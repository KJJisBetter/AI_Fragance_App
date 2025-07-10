import type { Fragrance, FragranceSearchFilters } from '@fragrance-battle/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FilterSidebar } from '../components/FilterSidebar'
import { BackToTop, FragranceInfiniteScroll } from '../components/InfiniteScroll'
import {
  FilterSkeleton,
  PageHeaderSkeleton,
  SearchResultsSkeleton,
  SmartLoading,
} from '../components/LoadingStates'
import { SearchHighlight } from '../components/SearchHighlight'
import { SortSelect } from '../components/SortSelect'
import { VirtualizedList } from '../components/VirtualizedList'
import { fragrancesApi } from '../lib/api'
import { searchAnalytics } from '../lib/searchAnalytics'
import './FragrancesPage.css'
import { Helmet } from 'react-helmet-async'
import { FragranceCard } from '../components/FragranceCard'

export const FragrancesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlSearchQuery = searchParams.get('search') || ''
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery)
  const [filters, setFilters] = useState<FragranceSearchFilters>({})
  const updateFilters = (changes: Partial<FragranceSearchFilters>) => {
    setFilters(prev => ({ ...prev, ...changes }))
  }
  const [brandSearch, setBrandSearch] = useState('')
  const [sortBy, setSortBy] = useState<
    'name' | 'brand' | 'year' | 'rating' | 'createdAt' | 'popularity' | 'prestige'
  >('popularity')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Dynamic filter options from database
  const [filterOptions, setFilterOptions] = useState<{
    brands: string[]
    seasons: string[]
    occasions: string[]
    moods: string[]
    concentrations: string[]
    yearRange: { min: number; max: number }
  }>({
    brands: [],
    seasons: [],
    occasions: [],
    moods: [],
    concentrations: [],
    yearRange: { min: 1900, max: new Date().getFullYear() },
  })
  const [filtersLoading, setFiltersLoading] = useState(true)
  const [brandSuggestions, setBrandSuggestions] = useState<
    Array<{ name: string; originalName: string; count: number }>
  >([])
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)

  const [fragrances, setFragrances] = useState<Fragrance[]>([])
  const [totalFragrances, setTotalFragrances] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      console.log('🔍 Fetching fragrances with params:', {
        searchQuery: urlSearchQuery,
        filters,
        page: 1, // Reset to page 1 for new search
        sortBy,
        sortOrder,
      })

      const limit = 20

      try {
        let result
        if (urlSearchQuery.trim()) {
          console.log('🔍 Using search API')
          result = await fragrancesApi.search({
            query: urlSearchQuery,
            filters,
            page: 1,
            limit,
            sortBy,
            sortOrder,
          })
        } else {
          console.log('🔍 Using getAll API')
          result = await fragrancesApi.getAll({
            page: 1,
            limit,
            sortBy,
            sortOrder,
            ...filters,
          })
        }

        console.log('✅ API Response:', result)
        const responseData = (result as any).data || (result as any)
        const fetchedFragrances = responseData.fragrances || []
        const totalCount = responseData.pagination?.totalCount || responseData.total || 0

        setFragrances(fetchedFragrances)
        setTotalFragrances(totalCount)

        if (urlSearchQuery.trim()) {
          searchAnalytics.trackSearch(urlSearchQuery, fetchedFragrances.length, 'page')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
        setError(errorMessage)
        console.error('❌ Error fetching fragrances:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [urlSearchQuery, filters, sortBy, sortOrder])

  // Sync local search input with URL
  useEffect(() => {
    if (urlSearchQuery !== searchQuery) {
      setSearchQuery(urlSearchQuery)
    }
  }, [urlSearchQuery])

  // Virtual scrolling configuration
  const VIRTUAL_SCROLL_THRESHOLD = 50 // Use virtual scrolling for more than 50 items
  const ITEM_HEIGHT = 280 // Height of each fragrance card in pixels
  const CONTAINER_HEIGHT = 600 // Height of the virtual scroll container

  // Should use virtual scrolling?
  const shouldUseVirtualScrolling = useMemo(() => {
    return fragrances.length > VIRTUAL_SCROLL_THRESHOLD
  }, [fragrances.length])

  // Render function for virtual list items
  const renderFragranceItem = useMemo(
    () => (fragrance: Fragrance, index: number) => (
      <Link
        key={fragrance.id}
        to={`/fragrances/${fragrance.id}`}
        className="fragrance-card"
        style={{ margin: '8px' }}
      >
        <div className="fragrance-card-content">
          <div className="fragrance-card-header">
            <h3 className="fragrance-card-name">
              <SearchHighlight text={fragrance.name} searchTerm={urlSearchQuery} />
            </h3>
            <p className="fragrance-card-brand">
              <SearchHighlight text={fragrance.brand} searchTerm={urlSearchQuery} />
            </p>
          </div>

          <div className="fragrance-card-details">
            {fragrance.year && <div className="fragrance-card-year">📅 {fragrance.year}</div>}
            {fragrance.concentration && (
              <div className="fragrance-card-concentration">💧 {fragrance.concentration}</div>
            )}
          </div>

          <div className="fragrance-card-notes">
            <div className="notes-section">
              <span className="notes-label">Top:</span>
              <span className="notes-text">{formatNotes(fragrance.topNotes || [])}</span>
            </div>
            <div className="notes-section">
              <span className="notes-label">Heart:</span>
              <span className="notes-text">{formatNotes(fragrance.heartNotes || [])}</span>
            </div>
            <div className="notes-section">
              <span className="notes-label">Base:</span>
              <span className="notes-text">{formatNotes(fragrance.baseNotes || [])}</span>
            </div>
          </div>

          <div className="fragrance-card-footer">
            <div className="fragrance-card-rating">
              <span
                className="rating-value"
                style={{ color: getRatingColor(fragrance.communityRating) }}
              >
                ⭐ {fragrance.communityRating?.toFixed(1) || 'N/A'}
              </span>
              <span className="rating-label">Community Rating</span>
            </div>

            {fragrance.verified && <div className="verified-badge">✅ Verified</div>}
          </div>
        </div>
      </Link>
    ),
    []
  )

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      setFiltersLoading(true)
      const result = (await fragrancesApi.getFilters()) as {
        brands: Array<{ name: string; count: number }>
        seasons: string[]
        occasions: string[]
        moods: string[]
        concentrations: Array<{ name: string; count: number }>
        yearRange?: { min: number; max: number }
      }

      // Convert the response to the expected format
      const options = {
        brands: result.brands.map(b => b.name),
        seasons: result.seasons,
        occasions: result.occasions,
        moods: result.moods,
        concentrations: result.concentrations.map(c => c.name),
        yearRange: result.yearRange || { min: 1900, max: new Date().getFullYear() },
      }

      setFilterOptions(options)
    } catch (err) {
      console.error('❌ Error fetching filter options:', err)
    } finally {
      setFiltersLoading(false)
    }
  }

  // Effect to fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions()
  }, [])

  // Search brands dynamically
  const searchBrands = async (query: string) => {
    if (!query.trim()) {
      setBrandSuggestions([])
      setShowBrandDropdown(false)
      return
    }

    try {
      const result = await fragrancesApi.searchBrands(query, 10)
      const responseData = (result as any).data || (result as any)
      setBrandSuggestions(responseData.brands || [])
      setShowBrandDropdown(true)
    } catch (err) {
      console.error('Error searching brands:', err)
      setBrandSuggestions([])
      setShowBrandDropdown(false)
    }
  }

  // Debounced brand search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchBrands(brandSearch)
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [brandSearch])

  // Track the selected brand's original name for filtering
  const [selectedBrandOriginal, setSelectedBrandOriginal] = useState<string>('')

  // Effect to update filters when brand is selected
  useEffect(() => {
    const updatedFilters = { ...filters }
    if (selectedBrandOriginal.trim()) {
      updatedFilters.brand = selectedBrandOriginal.trim()
    } else if (brandSearch.trim() && !selectedBrandOriginal) {
      // If typing freely (not from suggestions), use the typed value
      updatedFilters.brand = brandSearch.trim()
    } else {
      delete updatedFilters.brand
    }
    setFilters(updatedFilters)
  }, [brandSearch, selectedBrandOriginal])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev)
      newParams.set('search', searchQuery)
      return newParams
    })
  }

  // Handle filter changes
  const handleFilterChange = (
    filterType: keyof FragranceSearchFilters,
    value: string | boolean
  ) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value === '' ? undefined : value,
    }))
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({})
    setSearchQuery('')
    setBrandSearch('')
    setSelectedBrandOriginal('')
  }

  // Format notes for display
  const formatNotes = (notes: string[]) => {
    if (!notes || notes.length === 0) return 'Not specified'
    return notes.slice(0, 3).join(', ') + (notes.length > 3 ? '...' : '')
  }

  // Get rating color
  const getRatingColor = (rating?: number) => {
    if (!rating) return '#94a3b8'
    if (rating >= 4.5) return '#22c55e'
    if (rating >= 4.0) return '#3b82f6'
    if (rating >= 3.5) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="fragrances-page-container bg-slate-50 min-h-screen">
      <Helmet>
        <title>
          {urlSearchQuery ? `Search Results for "${urlSearchQuery}"` : 'Discover Fragrances'} -
          Fragrance Battle AI
        </title>
        <meta
          name="description"
          content={`Search and filter through our collection of fragrances. ${urlSearchQuery ? `Showing results for ${urlSearchQuery}.` : ''}`}
        />
      </Helmet>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <FilterSidebar
              filters={filters}
              options={filterOptions}
              onChange={updateFilters}
              onClear={clearFilters}
            />
          </div>

          {/* Results Section */}
          <div className="lg:col-span-3">
            {/* Results Count */}
            <div className="results-count">
              <p>
                Showing {fragrances.length} of {totalFragrances.toLocaleString()} fragrances
                {urlSearchQuery && ` for "${urlSearchQuery}"`}
                {isLoading && (
                  <span style={{ marginLeft: '8px' }}>
                    <span className="results-loading"></span>
                  </span>
                )}
              </p>
            </div>

            {/* Fragrances Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="w-full h-72 bg-slate-200 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {fragrances.map(fragrance => (
                  <FragranceCard key={fragrance.id} fragrance={fragrance} />
                ))}
              </div>
            )}

            {/* No Results */}
            {!isLoading && fragrances.length === 0 && (
              <div className="text-center py-16">
                <h3 className="text-xl font-semibold">No Results Found</h3>
                <p className="text-slate-500">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Back to top button */}
      <BackToTop showThreshold={400} />

      {/* Add spin animation */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `,
        }}
      />
    </div>
  )
}
