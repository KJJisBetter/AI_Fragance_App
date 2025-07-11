import axios from 'axios';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function main() {
  console.log('🔍 Debugging Raw API Response...');

  const client = axios.create({
    baseURL: process.env.PERFUMERO_BASE_URL || 'https://perfumero1.p.rapidapi.com',
    timeout: 30000,
    headers: {
      'X-RapidAPI-Key': process.env.PERFUMERO_API_KEY!,
      'X-RapidAPI-Host': 'perfumero1.p.rapidapi.com',
      'Content-Type': 'application/json'
    }
  });

  try {
    // Test 1: Simple search
    console.log('\n🧪 Test 1: Simple search with name=Creed');
    const response1 = await client.get('/search', {
      params: { name: 'Creed', limit: 5 }
    });
    console.log('📊 Status:', response1.status);
    console.log('📊 Headers:', response1.headers);
    console.log('📊 Raw Data:', JSON.stringify(response1.data, null, 2));

    // Test 2: Search with no parameters
    console.log('\n🧪 Test 2: Search with no parameters');
    const response2 = await client.get('/search');
    console.log('📊 Status:', response2.status);
    console.log('📊 Raw Data:', JSON.stringify(response2.data, null, 2));

    // Test 3: Try a specific perfume ID if we can find any
    console.log('\n🧪 Test 3: Test with brand parameter');
    const response3 = await client.get('/search', {
      params: { brand: 'Dior' }
    });
    console.log('📊 Status:', response3.status);
    console.log('📊 Raw Data:', JSON.stringify(response3.data, null, 2));

  } catch (error: any) {
    console.error('❌ Raw API test failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Headers:', error.response?.headers);
  }
}

main().catch(console.error);
