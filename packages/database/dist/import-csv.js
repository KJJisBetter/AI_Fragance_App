"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importFragrancesFromCSV = void 0;
const index_1 = require("./index");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const parseNotes = (notesString) => {
    if (!notesString || notesString.trim() === '')
        return [];
    return notesString
        .split(',')
        .map(note => note.trim())
        .filter(note => note.length > 0)
        .map(note => {
        // Capitalize first letter and clean up
        return note.charAt(0).toUpperCase() + note.slice(1).toLowerCase();
    });
};
const parseRating = (ratingString) => {
    if (!ratingString || ratingString.trim() === '')
        return null;
    // Handle European decimal format (comma instead of dot)
    const normalizedRating = ratingString.replace(',', '.');
    const rating = parseFloat(normalizedRating);
    return isNaN(rating) ? null : Math.max(0, Math.min(5, rating));
};
const parseYear = (yearString) => {
    if (!yearString || yearString.trim() === '')
        return null;
    const year = parseInt(yearString, 10);
    return isNaN(year) || year < 1900 || year > new Date().getFullYear() ? null : year;
};
const getMainAccords = (row) => {
    const accords = [
        row.mainaccord1,
        row.mainaccord2,
        row.mainaccord3,
        row.mainaccord4,
        row.mainaccord5
    ].filter(accord => accord && accord.trim() !== '' && accord !== 'unknown');
    return accords.map(accord => accord.charAt(0).toUpperCase() + accord.slice(1).toLowerCase());
};
const mapAccordsToCategories = (accords) => {
    const seasons = [];
    const occasions = [];
    const moods = [];
    accords.forEach(accord => {
        const lowerAccord = accord.toLowerCase();
        // Season mapping based on common fragrance knowledge
        if (lowerAccord.includes('fresh') || lowerAccord.includes('citrus') || lowerAccord.includes('aquatic')) {
            if (!seasons.includes('Spring'))
                seasons.push('Spring');
            if (!seasons.includes('Summer'))
                seasons.push('Summer');
        }
        if (lowerAccord.includes('warm spicy') || lowerAccord.includes('oriental') || lowerAccord.includes('woody')) {
            if (!seasons.includes('Fall'))
                seasons.push('Fall');
            if (!seasons.includes('Winter'))
                seasons.push('Winter');
        }
        if (lowerAccord.includes('floral') || lowerAccord.includes('green')) {
            if (!seasons.includes('Spring'))
                seasons.push('Spring');
        }
        // Occasion mapping
        if (lowerAccord.includes('fresh') || lowerAccord.includes('citrus') || lowerAccord.includes('light')) {
            if (!occasions.includes('Daily'))
                occasions.push('Daily');
            if (!occasions.includes('Casual'))
                occasions.push('Casual');
        }
        if (lowerAccord.includes('oriental') || lowerAccord.includes('amber') || lowerAccord.includes('intense')) {
            if (!occasions.includes('Evening'))
                occasions.push('Evening');
            if (!occasions.includes('Formal'))
                occasions.push('Formal');
        }
        // Mood mapping
        if (lowerAccord.includes('fresh') || lowerAccord.includes('citrus')) {
            if (!moods.includes('Fresh'))
                moods.push('Fresh');
        }
        if (lowerAccord.includes('woody') || lowerAccord.includes('oriental')) {
            if (!moods.includes('Confident'))
                moods.push('Confident');
        }
        if (lowerAccord.includes('floral') || lowerAccord.includes('sweet')) {
            if (!moods.includes('Romantic'))
                moods.push('Romantic');
        }
    });
    // Default fallbacks if no categories assigned
    if (seasons.length === 0)
        seasons.push('Spring', 'Summer');
    if (occasions.length === 0)
        occasions.push('Daily', 'Casual');
    if (moods.length === 0)
        moods.push('Fresh');
    return { seasons, occasions, moods };
};
const importFragrancesFromCSV = async (filePath, batchSize = 100) => {
    let imported = 0;
    let skipped = 0;
    const errors = [];
    const fragrances = [];
    console.log(`🚀 Starting import from ${filePath}...`);
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe((0, csv_parser_1.default)({ separator: ';' }))
            .on('data', (row) => {
            try {
                // Skip if essential data is missing
                if (!row.Perfume || !row.Brand) {
                    skipped++;
                    return;
                }
                const topNotes = parseNotes(row.Top);
                const middleNotes = parseNotes(row.Middle);
                const baseNotes = parseNotes(row.Base);
                const mainAccords = getMainAccords(row);
                const { seasons, occasions, moods } = mapAccordsToCategories(mainAccords);
                const fragrance = {
                    name: row.Perfume.trim(),
                    brand: row.Brand.trim(),
                    year: parseYear(row.Year),
                    concentration: null, // Not available in this dataset
                    topNotes,
                    middleNotes,
                    baseNotes,
                    aiSeasons: seasons,
                    aiOccasions: occasions,
                    aiMoods: moods,
                    fragranticaSeasons: [], // Will be populated later
                    communityRating: parseRating(row['Rating Value']),
                    verified: true, // Since this is Fragrantica data
                    longevity: null,
                    sillage: null,
                    projection: null
                };
                fragrances.push(fragrance);
                // Process in batches
                if (fragrances.length >= batchSize) {
                    processBatch();
                }
            }
            catch (error) {
                errors.push(`Error processing row for ${row.Perfume}: ${error}`);
                skipped++;
            }
        })
            .on('end', async () => {
            // Process remaining fragrances
            if (fragrances.length > 0) {
                await processBatch();
            }
            console.log(`✅ Import completed:`);
            console.log(`   📊 Imported: ${imported}`);
            console.log(`   ⏭️  Skipped: ${skipped}`);
            console.log(`   ❌ Errors: ${errors.length}`);
            resolve({ imported, skipped, errors });
        })
            .on('error', (error) => {
            console.error('❌ Error reading CSV file:', error);
            reject(error);
        });
        const processBatch = async () => {
            try {
                console.log(`📦 Processing batch of ${fragrances.length} fragrances...`);
                // Use createMany with skipDuplicates to handle existing records
                const result = await index_1.prisma.fragrance.createMany({
                    data: fragrances.splice(0), // Clear the array
                    skipDuplicates: true
                });
                imported += result.count;
                console.log(`   ✅ Batch imported: ${result.count} fragrances`);
            }
            catch (error) {
                console.error('❌ Error in batch processing:', error);
                errors.push(`Batch processing error: ${error}`);
                skipped += fragrances.length;
                fragrances.splice(0); // Clear the array
            }
        };
    });
};
exports.importFragrancesFromCSV = importFragrancesFromCSV;
// CLI runner
if (require.main === module) {
    const csvPath = process.argv[2] || path.join(__dirname, '../../../data/fra_cleaned.csv');
    (0, exports.importFragrancesFromCSV)(csvPath)
        .then((result) => {
        console.log('🎉 Import completed successfully!');
        console.log(`Final stats:`, result);
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Import failed:', error);
        process.exit(1);
    })
        .finally(async () => {
        await index_1.prisma.$disconnect();
    });
}
//# sourceMappingURL=import-csv.js.map