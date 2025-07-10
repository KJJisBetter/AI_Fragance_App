import { useMemo } from 'react';
import type { Fragrance } from '@fragrance-battle/types';
import {
  getDisplayFragrance,
  getDisplayFragrances,
  formatFragranceName,
  getNameTooltip,
  type DisplayFragrance
} from '@/utils/fragrance';

/**
 * Hook options for customizing fragrance display
 */
interface UseCleanFragranceOptions {
  context?: 'card' | 'list' | 'detail' | 'search';
  enableTooltip?: boolean;
  enableValidation?: boolean;
}

/**
 * Return type for single fragrance hook
 */
interface CleanFragranceResult {
  displayFragrance: DisplayFragrance;
  formattedName: string;
  tooltip: string;
  hasRedundancy: boolean;
  isClean: boolean;
}

/**
 * Return type for multiple fragrances hook
 */
interface CleanFragrancesResult {
  displayFragrances: DisplayFragrance[];
  totalCleaned: number;
  redundancyStats: {
    total: number;
    cleaned: number;
    patterns: Record<string, number>;
  };
}

/**
 * React hook for cleaning and formatting a single fragrance
 * Provides memoized clean fragrance data for optimal performance
 */
export function useCleanFragrance(
  fragrance: Fragrance | null,
  options: UseCleanFragranceOptions = {}
): CleanFragranceResult | null {
  const {
    context = 'card',
    enableTooltip = true,
    enableValidation = false,
  } = options;

  return useMemo(() => {
    if (!fragrance) return null;

    try {
      // Get display fragrance with clean names
      const displayFragrance = getDisplayFragrance(fragrance);

      // Format name for specific context
      const formattedName = formatFragranceName(displayFragrance, context);

      // Get tooltip text if enabled
      const tooltip = enableTooltip ? getNameTooltip(displayFragrance) : '';

      // Determine if this fragrance was cleaned
      const hasRedundancy = displayFragrance.hasRedundancy;
      const isClean = displayFragrance.displayName !== fragrance.name;

      return {
        displayFragrance,
        formattedName,
        tooltip,
        hasRedundancy,
        isClean,
      };
    } catch (error) {
      console.warn('Error cleaning fragrance:', error, fragrance);

      // Fallback to original data if cleaning fails
      return {
        displayFragrance: {
          ...fragrance,
          displayName: fragrance.name,
          cleanName: fragrance.name,
          hasRedundancy: false,
          originalName: fragrance.name,
        },
        formattedName: fragrance.name,
        tooltip: '',
        hasRedundancy: false,
        isClean: false,
      };
    }
  }, [fragrance, context, enableTooltip, enableValidation]);
}

/**
 * React hook for cleaning and formatting multiple fragrances
 * Optimized for grid/list components with batch processing
 */
export function useCleanFragrances(
  fragrances: Fragrance[],
  options: UseCleanFragranceOptions = {}
): CleanFragrancesResult {
  const { context = 'card' } = options;

  return useMemo(() => {
    if (!fragrances || fragrances.length === 0) {
      return {
        displayFragrances: [],
        totalCleaned: 0,
        redundancyStats: {
          total: 0,
          cleaned: 0,
          patterns: {},
        },
      };
    }

    try {
      // Batch process all fragrances
      const displayFragrances = getDisplayFragrances(fragrances);

      // Calculate statistics
      const totalCleaned = displayFragrances.filter(f => f.hasRedundancy).length;
      const patterns: Record<string, number> = {};

      displayFragrances.forEach(fragrance => {
        if (fragrance.hasRedundancy) {
          // This would require pattern tracking in the utility function
          // For now, we'll use a simple categorization
          if (fragrance.displayName !== fragrance.originalName) {
            const key = fragrance.brand === 'Versace' ? 'versace' : 'general';
            patterns[key] = (patterns[key] || 0) + 1;
          }
        }
      });

      return {
        displayFragrances,
        totalCleaned,
        redundancyStats: {
          total: fragrances.length,
          cleaned: totalCleaned,
          patterns,
        },
      };
    } catch (error) {
      console.warn('Error cleaning fragrances batch:', error);

      // Fallback to original data
      const fallbackDisplayFragrances: DisplayFragrance[] = fragrances.map(f => ({
        ...f,
        displayName: f.name,
        cleanName: f.name,
        hasRedundancy: false,
        originalName: f.name,
      }));

      return {
        displayFragrances: fallbackDisplayFragrances,
        totalCleaned: 0,
        redundancyStats: {
          total: fragrances.length,
          cleaned: 0,
          patterns: {},
        },
      };
    }
  }, [fragrances, context]);
}

/**
 * Hook for tracking fragrance name cleaning performance
 * Useful for debugging and optimization
 */
export function useFragranceCleaningStats(fragrances: Fragrance[]) {
  return useMemo(() => {
    if (!fragrances || fragrances.length === 0) {
      return {
        totalProcessed: 0,
        cleaningRate: 0,
        averageReduction: 0,
        patterns: {},
      };
    }

    let totalOriginalLength = 0;
    let totalCleanedLength = 0;
    let cleanedCount = 0;
    const patterns: Record<string, number> = {};

    fragrances.forEach(fragrance => {
      const displayFragrance = getDisplayFragrance(fragrance);

      totalOriginalLength += fragrance.name.length;
      totalCleanedLength += displayFragrance.displayName.length;

      if (displayFragrance.hasRedundancy) {
        cleanedCount++;

        // Simple pattern categorization
        if (fragrance.name.toLowerCase().includes('atelier')) {
          patterns.atelier = (patterns.atelier || 0) + 1;
        } else if (fragrance.name.toLowerCase().includes(fragrance.brand.toLowerCase())) {
          patterns.brandRedundancy = (patterns.brandRedundancy || 0) + 1;
        } else {
          patterns.other = (patterns.other || 0) + 1;
        }
      }
    });

    const cleaningRate = (cleanedCount / fragrances.length) * 100;
    const averageReduction = totalOriginalLength > 0
      ? ((totalOriginalLength - totalCleanedLength) / totalOriginalLength) * 100
      : 0;

    return {
      totalProcessed: fragrances.length,
      cleaningRate: Math.round(cleaningRate * 100) / 100,
      averageReduction: Math.round(averageReduction * 100) / 100,
      patterns,
    };
  }, [fragrances]);
}

/**
 * Hook for handling individual fragrance name editing/validation
 * Useful for admin interfaces or user-generated content
 */
export function useFragranceNameEditor(fragrance: Fragrance | null) {
  const cleanResult = useCleanFragrance(fragrance);

  const validateAndClean = useMemo(() => {
    if (!fragrance || !cleanResult) return null;

    return {
      suggestedName: cleanResult.displayFragrance.displayName,
      originalName: fragrance.name,
      hasIssues: cleanResult.hasRedundancy,
      improvements: cleanResult.hasRedundancy
        ? [`Remove brand redundancy: "${fragrance.name}" → "${cleanResult.displayFragrance.displayName}"`]
        : [],
    };
  }, [fragrance, cleanResult]);

  return {
    cleanResult,
    validateAndClean,
    canImprove: cleanResult?.hasRedundancy || false,
  };
}

/**
 * Hook for fragrance search with clean names
 * Integrates with search functionality to provide clean results
 */
export function useSearchFragrances(
  searchResults: Fragrance[],
  query: string
) {
  const cleanResults = useCleanFragrances(searchResults, { context: 'search' });

  const enhancedResults = useMemo(() => {
    return cleanResults.displayFragrances.map(fragrance => ({
      ...fragrance,
      searchRelevance: {
        matchesCleanName: fragrance.displayName.toLowerCase().includes(query.toLowerCase()),
        matchesOriginalName: fragrance.originalName.toLowerCase().includes(query.toLowerCase()),
        matchesBrand: fragrance.brand.toLowerCase().includes(query.toLowerCase()),
      },
    }));
  }, [cleanResults.displayFragrances, query]);

  return {
    ...cleanResults,
    enhancedResults,
    searchStats: {
      totalResults: searchResults.length,
      cleanedResults: cleanResults.totalCleaned,
      query,
    },
  };
}

// Export types for external use
export type {
  CleanFragranceResult,
  CleanFragrancesResult,
  UseCleanFragranceOptions
};
