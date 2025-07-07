import { prisma } from './index';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

interface ParfumoCSVRow {
  Name: string;
  Brand: string;
  'Release Year': string;
  Concentration: string;
  'Rating Value': string;
  'Rating Count': string;
  'Main Accords': string;
  'Top Notes': string;
  'Middle Notes': string;
  'Base Notes': string;
  Perfumers: string;
  URL: string;
}

const parseNotes = (notesString: string): string[] => {
  if (!notesString || notesString.trim() === '' || notesString === 'N/A') return [];

  return notesString
    .split(',')
    .map(note => note.trim())
    .filter(note => note.length > 0 && note !== 'N/A')
    .map(note => {
      return note.charAt(0).toUpperCase() + note.slice(1).toLowerCase();
    });
};

const parseParfumoRating = (ratingString: string): number | null => {
  if (!ratingString || ratingString.trim() === '' || ratingString === 'N/A') return null;
  const rating = parseFloat(ratingString);
  return isNaN(rating) ? null : Math.max(0, Math.min(5, rating / 2));
};

const parseYear = (yearString: string): number | null => {
  if (!yearString || yearString.trim() === '' || yearString === 'N/A') return null;
  const year = parseInt(yearString, 10);
  return isNaN(year) || year < 1900 || year > new Date().getFullYear() ? null : year;
};

const parseConcentration = (concString: string): string | null => {
  if (!concString || concString.trim() === '' || concString === 'N/A') return null;
  return concString.trim();
};

const mapAccordsToCategories = (accordsString: string): {
  seasons: string[];
  occasions: string[];
  moods: string[];
} => {
  const seasons: string[] = [];
  const occasions: string[] = [];
  const moods: string[] = [];

  if (!accordsString || accordsString === 'N/A') {
    return { seasons: ['Spring', 'Summer'], occasions: ['Daily', 'Casual'], moods: ['Fresh'] };
  }

  const accords = accordsString.toLowerCase();

  if (accords.includes('fresh') || accords.includes('citrus') || accords.includes('aquatic') || accords.includes('green')) {
    if (!seasons.includes('Spring')) seasons.push('Spring');
    if (!seasons.includes('Summer')) seasons.push('Summer');
  }
  if (accords.includes('spicy') || accords.includes('oriental') || accords.includes('woody') || accords.includes('warm')) {
    if (!seasons.includes('Fall')) seasons.push('Fall');
    if (!seasons.includes('Winter')) seasons.push('Winter');
  }
  if (accords.includes('floral') || accords.includes('powdery')) {
    if (!seasons.includes('Spring')) seasons.push('Spring');
  }

  if (accords.includes('fresh') || accords.includes('citrus') || accords.includes('light') || accords.includes('clean')) {
    if (!occasions.includes('Daily')) occasions.push('Daily');
    if (!occasions.includes('Casual')) occasions.push('Casual');
  }
  if (accords.includes('oriental') || accords.includes('amber') || accords.includes('intense') || accords.includes('heavy')) {
    if (!occasions.includes('Evening')) occasions.push('Evening');
    if (!occasions.includes('Formal')) occasions.push('Formal');
  }

  if (accords.includes('fresh') || accords.includes('citrus') || accords.includes('aquatic')) {
    if (!moods.includes('Fresh')) moods.push('Fresh');
  }
  if (accords.includes('woody') || accords.includes('oriental') || accords.includes('strong')) {
    if (!moods.includes('Confident')) moods.push('Confident');
  }
  if (accords.includes('floral') || accords.includes('sweet') || accords.includes('romantic')) {
    if (!moods.includes('Romantic')) moods.push('Romantic');
  }

  if (seasons.length === 0) seasons.push('Spring', 'Summer');
  if (occasions.length === 0) occasions.push('Daily', 'Casual');
  if (moods.length === 0) moods.push('Fresh');

  return { seasons, occasions, moods };
};

const cleanFragranceName = (name: string): string => {
  return name.replace(/^#\w*\s*/, '').trim();
};

export const importParfumoBulk = async (
  filePath: string,
  batchSize: number = 1000
): Promise<{ imported: number; skipped: number; errors: string[] }> => {
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const fragrances: any[] = [];

  console.log(`🚀 Starting BULK Parfumo import from ${filePath}...`);
  console.log(`📋 Strategy: Skip duplicates, bulk insert`);

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ',' }))
      .on('data', (row: ParfumoCSVRow) => {
        try {
          const cleanName = cleanFragranceName(row.Name);
          if (!cleanName || !row.Brand || cleanName.includes('#NAME?') || cleanName.length < 2) {
            skipped++;
            return;
          }

          const topNotes = parseNotes(row['Top Notes']);
          const middleNotes = parseNotes(row['Middle Notes']);
          const baseNotes = parseNotes(row['Base Notes']);
          const { seasons, occasions, moods } = mapAccordsToCategories(row['Main Accords']);

          const fragrance = {
            name: cleanName,
            brand: row.Brand.trim(),
            year: parseYear(row['Release Year']),
            concentration: parseConcentration(row.Concentration),
            topNotes,
            middleNotes,
            baseNotes,
            aiSeasons: seasons,
            aiOccasions: occasions,
            aiMoods: moods,
            fragranticaSeasons: [],
            communityRating: parseParfumoRating(row['Rating Value']),
            verified: true,
            longevity: null,
            sillage: null,
            projection: null
          };

          fragrances.push(fragrance);

          if (fragrances.length >= batchSize) {
            processBatch();
          }
        } catch (error) {
          errors.push(`Error processing row for ${row.Name}: ${error}`);
          skipped++;
        }
      })
      .on('end', async () => {
        if (fragrances.length > 0) {
          await processBatch();
        }

        console.log(`✅ BULK Parfumo import completed:`);
        console.log(`   📊 Imported: ${imported}`);
        console.log(`   ⏭️  Skipped: ${skipped}`);
        console.log(`   ❌ Errors: ${errors.length}`);

        resolve({ imported, skipped, errors });
      })
      .on('error', (error) => {
        console.error('❌ Error reading Parfumo CSV file:', error);
        reject(error);
      });

    const processBatch = async () => {
      try {
        console.log(`📦 Processing batch of ${fragrances.length} fragrances...`);

        // Use bulk insert with skipDuplicates - much faster!
        const result = await prisma.fragrance.createMany({
          data: fragrances.splice(0),
          skipDuplicates: true
        });

        imported += result.count;
        console.log(`   ✅ Batch imported: ${result.count} new fragrances`);

      } catch (error) {
        console.error('❌ Error in batch processing:', error);
        errors.push(`Batch processing error: ${error}`);
        skipped += fragrances.length;
        fragrances.splice(0);
      }
    };
  });
};

// CLI runner
if (require.main === module) {
  const csvPath = process.argv[2] || path.join(__dirname, '../../../data/parfumo_datos.csv');

  importParfumoBulk(csvPath, 1000)
    .then((result) => {
      console.log('🎉 BULK Parfumo import completed successfully!');
      console.log(`Final stats:`, result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 BULK Parfumo import failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
