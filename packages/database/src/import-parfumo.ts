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
      // Capitalize first letter and clean up
      return note.charAt(0).toUpperCase() + note.slice(1).toLowerCase();
    });
};

const parseParfumoRating = (ratingString: string): number | null => {
  if (!ratingString || ratingString.trim() === '' || ratingString === 'N/A') return null;

  const rating = parseFloat(ratingString);
  // Parfumo uses 1-10 scale, convert to 1-5 scale to match Fragantica
  return isNaN(rating) ? null : Math.max(0, Math.min(5, rating / 2));
};

const parseRatingCount = (countString: string): number | null => {
  if (!countString || countString.trim() === '' || countString === 'N/A') return null;

  // Handle formats like "6 Ratings", "3 Ratings"
  const match = countString.match(/(\d+)/);
  return match && match[1] ? parseInt(match[1], 10) : null;
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

  // Season mapping based on common fragrance knowledge
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

  // Occasion mapping
  if (accords.includes('fresh') || accords.includes('citrus') || accords.includes('light') || accords.includes('clean')) {
    if (!occasions.includes('Daily')) occasions.push('Daily');
    if (!occasions.includes('Casual')) occasions.push('Casual');
  }
  if (accords.includes('oriental') || accords.includes('amber') || accords.includes('intense') || accords.includes('heavy')) {
    if (!occasions.includes('Evening')) occasions.push('Evening');
    if (!occasions.includes('Formal')) occasions.push('Formal');
  }

  // Mood mapping
  if (accords.includes('fresh') || accords.includes('citrus') || accords.includes('aquatic')) {
    if (!moods.includes('Fresh')) moods.push('Fresh');
  }
  if (accords.includes('woody') || accords.includes('oriental') || accords.includes('strong')) {
    if (!moods.includes('Confident')) moods.push('Confident');
  }
  if (accords.includes('floral') || accords.includes('sweet') || accords.includes('romantic')) {
    if (!moods.includes('Romantic')) moods.push('Romantic');
  }

  // Default fallbacks if no categories assigned
  if (seasons.length === 0) seasons.push('Spring', 'Summer');
  if (occasions.length === 0) occasions.push('Daily', 'Casual');
  if (moods.length === 0) moods.push('Fresh');

  return { seasons, occasions, moods };
};

const cleanFragranceName = (name: string): string => {
  // Remove Parfumo-specific prefixes like "#455", "#NAME?", etc.
  return name.replace(/^#\w*\s*/, '').trim();
};

export const importParfumoFromCSV = async (
  filePath: string,
  batchSize: number = 100,
  mergeStrategy: 'replace' | 'merge' | 'skip_existing' = 'merge'
): Promise<{ imported: number; updated: number; skipped: number; errors: string[] }> => {
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const fragrances: any[] = [];

  console.log(`🚀 Starting Parfumo import from ${filePath}...`);
  console.log(`📋 Strategy: ${mergeStrategy}`);

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ',' }))
      .on('data', (row: ParfumoCSVRow) => {
        try {
          // Skip if essential data is missing or corrupted
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
            fragranticaSeasons: [], // Empty for Parfumo data
            communityRating: parseParfumoRating(row['Rating Value']),
            verified: true, // Parfumo is a reliable source
            longevity: null,
            sillage: null,
            projection: null,
            // Store source info for future reference
            metadata: {
              source: 'parfumo',
              ratingCount: parseRatingCount(row['Rating Count']),
              perfumers: row.Perfumers && row.Perfumers !== 'N/A' ? row.Perfumers : null,
              url: row.URL
            }
          };

          fragrances.push(fragrance);

          // Process in batches
          if (fragrances.length >= batchSize) {
            processBatch();
          }
        } catch (error) {
          errors.push(`Error processing row for ${row.Name}: ${error}`);
          skipped++;
        }
      })
      .on('end', async () => {
        // Process remaining fragrances
        if (fragrances.length > 0) {
          await processBatch();
        }

        console.log(`✅ Parfumo import completed:`);
        console.log(`   📊 Imported: ${imported}`);
        console.log(`   🔄 Updated: ${updated}`);
        console.log(`   ⏭️  Skipped: ${skipped}`);
        console.log(`   ❌ Errors: ${errors.length}`);

        resolve({ imported, updated, skipped, errors });
      })
      .on('error', (error) => {
        console.error('❌ Error reading Parfumo CSV file:', error);
        reject(error);
      });

    const processBatch = async () => {
      try {
        console.log(`📦 Processing batch of ${fragrances.length} fragrances...`);

        for (const fragrance of fragrances) {
          try {
            // Check if fragrance already exists (by name + brand)
            const existing = await prisma.fragrance.findFirst({
              where: {
                AND: [
                  { name: { equals: fragrance.name, mode: 'insensitive' } },
                  { brand: { equals: fragrance.brand, mode: 'insensitive' } }
                ]
              }
            });

            if (existing) {
              if (mergeStrategy === 'skip_existing') {
                skipped++;
                continue;
              } else if (mergeStrategy === 'merge') {
                // Update with better data (keep existing + add new info)
                const updateData: any = {};

                // Keep existing data, only update if new data is better
                if (!existing.year && fragrance.year) updateData.year = fragrance.year;
                if (!existing.concentration && fragrance.concentration) updateData.concentration = fragrance.concentration;

                // Merge notes (combine unique values)
                if (fragrance.topNotes.length > 0) {
                  const mergedTop = [...new Set([...existing.topNotes, ...fragrance.topNotes])];
                  updateData.topNotes = mergedTop;
                }
                if (fragrance.middleNotes.length > 0) {
                  const mergedMiddle = [...new Set([...existing.middleNotes, ...fragrance.middleNotes])];
                  updateData.middleNotes = mergedMiddle;
                }
                if (fragrance.baseNotes.length > 0) {
                  const mergedBase = [...new Set([...existing.baseNotes, ...fragrance.baseNotes])];
                  updateData.baseNotes = mergedBase;
                }

                // Keep better rating (prefer one with more votes if available)
                if (fragrance.communityRating && (!existing.communityRating ||
                    (fragrance.metadata?.ratingCount && fragrance.metadata.ratingCount > 10))) {
                  updateData.communityRating = fragrance.communityRating;
                }

                // Update AI categories if they're more comprehensive
                if (fragrance.aiSeasons.length >= existing.aiSeasons.length) {
                  updateData.aiSeasons = fragrance.aiSeasons;
                }
                if (fragrance.aiOccasions.length >= existing.aiOccasions.length) {
                  updateData.aiOccasions = fragrance.aiOccasions;
                }
                if (fragrance.aiMoods.length >= existing.aiMoods.length) {
                  updateData.aiMoods = fragrance.aiMoods;
                }

                if (Object.keys(updateData).length > 0) {
                  await prisma.fragrance.update({
                    where: { id: existing.id },
                    data: { ...updateData, updatedAt: new Date() }
                  });
                  updated++;
                } else {
                  skipped++;
                }
              } else if (mergeStrategy === 'replace') {
                // Replace existing with new data
                await prisma.fragrance.update({
                  where: { id: existing.id },
                  data: { ...fragrance, metadata: undefined, updatedAt: new Date() }
                });
                updated++;
              }
            } else {
              // Create new fragrance
              const { metadata, ...fragranceData } = fragrance;
              await prisma.fragrance.create({
                data: fragranceData
              });
              imported++;
            }
          } catch (error) {
            console.error(`Error processing ${fragrance.name}:`, error);
            errors.push(`Error processing ${fragrance.name}: ${error}`);
            skipped++;
          }
        }

        fragrances.splice(0); // Clear the array
        console.log(`   ✅ Batch processed: +${imported} new, ~${updated} updated, -${skipped} skipped`);

      } catch (error) {
        console.error('❌ Error in batch processing:', error);
        errors.push(`Batch processing error: ${error}`);
        skipped += fragrances.length;
        fragrances.splice(0); // Clear the array
      }
    };
  });
};

// CLI runner
if (require.main === module) {
  const csvPath = process.argv[2] || path.join(__dirname, '../../../data/parfumo_datos.csv');
  const strategy = (process.argv[3] as 'replace' | 'merge' | 'skip_existing') || 'merge';

  importParfumoFromCSV(csvPath, 100, strategy)
    .then((result) => {
      console.log('🎉 Parfumo import completed successfully!');
      console.log(`Final stats:`, result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Parfumo import failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
