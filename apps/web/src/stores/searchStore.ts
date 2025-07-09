import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// Search filter types
export interface FragranceFilters {
  brands: string[]
  years: number[]
  concentrations: string[]
  seasons: string[]
  occasions: string[]
  moods: string[]
  priceRange: [number, number]
  ratingRange: [number, number]
  relevanceScore: [number, number]
  notes: string[]
  sortBy: 'name' | 'brand' | 'year' | 'rating' | 'popularity' | 'relevance'
  sortOrder: 'asc' | 'desc'
}

// Search suggestion types
export interface SearchSuggestion {
  id: string
  text: string
  type: 'fragrance' | 'brand' | 'note' | 'category'
  count?: number
  metadata?: Record<string, any>
}

// Recent search item
export interface RecentSearch {
  id: string
  query: string
  filters: Partial<FragranceFilters>
  timestamp: Date
  resultsCount: number
}

// Search preferences
export interface SearchPreferences {
  autoComplete: boolean
  showRecentSearches: boolean
  maxRecentSearches: number
  searchOnType: boolean
  searchDelay: number
  showPopularSuggestions: boolean
  saveSearchHistory: boolean
  enableVoiceSearch: boolean
  defaultSortBy: FragranceFilters['sortBy']
  defaultSortOrder: FragranceFilters['sortOrder']
}

// Search state interface
interface SearchState {
  // Current search state
  query: string
  filters: Partial<FragranceFilters>
  isSearching: boolean
  lastSearchTime: Date | null

  // Search history
  recentSearches: RecentSearch[]

  // Search suggestions
  suggestions: SearchSuggestion[]
  showSuggestions: boolean
  selectedSuggestionIndex: number

  // Search preferences
  preferences: SearchPreferences

  // Popular/trending data
  popularSearches: string[]
  trendingFragrances: string[]

  // Search analytics
  searchCount: number
  lastSearchResults: any[]

  // Actions
  // Search actions
  setQuery: (query: string) => void
  setFilters: (filters: Partial<FragranceFilters>) => void
  updateFilter: (key: keyof FragranceFilters, value: any) => void
  clearFilters: () => void
  setIsSearching: (isSearching: boolean) => void

  // Recent searches
  addRecentSearch: (query: string, filters: Partial<FragranceFilters>, resultsCount: number) => void
  removeRecentSearch: (id: string) => void
  clearRecentSearches: () => void

  // Search suggestions
  setSuggestions: (suggestions: SearchSuggestion[]) => void
  setShowSuggestions: (show: boolean) => void
  setSelectedSuggestionIndex: (index: number) => void
  selectSuggestion: (suggestion: SearchSuggestion) => void

  // Search preferences
  updatePreferences: (preferences: Partial<SearchPreferences>) => void
  resetPreferences: () => void

  // Popular data
  setPopularSearches: (searches: string[]) => void
  setTrendingFragrances: (fragrances: string[]) => void

  // Search analytics
  incrementSearchCount: () => void
  setLastSearchResults: (results: any[]) => void
  updateSearchAnalytics: (query: string, resultCount: number, source: string) => void

  // Utility actions
  performSearch: (query?: string, filters?: Partial<FragranceFilters>) => void
  getSearchHistory: () => RecentSearch[]
  getFilteredSuggestions: (query: string) => SearchSuggestion[]
  exportSearchData: () => Record<string, any>
  importSearchData: (data: Record<string, any>) => void
}

// Default filters
const defaultFilters: FragranceFilters = {
  brands: [],
  years: [],
  concentrations: [],
  seasons: [],
  occasions: [],
  moods: [],
  priceRange: [0, 1000],
  ratingRange: [0, 5],
  relevanceScore: [0, 100],
  notes: [],
  sortBy: 'relevance',
  sortOrder: 'desc'
}

// Default preferences
const defaultPreferences: SearchPreferences = {
  autoComplete: true,
  showRecentSearches: true,
  maxRecentSearches: 10,
  searchOnType: true,
  searchDelay: 300,
  showPopularSuggestions: true,
  saveSearchHistory: true,
  enableVoiceSearch: false,
  defaultSortBy: 'relevance',
  defaultSortOrder: 'desc'
}

// Create the search store
export const useSearchStore = create<SearchState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        query: '',
        filters: {},
        isSearching: false,
        lastSearchTime: null,

        // Search history
        recentSearches: [],

        // Search suggestions
        suggestions: [],
        showSuggestions: false,
        selectedSuggestionIndex: -1,

        // Search preferences
        preferences: defaultPreferences,

        // Popular data
        popularSearches: [],
        trendingFragrances: [],

        // Search analytics
        searchCount: 0,
        lastSearchResults: [],

        // Search actions
        setQuery: (query: string) => {
          set({ query })

          // Auto-suggestions if enabled
          const { preferences } = get()
          if (preferences.autoComplete && query.length > 0) {
            const suggestions = get().getFilteredSuggestions(query)
            set({ suggestions, showSuggestions: true, selectedSuggestionIndex: -1 })
          } else {
            set({ showSuggestions: false, suggestions: [] })
          }
        },

        setFilters: (filters: Partial<FragranceFilters>) => {
          set({ filters })
        },

        updateFilter: (key: keyof FragranceFilters, value: any) => {
          set((state) => ({
            filters: {
              ...state.filters,
              [key]: value
            }
          }))
        },

        clearFilters: () => {
          set({ filters: {} })
        },

        setIsSearching: (isSearching: boolean) => {
          set({ isSearching })
        },

        // Recent searches
        addRecentSearch: (query: string, filters: Partial<FragranceFilters>, resultsCount: number) => {
          const { preferences, recentSearches } = get()

          if (!preferences.saveSearchHistory) return

          const newSearch: RecentSearch = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            query,
            filters,
            timestamp: new Date(),
            resultsCount
          }

          // Remove duplicate if exists
          const filteredSearches = recentSearches.filter(search =>
            search.query !== query || JSON.stringify(search.filters) !== JSON.stringify(filters)
          )

          // Add new search to beginning and limit to max
          const updatedSearches = [newSearch, ...filteredSearches].slice(0, preferences.maxRecentSearches)

          set({ recentSearches: updatedSearches })
        },

        removeRecentSearch: (id: string) => {
          set((state) => ({
            recentSearches: state.recentSearches.filter(search => search.id !== id)
          }))
        },

        clearRecentSearches: () => {
          set({ recentSearches: [] })
        },

        // Search suggestions
        setSuggestions: (suggestions: SearchSuggestion[]) => {
          set({ suggestions })
        },

        setShowSuggestions: (showSuggestions: boolean) => {
          set({ showSuggestions })
        },

        setSelectedSuggestionIndex: (selectedSuggestionIndex: number) => {
          set({ selectedSuggestionIndex })
        },

        selectSuggestion: (suggestion: SearchSuggestion) => {
          set({
            query: suggestion.text,
            showSuggestions: false,
            selectedSuggestionIndex: -1
          })
        },

        // Search preferences
        updatePreferences: (newPreferences: Partial<SearchPreferences>) => {
          set((state) => ({
            preferences: {
              ...state.preferences,
              ...newPreferences
            }
          }))
        },

        resetPreferences: () => {
          set({ preferences: defaultPreferences })
        },

        // Popular data
        setPopularSearches: (popularSearches: string[]) => {
          set({ popularSearches })
        },

        setTrendingFragrances: (trendingFragrances: string[]) => {
          set({ trendingFragrances })
        },

        // Search analytics
        incrementSearchCount: () => {
          set((state) => ({
            searchCount: state.searchCount + 1
          }))
        },

        setLastSearchResults: (lastSearchResults: any[]) => {
          set({ lastSearchResults })
        },

        updateSearchAnalytics: (query: string, resultCount: number, source: string) => {
          // Increment search count
          set((state) => ({
            searchCount: state.searchCount + 1
          }))

          // Log analytics data (in a real app, this would be sent to analytics service)
          console.log('Search Analytics:', {
            query,
            resultCount,
            source,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          })

          // Update last search time
          set({ lastSearchTime: new Date() })
        },

        // Utility actions
        performSearch: (query?: string, filters?: Partial<FragranceFilters>) => {
          const currentState = get()
          const searchQuery = query || currentState.query
          const searchFilters = filters || currentState.filters

          if (!searchQuery.trim()) return

          set({
            isSearching: true,
            lastSearchTime: new Date()
          })

          // Add to recent searches (will be called after search completes)
          // This is typically handled by the component that performs the actual search
          get().incrementSearchCount()
        },

        getSearchHistory: () => {
          const { recentSearches } = get()
          return recentSearches.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        },

        getFilteredSuggestions: (query: string) => {
          const { suggestions, popularSearches, trendingFragrances } = get()
          const lowercaseQuery = query.toLowerCase()

          // Filter existing suggestions
          const filteredSuggestions = suggestions.filter(suggestion =>
            suggestion.text.toLowerCase().includes(lowercaseQuery)
          )

          // Add popular suggestions if enabled
          const popularSuggestions: SearchSuggestion[] = popularSearches
            .filter(search => search.toLowerCase().includes(lowercaseQuery))
            .slice(0, 3)
            .map(search => ({
              id: `popular-${search}`,
              text: search,
              type: 'fragrance' as const,
              count: 0
            }))

          return [...filteredSuggestions, ...popularSuggestions].slice(0, 10)
        },

        exportSearchData: () => {
          const { recentSearches, preferences, searchCount } = get()
          return {
            recentSearches,
            preferences,
            searchCount,
            exportedAt: new Date().toISOString()
          }
        },

        importSearchData: (data: Record<string, any>) => {
          try {
            const { recentSearches, preferences, searchCount } = data

            set({
              recentSearches: recentSearches || [],
              preferences: { ...defaultPreferences, ...preferences },
              searchCount: searchCount || 0
            })
          } catch (error) {
            console.error('Failed to import search data:', error)
          }
        }
      }),
      {
        name: 'search-store',
        // Only persist certain keys
        partialize: (state) => ({
          recentSearches: state.recentSearches,
          preferences: state.preferences,
          popularSearches: state.popularSearches,
          searchCount: state.searchCount,
        }),
      }
    ),
    {
      name: 'search-store',
    }
  )
)

// Selector hooks for performance
export const useSearchQuery = () => useSearchStore((state) => ({
  query: state.query,
  setQuery: state.setQuery,
  isSearching: state.isSearching,
  setIsSearching: state.setIsSearching,
}))

export const useSearchFilters = () => useSearchStore((state) => ({
  filters: state.filters,
  setFilters: state.setFilters,
  updateFilter: state.updateFilter,
  clearFilters: state.clearFilters,
}))

export const useSearchSuggestions = () => useSearchStore((state) => ({
  suggestions: state.suggestions,
  showSuggestions: state.showSuggestions,
  selectedSuggestionIndex: state.selectedSuggestionIndex,
  setSuggestions: state.setSuggestions,
  setShowSuggestions: state.setShowSuggestions,
  setSelectedSuggestionIndex: state.setSelectedSuggestionIndex,
  selectSuggestion: state.selectSuggestion,
  getFilteredSuggestions: state.getFilteredSuggestions,
}))

export const useSearchHistory = () => useSearchStore((state) => ({
  recentSearches: state.recentSearches,
  addRecentSearch: state.addRecentSearch,
  removeRecentSearch: state.removeRecentSearch,
  clearRecentSearches: state.clearRecentSearches,
  getSearchHistory: state.getSearchHistory,
}))

export const useSearchPreferences = () => useSearchStore((state) => ({
  preferences: state.preferences,
  updatePreferences: state.updatePreferences,
  resetPreferences: state.resetPreferences,
}))

export const useSearchAnalytics = () => useSearchStore((state) => ({
  searchCount: state.searchCount,
  lastSearchResults: state.lastSearchResults,
  lastSearchTime: state.lastSearchTime,
  incrementSearchCount: state.incrementSearchCount,
  setLastSearchResults: state.setLastSearchResults,
  updateSearchAnalytics: state.updateSearchAnalytics,
}))

export const usePopularContent = () => useSearchStore((state) => ({
  popularSearches: state.popularSearches,
  trendingFragrances: state.trendingFragrances,
  setPopularSearches: state.setPopularSearches,
  setTrendingFragrances: state.setTrendingFragrances,
}))

// Export the store for external access
export default useSearchStore
