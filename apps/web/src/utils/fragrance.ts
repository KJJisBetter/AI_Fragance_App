import type { Fragrance } from '@fragrance-battle/types';

/**
 * Extended fragrance interface for display purposes
 */
export interface DisplayFragrance extends Fragrance {
  displayName: string;
  cleanName: string;
  hasRedundancy: boolean;
  originalName: string;
}

/**
 * Cleanup pattern result
 */
interface CleanupResult {
  cleaned: string;
  pattern: 'atelierVersace' | 'brandWithYear' | 'brandSuffix' | 'dashPrefix' | 'unchanged';
  hasRedundancy: boolean;
}

/**
 * Cache for expensive regex operations
 */
const regexCache = new Map<string, RegExp>();

/**
 * Get or create cached regex
 */
function getCachedRegex(pattern: string, flags?: string): RegExp {
  const key = `${pattern}|${flags || ''}`;
  if (!regexCache.has(key)) {
    regexCache.set(key, new RegExp(pattern, flags));
  }
  return regexCache.get(key)!;
}

/**
 * Performance-optimized fragrance name cleaning
 * Handles various redundancy patterns found in the database
 */
export function cleanFragranceName(name: string, brand: string): CleanupResult {
  if (!name || !brand) {
    return {
      cleaned: name || '',
      pattern: 'unchanged',
      hasRedundancy: false
    };
  }

  const originalName = name.trim();
  let cleanedName = originalName;
  let pattern: CleanupResult['pattern'] = 'unchanged';
  let hasRedundancy = false;

  // Fast check for Versace brand (most common redundancy)
  if (brand === 'Versace') {
    // Pattern 1: "Atelier Versace - [Product] Versace [Year]" → "[Product] [Year]"
    const atelierMatch = originalName.match(
      getCachedRegex('^Atelier\\s+Versace\\s*-\\s*(.+?)\\s+Versace\\s+(\\d{4})\\s*$', 'i')
    );
    if (atelierMatch) {
      cleanedName = `${atelierMatch[1].trim()} ${atelierMatch[2]}`;
      pattern = 'atelierVersace';
      hasRedundancy = true;
    } else {
      // Pattern 2: "[Product] Versace [Year]" → "[Product] [Year]"
      const regularMatch = originalName.match(
        getCachedRegex('^(.+?)\\s+Versace\\s+(\\d{4})\\s*$', 'i')
      );
      if (regularMatch) {
        cleanedName = `${regularMatch[1].trim()} ${regularMatch[2]}`;
        pattern = 'brandWithYear';
        hasRedundancy = true;
      } else {
        // Pattern 3: "[Product] Versace" → "[Product]"
        const simpleMatch = originalName.match(
          getCachedRegex('^(.+?)\\s+Versace\\s*$', 'i')
        );
        if (simpleMatch && simpleMatch[1].trim().length > 3) {
          cleanedName = simpleMatch[1].trim();
          pattern = 'brandSuffix';
          hasRedundancy = true;
        }
      }
    }
  }

  // General patterns for any brand (if no Versace-specific match)
  if (pattern === 'unchanged') {
    const brandEscaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Pattern 4: "Brand - Product" → "Product"
    const dashMatch = originalName.match(
      getCachedRegex(`^${brandEscaped}\\s*-\\s*(.+)$`, 'i')
    );
    if (dashMatch) {
      cleanedName = dashMatch[1].trim();
      pattern = 'dashPrefix';
      hasRedundancy = true;
    } else {
      // Pattern 5: "Product Brand Year" → "Product Year"
      const trailingBrandYearMatch = originalName.match(
        getCachedRegex(`^(.+?)\\s+${brandEscaped}\\s+(\\d{4})\\s*$`, 'i')
      );
      if (trailingBrandYearMatch && trailingBrandYearMatch[1].trim().length > 3) {
        cleanedName = `${trailingBrandYearMatch[1].trim()} ${trailingBrandYearMatch[2]}`;
        pattern = 'brandWithYear';
        hasRedundancy = true;
      } else {
        // Pattern 6: "Product Brand" → "Product"
        const trailingBrandMatch = originalName.match(
          getCachedRegex(`^(.+?)\\s+${brandEscaped}\\s*$`, 'i')
        );
        if (trailingBrandMatch && trailingBrandMatch[1].trim().length > 3) {
          cleanedName = trailingBrandMatch[1].trim();
          pattern = 'brandSuffix';
          hasRedundancy = true;
        }
      }
    }
  }

  // Clean up extra whitespace
  cleanedName = cleanedName.replace(/\s+/g, ' ').trim();

  // Remove year from the name
  cleanedName = cleanedName.replace(/\b(19|20)\d{2}\b/g, '').trim();

  // Safety check - if we accidentally made it too short, keep original
  if (cleanedName.length < 2) {
    cleanedName = originalName;
    pattern = 'unchanged';
    hasRedundancy = false;
  }

  return { cleaned: cleanedName, pattern, hasRedundancy };
}

/**
 * Get display-ready fragrance data with clean names
 */
export function getDisplayFragrance(fragrance: Fragrance): DisplayFragrance {
  const cleanupResult = cleanFragranceName(fragrance.name, fragrance.brand);

  return {
    ...fragrance,
    displayName: cleanupResult.cleaned,
    cleanName: cleanupResult.cleaned,
    hasRedundancy: cleanupResult.hasRedundancy,
    originalName: fragrance.name,
  };
}

/**
 * Batch process multiple fragrances for performance
 */
export function getDisplayFragrances(fragrances: Fragrance[]): DisplayFragrance[] {
  return fragrances.map(getDisplayFragrance);
}

/**
 * Check if a fragrance name has potential redundancy issues
 */
export function hasNameRedundancy(name: string, brand: string): boolean {
  if (!name || !brand) return false;

  const lowerName = name.toLowerCase();
  const lowerBrand = brand.toLowerCase();

  // Quick checks for common patterns
  return (
    lowerName.includes(`${lowerBrand} -`) ||
    lowerName.includes(`- ${lowerBrand}`) ||
    lowerName.endsWith(` ${lowerBrand}`) ||
    lowerName.includes(`${lowerBrand} ${lowerBrand}`) ||
    (lowerName.includes('atelier') && lowerName.includes(lowerBrand) && lowerName.split(lowerBrand).length > 2)
  );
}

/**
 * Convert a string to proper title case for fragrance names
 */
export function toTitleCase(str: string): string {
  if (!str) return '';

  return str
    .toLowerCase()
    .split(/[\s-_]+/) // Split on spaces, hyphens, and underscores
    .map(word => {
      if (word.length === 0) return word;

      // Handle special cases
      const specialWords: Record<string, string> = {
        'edt': 'EDT',
        'edp': 'EDP',
        'eau': 'Eau',
        'de': 'de',
        'la': 'la',
        'le': 'le',
        'du': 'du',
        'des': 'des',
        'and': 'and',
        'of': 'of',
        'for': 'for',
        'by': 'by',
        'vs': 'VS',
        'v.s.': 'V.S.',
        'man': 'Man',
        'men': 'Men',
        'woman': 'Woman',
        'women': 'Women',
        'homme': 'Homme',
        'femme': 'Femme',
        'uomo': 'Uomo',
        'donna': 'Donna'
      };

      const lowerWord = word.toLowerCase();
      if (specialWords[lowerWord]) {
        return specialWords[lowerWord];
      }

      // Standard title case
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Format fragrance name for display with proper casing
 */
export function formatDisplayName(name: string): string {
  if (!name) return '';

  // First clean up any URL-like formatting
  let cleaned = name
    .replace(/[-_]+/g, ' ') // Replace hyphens and underscores with spaces
    .replace(/\s+/g, ' ')   // Normalize multiple spaces
    .trim();

  // Apply title case
  return toTitleCase(cleaned);
}

/**
 * Sort brands by popularity (count) then alphabetically
 */
export function sortBrandsByPopularity(brands: Array<{ name: string; count: number }>): Array<{ name: string; count: number }> {
  return [...brands].sort((a, b) => {
    // First sort by count (descending)
    if (b.count !== a.count) {
      return b.count - a.count;
    }

    // Then sort alphabetically by formatted name
    const nameA = formatDisplayName(a.name);
    const nameB = formatDisplayName(b.name);
    return nameA.localeCompare(nameB);
  });
}

/**
 * Sort brands alphabetically by formatted name
 */
export function sortBrandsAlphabetically(brands: Array<{ name: string; count: number }>): Array<{ name: string; count: number }> {
  return [...brands].sort((a, b) => {
    const nameA = formatDisplayName(a.name);
    const nameB = formatDisplayName(b.name);
    return nameA.localeCompare(nameB);
  });
}

/**
 * Format concentration values with proper names and abbreviations
 */
export function formatConcentration(concentration: string | null | undefined): string {
  if (!concentration) return '';

  // Handle the "Concentration" issue in the database
  if (concentration === 'Concentration') return '';

    const concentrationMap: Record<string, string> = {
    // API standardized values (only the 4 main types)
    'edt': 'Eau de Toilette (EDT)',
    'edp': 'Eau de Parfum (EDP)',
    'parfum': 'Parfum',
    'cologne': 'Cologne',

    // Legacy uppercase versions
    'EDT': 'Eau de Toilette (EDT)',
    'EDP': 'Eau de Parfum (EDP)',
    'EDC': 'Cologne',
    'PARFUM': 'Parfum',
    'COLOGNE': 'Cologne',

    // Full names
    'Eau de Toilette': 'Eau de Toilette (EDT)',
    'Eau de Parfum': 'Eau de Parfum (EDP)',
    'Eau de Cologne': 'Cologne',
    'Parfum': 'Parfum',
    'Extrait de Parfum': 'Parfum',
    'Extrait': 'Parfum',
    'Cologne': 'Cologne',
    'Perfume': 'Parfum',

    // Lowercase full names
    'eau de toilette': 'Eau de Toilette (EDT)',
    'eau de parfum': 'Eau de Parfum (EDP)',
    'eau de cologne': 'Cologne',
    'extrait de parfum': 'Parfum',
    'perfume': 'Parfum',
    'cologne': 'Cologne'
  };

  const normalized = concentration.trim();
  return concentrationMap[normalized] || concentrationMap[normalized.toLowerCase()] || toTitleCase(normalized);
}

/**
 * Get short concentration abbreviation for display in cards
 */
export function getConcentrationAbbreviation(concentration: string | null | undefined): string {
  if (!concentration) return '';

  // Handle the "Concentration" issue in the database
  if (concentration === 'Concentration') return '';

  const abbreviationMap: Record<string, string> = {
    'EDT': 'EDT',
    'EDP': 'EDP',
    'Parfum': 'Parfum',
    'EDC': 'Cologne',
    'Cologne': 'Cologne',
    'Extrait': 'Extrait',
    'Aftershave': 'Aftershave',
    'Splash': 'Splash',
    'Mist': 'Mist',
    'Spray': 'Spray',

    // Handle full names
    'Eau de Toilette': 'EDT',
    'Eau de Parfum': 'EDP',
    'Eau de Cologne': 'Cologne',
    'Extrait de Parfum': 'Extrait',
    'Body Mist': 'Mist',

    // Handle variations
    'eau de toilette': 'EDT',
    'eau de parfum': 'EDP',
    'eau de cologne': 'Cologne',
    'extrait de parfum': 'Extrait',
    'body mist': 'Mist',

    // Handle lowercase
    'edt': 'EDT',
    'edp': 'EDP',
    'edc': 'Cologne',
    'parfum': 'Parfum',
    'cologne': 'Cologne',
    'extrait': 'Extrait',
    'aftershave': 'Aftershave',
    'splash': 'Splash',
    'mist': 'Mist',
    'spray': 'Spray'
  };

  const normalized = concentration.trim();
  return abbreviationMap[normalized] || abbreviationMap[normalized.toLowerCase()] || toTitleCase(normalized);
}

/**
 * Format fragrance name for different display contexts
 */
export function formatFragranceName(
  fragrance: Fragrance | DisplayFragrance,
  context: 'card' | 'list' | 'detail' | 'search' = 'card'
): string {
  const displayFragrance = 'displayName' in fragrance
    ? fragrance
    : getDisplayFragrance(fragrance);

  // Always apply proper formatting to the display name
  const formattedName = formatDisplayName(displayFragrance.displayName);

  switch (context) {
    case 'card':
      // For cards, use clean name truncated appropriately
      return formattedName;

    case 'list':
      // For lists, might want to include brand prefix if very short
      if (formattedName.length < 15 && displayFragrance.hasRedundancy) {
        return `${fragrance.brand} ${formattedName}`;
      }
      return formattedName;

    case 'detail':
      // For detail pages, show full context
      return displayFragrance.hasRedundancy
        ? `${formattedName} (${fragrance.brand})`
        : formattedName;

    case 'search':
      // For search results, include brand context
      return `${formattedName} by ${fragrance.brand}`;

    default:
      return formattedName;
  }
}

/**
 * Get tooltip text for truncated names
 */
export function getNameTooltip(fragrance: Fragrance | DisplayFragrance): string {
  const displayFragrance = 'displayName' in fragrance
    ? fragrance
    : getDisplayFragrance(fragrance);

  if (displayFragrance.hasRedundancy) {
    return `Full name: ${displayFragrance.originalName}`;
  }

  // Show tooltip if the display name is significantly shorter than original
  if (displayFragrance.displayName.length < fragrance.name.length - 5) {
    return `Full name: ${fragrance.name}`;
  }

  return '';
}

/**
 * Validate cleaned name against business rules
 */
export function validateCleanedName(cleaned: string, original: string, brand: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check minimum length
  if (cleaned.length < 2) {
    issues.push('Name too short after cleaning');
  }

  // Check if we accidentally removed essential information
  if (cleaned.length < original.length * 0.3) {
    issues.push('Name may have been over-cleaned (too much removed)');
  }

  // Check for still-existing redundancy
  if (hasNameRedundancy(cleaned, brand)) {
    issues.push('Redundancy still exists after cleaning');
  }

  // Check for missing important parts (years, special editions)
  const yearInOriginal = original.match(/\b(19|20)\d{2}\b/);
  const yearInCleaned = cleaned.match(/\b(19|20)\d{2}\b/);
  if (yearInOriginal && !yearInCleaned) {
    issues.push('Year information may have been lost');
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Performance stats for monitoring
 */
export function getCacheStats(): {
  regexCacheSize: number;
  hitRate: number;
} {
  return {
    regexCacheSize: regexCache.size,
    hitRate: 0, // Would need to implement hit tracking for actual metrics
  };
}

/**
 * Clear caches (useful for testing or memory management)
 */
export function clearCaches(): void {
  regexCache.clear();
}

/**
 * Bulk cleanup operation with progress tracking
 */
export function cleanFragranceNamesBulk(
  fragrances: Fragrance[],
  onProgress?: (processed: number, total: number) => void
): DisplayFragrance[] {
  const results: DisplayFragrance[] = [];
  const batchSize = 100;

  for (let i = 0; i < fragrances.length; i += batchSize) {
    const batch = fragrances.slice(i, i + batchSize);
    const batchResults = batch.map(getDisplayFragrance);
    results.push(...batchResults);

    if (onProgress) {
      onProgress(Math.min(i + batchSize, fragrances.length), fragrances.length);
    }
  }

  return results;
}

/**
 * Export types for external use
 */
export type { DisplayFragrance, CleanupResult };
