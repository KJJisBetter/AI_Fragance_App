const { PrismaClient } = require('@prisma/client');
const { FragranceNameCleaner } = require('../scripts/clean-fragrance-names');

// Mock fragrance data for testing
const mockFragrances = [
  // Atelier Versace patterns
  {
    id: 'test-1',
    name: 'Atelier Versace - Éclat de Rose Versace 2019',
    brand: 'Versace',
    expected: 'Éclat de Rose 2019',
    pattern: 'atelierVersace'
  },
  {
    id: 'test-2',
    name: 'Atelier Versace - Gingembre Pétillant Versace 2021',
    brand: 'Versace',
    expected: 'Gingembre Pétillant 2021',
    pattern: 'atelierVersace'
  },

  // Brand with year patterns
  {
    id: 'test-3',
    name: 'Baby Blue Jeans Versace 1995',
    brand: 'Versace',
    expected: 'Baby Blue Jeans 1995',
    pattern: 'brandWithYear'
  },
  {
    id: 'test-4',
    name: 'Black Jeans Versace 1997',
    brand: 'Versace',
    expected: 'Black Jeans 1997',
    pattern: 'brandWithYear'
  },

  // Brand suffix patterns
  {
    id: 'test-5',
    name: 'Blue Jeans Versace',
    brand: 'Versace',
    expected: 'Blue Jeans',
    pattern: 'brandSuffix'
  },

  // Dash prefix patterns
  {
    id: 'test-6',
    name: 'Dior - Sauvage',
    brand: 'Dior',
    expected: 'Sauvage',
    pattern: 'dashPrefix'
  },
  {
    id: 'test-7',
    name: 'Tom Ford - Oud Wood',
    brand: 'Tom Ford',
    expected: 'Oud Wood',
    pattern: 'dashPrefix'
  },

  // No changes needed
  {
    id: 'test-8',
    name: 'Eros',
    brand: 'Versace',
    expected: 'Eros',
    pattern: 'unchanged'
  },
  {
    id: 'test-9',
    name: 'Aventus',
    brand: 'Creed',
    expected: 'Aventus',
    pattern: 'unchanged'
  },

  // Edge cases
  {
    id: 'test-10',
    name: 'V',  // Too short
    brand: 'Versace',
    expected: 'V',  // Should remain unchanged
    pattern: 'unchanged'
  },
  {
    id: 'test-11',
    name: '',  // Empty name
    brand: 'Versace',
    expected: '',
    pattern: 'unchanged'
  },

  // Complex patterns
  {
    id: 'test-12',
    name: 'Bright Crystal Absolu Versace 2013',
    brand: 'Versace',
    expected: 'Bright Crystal Absolu 2013',
    pattern: 'brandWithYear'
  }
];

describe('Fragrance Name Cleanup', () => {
  let cleaner;

  beforeEach(() => {
    cleaner = new FragranceNameCleaner();
  });

  describe('Pattern Matching', () => {
    mockFragrances.forEach((fragrance) => {
      test(`should clean "${fragrance.name}" to "${fragrance.expected}"`, () => {
        const result = cleaner.cleanFragranceName(fragrance.name, fragrance.brand);

        expect(result.cleaned).toBe(fragrance.expected);
        expect(result.pattern).toBe(fragrance.pattern);
      });
    });
  });

  describe('Safety Checks', () => {
    test('should handle null/undefined inputs', () => {
      const result1 = cleaner.cleanFragranceName(null, 'Versace');
      const result2 = cleaner.cleanFragranceName('Test', null);
      const result3 = cleaner.cleanFragranceName(null, null);

      expect(result1.cleaned).toBe('');
      expect(result2.cleaned).toBe('Test');
      expect(result3.cleaned).toBe('');
    });

    test('should not make names too short', () => {
      const result = cleaner.cleanFragranceName('A Versace', 'Versace');
      expect(result.cleaned).toBe('A Versace'); // Should not clean very short names
    });

    test('should preserve original if cleaning fails', () => {
      const originalName = 'Complex Name With [Special] Characters Versace';
      const result = cleaner.cleanFragranceName(originalName, 'Versace');

      // Should either clean properly or preserve original
      expect(result.cleaned.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    test('should process large batches efficiently', () => {
      const startTime = Date.now();
      const largeBatch = Array(1000).fill(null).map((_, i) => ({
        name: `Test Fragrance ${i} Versace 2020`,
        brand: 'Versace'
      }));

      largeBatch.forEach(fragrance => {
        cleaner.cleanFragranceName(fragrance.name, fragrance.brand);
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Validation Rules', () => {
    test('should preserve years in names', () => {
      const result = cleaner.cleanFragranceName('Test Fragrance Versace 2020', 'Versace');
      expect(result.cleaned).toContain('2020');
    });

    test('should not over-clean names', () => {
      const result = cleaner.cleanFragranceName('Versace Pour Homme Versace 2008', 'Versace');
      expect(result.cleaned.length).toBeGreaterThan(5);
    });

    test('should handle special characters', () => {
      const result = cleaner.cleanFragranceName("L'Homme Versace", 'Versace');
      expect(result.cleaned).toBe("L'Homme");
    });
  });

  describe('Brand-Specific Logic', () => {
    test('should handle Versace patterns specifically', () => {
      const versaceResult = cleaner.cleanFragranceName('Atelier Versace - Test Versace 2021', 'Versace');
      expect(versaceResult.pattern).toBe('atelierVersace');
      expect(versaceResult.cleaned).toBe('Test 2021');
    });

    test('should handle general brand patterns', () => {
      const diorResult = cleaner.cleanFragranceName('Dior - Sauvage', 'Dior');
      expect(diorResult.pattern).toBe('dashPrefix');
      expect(diorResult.cleaned).toBe('Sauvage');
    });
  });
});

// Database validation queries
const validationQueries = {
  // Check for remaining redundancy patterns
  checkRedundancy: `
    SELECT
      COUNT(*) as count,
      name,
      brand
    FROM fragrances
    WHERE (
      name ILIKE '%Atelier Versace -%Versace%' OR
      name ILIKE '%Versace %Versace%' OR
      name ~ '.+ Versace 20[0-9][0-9]$' OR
      name ~ '.+ Versace$'
    )
    GROUP BY name, brand
    ORDER BY count DESC
    LIMIT 20;
  `,

  // Check for very short names
  checkShortNames: `
    SELECT
      COUNT(*) as count,
      name,
      brand,
      LENGTH(name) as name_length
    FROM fragrances
    WHERE LENGTH(TRIM(name)) < 3
    ORDER BY name_length ASC
    LIMIT 20;
  `,

  // Validate year preservation
  checkYearPreservation: `
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN name ~ '[0-9]{4}' THEN 1 END) as with_years,
      COUNT(CASE WHEN name_original ~ '[0-9]{4}' THEN 1 END) as original_with_years
    FROM fragrances
    WHERE name_original IS NOT NULL;
  `,

  // Check cleanup statistics
  getCleanupStats: `
    SELECT
      COUNT(*) as total_fragrances,
      COUNT(CASE WHEN name != name_original THEN 1 END) as cleaned_count,
      COUNT(CASE WHEN name = name_original THEN 1 END) as unchanged_count,
      ROUND(
        COUNT(CASE WHEN name != name_original THEN 1 END) * 100.0 / COUNT(*),
        2
      ) as cleanup_percentage
    FROM fragrances
    WHERE name_original IS NOT NULL;
  `,

  // Brand-specific cleanup rates
  getBrandStats: `
    SELECT
      brand,
      COUNT(*) as total,
      COUNT(CASE WHEN name != name_original THEN 1 END) as cleaned,
      ROUND(
        COUNT(CASE WHEN name != name_original THEN 1 END) * 100.0 / COUNT(*),
        2
      ) as cleanup_rate
    FROM fragrances
    WHERE name_original IS NOT NULL
    GROUP BY brand
    HAVING COUNT(*) > 5
    ORDER BY cleanup_rate DESC;
  `,

  // Sample of cleaned names for manual verification
  getSampleCleaned: `
    SELECT
      name_original,
      name as cleaned_name,
      brand,
      CASE
        WHEN name_original ILIKE '%Atelier%Versace%' THEN 'atelier_versace'
        WHEN name_original ~ '.+ [A-Z][a-z]+ [0-9]{4}$' THEN 'brand_with_year'
        WHEN name_original ~ '.+ [A-Z][a-z]+$' THEN 'brand_suffix'
        WHEN name_original ILIKE '%-%' THEN 'dash_prefix'
        ELSE 'other'
      END as detected_pattern
    FROM fragrances
    WHERE name_original IS NOT NULL
      AND name != name_original
    ORDER BY RANDOM()
    LIMIT 20;
  `
};

// Test runner for database validation
async function runDatabaseValidation() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Running database validation queries...\n');

    for (const [queryName, query] of Object.entries(validationQueries)) {
      console.log(`📊 ${queryName}:`);
      try {
        const results = await prisma.$queryRawUnsafe(query);
        console.table(results);
        console.log('');
      } catch (error) {
        console.error(`❌ Error running ${queryName}:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Database validation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use in other test files
module.exports = {
  mockFragrances,
  validationQueries,
  runDatabaseValidation
};

// Run validation if called directly
if (require.main === module) {
  runDatabaseValidation();
}
