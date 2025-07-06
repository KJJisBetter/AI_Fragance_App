// Smart search normalization for fragrance names
export interface SearchVariation {
  original: string;
  normalized: string;
  variations: string[];
}

// Common fragrance naming patterns and their variations
const FRAGRANCE_PATTERNS = {
  // Apostrophe variations
  apostrophe: {
    "j'adore": ["jadore", "j adore", "j-adore"],
    "l'eau": ["leau", "l eau", "l-eau"],
    "l'homme": ["lhomme", "l homme", "l-homme"],
    "d'amour": ["damour", "d amour", "d-amour"],
    "l'instant": ["linstant", "l instant", "l-instant"],
    "l'imperatrice": ["limperatrice", "l imperatrice", "l-imperatrice"]
  },

  // Number variations
  numbers: {
    "no 5": ["no5", "no. 5", "number 5", "n5"],
    "no 1": ["no1", "no. 1", "number 1", "n1"],
    "ck one": ["ck 1", "calvin klein one", "calvin klein 1"],
    "212": ["two twelve", "two one two"]
  },

  // Concentration abbreviations
  concentrations: {
    "eau de parfum": ["edp", "parfum"],
    "eau de toilette": ["edt", "toilette"],
    "eau de cologne": ["edc", "cologne"],
    "parfum": ["extrait", "pure parfum"],
    "eau fraiche": ["fresh", "fraiche"]
  }
};

// Generate abbreviation from brand name (first letter of each word)
function generateBrandAbbreviation(brandName: string): string[] {
  const abbreviations: string[] = [];

  // Split by hyphens, spaces, and ampersands
  const words = brandName
    .toLowerCase()
    .replace(/[&]/g, ' ')
    .split(/[-\s]+/)
    .filter(word => word.length > 0 && !['and', 'de', 'la', 'le', 'du', 'des'].includes(word));

  if (words.length >= 2) {
    // Generate abbreviation from first letters
    const abbrev = words.map(word => word.charAt(0)).join('');
    abbreviations.push(abbrev);

    // Also add version with dots (e.g., "y.s.l")
    if (words.length <= 4) {
      abbreviations.push(words.map(word => word.charAt(0)).join('.'));
    }
  }

  return abbreviations;
}

// Generate expanded versions from abbreviation
function expandAbbreviation(abbrev: string, allBrands: string[] = []): string[] {
  const expansions: string[] = [];

  // If we have brand data, try to match against known brands
  if (allBrands.length > 0) {
    allBrands.forEach(brand => {
      const brandAbbrevs = generateBrandAbbreviation(brand);
      if (brandAbbrevs.includes(abbrev.toLowerCase())) {
        expansions.push(brand);
        // Also add formatted version
        expansions.push(brand.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
      }
    });
  }

  return expansions;
}

// Normalize a search term by removing special characters and standardizing
export function normalizeSearchTerm(term: string): string {
  return term
    .toLowerCase()
    .trim()
    .replace(/[''`]/g, '') // Remove apostrophes
    .replace(/[&]/g, ' and ') // Replace ampersands
    .replace(/[.\-_]/g, ' ') // Replace dots, hyphens, underscores with spaces
    .replace(/\s+/g, ' ') // Normalize multiple spaces
    .trim();
}

// Generate search variations for a given term
export function generateSearchVariations(searchTerm: string, allBrands: string[] = []): string[] {
  const variations = new Set<string>();
  const normalized = normalizeSearchTerm(searchTerm);

  // Add original and normalized versions
  variations.add(searchTerm.toLowerCase().trim());
  variations.add(normalized);

  // Check for pattern matches in apostrophes and numbers
  Object.entries(FRAGRANCE_PATTERNS).forEach(([category, patterns]) => {
    Object.entries(patterns).forEach(([pattern, alternates]) => {
      const patternNormalized = normalizeSearchTerm(pattern);

      // If search term matches a pattern, add all its variations
      if (normalized.includes(patternNormalized) || patternNormalized.includes(normalized)) {
        variations.add(pattern);
        alternates.forEach(alt => variations.add(alt));
      }

      // If search term matches any variation, add the main pattern
      alternates.forEach(alt => {
        const altNormalized = normalizeSearchTerm(alt);
        if (normalized.includes(altNormalized) || altNormalized.includes(normalized)) {
          variations.add(pattern);
          variations.add(alt);
        }
      });
    });
  });

  // Smart brand abbreviation handling
  const searchWords = searchTerm.toLowerCase().trim().split(/\s+/);

  // If it's a short term (2-4 letters), treat as potential abbreviation
  if (searchWords.length === 1 && searchWords[0].length >= 2 && searchWords[0].length <= 4) {
    const expansions = expandAbbreviation(searchWords[0], allBrands);
    expansions.forEach(expansion => variations.add(expansion));
  }

  // If it's a brand name, add its abbreviations
  if (searchWords.length >= 2) {
    const abbrevs = generateBrandAbbreviation(searchTerm);
    abbrevs.forEach(abbrev => variations.add(abbrev));
  }

  // Handle ampersand variations
  if (normalized.includes(' and ')) {
    variations.add(normalized.replace(/ and /g, ' & '));
    variations.add(normalized.replace(/ and /g, ''));
  }
  if (searchTerm.includes('&')) {
    variations.add(searchTerm.replace(/&/g, ' and '));
    variations.add(searchTerm.replace(/\s*&\s*/g, ''));
  }

  return Array.from(variations).filter(v => v.length > 0);
}

// Smart search query builder that includes variations
export function buildSmartSearchQuery(searchTerm: string, allBrands: string[] = []): Array<{
  OR: Array<{ name: { contains: string; mode: 'insensitive' } } | { brand: { contains: string; mode: 'insensitive' } }>
}> {
  const variations = generateSearchVariations(searchTerm, allBrands);

  // For each variation, create name and brand search conditions
  return variations.map(variation => ({
    OR: [
      { name: { contains: variation, mode: 'insensitive' as const } },
      { brand: { contains: variation, mode: 'insensitive' as const } }
    ]
  }));
}

// Test function to verify normalization
export function testSearchNormalization() {
  const testCases = [
    "jadore",
    "j'adore",
    "dolce gabbana",
    "d&g",
    "ck one",
    "chanel no 5",
    "creed aventus",
    "ysl",
    "tf",
    "jpg",
    "edp"
  ];

  // Mock some brand data for testing
  const mockBrands = [
    "yves-saint-laurent",
    "tom-ford",
    "jean-paul-gaultier",
    "calvin-klein",
    "dolce-gabbana",
    "giorgio-armani"
  ];

  console.log('🧪 Testing Search Normalization:');
  testCases.forEach(term => {
    const variations = generateSearchVariations(term, mockBrands);
    console.log(`"${term}" → [${variations.join(', ')}]`);
  });
}
