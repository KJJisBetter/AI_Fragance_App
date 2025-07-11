import axios from 'axios';
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function quickAPITest() {
  console.log('🧪 Quick API Test with your key...\n');

  // Get API key from environment
  const apiKey = process.env.PERFUMERO_API_KEY;
  const baseURL = process.env.PERFUMERO_BASE_URL || 'https://perfumero1.p.rapidapi.com';

  if (!apiKey) {
    console.error('❌ PERFUMERO_API_KEY not found in environment variables');
    console.log('Please set PERFUMERO_API_KEY in your .env file');
    console.log('Example: PERFUMERO_API_KEY="your-rapidapi-key-here"');
    process.exit(1);
  }

  console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log(`🌐 Base URL: ${baseURL}\n`);

  const options = {
    method: 'GET',
    url: `${baseURL}/search`,
    params: {
      sex: 'M',
      type: 'EDT',
      available: 'Y',
      limited: 'N',
      collector: 'N',
      accords: 'woody',
      page: '1',
      limit: '5'  // Small limit for testing
    },
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'perfumero1.p.rapidapi.com'
    }
  };

  try {
    console.log('🌐 Making API request...');
    const response = await axios.request(options);
    console.log('✅ API Test Successful!');
    console.log(`📊 Found ${response.data.length || 0} results`);

    if (response.data && response.data.length > 0) {
      const sample = response.data[0];
      console.log('📋 Sample result:');
      console.log(`   PID: ${sample.pid || 'N/A'}`);
      console.log(`   Name: ${sample.name || 'N/A'}`);
      console.log(`   Brand: ${sample.brand || 'N/A'}`);
      console.log(`   Type: ${sample.type || 'N/A'}`);
      console.log(`   Year: ${sample.year || 'N/A'}`);
      console.log(`   Sex: ${sample.sex || 'N/A'}`);
      console.log(`   Rating: ${sample.rating || 'N/A'}`);
      console.log(`   Available: ${sample.available || 'N/A'}`);

      // Parse JSON strings for notes
      try {
        const topNotes = sample.top ? JSON.parse(sample.top) : [];
        const heartNotes = sample.heart ? JSON.parse(sample.heart) : [];
        const baseNotes = sample.base ? JSON.parse(sample.base) : [];
        console.log(`   Top Notes: ${topNotes.join(', ') || 'N/A'}`);
        console.log(`   Heart Notes: ${heartNotes.join(', ') || 'N/A'}`);
        console.log(`   Base Notes: ${baseNotes.join(', ') || 'N/A'}`);
      } catch (e) {
        console.log(`   Notes: Could not parse notes data`);
      }
    }

    console.log('\n✅ Your API key is working correctly!');
    console.log('You can now run the seeding script safely.');

  } catch (error: any) {
    console.log('❌ API Test Failed:');
    console.log(`   Status: ${error.response?.status || 'No status'}`);
    console.log(`   Message: ${error.message}`);
    console.log(`   Response: ${JSON.stringify(error.response?.data || {}, null, 2)}`);

    if (error.response?.status === 401) {
      console.log('\n🔐 This looks like an authentication issue.');
      console.log('   Make sure your API key is correct and you have an active subscription.');
    } else if (error.response?.status === 403) {
      console.log('\n🔐 Not subscribed to API.');
      console.log('   Subscribe at: https://rapidapi.com/perfumero/api/perfumero1');
    } else if (error.response?.status === 429) {
      console.log('\n⏰ Rate limit exceeded.');
      console.log('   Wait a moment and try again.');
    }
  }
}

quickAPITest().catch(console.error);
