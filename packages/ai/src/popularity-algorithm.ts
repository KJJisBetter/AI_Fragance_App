import { Fragrance } from '@fragrance-battle/types';

// True Popularity Algorithm - What People Actually Want & Buy
// This measures mainstream recognition, not enthusiast preferences

// ===== MAINSTREAM RECOGNITION (30%) =====
// How well-known is this fragrance to regular people?

const MAINSTREAM_BRAND_SCORES: Record<string, number> = {
  // Mass market powerhouses - everyone knows these
  'Calvin Klein': 30,
  'Giorgio Armani': 28,
  'Versace': 27,
  'Paco Rabanne': 26,
  'Hugo Boss': 25,
  'Dolce & Gabbana': 25,
  'Ralph Lauren': 24,
  'Tommy Hilfiger': 23,
  'Burberry': 22,
  'Lacoste': 21,

  // Premium but still mainstream
  'Dior': 28,
  'Chanel': 26,
  'Yves Saint Laurent': 24,
  'Givenchy': 22,
  'Hermès': 20,

  // Celebrity/accessible brands
  'Ariana Grande': 25,
  'Rihanna': 24,
  'Britney Spears': 20,
  'Jennifer Lopez': 19,
  'Sean John': 18,

  // Designer but less mainstream
  'Tom Ford': 15,
  'Marc Jacobs': 18,
  'Viktor & Rolf': 16,
  'Jean Paul Gaultier': 17,

  // Mass market accessible
  'Bath & Body Works': 28,
  'Victoria\'s Secret': 27,
  'Axe': 26,
  'Old Spice': 25,
  'Zara': 22,
  'H&M': 20,

  // Niche/enthusiast (low mainstream recognition)
  'Creed': 8,
  'Tom Ford Private Blend': 5,
  'Le Labo': 7,
  'Byredo': 10,
  'Maison Margiela': 8,
  'Diptyque': 6,
  'Amouage': 4,
  'Roja Parfums': 3,
  'Clive Christian': 2,

  // Unknown brands
  'Unknown': 1
};

// ===== PRICE ACCESSIBILITY SCORES (Part of Sales Indicators 20%) =====
const getPriceAccessibilityScore = (brand: string): number => {
  // Quick popularity boost based on price accessibility
  // This is a simplified version - in production you'd have actual price data
  const estimatedPriceRanges: Record<string, number> = {
    // Drugstore accessible (under $30)
    'Axe': 30,
    'Old Spice': 30,
    'Bath & Body Works': 28,
    'Body Fantasies': 30,
    'Adidas': 25,
    'Walmart brands': 30,

    // Department store accessible (under $50-100)
    'Calvin Klein': 25,
    'Tommy Hilfiger': 25,
    'Ralph Lauren': 23,
    'Burberry': 20,
    'Hugo Boss': 22,
    'Lacoste': 24,
    'Zara': 26,
    'H&M': 28,

    // Designer accessible (under $150)
    'Giorgio Armani': 20,
    'Versace': 18,
    'Dolce & Gabbana': 18,
    'Paco Rabanne': 20,
    'Yves Saint Laurent': 15,
    'Dior': 15,
    'Chanel': 12,

    // Premium (under $200)
    'Tom Ford': 10,
    'Hermès': 8,
    'Givenchy': 12,

    // Luxury penalty for popularity (over $200)
    'Creed': -5,
    'Roja Parfums': -10,
    'Clive Christian': -15,
    'Henry Jacques': -15,
    'Amouage': -5
  };

  return estimatedPriceRanges[brand] || 15; // Default mid-range score
};

// ===== CULTURAL IMPACT & MEME STATUS (10%) =====
const getCulturalImpactScore = (fragrance: Pick<Fragrance, 'name' | 'brand'>): number => {
  const { name, brand } = fragrance;
  const fullName = `${name} ${brand}`.toLowerCase();

  // Famous fragrances that have cultural recognition/meme status
  const culturalIcons: Record<string, number> = {
    // Meme status and viral recognition
    'sauvage dior': 25,           // "Sauvage guy" memes, TikTok famous
    'eros versace': 23,           // Club fragrance, TikTok popular
    'one million paco rabanne': 22, // Distinctive bottle, party fragrance
    'invictus paco rabanne': 20,  // Sports/gym fragrance stereotype
    'bad boy carolina herrera': 18, // Edgy branding appeal
    'the one dolce': 17,          // Wedding fragrance reputation
    'code giorgio armani': 16,    // Nightlife association

    // Classic mainstream recognition
    'ck one calvin klein': 25,    // 90s nostalgia, unisex pioneer
    'polo ralph lauren': 22,      // Preppy stereotype, widely known
    'cool water davidoff': 20,    // 90s dad fragrance meme
    'acqua di gio giorgio armani': 24, // All-time bestseller recognition
    'obsession calvin klein': 18, // 80s/90s classic recognition

    // Celebrity/accessible cultural presence
    'cloud ariana grande': 22,    // TikTok/Gen Z favorite
    'thank u next ariana grande': 20,
    'fenty rihanna': 18,
    'curious britney spears': 15,

    // Office/professional stereotype
    'bleu de chanel chanel': 15,  // Professional choice reputation
    'boss bottled hugo boss': 14, // Office appropriate stereotype
    'fahrenheit dior': 16,        // Distinctive/polarizing reputation

    // Luxury but not mainstream memes
    'aventus creed': 8,           // Known in fragrance community only
    'tobacco vanille tom ford': 6, // Niche recognition
    'jazz club maison margiela': 4,
    'black tea tom ford': 3
  };

  // Check for exact matches first
  for (const [fragrance_key, score] of Object.entries(culturalIcons)) {
    if (fullName.includes(fragrance_key)) {
      return score;
    }
  }

  // Brand-level cultural presence fallback
  const brandCultural: Record<string, number> = {
    'Calvin Klein': 8,
    'Giorgio Armani': 7,
    'Dior': 6,
    'Versace': 8,
    'Paco Rabanne': 7,
    'Ariana Grande': 10,
    'Rihanna': 8,
    'Creed': 2,
    'Tom Ford': 3
  };

  return brandCultural[brand] || 2;
};

// ===== TRENDING FACTORS (25%) =====
const getTrendingScore = (fragrance: Pick<Fragrance, 'year' | 'name' | 'brand'>): number => {
  let score = 0;
  const currentYear = new Date().getFullYear();
  const age = fragrance.year ? currentYear - fragrance.year : 50;

  // Recency boost (newer = more trending)
  if (age <= 1) score += 25;        // Last year - peak trending
  else if (age <= 3) score += 20;   // Recent releases
  else if (age <= 5) score += 15;   // Still current
  else if (age <= 10) score += 10;  // Modern classics
  else if (age <= 20) score += 5;   // Older but still relevant
  else score += 2;                  // Vintage/classic status

  // Social media friendly names/brands get trend boost
  const trendyKeywords = ['cloud', 'bad boy', 'wanted', 'stronger', 'invictus', 'eros', 'icon'];
  const nameKeywords = fragrance.name.toLowerCase();

  for (const keyword of trendyKeywords) {
    if (nameKeywords.includes(keyword)) {
      score += 5;
      break;
    }
  }

  // TikTok/social media popular brands
  const socialMediaBrands = ['Ariana Grande', 'Rihanna', 'Versace', 'Paco Rabanne'];
  if (socialMediaBrands.includes(fragrance.brand)) {
    score += 8;
  }

  return Math.min(25, score);
};

// ===== USER BEHAVIOR PATTERNS (15%) =====
const getUserBehaviorScore = (fragrance: Pick<Fragrance, 'communityRating' | 'verified' | 'brand'>): number => {
  let score = 0;

  // High community engagement = more people have tried it
  if (fragrance.communityRating && fragrance.communityRating > 0) {
    score += 8; // People are rating it = popular enough to try

    // Moderate ratings often indicate mainstream appeal (not just enthusiast favorites)
    if (fragrance.communityRating >= 3.0 && fragrance.communityRating <= 4.2) {
      score += 4; // Sweet spot for mainstream appeal
    }
  }

  // Verified status indicates it's popular enough to be in database
  if (fragrance.verified) {
    score += 3;
  }

  return Math.min(15, score);
};

// ===== MAIN POPULARITY CALCULATION =====
export const calculatePopularityScore = (
  fragrance: Pick<Fragrance, 'name' | 'brand' | 'year' | 'communityRating' | 'verified'>
): number => {
  // Mainstream Recognition (30%)
  const mainstreamScore = MAINSTREAM_BRAND_SCORES[fragrance.brand] || 5;

  // Current Trends & Buzz (25%)
  const trendingScore = getTrendingScore(fragrance);

  // Sales Volume Indicators (20%)
  const salesScore = getPriceAccessibilityScore(fragrance.brand);

  // User Behavior Patterns (15%)
  const behaviorScore = getUserBehaviorScore(fragrance);

  // Cultural Impact (10%)
  const culturalScore = getCulturalImpactScore(fragrance);

  // Weighted total
  const totalScore = (mainstreamScore * 0.30) +
                    (trendingScore * 0.25) +
                    (salesScore * 0.20) +
                    (behaviorScore * 0.15) +
                    (culturalScore * 0.10);

  return Math.round(totalScore * 100) / 100;
};

// ===== BATCH CALCULATION =====
export const calculatePopularityScoresBatch = (
  fragrances: Pick<Fragrance, 'id' | 'name' | 'brand' | 'year' | 'communityRating' | 'verified'>[]
): Array<{ id: string; popularityScore: number; breakdown: any }> => {
  return fragrances.map(fragrance => {
    const mainstreamScore = MAINSTREAM_BRAND_SCORES[fragrance.brand] || 5;
    const trendingScore = getTrendingScore(fragrance);
    const salesScore = getPriceAccessibilityScore(fragrance.brand);
    const behaviorScore = getUserBehaviorScore(fragrance);
    const culturalScore = getCulturalImpactScore(fragrance);

    const totalScore = (mainstreamScore * 0.30) +
                      (trendingScore * 0.25) +
                      (salesScore * 0.20) +
                      (behaviorScore * 0.15) +
                      (culturalScore * 0.10);

    return {
      id: fragrance.id,
      popularityScore: Math.round(totalScore * 100) / 100,
      breakdown: {
        mainstream: mainstreamScore,
        trending: trendingScore,
        sales: salesScore,
        behavior: behaviorScore,
        cultural: culturalScore,
        total: totalScore
      }
    };
  });
};

// ===== ANALYSIS UTILITY =====
export const analyzePopularityBreakdown = (
  fragrance: Pick<Fragrance, 'name' | 'brand' | 'year' | 'communityRating' | 'verified'>
) => {
  const mainstreamScore = MAINSTREAM_BRAND_SCORES[fragrance.brand] || 5;
  const trendingScore = getTrendingScore(fragrance);
  const salesScore = getPriceAccessibilityScore(fragrance.brand);
  const behaviorScore = getUserBehaviorScore(fragrance);
  const culturalScore = getCulturalImpactScore(fragrance);

  const totalScore = (mainstreamScore * 0.30) +
                    (trendingScore * 0.25) +
                    (salesScore * 0.20) +
                    (behaviorScore * 0.15) +
                    (culturalScore * 0.10);

  return {
    fragrance: {
      name: fragrance.name,
      brand: fragrance.brand
    },
    scores: {
      mainstream: {
        score: mainstreamScore,
        weight: '30%',
        description: 'Brand recognition among regular consumers'
      },
      trending: {
        score: trendingScore,
        weight: '25%',
        description: 'Current buzz and social media presence'
      },
      sales: {
        score: salesScore,
        weight: '20%',
        description: 'Price accessibility and retail availability'
      },
      behavior: {
        score: behaviorScore,
        weight: '15%',
        description: 'User engagement and trial rates'
      },
      cultural: {
        score: culturalScore,
        weight: '10%',
        description: 'Meme status and cultural recognition'
      }
    },
    total: {
      score: Math.round(totalScore * 100) / 100,
      interpretation: totalScore >= 80 ? 'Mainstream Hit' :
                     totalScore >= 60 ? 'Popular Choice' :
                     totalScore >= 40 ? 'Niche Appeal' :
                     'Enthusiast Only'
    }
  };
};

export {
  MAINSTREAM_BRAND_SCORES,
  getPriceAccessibilityScore,
  getCulturalImpactScore,
  getTrendingScore,
  getUserBehaviorScore
};
