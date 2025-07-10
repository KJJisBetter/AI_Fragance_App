import { useCallback, useEffect, useRef, useState } from 'react'

interface UseInfiniteScrollProps {
  hasMore: boolean
  isLoading: boolean
  threshold?: number
  rootMargin?: string
  onLoadMore: () => void
}

export const useInfiniteScroll = ({
  hasMore,
  isLoading,
  threshold = 1.0,
  rootMargin = '200px',
  onLoadMore,
}: UseInfiniteScrollProps) => {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Callback for when the sentinel element becomes visible
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      setIsVisible(entry.isIntersecting)

      if (entry.isIntersecting && hasMore && !isLoading) {
        onLoadMore()
      }
    },
    [hasMore, isLoading, onLoadMore]
  )

  // Set up the intersection observer
  useEffect(() => {
    const currentLoadingRef = loadingRef.current

    if (!currentLoadingRef) return

    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin,
    })

    observerRef.current.observe(currentLoadingRef)

    return () => {
      if (observerRef.current && currentLoadingRef) {
        observerRef.current.unobserve(currentLoadingRef)
      }
    }
  }, [handleIntersection, threshold, rootMargin])

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  return {
    loadingRef,
    isVisible,
  }
}

// Hook for managing infinite scroll state and data
interface UseInfiniteDataProps<T> {
  fetchData: (page: number) => Promise<{
    items: T[]
    hasMore: boolean
    totalCount: number
  }>
  dependencies?: any[]
  initialPage?: number
}

export const useInfiniteData = <T>({
  fetchData,
  dependencies = [],
  initialPage = 1,
}: UseInfiniteDataProps<T>) => {
  const [data, setData] = useState<T[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalCount, setTotalCount] = useState(0)

  // Reset data when dependencies change
  const resetData = useCallback(() => {
    setData([])
    setCurrentPage(initialPage)
    setHasMore(true)
    setError(null)
    setTotalCount(0)
  }, [initialPage])

  // Load more data
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchData(currentPage)

      setData(prevData =>
        currentPage === initialPage ? result.items : [...prevData, ...result.items]
      )

      setHasMore(result.hasMore)
      setTotalCount(result.totalCount)
      setCurrentPage(prev => prev + 1)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      setError(errorMessage)
      console.error('Infinite scroll error:', err)
    } finally {
      setIsLoading(false)
      setIsInitialLoading(false)
    }
  }, [currentPage, fetchData, hasMore, initialPage, isLoading])

  // Initial load and reset when dependencies change
  useEffect(() => {
    resetData()
    setIsInitialLoading(true)
    // Use setTimeout to ensure state is reset before loading
    const timeoutId = setTimeout(() => {
      loadMore()
    }, 0)

    return () => clearTimeout(timeoutId)
  }, dependencies)

  // Force refresh
  const refresh = useCallback(() => {
    resetData()
    setIsInitialLoading(true)
    setTimeout(() => {
      loadMore()
    }, 0)
  }, [resetData, loadMore])

  return {
    data,
    hasMore,
    isLoading,
    isInitialLoading,
    error,
    totalCount,
    currentPage,
    loadMore,
    refresh,
    resetData,
  }
}

// Debounced infinite scroll hook to prevent rapid API calls
export const useDebouncedInfiniteScroll = ({
  hasMore,
  isLoading,
  onLoadMore,
  delay = 300,
  threshold = 1.0,
  rootMargin = '200px',
}: UseInfiniteScrollProps & { delay?: number }) => {
  const [debouncedLoadMore, setDebouncedLoadMore] = useState<() => void>(() => () => {})

  // Debounce the load more function
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLoadMore(() => onLoadMore)
    }, delay)

    return () => clearTimeout(timer)
  }, [onLoadMore, delay])

  return useInfiniteScroll({
    hasMore,
    isLoading,
    threshold,
    rootMargin,
    onLoadMore: debouncedLoadMore,
  })
}
