// Smart Search Intelligence System for Fragrance Battle AI
// Phase 3B: Comprehensive brand abbreviations, fragrance nicknames, and intelligent search

export interface SearchVariation {
  original: string;
  normalized: string;
  variations: string[];
  searchType: 'exact' | 'brand' | 'nickname' | 'fuzzy' | 'notes';
  confidence: number;
}

export interface SearchStrategy {
  exact: string[];
  brand: string[];
  nickname: string[];
  fuzzy: string[];
  notes: string[];
}

// ===== BRAND ABBREVIATION MAPPING =====
const BRAND_ABBREVIATIONS = {
  // Major designer houses
  'ysl': 'Yves Saint Laurent',
  'y.s.l': 'Yves Saint Laurent',
  'y.s.l.': 'Yves Saint Laurent',
  'saint laurent': 'Yves Saint Laurent',

  'tf': 'Tom Ford',
  't.f': 'Tom Ford',
  't.f.': 'Tom Ford',
  'tom ford': 'Tom Ford',

  'jpg': 'Jean Paul Gaultier',
  'j.p.g': 'Jean Paul Gaultier',
  'j.p.g.': 'Jean Paul Gaultier',
  'gaultier': 'Jean Paul Gaultier',
  'paul gaultier': 'Jean Paul Gaultier',

  'd&g': 'Dolce & Gabbana',
  'dg': 'Dolce & Gabbana',
  'd g': 'Dolce & Gabbana',
  'dolce gabbana': 'Dolce & Gabbana',
  'dolce': 'Dolce & Gabbana',
  'gabbana': 'Dolce & Gabbana',

  'ck': 'Calvin Klein',
  'c.k': 'Calvin Klein',
  'c.k.': 'Calvin Klein',
  'calvin': 'Calvin Klein',
  'klein': 'Calvin Klein',

  'boss': 'Hugo Boss',
  'hugo boss': 'Hugo Boss',
  'hugo': 'Hugo Boss',

  'armani': 'Giorgio Armani',
  'ga': 'Giorgio Armani',
  'g.a': 'Giorgio Armani',
  'g.a.': 'Giorgio Armani',
  'giorgio': 'Giorgio Armani',

  'dior': 'Christian Dior',
  'christian dior': 'Christian Dior',
  'cd': 'Christian Dior',
  'c.d': 'Christian Dior',

  // Luxury and niche brands
  'chanel': 'Chanel',
  'creed': 'Creed',
  'versace': 'Versace',
  'prada': 'Prada',
  'gucci': 'Gucci',
  'hermes': 'Hermès',
  'hermès': 'Hermès',

  // Popular brands
  'paco': 'Paco Rabanne',
  'rabanne': 'Paco Rabanne',
  'paco rabanne': 'Paco Rabanne',

  'thierry mugler': 'Thierry Mugler',
  'mugler': 'Thierry Mugler',

  'issey': 'Issey Miyake',
  'miyake': 'Issey Miyake',
  'issey miyake': 'Issey Miyake',

  'viktor rolf': 'Viktor & Rolf',
  'v&r': 'Viktor & Rolf',
  'vr': 'Viktor & Rolf',
  'viktor': 'Viktor & Rolf',

  // Niche and artisan
  'mfk': 'Maison Francis Kurkdjian',
  'm.f.k': 'Maison Francis Kurkdjian',
  'm.f.k.': 'Maison Francis Kurkdjian',
  'francis kurkdjian': 'Maison Francis Kurkdjian',
  'kurkdjian': 'Maison Francis Kurkdjian',

  'montblanc': 'Montblanc',
  'mb': 'Montblanc',
  'm.b': 'Montblanc',
  'mont blanc': 'Montblanc',

  'kenzo': 'Kenzo',
  'givenchy': 'Givenchy',
  'lancome': 'Lancôme',
  'lancôme': 'Lancôme'
};

// ===== FRAGRANCE NICKNAME MAPPING =====
const FRAGRANCE_NICKNAMES = {
  // ===== CHANEL =====
  'chanel blue': 'Bleu de Chanel',
  'blue chanel': 'Bleu de Chanel',
  'bleu chanel': 'Bleu de Chanel',
  'chanel bleu': 'Bleu de Chanel',
  'blue de chanel': 'Bleu de Chanel',
  'dior blue': 'Bleu de Chanel', // common confusion

  'chanel 5': 'Chanel No 5',
  'no 5': 'Chanel No 5',
  'number 5': 'Chanel No 5',
  'n5': 'Chanel No 5',
  'no5': 'Chanel No 5',

  // ===== DIOR =====
  'sauvage': 'Dior Sauvage',
  'savage': 'Dior Sauvage', // common misspelling
  'savange': 'Dior Sauvage', // typo
  'dior savage': 'Dior Sauvage',

  'fahrenheit': 'Dior Fahrenheit',
  'farenheit': 'Dior Fahrenheit', // common misspelling
  'dior fahrenheit': 'Dior Fahrenheit',

  'homme intense': 'Dior Homme Intense',
  'dior homme': 'Dior Homme',

  // ===== CREED =====
  'aventus': 'Creed Aventus',
  'creed aventus': 'Creed Aventus',
  'aventis': 'Creed Aventus', // typo

  'green irish tweed': 'Creed Green Irish Tweed',
  'git': 'Creed Green Irish Tweed',
  'irish tweed': 'Creed Green Irish Tweed',

  'millesime imperial': 'Creed Millesime Imperial',
  'mi': 'Creed Millesime Imperial',
  'imperial': 'Creed Millesime Imperial',

  // ===== PACO RABANNE =====
  'one million': 'Paco Rabanne 1 Million',
  '1 million': 'Paco Rabanne 1 Million',
  'one mil': 'Paco Rabanne 1 Million',
  '1mil': 'Paco Rabanne 1 Million',
  'million': 'Paco Rabanne 1 Million',

  'invictus': 'Paco Rabanne Invictus',
  'invictis': 'Paco Rabanne Invictus', // typo
  'paco invictus': 'Paco Rabanne Invictus',

  'phantom': 'Paco Rabanne Phantom',
  'paco phantom': 'Paco Rabanne Phantom',

  // ===== YSL =====
  'la nuit': "Yves Saint Laurent La Nuit de L'Homme",
  'ysl la nuit': "Yves Saint Laurent La Nuit de L'Homme",
  'lnuit': "Yves Saint Laurent La Nuit de L'Homme",
  'lndl': "Yves Saint Laurent La Nuit de L'Homme",
  'la nuit de lhomme': "Yves Saint Laurent La Nuit de L'Homme",

  'y edp': 'Yves Saint Laurent Y Eau de Parfum',
  'y edt': 'Yves Saint Laurent Y Eau de Toilette',
  'ysl y': 'Yves Saint Laurent Y',

  'kouros': 'Yves Saint Laurent Kouros',
  'ysl kouros': 'Yves Saint Laurent Kouros',

  // ===== TOM FORD =====
  'black orchid': 'Tom Ford Black Orchid',
  'tf black orchid': 'Tom Ford Black Orchid',

  'tobacco vanille': 'Tom Ford Tobacco Vanille',
  'tf tobacco vanille': 'Tom Ford Tobacco Vanille',
  'tobacco vanilla': 'Tom Ford Tobacco Vanille',

  'oud wood': 'Tom Ford Oud Wood',
  'tf oud wood': 'Tom Ford Oud Wood',
  'tom ford oud': 'Tom Ford Oud Wood',

  'lost cherry': 'Tom Ford Lost Cherry',
  'tf lost cherry': 'Tom Ford Lost Cherry',

  'fucking fabulous': 'Tom Ford Fucking Fabulous',
  'ff': 'Tom Ford Fucking Fabulous',
  'tf ff': 'Tom Ford Fucking Fabulous',
  'f fabulous': 'Tom Ford Fucking Fabulous',

  'tuscan leather': 'Tom Ford Tuscan Leather',
  'tf tuscan leather': 'Tom Ford Tuscan Leather',

  // ===== VERSACE =====
  'eros': 'Versace Eros',
  'versace eros': 'Versace Eros',
  'eros flame': 'Versace Eros Flame',
  'versace eros flame': 'Versace Eros Flame',

  'dylan blue': 'Versace Dylan Blue',
  'versace dylan': 'Versace Dylan Blue',

  'pour homme': 'Versace Pour Homme',
  'versace pour homme': 'Versace Pour Homme',

  // ===== JEAN PAUL GAULTIER =====
  'le male': 'Jean Paul Gaultier Le Male',
  'jpg le male': 'Jean Paul Gaultier Le Male',
  'ultra male': 'Jean Paul Gaultier Ultra Male',
  'jpg ultra male': 'Jean Paul Gaultier Ultra Male',
  'scandal': 'Jean Paul Gaultier Scandal',
  'jpg scandal': 'Jean Paul Gaultier Scandal',

  // ===== GIORGIO ARMANI =====
  'acqua di gio': 'Giorgio Armani Acqua di Gio',
  'adg': 'Giorgio Armani Acqua di Gio',
  'gio': 'Giorgio Armani Acqua di Gio',
  'acqua': 'Giorgio Armani Acqua di Gio',

  'code': 'Giorgio Armani Code',
  'armani code': 'Giorgio Armani Code',

  'stronger with you': 'Giorgio Armani Stronger with You',
  'swy': 'Giorgio Armani Stronger with You',
  'armani stronger': 'Giorgio Armani Stronger with You',

  // ===== CALVIN KLEIN =====
  'ck one': 'Calvin Klein CK One',
  'ck 1': 'Calvin Klein CK One',
  'calvin klein one': 'Calvin Klein CK One',

  'eternity': 'Calvin Klein Eternity',
  'ck eternity': 'Calvin Klein Eternity',

  'obsession': 'Calvin Klein Obsession',
  'ck obsession': 'Calvin Klein Obsession',

  // ===== COMMON CONCENTRATION ABBREVIATIONS =====
  'edp': 'Eau de Parfum',
  'edt': 'Eau de Toilette',
  'edc': 'Eau de Cologne',
  'parfum': 'Parfum',
  'cologne': 'Eau de Cologne',
  'toilette': 'Eau de Toilette'
};

// ===== FUZZY MATCHING FOR TYPOS =====
const COMMON_TYPOS = {
  // Spelling variations
  'sagave': 'sauvage',
  'savage': 'sauvage',
  'savange': 'sauvage',
  'suvage': 'sauvage',

  'aventis': 'aventus',
  'aventous': 'aventus',
  'avantus': 'aventus',

  'chanel': 'chanel',
  'chanell': 'chanel',
  'channel': 'chanel',

  'dior': 'dior',
  'deor': 'dior',
  'doir': 'dior',

  'versace': 'versace',
  'versachi': 'versace',
  'versase': 'versace',

  // Common misspellings
  'farenheit': 'fahrenheit',
  'farenheight': 'fahrenheit',
  'farenhiet': 'fahrenheit',

  'invictis': 'invictus',
  'invictous': 'invictus',

  'aqua': 'acqua',
  'akqua': 'acqua'
};

// ===== INTELLIGENT SEARCH FUNCTIONS =====

// Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Normalize search term
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

// Generate typo corrections
function generateTypoCorrections(term: string): string[] {
  const corrections: string[] = [];
  const normalizedTerm = normalizeSearchTerm(term);

  // Check direct typo mappings
  if (COMMON_TYPOS[normalizedTerm]) {
    corrections.push(COMMON_TYPOS[normalizedTerm]);
  }

  // Check for fuzzy matches against known brands and fragrances
  const allKnownTerms = [
    ...Object.keys(BRAND_ABBREVIATIONS),
    ...Object.values(BRAND_ABBREVIATIONS),
    ...Object.keys(FRAGRANCE_NICKNAMES),
    ...Object.values(FRAGRANCE_NICKNAMES)
  ];

  for (const knownTerm of allKnownTerms) {
    const distance = levenshteinDistance(normalizedTerm, normalizeSearchTerm(knownTerm));
    const similarity = 1 - (distance / Math.max(normalizedTerm.length, knownTerm.length));

    // If similarity is high enough (80%+), suggest as correction
    if (similarity >= 0.8 && distance <= 2 && distance > 0) {
      corrections.push(knownTerm);
    }
  }

  return [...new Set(corrections)]; // Remove duplicates
}

// Expand brand abbreviations
function expandBrandAbbreviations(term: string): string[] {
  const expansions: string[] = [];
  const normalizedTerm = normalizeSearchTerm(term);

  // Direct brand mapping
  if (BRAND_ABBREVIATIONS[normalizedTerm]) {
    expansions.push(BRAND_ABBREVIATIONS[normalizedTerm]);
  }

  // Check if term contains a brand abbreviation
  for (const [abbrev, fullName] of Object.entries(BRAND_ABBREVIATIONS)) {
    if (normalizedTerm.includes(abbrev) || abbrev.includes(normalizedTerm)) {
      expansions.push(fullName);
      expansions.push(abbrev);
    }
  }

  return [...new Set(expansions)];
}

// Expand fragrance nicknames
function expandFragranceNicknames(term: string): string[] {
  const expansions: string[] = [];
  const normalizedTerm = normalizeSearchTerm(term);

  // Direct nickname mapping
  if (FRAGRANCE_NICKNAMES[normalizedTerm]) {
    expansions.push(FRAGRANCE_NICKNAMES[normalizedTerm]);
  }

  // Check partial matches
  for (const [nickname, fullName] of Object.entries(FRAGRANCE_NICKNAMES)) {
    if (normalizedTerm.includes(nickname) || nickname.includes(normalizedTerm)) {
      expansions.push(fullName);
      expansions.push(nickname);
    }
  }

  return [...new Set(expansions)];
}

// Generate comprehensive search variations
export function generateSearchVariations(searchTerm: string, allBrands: string[] = []): SearchStrategy {
  const normalized = normalizeSearchTerm(searchTerm);

  const strategy: SearchStrategy = {
    exact: [searchTerm.toLowerCase().trim(), normalized],
    brand: [],
    nickname: [],
    fuzzy: [],
    notes: []
  };

  // Expand brand abbreviations
  strategy.brand = expandBrandAbbreviations(normalized);

  // Expand fragrance nicknames
  strategy.nickname = expandFragranceNicknames(normalized);

  // Generate typo corrections
  strategy.fuzzy = generateTypoCorrections(normalized);

  // Add cross-references between brands and nicknames
  strategy.brand.forEach(brand => {
    strategy.nickname.push(...expandFragranceNicknames(`${brand} ${normalized}`));
  });

  // Remove duplicates and filter empty values
  Object.keys(strategy).forEach(key => {
    strategy[key as keyof SearchStrategy] = [...new Set(strategy[key as keyof SearchStrategy])].filter(v => v.length > 0);
  });

  return strategy;
}

// Build optimized search query for database
export function buildSmartSearchQuery(searchTerm: string, allBrands: string[] = []): {
  OR: Array<{ name: { contains: string; mode: 'insensitive' } } | { brand: { contains: string; mode: 'insensitive' } }>
} {
  const strategy = generateSearchVariations(searchTerm, allBrands);
  const searchConditions: Array<{ name: { contains: string; mode: 'insensitive' } } | { brand: { contains: string; mode: 'insensitive' } }> = [];

  // Priority order: exact > nickname > brand > fuzzy
  const allVariations = [
    ...strategy.exact,
    ...strategy.nickname,
    ...strategy.brand,
    ...strategy.fuzzy
  ];

  // Limit to top 10 variations for performance
  const limitedVariations = [...new Set(allVariations)].slice(0, 10);

  // Create search conditions for name and brand
  limitedVariations.forEach(variation => {
    searchConditions.push({ name: { contains: variation, mode: 'insensitive' as const } });
    searchConditions.push({ brand: { contains: variation, mode: 'insensitive' as const } });
  });

  return { OR: searchConditions };
}

// Calculate search result confidence score
export function calculateSearchConfidence(
  searchTerm: string,
  fragranceName: string,
  fragranceBrand: string
): number {
  const normalized = normalizeSearchTerm(searchTerm);
  const normName = normalizeSearchTerm(fragranceName);
  const normBrand = normalizeSearchTerm(fragranceBrand);

  let confidence = 0;

  // Exact match gets highest score
  if (normName === normalized || normBrand === normalized) {
    confidence = 100;
  }
  // Nickname match gets high score
  else if (FRAGRANCE_NICKNAMES[normalized] &&
           normName.includes(normalizeSearchTerm(FRAGRANCE_NICKNAMES[normalized]))) {
    confidence = 95;
  }
  // Brand abbreviation match
  else if (BRAND_ABBREVIATIONS[normalized] &&
           normBrand.includes(normalizeSearchTerm(BRAND_ABBREVIATIONS[normalized]))) {
    confidence = 90;
  }
  // Partial match
  else if (normName.includes(normalized) || normBrand.includes(normalized)) {
    confidence = 80;
  }
  // Fuzzy match
  else {
    const nameDistance = levenshteinDistance(normalized, normName);
    const brandDistance = levenshteinDistance(normalized, normBrand);
    const bestDistance = Math.min(nameDistance, brandDistance);
    const similarity = 1 - (bestDistance / Math.max(normalized.length, Math.max(normName.length, normBrand.length)));
    confidence = Math.round(similarity * 70); // Max 70 for fuzzy matches
  }

  return Math.min(confidence, 100);
}

// Test function for development
export function testSearchIntelligence() {
  const testCases = [
    "chanel blue",
    "ysl",
    "tf",
    "sauvage",
    "savage", // typo
    "aventus",
    "one million",
    "adg",
    "jpg le male",
    "ck one",
    "la nuit",
    "ff", // fucking fabulous
    "bleu de chanel",
    "dior blue", // confusion
    "git" // green irish tweed
  ];

  console.log('🧪 Testing Smart Search Intelligence:');
  console.log('=====================================');

  testCases.forEach(term => {
    const strategy = generateSearchVariations(term);
    console.log(`\n"${term}":`);
    console.log(`  📍 Exact: [${strategy.exact.join(', ')}]`);
    console.log(`  🏢 Brand: [${strategy.brand.join(', ')}]`);
    console.log(`  🎯 Nickname: [${strategy.nickname.join(', ')}]`);
    console.log(`  🔀 Fuzzy: [${strategy.fuzzy.join(', ')}]`);
  });
}
