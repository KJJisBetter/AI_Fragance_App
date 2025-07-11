/**
 * Identify Hot Cache Candidates
 *
 * This script identifies which fragrances should remain in the database (hot cache)
 * based on market intelligence, popularity, and engagement metrics.
 */

import { prisma } from '@fragrance-battle/database';
import { log } from '../utils/logger';

interface HotCacheCandidate {
  id: string;
  name: string;
  brand: string;
  year?: number;
  concentration?: string;
  engagementScore: number;
  isPopularBrand: boolean;
  isPopularFragrance: boolean;
  hasCleanNaming: boolean;
  _count: {
    battleItems: number;
    reviews: number;
    userCollections: number;
  };
}

// Market Intelligence: 2025 Brand Priorities
const HOT_CACHE_BRANDS = {
  // Tier 1 - Most searched brands (should always be fast)
  tier1: [
    'Dior', 'Chanel', 'Tom Ford', 'Creed', 'Armani', 'Giorgio Armani',
    'Versace', 'YSL', 'Yves Saint Laurent', 'Hermès', 'Gucci'
  ],

  // Viral/Trending - people search these constantly
  trending: [
    'Jean Paul Gaultier', 'Azzaro', 'Prada', 'Valentino', 'Viktor & Rolf',
    'Viktor and Rolf', 'Parfums de Marly', 'Diptyque', 'Maison Francis Kurkdjian',
    'MFK', 'Le Labo', 'Byredo'
  ],

  // Celebrity/Popular - Gen Z searches these all the time
  celebrity: [
    'Ariana Grande', 'Billie Eilish', 'Bella Hadid', 'Sabrina Carpenter',
    'Rihanna', 'Fenty'
  ],

  // Clone/Budget - high search volume from budget users
  clones: [
    'Lattafa', 'Armaf', 'Dossier', 'ALT Fragrances', 'ALT', 'Zara',
    'Alexandria', 'DUA'
  ]
};

// Popular individual fragrances that get searched constantly
const HOT_CACHE_FRAGRANCES = [
  'sauvage', 'aventus', 'libre', 'flowerbomb', 'le male', 'ultra male',
  'baccarat rouge', 'br540', 'br 540', 'delina', 'cloud', 'santal 33',
  'another 13', 'khamrah', 'club de nuit', 'most wanted', 'acqua di gio',
  'bright crystal', 'dylan blue', 'dylan purple', 'eros', 'y edp',
  'la vie est belle', 'black opium', 'good girl', 'si', 'coco mademoiselle',
  'miss dior', 'jadore', "j'adore", 'paradoxe', 'candy', 'born in roma'
];

export async function identifyHotCacheCandidates() {
  log.info('🔥 Identifying Hot Cache candidates (popular searches)...');

  // Combine all brand lists for searching
  const allHotCacheBrands = [
    ...HOT_CACHE_BRANDS.tier1,
    ...HOT_CACHE_BRANDS.trending,
    ...HOT_CACHE_BRANDS.celebrity,
    ...HOT_CACHE_BRANDS.clones
  ];

  // Find candidates for hot cache (database)
  const hotCacheCandidates = await prisma.fragrance.findMany({
    where: {
      AND: [
        // Basic quality criteria
        { name: { not: { equals: '' } } },
        { brand: { not: { equals: '' } } },
        { name: { not: { contains: '  ' } } }, // No double spaces

        // POPULAR criteria (new focus)
        {
          OR: [
            // Popular brand (case insensitive)
            {
              OR: allHotCacheBrands.map(brand => ({
                brand: { contains: brand, mode: 'insensitive' as const }
              }))
            },

            // Popular fragrance name
            {
              OR: HOT_CACHE_FRAGRANCES.map(frag => ({
                name: { contains: frag, mode: 'insensitive' as const }
              }))
            },

            // High engagement (proves popularity)
            {
              OR: [
                // Has battle participation
                { battleItems: { some: {} } },
                // Has reviews
                { reviews: { some: {} } },
                // In user collections
                { userCollections: { some: {} } }
              ]
            },

            // High scores
            { communityRating: { gte: 4.0 } },
            { popularityScore: { gt: 0 } },
            { verified: true }
          ]
        }
      ]
    },
    include: {
      _count: {
        select: {
          battleItems: true,
          reviews: true,
          userCollections: true
        }
      }
    }
  });

  log.info(`📊 Found ${hotCacheCandidates.length} initial hot cache candidates`);

  // Further filter for truly hot cache worthy
  const realHotCache = hotCacheCandidates.filter((fragrance): fragrance is HotCacheCandidate => {
    // Check for clean naming
    const nameContainsBrand = fragrance.name
      .toLowerCase()
      .includes(fragrance.brand.toLowerCase());

    const hasRedundantYear = /\b(19|20)\d{2}\b/.test(fragrance.name);
    const hasRedundantConcentration = /\b(EDT|EDP|Parfum|Cologne)\b/i.test(fragrance.name);

    const wordCount = fragrance.name.split(' ').length;

    // Calculate engagement score
    const engagementScore =
      fragrance._count.battleItems +
      fragrance._count.reviews +
      fragrance._count.userCollections;

    // Check if it's a popular brand
    const isPopularBrand = allHotCacheBrands.some(brand =>
      fragrance.brand.toLowerCase().includes(brand.toLowerCase()) ||
      brand.toLowerCase().includes(fragrance.brand.toLowerCase())
    );

    // Check if it's a popular fragrance
    const isPopularFragrance = HOT_CACHE_FRAGRANCES.some(frag =>
      fragrance.name.toLowerCase().includes(frag.toLowerCase())
    );

    // Clean naming check
    const hasCleanNaming = !nameContainsBrand &&
                          !hasRedundantYear &&
                          !hasRedundantConcentration &&
                          wordCount <= 6 &&
                          wordCount >= 1 &&
                          fragrance.name.length >= 3;

    // Must meet at least one popularity criteria
    const meetsPopularityCriteria = isPopularBrand ||
                                   isPopularFragrance ||
                                   engagementScore > 0 ||
                                   (fragrance.communityRating && fragrance.communityRating >= 4.0) ||
                                   fragrance.verified;

    // For popular items, we're more lenient with naming
    if ((isPopularBrand || isPopularFragrance) && engagementScore > 0) {
      return true; // Keep even with imperfect naming if truly popular
    }

    // For others, require both clean naming and popularity
    return hasCleanNaming && meetsPopularityCriteria;
  });

  // Calculate statistics
  const stats = {
    tier1Brands: realHotCache.filter(f =>
      HOT_CACHE_BRANDS.tier1.some(b =>
        f.brand.toLowerCase().includes(b.toLowerCase())
      )
    ).length,

    trendingBrands: realHotCache.filter(f =>
      HOT_CACHE_BRANDS.trending.some(b =>
        f.brand.toLowerCase().includes(b.toLowerCase())
      )
    ).length,

    celebrityBrands: realHotCache.filter(f =>
      HOT_CACHE_BRANDS.celebrity.some(b =>
        f.brand.toLowerCase().includes(b.toLowerCase())
      )
    ).length,

    cloneBrands: realHotCache.filter(f =>
      HOT_CACHE_BRANDS.clones.some(b =>
        f.brand.toLowerCase().includes(b.toLowerCase())
      )
    ).length,

    withEngagement: realHotCache.filter(f =>
      (f._count.battleItems + f._count.reviews + f._count.userCollections) > 0
    ).length,

    verified: realHotCache.filter(f => f.verified).length,

    highRated: realHotCache.filter(f =>
      f.communityRating && f.communityRating >= 4.0
    ).length
  };

  const totalCount = await prisma.fragrance.count();

  log.info(`📊 Hot Cache Analysis:`);
  log.info(`- Initial DB size: ${totalCount.toLocaleString()}`);
  log.info(`- Hot cache candidates: ${hotCacheCandidates.length.toLocaleString()}`);
  log.info(`- Final hot cache: ${realHotCache.length.toLocaleString()}`);
  log.info(`- To be purged: ${(totalCount - realHotCache.length).toLocaleString()}`);
  log.info(`\n📈 Market Coverage:`);
  log.info(`- Tier 1 (Luxury): ${stats.tier1Brands} fragrances`);
  log.info(`- Trending: ${stats.trendingBrands} fragrances`);
  log.info(`- Celebrity: ${stats.celebrityBrands} fragrances`);
  log.info(`- Clone/Budget: ${stats.cloneBrands} fragrances`);
  log.info(`\n💎 Quality Metrics:`);
  log.info(`- With engagement: ${stats.withEngagement} fragrances`);
  log.info(`- Verified: ${stats.verified} fragrances`);
  log.info(`- High rated (4.0+): ${stats.highRated} fragrances`);

  // Update market priority scores
  log.info(`\n🎯 Updating market priority scores...`);

  for (const fragrance of realHotCache) {
    let marketPriority = 0.5; // Default

    // Assign market priority based on brand tier
    if (HOT_CACHE_BRANDS.tier1.some(b =>
      fragrance.brand.toLowerCase().includes(b.toLowerCase())
    )) {
      marketPriority = 1.0;
    } else if (HOT_CACHE_BRANDS.trending.some(b =>
      fragrance.brand.toLowerCase().includes(b.toLowerCase())
    )) {
      marketPriority = 0.9;
    } else if (HOT_CACHE_BRANDS.celebrity.some(b =>
      fragrance.brand.toLowerCase().includes(b.toLowerCase())
    )) {
      marketPriority = 0.8;
    } else if (HOT_CACHE_BRANDS.clones.some(b =>
      fragrance.brand.toLowerCase().includes(b.toLowerCase())
    )) {
      marketPriority = 0.7;
    }

    // Determine if trending
    const isTrending = HOT_CACHE_BRANDS.trending.some(b =>
      fragrance.brand.toLowerCase().includes(b.toLowerCase())
    ) || HOT_CACHE_FRAGRANCES.some(f =>
      fragrance.name.toLowerCase().includes(f.toLowerCase())
    );

    // Determine target demographic
    let targetDemographic = 'mainstream';
    if (HOT_CACHE_BRANDS.celebrity.some(b =>
      fragrance.brand.toLowerCase().includes(b.toLowerCase())
    )) {
      targetDemographic = 'gen_z';
    } else if (HOT_CACHE_BRANDS.clones.some(b =>
      fragrance.brand.toLowerCase().includes(b.toLowerCase())
    )) {
      targetDemographic = 'budget_conscious';
    } else if (['Parfums de Marly', 'Diptyque', 'Le Labo', 'MFK', 'Byredo'].some(b =>
      fragrance.brand.toLowerCase().includes(b.toLowerCase())
    )) {
      targetDemographic = 'niche_enthusiast';
    }

    await prisma.fragrance.update({
      where: { id: fragrance.id },
      data: {
        marketPriority,
        trending: isTrending,
        targetDemographic,
        dataSource: 'hot_cache_identified'
      }
    });
  }

  log.info(`✅ Market priority scores updated for ${realHotCache.length} fragrances`);

  return realHotCache.map(f => f.id);
}

// Run if called directly
if (require.main === module) {
  identifyHotCacheCandidates()
    .then(keeperIds => {
      log.info(`\n✅ Identified ${keeperIds.length} fragrances for hot cache`);
      process.exit(0);
    })
    .catch(error => {
      log.error('❌ Failed to identify hot cache candidates:', error);
      process.exit(1);
    });
}
