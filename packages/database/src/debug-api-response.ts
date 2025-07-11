import { PerfumeroService } from './services/perfumero-service';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function main() {
  console.log('🔍 Debugging API Response Structure...');

  const perfumero = new PerfumeroService({
    apiKey: process.env.PERFUMERO_API_KEY!,
    baseURL: process.env.PERFUMERO_BASE_URL || 'https://perfumero1.p.rapidapi.com',
    monthlyLimit: 30
  });

  try {
    // Test with a simple search
    console.log('\n🧪 Testing simple search...');
    const result = await perfumero.search({ name: 'Creed' });
    console.log('📊 Raw result:', JSON.stringify(result, null, 2));

    // Test with no parameters
    console.log('\n🧪 Testing empty search...');
    const emptyResult = await perfumero.search({ limit: 5 });
    console.log('📊 Empty search result:', JSON.stringify(emptyResult, null, 2));

    // Test with brand parameter
    console.log('\n🧪 Testing brand search...');
    const brandResult = await perfumero.search({ brand: 'Dior', limit: 3 });
    console.log('📊 Brand search result:', JSON.stringify(brandResult, null, 2));

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

main().catch(console.error);
