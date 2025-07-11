import { PrismaClient } from '@prisma/client';
import { PerfumeroService } from './services/perfumero-service';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting simple API seeding test...');

  // Initialize Perfumero service
  const perfumero = new PerfumeroService({
    apiKey: process.env.PERFUMERO_API_KEY!,
    baseURL: process.env.PERFUMERO_BASE_URL || 'https://perfumero1.p.rapidapi.com',
    monthlyLimit: 30
  });

  console.log('🔑 API Key configured:', process.env.PERFUMERO_API_KEY?.substring(0, 10) + '...');

  // Test with a few strategic searches
  const testSearches = [
    'Tom Ford Oud Wood',
    'Creed Aventus',
    'Chanel Bleu de Chanel'
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const query of testSearches) {
    try {
      console.log(`\n🔍 Testing search: "${query}"`);

      if (!perfumero.canMakeRequest()) {
        console.log('⚠️ Rate limit reached, stopping');
        break;
      }

      const results = await perfumero.search({ name: query, limit: 3 });
      console.log(`✅ Found ${results.perfumes.length} results`);

      // Show first result details
      if (results.perfumes.length > 0) {
        const perfume = results.perfumes[0];
        console.log(`   📝 First result: "${perfume.name}" by ${perfume.brand}`);
        console.log(`   🗒️  Notes: Top(${perfume.topNotes?.length || 0}), Heart(${perfume.heartNotes?.length || 0}), Base(${perfume.baseNotes?.length || 0})`);
        console.log(`   ⭐ Rating: ${perfume.rating || 'N/A'}`);
      }

      successCount++;

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Search failed for "${query}":`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successful requests: ${successCount}`);
  console.log(`   ❌ Failed requests: ${errorCount}`);
  console.log(`   📈 Rate limit status: ${perfumero.getUsageStats().requestsThisMonth}/${perfumero.getUsageStats().monthlyLimit}`);

  await prisma.$disconnect();
}

main().catch(console.error);
