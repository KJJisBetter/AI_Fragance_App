import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SearchResults } from '@/components/search/SearchResults'
import { FilterSidebar } from '@/components/filter/FilterSidebar'
import { fragrancesApi } from '../lib/api'
import { searchAnalytics } from '../lib/searchAnalytics'
import type { Fragrance } from '@fragrance-battle/types'

interface FilterState {
  brands: string[]
  concentrations: string[]
  seasons: string[]
  occasions: string[]
  moods: string[]
  yearRange: [number, number]
  ratingRange: [number, number]
  priceRange: [number, number]
  hasNotes: boolean
  verified: boolean
}

export const FragrancesPageRedesigned = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlSearchQuery = searchParams.get('search') || ''

  // State
  const [fragrances, setFragrances] = useState<Fragrance[]>([])
  const [totalFragrances, setTotalFragrances] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    brands: [],
    concentrations: [],
    seasons: [],
    occasions: [],
    moods: [],
    yearRange: [1900, new Date().getFullYear()],
    ratingRange: [0, 5],
    priceRange: [0, 1000],
    hasNotes: false,
    verified: false,
  })

  // Sort state
  const [currentSort, setCurrentSort] = useState({
    sortBy: 'popularity',
    sortOrder: 'desc' as 'asc' | 'desc'
  })

  // Available filter options (would come from API in real app)
  const [availableOptions, setAvailableOptions] = useState({
    brands: [] as Array<{ name: string; count: number }>,
    concentrations: ['EDT', 'EDP', 'Parfum', 'EDC', 'Cologne'],
    seasons: ['Spring', 'Summer', 'Fall', 'Winter'],
    occasions: ['Daily', 'Evening', 'Formal', 'Casual', 'Date', 'Work', 'Special Events'],
    moods: ['Fresh', 'Confident', 'Sophisticated', 'Playful', 'Romantic', 'Energetic', 'Mysterious', 'Elegant'],
  })

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const limit = 24 // Increased for better grid layout

      let result
      if (urlSearchQuery.trim()) {
        result = await fragrancesApi.search({
          query: urlSearchQuery,
          filters: {
            brands: filters.brands,
            concentrations: filters.concentrations,
            seasons: filters.seasons,
            occasions: filters.occasions,
            moods: filters.moods,
            yearFrom: filters.yearRange[0],
            yearTo: filters.yearRange[1],
            ratingMin: filters.ratingRange[0],
            verified: filters.verified || undefined,
          },
          page: 1,
          limit,
          sortBy: currentSort.sortBy,
          sortOrder: currentSort.sortOrder,
        })
      } else {
        result = await fragrancesApi.getAll({
          page: 1,
          limit,
          sortBy: currentSort.sortBy,
          sortOrder: currentSort.sortOrder,
          brands: filters.brands,
          concentrations: filters.concentrations,
          verified: filters.verified || undefined,
        })
      }

      const responseData = (result as any).data || (result as any)
      const fetchedFragrances = responseData.fragrances || []
      const totalCount = responseData.pagination?.totalCount || responseData.total || 0

      setFragrances(fetchedFragrances)
      setTotalFragrances(totalCount)

      if (urlSearchQuery.trim()) {
        searchAnalytics.trackSearch(urlSearchQuery, fetchedFragrances.length, 'redesigned-page')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load fragrances'
      setError(errorMessage)
      console.error('❌ Error fetching fragrances:', err)
    } finally {
      setIsLoading(false)
    }
  }, [urlSearchQuery, filters, currentSort])

  // Fetch available filter options
  const fetchFilterOptions = useCallback(async () => {
    try {
      const filterData = await fragrancesApi.getFilters()
      setAvailableOptions(prev => ({
        ...prev,
        brands: filterData.brands?.slice(0, 50) || [], // Limit to top 50 brands
      }))
    } catch (err) {
      console.error('Failed to load filter options:', err)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchFilterOptions()
  }, [fetchFilterOptions])

  // Handlers
  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  const handleSort = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    setCurrentSort({ sortBy, sortOrder })
  }

  const toggleMobileFilters = () => {
    setShowMobileFilters(!showMobileFilters)
  }

  // Generate page title
  const pageTitle = urlSearchQuery
    ? `${urlSearchQuery} Fragrances - ${totalFragrances.toLocaleString()} Results`
    : `Discover Fragrances - ${totalFragrances.toLocaleString()} Premium Scents`

  const pageDescription = urlSearchQuery
    ? `Explore ${totalFragrances.toLocaleString()} fragrances matching "${urlSearchQuery}". Find your perfect scent with detailed notes, ratings, and expert reviews.`
    : `Discover your perfect fragrance from our collection of ${totalFragrances.toLocaleString()} premium scents. Compare notes, ratings, and find your signature scent.`

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        {/* Page Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                    {urlSearchQuery ? `Search Results` : 'Discover Fragrances'}
                  </h1>
                  <p className="mt-2 text-slate-600">
                    {urlSearchQuery
                      ? `Showing results for "${urlSearchQuery}"`
                      : 'Explore our curated collection of premium fragrances'
                    }
                  </p>
                </div>

                {/* Mobile Filter Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMobileFilters}
                  className="lg:hidden"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="lg:grid lg:grid-cols-4 lg:gap-8">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <FilterSidebar
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  availableOptions={availableOptions}
                  className="h-[calc(100vh-8rem)] rounded-xl border border-slate-200 shadow-sm"
                />
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-3">
              {error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                    <X className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-red-900 mb-2">
                    Something went wrong
                  </h3>
                  <p className="text-red-700 mb-4">{error}</p>
                  <Button onClick={() => window.location.reload()}>
                    Try Again
                  </Button>
                </div>
              ) : (
                <SearchResults
                  fragrances={fragrances}
                  totalCount={totalFragrances}
                  isLoading={isLoading}
                  searchQuery={urlSearchQuery}
                  onSort={handleSort}
                  onToggleFilters={toggleMobileFilters}
                  currentSort={currentSort}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
                />
              )}
            </div>
          </div>
        </div>

        {/* Mobile Filter Overlay */}
        {showMobileFilters && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={toggleMobileFilters} />
            <div className="absolute right-0 top-0 h-full w-80 max-w-[90vw] bg-white shadow-xl">
              <FilterSidebar
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onClose={toggleMobileFilters}
                availableOptions={availableOptions}
                className="h-full"
              />
            </div>
          </div>
        )}

        {/* Battle Mode Guide (Could be a dismissible banner) */}
        <div className="fixed bottom-6 right-6 bg-purple-100 border border-purple-200 rounded-lg p-4 shadow-lg max-w-sm hidden xl:block">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">✨</span>
            </div>
            <div>
              <h4 className="font-medium text-purple-900 text-sm">New: Battle Mode</h4>
              <p className="text-purple-700 text-xs mt-1">
                Select fragrances and compare them head-to-head to find your perfect match.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
