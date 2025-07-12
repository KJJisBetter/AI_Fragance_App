import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Common concentration patterns in fragrance names
const concentrationPatterns = {
  // Exact matches (case insensitive)
  'eau de parfum': 'edp',
  'eau de toilette': 'edt',
  'eau de cologne': 'edc',
  'parfum': 'parfum',
  'extrait de parfum': 'parfum',
  'extrait': 'parfum',
  'cologne': 'cologne',
  'perfume': 'parfum',

  // Abbreviations
  'edp': 'edp',
  'edt': 'edt',
  'edc': 'edc',

  // Body care products
  'body spray': 'body_spray',
  'body mist': 'body_mist',
  'hair mist': 'hair_mist',
  'fragrance mist': 'fragrance_mist',
  'solid perfume': 'solid_perfume',
  'perfume oil': 'perfume_oil',

  // Aftershave
  'after shave': 'aftershave',
  'aftershave': 'aftershave',
  'après-rasage': 'aftershave',
  'après rasage': 'aftershave',
};

// Brand-specific concentration defaults based on market research
const brandDefaults = {
  // Luxury brands typically release EDP first
  'chanel': 'edp',
  'dior': 'edp',
  'tom-ford': 'edp',
  'creed': 'edp',
  'guerlain': 'edp',
  'hermès': 'edp',
  'yves-saint-laurent': 'edp',
  'givenchy': 'edp',
  'giorgio-armani': 'edp',

  // Designer brands often have EDT as main concentration
  'calvin-klein': 'edt',
  'hugo-boss': 'edt',
  'versace': 'edt',
  'dolce-gabbana': 'edt',
  'prada': 'edt',
  'burberry': 'edt',

  // Niche brands typically focus on EDP/Parfum
  'amouage': 'edp',
  'montale': 'edp',
  'mancera': 'edp',
  'xerjoff': 'edp',
  'parfums-de-marly': 'edp',
  'maison-francis-kurkdjian': 'edp',
  'byredo': 'edp',

  // Arabian/Middle Eastern brands often do EDP/Parfum
  'lattafa-perfumes': 'edp',
  'al-haramain': 'edp',
  'afnan': 'edp',
  'armaf': 'edp',
  'rasasi': 'edp',
  'swiss-arabian': 'edp',

  // Celebrity/Mass market brands typically EDT
  'ariana-grande': 'edt',
  'britney-spears': 'edt',
  'jennifer-lopez': 'edt',
  'kim-kardashian': 'edt',
  'rihanna': 'edt',

  // Body care brands
  'bath-body-works': 'fragrance_mist',
  'victoria-secret': 'fragrance_mist',
  'the-body-shop': 'edt',
};

// Year-based concentration trends
const getConcentrationByYear = (year: number | null): string => {
  if (!year) return 'edp'; // Default for unknown years

  if (year >= 2010) return 'edp'; // Modern trend towards stronger concentrations
  if (year >= 1990) return 'edt'; // 90s-2000s were EDT dominant
  if (year >= 1970) return 'edt'; // Classic EDT era
  return 'cologne'; // Very old fragrances were often cologne
};

export async function inferConcentrations(): Promise<void> {
  console.log('🔍 Starting intelligent concentration inference...');

  // Step 1: Get current stats
  const beforeStats = await getConcentrationStats();
  console.log('\n📊 Before inference:');
  console.log(`   Total fragrances: ${beforeStats.total}`);
  console.log(`   With concentration: ${beforeStats.withConcentration} (${beforeStats.percentage}%)`);

  // Step 2: Get fragrances without concentration
  const fragrancesWithoutConcentration = await prisma.fragrance.findMany({
    where: {
      OR: [
        { concentration: null },
        { concentration: '' },
        { concentration: 'Concentration' }
      ]
    },
    select: {
      id: true,
      name: true,
      brand: true,
      year: true
    }
  });

  console.log(`\n🔍 Found ${fragrancesWithoutConcentration.length} fragrances without concentration data`);

  // Step 3: Infer concentrations using multiple strategies
  let inferred = 0;
  let namePatterns = 0;
  let brandDefaults = 0;
  let yearBased = 0;

  for (const fragrance of fragrancesWithoutConcentration) {
    let inferredConcentration: string | null = null;
    let inferenceMethod = '';

    // Strategy 1: Look for concentration patterns in name
    const nameLower = fragrance.name.toLowerCase();
    for (const [pattern, concentration] of Object.entries(concentrationPatterns)) {
      if (nameLower.includes(pattern)) {
        inferredConcentration = concentration;
        inferenceMethod = 'name_pattern';
        namePatterns++;
        break;
      }
    }

    // Strategy 2: Use brand-specific defaults
    if (!inferredConcentration) {
      const brandKey = fragrance.brand.toLowerCase().replace(/\s+/g, '-');
      if (brandDefaults[brandKey]) {
        inferredConcentration = brandDefaults[brandKey];
        inferenceMethod = 'brand_default';
        brandDefaults++;
      }
    }

    // Strategy 3: Use year-based inference
    if (!inferredConcentration) {
      inferredConcentration = getConcentrationByYear(fragrance.year);
      inferenceMethod = 'year_based';
      yearBased++;
    }

    // Update the fragrance with inferred concentration
    if (inferredConcentration) {
      await prisma.fragrance.update({
        where: { id: fragrance.id },
        data: { concentration: inferredConcentration }
      });

      inferred++;

      if (inferred % 1000 === 0) {
        console.log(`   📈 Inferred ${inferred} concentrations...`);
      }
    }
  }

  console.log(`\n✅ Inference complete!`);
  console.log(`   📊 Total inferred: ${inferred}`);
  console.log(`   🏷️  From name patterns: ${namePatterns}`);
  console.log(`   🏢 From brand defaults: ${brandDefaults}`);
  console.log(`   📅 From year trends: ${yearBased}`);

  // Step 4: Get final stats
  const afterStats = await getConcentrationStats();
  console.log('\n📊 After inference:');
  console.log(`   Total fragrances: ${afterStats.total}`);
  console.log(`   With concentration: ${afterStats.withConcentration} (${afterStats.percentage}%)`);
  console.log(`   Improvement: +${afterStats.withConcentration - beforeStats.withConcentration} concentrations`);

  // Step 5: Show final breakdown
  console.log('\n📋 Final concentration breakdown:');
  const finalBreakdown = await prisma.fragrance.groupBy({
    by: ['concentration'],
    where: { concentration: { not: null } },
    _count: { concentration: true },
    orderBy: { _count: { concentration: 'desc' } }
  });

  finalBreakdown.forEach(item => {
    console.log(`   ${item.concentration}: ${item._count.concentration}`);
  });

  console.log(`\n✅ Concentration inference completed!`);
  console.log(`📈 Success rate: ${((afterStats.withConcentration / afterStats.total) * 100).toFixed(1)}%`);
}

async function getConcentrationStats(): Promise<{
  total: number;
  withConcentration: number;
  percentage: string;
}> {
  const total = await prisma.fragrance.count();
  const withConcentration = await prisma.fragrance.count({
    where: {
      concentration: {
        not: null,
        notIn: ['', 'Concentration', 'Unknown', 'N/A']
      }
    }
  });

  return {
    total,
    withConcentration,
    percentage: ((withConcentration / total) * 100).toFixed(1)
  };
}

// Run inference if called directly
if (require.main === module) {
  inferConcentrations()
    .catch(console.error)
    .finally(() => process.exit(0));
}
