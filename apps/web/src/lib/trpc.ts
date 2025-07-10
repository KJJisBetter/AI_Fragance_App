import { QueryClient } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { createTRPCQueryUtils, createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '../../../api/src/trpc/router'

// Create the main tRPC React client
export const api = createTRPCReact<AppRouter>()

// Create the tRPC vanilla client for server-side usage
export const trpcClient = api.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/trpc` : '/api/trpc',

      // Add auth header to requests
      headers: () => {
        const token = localStorage.getItem('auth_token')
        return {
          authorization: token ? `Bearer ${token}` : '',
        }
      },

      // Handle errors
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          credentials: 'include',
        })
      },
    }),
  ],

  // Transform data on the client
  transformer: undefined, // We can add superjson here if needed
})

// Create query client with React 19 optimizations
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // React 19 compatible settings
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      // Optimize mutations for React 19
      retry: 1,
      gcTime: 5 * 60 * 1000,
    },
  },
})

// Create tRPC query utils for advanced usage
export const trpcUtils = createTRPCQueryUtils({ queryClient, client: trpcClient })

// Custom hooks with React 19 optimizations
export const useFragranceSearch = (searchParams: { query: string; filters?: any }) => {
  return api.fragrances.search.useQuery(searchParams, {
    enabled: !!searchParams.query,
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
    gcTime: 5 * 60 * 1000,

    // React 19 compatible options
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

export const usePopularFragrances = (limit = 20) => {
  return api.fragrances.getPopular.useQuery(
    { limit },
    {
      staleTime: 15 * 60 * 1000, // 15 minutes for popular content
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  )
}

export const useFragranceById = (id: string) => {
  return api.fragrances.getById.useQuery(
    { id },
    {
      enabled: !!id,
      staleTime: 10 * 60 * 1000, // 10 minutes for individual fragrances
      gcTime: 20 * 60 * 1000,
    }
  )
}

export const useUserProfile = () => {
  return api.users.getProfile.useQuery(undefined, {
    staleTime: 30 * 60 * 1000, // 30 minutes for user profile
    gcTime: 60 * 60 * 1000,
  })
}

export const useUserAnalytics = () => {
  return api.users.getAnalytics.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes for analytics
    gcTime: 15 * 60 * 1000,
  })
}

export const useUserCollections = (page = 1, limit = 20) => {
  return api.collections.getAll.useQuery(
    { page, limit },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for collections
      gcTime: 10 * 60 * 1000,
      keepPreviousData: true,
    }
  )
}

export const useRandomFragrances = (count = 5) => {
  return api.fragrances.getRandom.useQuery(
    { count },
    {
      staleTime: 1 * 60 * 1000, // 1 minute for random content
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  )
}

export const useFragranceFilters = () => {
  return api.fragrances.getFilters.useQuery(undefined, {
    staleTime: 60 * 60 * 1000, // 1 hour for filters (rarely change)
    gcTime: 120 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

// Mutations
export const useCreateCollection = () => {
  return api.collections.create.useMutation({
    onSuccess: () => {
      // Invalidate collections list
      trpcUtils.collections.getAll.invalidate()
    },
  })
}

export const useUpdateProfile = () => {
  return api.users.updateProfile.useMutation({
    onSuccess: () => {
      // Invalidate user profile
      trpcUtils.users.getProfile.invalidate()
    },
  })
}

// Prefetch utilities for React 19 Suspense
export const prefetchPopularFragrances = () => {
  return trpcUtils.fragrances.getPopular.prefetch({ limit: 20 })
}

export const prefetchFragranceFilters = () => {
  return trpcUtils.fragrances.getFilters.prefetch()
}

export const prefetchUserProfile = () => {
  return trpcUtils.users.getProfile.prefetch()
}

// React 19 compatible invalidation utilities
export const invalidateFragrances = () => {
  trpcUtils.fragrances.invalidate()
}

export const invalidateUserData = () => {
  trpcUtils.users.invalidate()
  trpcUtils.collections.invalidate()
}

export const invalidateSearch = () => {
  trpcUtils.fragrances.search.invalidate()
}

// Export types for use in components
export type { AppRouter } from '../../../api/src/trpc/router'
