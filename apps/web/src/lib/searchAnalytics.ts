interface SearchAnalytics {
  query: string
  timestamp: number
  resultCount: number
  clickedResult?: boolean
  source: 'global' | 'page' | 'filter'
}

interface PopularSearch {
  query: string
  count: number
  successRate: number
  avgResultCount: number
  lastSearched: number
}

interface SearchSuggestion {
  query: string
  type: 'trending' | 'popular' | 'recent' | 'completion'
  reason: string
  score: number
}

const STORAGE_KEY = 'fragrance-search-analytics'
const POPULAR_SEARCHES_KEY = 'fragrance-popular-searches'
const MAX_ANALYTICS_ENTRIES = 1000
const MIN_SEARCH_COUNT = 3

class SearchAnalyticsService {
  private analytics: SearchAnalytics[] = []
  private popularSearches: Map<string, PopularSearch> = new Map()

  constructor() {
    this.loadFromStorage()
    this.updatePopularSearches()
  }

  // Track a search query
  trackSearch(query: string, resultCount: number, source: 'global' | 'page' | 'filter' = 'global') {
    const analytics: SearchAnalytics = {
      query: query.trim().toLowerCase(),
      timestamp: Date.now(),
      resultCount,
      source,
    }

    this.analytics.push(analytics)

    // Keep only recent entries
    if (this.analytics.length > MAX_ANALYTICS_ENTRIES) {
      this.analytics = this.analytics.slice(-MAX_ANALYTICS_ENTRIES)
    }

    this.updatePopularSearches()
    this.saveToStorage()
  }

  // Track when a user clicks on a search result
  trackSearchClick(query: string) {
    const normalizedQuery = query.trim().toLowerCase()

    // Find recent searches for this query and mark as successful
    const recentSearches = this.analytics.filter(a => a.query === normalizedQuery).slice(-5) // Get last 5 searches for this query

    recentSearches.forEach(search => {
      search.clickedResult = true
    })

    this.updatePopularSearches()
    this.saveToStorage()
  }

  // Get trending searches (searches that are becoming popular)
  getTrendingSearches(limit: number = 10): SearchSuggestion[] {
    const now = Date.now()
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    // Calculate trend scores
    const trendScores = new Map<string, number>()

    this.analytics
      .filter(a => a.timestamp > oneWeekAgo)
      .forEach(analytics => {
        const query = analytics.query
        const isRecent = analytics.timestamp > oneDayAgo
        const weight = isRecent ? 2 : 1 // Recent searches get higher weight

        trendScores.set(query, (trendScores.get(query) || 0) + weight)
      })

    // Convert to suggestions
    const trending: SearchSuggestion[] = []
    trendScores.forEach((score, query) => {
      if (score >= 3) {
        // Minimum threshold for trending
        trending.push({
          query,
          type: 'trending',
          reason: `${score} searches this week`,
          score,
        })
      }
    })

    return trending.sort((a, b) => b.score - a.score).slice(0, limit)
  }

  // Get popular searches (all-time popular)
  getPopularSearches(limit: number = 10): SearchSuggestion[] {
    const popular: SearchSuggestion[] = []

    this.popularSearches.forEach((data, query) => {
      if (data.count >= MIN_SEARCH_COUNT) {
        popular.push({
          query,
          type: 'popular',
          reason: `${data.count} total searches`,
          score: data.count * data.successRate,
        })
      }
    })

    return popular.sort((a, b) => b.score - a.score).slice(0, limit)
  }

  // Get search completions based on partial query
  getSearchCompletions(partialQuery: string, limit: number = 5): SearchSuggestion[] {
    const query = partialQuery.trim().toLowerCase()
    if (query.length < 2) return []

    const completions: SearchSuggestion[] = []

    this.popularSearches.forEach((data, fullQuery) => {
      if (fullQuery.startsWith(query) && fullQuery !== query) {
        completions.push({
          query: fullQuery,
          type: 'completion',
          reason: `Complete "${query}..."`,
          score: data.count * data.successRate,
        })
      }
    })

    return completions.sort((a, b) => b.score - a.score).slice(0, limit)
  }

  // Get recent searches
  getRecentSearches(limit: number = 5): SearchSuggestion[] {
    const recent = new Set<string>()

    // Get unique recent searches
    this.analytics
      .slice(-50) // Look at last 50 searches
      .reverse()
      .forEach(analytics => {
        if (recent.size < limit) {
          recent.add(analytics.query)
        }
      })

    return Array.from(recent).map(query => ({
      query,
      type: 'recent',
      reason: 'Recent search',
      score: 1,
    }))
  }

  // Get comprehensive suggestions
  getAllSuggestions(partialQuery?: string): {
    trending: SearchSuggestion[]
    popular: SearchSuggestion[]
    recent: SearchSuggestion[]
    completions: SearchSuggestion[]
  } {
    return {
      trending: this.getTrendingSearches(5),
      popular: this.getPopularSearches(5),
      recent: this.getRecentSearches(5),
      completions: partialQuery ? this.getSearchCompletions(partialQuery, 5) : [],
    }
  }

  // Get search success rate
  getSearchSuccessRate(query: string): number {
    const normalizedQuery = query.trim().toLowerCase()
    const data = this.popularSearches.get(normalizedQuery)
    return data ? data.successRate : 0
  }

  // Get search statistics
  getSearchStats(): {
    totalSearches: number
    uniqueQueries: number
    avgResultCount: number
    successRate: number
  } {
    const totalSearches = this.analytics.length
    const uniqueQueries = new Set(this.analytics.map(a => a.query)).size
    const avgResultCount = this.analytics.reduce((sum, a) => sum + a.resultCount, 0) / totalSearches
    const successfulSearches = this.analytics.filter(a => a.clickedResult).length
    const successRate = successfulSearches / totalSearches

    return {
      totalSearches,
      uniqueQueries,
      avgResultCount: Math.round(avgResultCount),
      successRate: Math.round(successRate * 100) / 100,
    }
  }

  // Update popular searches cache
  private updatePopularSearches() {
    const searchCounts = new Map<
      string,
      { count: number; resultCounts: number[]; clicks: number }
    >()

    this.analytics.forEach(analytics => {
      const query = analytics.query
      const existing = searchCounts.get(query) || { count: 0, resultCounts: [], clicks: 0 }

      existing.count++
      existing.resultCounts.push(analytics.resultCount)
      if (analytics.clickedResult) {
        existing.clicks++
      }

      searchCounts.set(query, existing)
    })

    // Update popular searches
    this.popularSearches.clear()
    searchCounts.forEach((data, query) => {
      const avgResultCount =
        data.resultCounts.reduce((sum, count) => sum + count, 0) / data.resultCounts.length
      const successRate = data.clicks / data.count

      this.popularSearches.set(query, {
        query,
        count: data.count,
        successRate,
        avgResultCount,
        lastSearched: Math.max(
          ...this.analytics.filter(a => a.query === query).map(a => a.timestamp)
        ),
      })
    })
  }

  // Save to localStorage
  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.analytics))
      localStorage.setItem(
        POPULAR_SEARCHES_KEY,
        JSON.stringify(Array.from(this.popularSearches.entries()))
      )
    } catch (error) {
      console.warn('Failed to save search analytics to localStorage:', error)
    }
  }

  // Load from localStorage
  private loadFromStorage() {
    try {
      const analyticsData = localStorage.getItem(STORAGE_KEY)
      if (analyticsData) {
        this.analytics = JSON.parse(analyticsData)
      }

      const popularData = localStorage.getItem(POPULAR_SEARCHES_KEY)
      if (popularData) {
        const entries = JSON.parse(popularData)
        this.popularSearches = new Map(entries)
      }
    } catch (error) {
      console.warn('Failed to load search analytics from localStorage:', error)
      this.analytics = []
      this.popularSearches = new Map()
    }
  }

  // Clear all analytics (for privacy)
  clearAnalytics() {
    this.analytics = []
    this.popularSearches.clear()
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(POPULAR_SEARCHES_KEY)
  }
}

// Export singleton instance
export const searchAnalytics = new SearchAnalyticsService()

// Export types for use in other files
export type { SearchSuggestion, PopularSearch }
