import React, { useState } from 'react'
import { Grid, List, Swords, Heart, Filter, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FragranceCard } from '@/components/fragrance/FragranceCard'
import { formatDisplayName, getConcentrationAbbreviation } from '@/utils/fragrance'
import type { Fragrance } from '@fragrance-battle/types'

interface SearchResultsProps {
  fragrances: Fragrance[]
  totalCount: number
  isLoading?: boolean
  searchQuery?: string
  onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  onToggleFilters?: () => void
  currentSort?: { sortBy: string; sortOrder: 'asc' | 'desc' }
  className?: string
  // Pagination props
  currentPage?: number
  totalPages?: number
  isLoadingMore?: boolean
  onLoadMore?: () => void
  onLoadPage?: (page: number) => void
}

type ViewMode = 'grid' | 'list'
type CardVariant = 'default' | 'luxury' | 'compact' | 'battle'

export const SearchResults: React.FC<SearchResultsProps> = ({
  fragrances,
  totalCount,
  isLoading = false,
  searchQuery,
  onSort,
  onToggleFilters,
  currentSort = { sortBy: 'relevance', sortOrder: 'desc' },
  className,
  // Pagination props
  currentPage = 1,
  totalPages = 1,
  isLoadingMore = false,
  onLoadMore,
  onLoadPage,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [cardVariant, setCardVariant] = useState<CardVariant>('default')
  const [battleMode, setBattleMode] = useState(false)
  const [selectedForBattle, setSelectedForBattle] = useState<Fragrance[]>([])

  // Sort options
  const sortOptions = [
    { value: 'relevance', label: 'Relevance', order: 'desc' },
    { value: 'rating', label: 'Highest Rated', order: 'desc' },
    { value: 'year', label: 'Newest', order: 'desc' },
    { value: 'name', label: 'A-Z', order: 'asc' },
    { value: 'brand', label: 'Brand A-Z', order: 'asc' },
    { value: 'popularity', label: 'Most Popular', order: 'desc' },
  ]

  const handleSortChange = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    onSort?.(sortBy, sortOrder)
  }

  const handleAddToBattle = (fragrance: Fragrance) => {
    if (selectedForBattle.length < 8 && !selectedForBattle.find(f => f.id === fragrance.id)) {
      setSelectedForBattle(prev => [...prev, fragrance])
    }
  }

  const handleRemoveFromBattle = (fragranceId: string) => {
    setSelectedForBattle(prev => prev.filter(f => f.id !== fragranceId))
  }

  const handleAddToWishlist = (fragrance: Fragrance) => {
    // TODO: Implement wishlist functionality
    console.log('Add to wishlist:', fragrance.name)
  }

  // Loading skeleton
  const LoadingGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-slate-200 rounded-xl h-80 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-slate-200 rounded w-1/3"></div>
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  )

  // Empty state
  const EmptyState = () => (
    <div className="text-center py-16">
      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
        <span className="text-4xl opacity-50">🧪</span>
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-2">
        {searchQuery ? `No fragrances found for "${searchQuery}"` : 'No fragrances found'}
      </h3>
      <p className="text-slate-600 max-w-md mx-auto mb-6">
        Try adjusting your search terms or filters to find the perfect fragrance.
      </p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Clear all filters
      </Button>
    </div>
  )

  return (
    <div className={cn('space-y-6', className)}>
      {/* Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        {/* Results Count and Search Query */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {totalCount.toLocaleString()} Fragrances
            </h2>
            {searchQuery && (
              <Badge variant="outline" className="text-slate-600">
                for "{searchQuery}"
              </Badge>
            )}
          </div>
          {battleMode && selectedForBattle.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-purple-700">
              <Swords className="w-4 h-4" />
              {selectedForBattle.length} fragrances selected for battle
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'grid'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:text-slate-900'
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'list'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:text-slate-900'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Battle Mode Toggle */}
          <Button
            variant={battleMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBattleMode(!battleMode)}
            className={battleMode ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            <Swords className="w-4 h-4 mr-2" />
            Battle Mode
          </Button>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={`${currentSort.sortBy}-${currentSort.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-')
                handleSortChange(sortBy, sortOrder as 'asc' | 'desc')
              }}
              className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-1"
            >
              {sortOptions.map((option) => (
                <option key={`${option.value}-${option.order}`} value={`${option.value}-${option.order}`}>
                  {option.label}
                </option>
              ))}
            </select>
            <SlidersHorizontal className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Filter Toggle (Mobile) */}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFilters}
            className="sm:hidden"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Battle Selection Bar */}
      {battleMode && selectedForBattle.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-purple-900">Battle Selection</h4>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
              Start Battle ({selectedForBattle.length})
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedForBattle.map((fragrance) => (
              <Badge
                key={fragrance.id}
                variant="secondary"
                className="bg-purple-100 text-purple-800 hover:bg-purple-200 cursor-pointer"
                onClick={() => handleRemoveFromBattle(fragrance.id)}
              >
                {formatDisplayName(fragrance.brand)} {formatDisplayName(fragrance.name)}
                <span className="ml-1">×</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Results Grid/List */}
      {isLoading ? (
        <LoadingGrid />
      ) : fragrances.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          )}
        >
          {fragrances.map((fragrance) => (
            <FragranceCard
              key={fragrance.id}
              fragrance={fragrance}
              variant={battleMode ? 'battle' : cardVariant}
              size={viewMode === 'list' ? 'sm' : 'md'}
              showBattleActions={battleMode}
              onAddToBattle={handleAddToBattle}
              onAddToWishlist={handleAddToWishlist}
              className={viewMode === 'list' ? 'flex' : ''}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
          {/* Page Info */}
          <div className="text-sm text-slate-600">
            Showing {((currentPage - 1) * 24) + 1} to {Math.min(currentPage * 24, totalCount)} of {totalCount.toLocaleString()} fragrances
          </div>

          {/* Pagination Buttons */}
          <div className="flex items-center gap-2">
            {/* Previous Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onLoadPage?.(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
            >
              Previous
            </Button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {/* First page */}
              {currentPage > 3 && (
                <>
                  <Button
                    variant={1 === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onLoadPage?.(1)}
                    disabled={isLoading}
                  >
                    1
                  </Button>
                  {currentPage > 4 && <span className="text-slate-400 px-2">...</span>}
                </>
              )}

              {/* Current page and neighbors */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                if (page > totalPages) return null

                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onLoadPage?.(page)}
                    disabled={isLoading}
                    className={page === currentPage ? 'bg-slate-900 text-white' : ''}
                  >
                    {page}
                  </Button>
                )
              })}

              {/* Last page */}
              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && <span className="text-slate-400 px-2">...</span>}
                  <Button
                    variant={totalPages === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onLoadPage?.(totalPages)}
                    disabled={isLoading}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>

            {/* Next Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onLoadPage?.(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
            >
              Next
            </Button>
          </div>

          {/* Load More Button (Alternative) */}
          {currentPage < totalPages && onLoadMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="sm:hidden"
            >
              {isLoadingMore ? 'Loading...' : 'Load More'}
            </Button>
          )}
        </div>
      )}

      {/* Load More Loading State */}
      {isLoadingMore && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      )}

      {/* Load More / Pagination could go here */}
    </div>
  )
}
