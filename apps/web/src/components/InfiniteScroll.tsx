import { AlertCircle, ArrowUp, Loader } from 'lucide-react'
import React from 'react'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'

interface InfiniteScrollProps {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  error?: string | null
  children?: React.ReactNode
  className?: string
  threshold?: number
  rootMargin?: string
  loadingComponent?: React.ReactNode
  errorComponent?: React.ReactNode
  endMessage?: React.ReactNode
  showBackToTop?: boolean
  onBackToTop?: () => void
}

export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  hasMore,
  isLoading,
  onLoadMore,
  error,
  children,
  className = '',
  threshold = 1.0,
  rootMargin = '200px',
  loadingComponent,
  errorComponent,
  endMessage,
  showBackToTop = true,
  onBackToTop,
}) => {
  const { loadingRef, isVisible } = useInfiniteScroll({
    hasMore,
    isLoading,
    threshold,
    rootMargin,
    onLoadMore,
  })

  const handleBackToTop = () => {
    if (onBackToTop) {
      onBackToTop()
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className={`infinite-scroll-container ${className}`}>
      {children}

      {/* Loading indicator */}
      {hasMore && (
        <div
          ref={loadingRef}
          className="infinite-scroll-sentinel py-8 flex justify-center items-center"
        >
          {isLoading &&
            (loadingComponent || (
              <div className="flex items-center space-x-2 text-gray-500">
                <Loader className="w-5 h-5 animate-spin" />
                <span>Loading more fragrances...</span>
              </div>
            ))}

          {error &&
            (errorComponent || (
              <div className="flex items-center space-x-2 text-red-500">
                <AlertCircle className="w-5 h-5" />
                <span>Failed to load more: {error}</span>
                <button
                  onClick={onLoadMore}
                  className="ml-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  Retry
                </button>
              </div>
            ))}
        </div>
      )}

      {/* End message */}
      {!hasMore && !isLoading && (
        <div className="infinite-scroll-end py-8 flex flex-col items-center space-y-4">
          {endMessage || (
            <div className="text-center text-gray-500">
              <p className="mb-2">🎉 You've reached the end!</p>
              <p className="text-sm">No more fragrances to load</p>
            </div>
          )}

          {/* Back to top button */}
          {showBackToTop && (
            <button
              onClick={handleBackToTop}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowUp className="w-4 h-4" />
              <span>Back to Top</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Specialized infinite scroll for fragrance grids
interface FragranceInfiniteScrollProps {
  fragrances: any[]
  hasMore: boolean
  isLoading: boolean
  isInitialLoading: boolean
  error?: string | null
  onLoadMore: () => void
  totalCount: number
  renderFragrance: (fragrance: any, index: number) => React.ReactNode
  className?: string
  gridClassName?: string
  emptyStateComponent?: React.ReactNode
}

export const FragranceInfiniteScroll: React.FC<FragranceInfiniteScrollProps> = ({
  fragrances,
  hasMore,
  isLoading,
  isInitialLoading,
  error,
  onLoadMore,
  totalCount,
  renderFragrance,
  className = '',
  gridClassName = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
  emptyStateComponent,
}) => {
  // Show empty state for initial load with no results
  if (!isInitialLoading && fragrances.length === 0) {
    return (
      <div className={`fragrance-infinite-scroll ${className}`}>
        {emptyStateComponent || (
          <div className="text-center py-12">
            <p className="text-gray-500">No fragrances found</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`fragrance-infinite-scroll ${className}`}>
      {/* Results summary */}
      {fragrances.length > 0 && (
        <div className="mb-6 text-sm text-gray-600">
          Showing {fragrances.length} of {totalCount} fragrances
        </div>
      )}

      <InfiniteScroll
        hasMore={hasMore}
        isLoading={isLoading}
        onLoadMore={onLoadMore}
        error={error}
        loadingComponent={
          <div className="flex items-center justify-center space-x-2 text-gray-500">
            <Loader className="w-5 h-5 animate-spin" />
            <span>Loading more fragrances...</span>
          </div>
        }
        endMessage={
          <div className="text-center text-gray-500">
            <p className="mb-2">🎉 All fragrances loaded!</p>
            <p className="text-sm">You've viewed all {totalCount} fragrances in this collection</p>
          </div>
        }
      >
        {/* Fragrance grid */}
        <div className={gridClassName}>
          {fragrances.map((fragrance, index) => (
            <div key={`${fragrance.id}-${index}`} className="fragrance-item">
              {renderFragrance(fragrance, index)}
            </div>
          ))}
        </div>
      </InfiniteScroll>
    </div>
  )
}

// Hook for scroll position tracking
export const useScrollPosition = () => {
  const [scrollY, setScrollY] = React.useState(0)
  const [isScrolled, setIsScrolled] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      setScrollY(currentScrollY)
      setIsScrolled(currentScrollY > 100)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return { scrollY, isScrolled }
}

// Floating back to top button
interface BackToTopProps {
  showThreshold?: number
  className?: string
}

export const BackToTop: React.FC<BackToTopProps> = ({ showThreshold = 300, className = '' }) => {
  const { scrollY } = useScrollPosition()
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    setIsVisible(scrollY > showThreshold)
  }, [scrollY, showThreshold])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!isVisible) return null

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 ${className}`}
      aria-label="Back to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  )
}
