import type {
  AddToCollectionRequest,
  AICategorFeedbackRequest,
  AICategorizationRequest,
  APIResponse,
  AuthResponse,
  CreateBattleRequest,
  CreateCollectionRequest,
  CreateFragranceRequest,
  FragranceSearchRequest,
  LoginRequest,
  RegisterRequest,
  VoteBattleRequest,
} from '@fragrance-battle/types'
import axios, { type AxiosError, type AxiosResponse } from 'axios'

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Debug logging
console.log('🔧 API Configuration:', {
  baseURL: import.meta.env.VITE_API_URL || '/api',
  environment: import.meta.env.MODE,
})

// Request interceptor to add auth token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }

    // Extract error message from backend response format
    if (error.response?.data && typeof error.response.data === 'object') {
      const errorData = error.response.data as any
      if (errorData.error?.message) {
        const enhancedError = new Error(errorData.error.message)
        enhancedError.name = errorData.error.code || 'API_ERROR'
        return Promise.reject(enhancedError)
      }
    }

    return Promise.reject(error)
  }
)

// Generic API response handler
const handleApiResponse = <T>(response: AxiosResponse<APIResponse<T>>): T => {
  if (response.data.success) {
    return response.data.data!
  }
  throw new Error(response.data.error?.message || 'Unknown error')
}

// Auth API
export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<APIResponse<AuthResponse>>('/auth/login', data)
    return handleApiResponse(response)
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<APIResponse<AuthResponse>>('/auth/register', data)
    return handleApiResponse(response)
  },

  getCurrentUser: async () => {
    const response = await api.get<APIResponse<{ user: AuthResponse['user'] }>>('/auth/me')
    return handleApiResponse(response)
  },

  updateProfile: async (data: { username?: string; email?: string }) => {
    const response = await api.put<APIResponse<{ user: AuthResponse['user'] }>>('/auth/me', data)
    return handleApiResponse(response)
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const response = await api.put<APIResponse<{ message: string }>>('/auth/change-password', data)
    return handleApiResponse(response)
  },
}

// Fragrances API
export const fragrancesApi = {
  search: async (params: FragranceSearchRequest) => {
    const response = await api.post('/fragrances/search', params)
    return handleApiResponse(response)
  },

  getAll: async (params?: Record<string, any>) => {
    const response = await api.get('/fragrances', { params })
    return handleApiResponse(response)
  },

  getById: async (id: string) => {
    const response = await api.get(`/fragrances/${id}`)
    return handleApiResponse(response)
  },

  create: async (data: CreateFragranceRequest) => {
    const response = await api.post('/fragrances', data)
    return handleApiResponse(response)
  },

  update: async (id: string, data: Partial<CreateFragranceRequest>) => {
    const response = await api.put(`/fragrances/${id}`, data)
    return handleApiResponse(response)
  },

  delete: async (id: string) => {
    const response = await api.delete(`/fragrances/${id}`)
    return handleApiResponse(response)
  },

  getPopular: async () => {
    const response = await api.get('/fragrances/popular/trending')
    return handleApiResponse(response)
  },

  getRandom: async (count?: number) => {
    const response = await api.get('/fragrances/random/discover', {
      params: { count },
    })
    return handleApiResponse(response)
  },

  getFilters: async () => {
    const response = await api.get('/fragrances/filters')
    return handleApiResponse(response)
  },

  searchBrands: async (query: string, limit?: number) => {
    const response = await api.get('/fragrances/brands/search', {
      params: { q: query, limit },
    })
    return handleApiResponse(response)
  },
}

// Collections API
export const collectionsApi = {
  getAll: async (params?: Record<string, any>) => {
    const response = await api.get('/collections', { params })
    return handleApiResponse(response)
  },

  getById: async (id: string) => {
    const response = await api.get(`/collections/${id}`)
    return handleApiResponse(response)
  },

  create: async (data: CreateCollectionRequest) => {
    const response = await api.post('/collections', data)
    return handleApiResponse(response)
  },

  update: async (id: string, data: Partial<CreateCollectionRequest>) => {
    const response = await api.put(`/collections/${id}`, data)
    return handleApiResponse(response)
  },

  delete: async (id: string) => {
    const response = await api.delete(`/collections/${id}`)
    return handleApiResponse(response)
  },

  addItem: async (collectionId: string, data: AddToCollectionRequest) => {
    const response = await api.post(`/collections/${collectionId}/items`, data)
    return handleApiResponse(response)
  },

  updateItem: async (
    collectionId: string,
    itemId: string,
    data: Partial<AddToCollectionRequest>
  ) => {
    const response = await api.put(`/collections/${collectionId}/items/${itemId}`, data)
    return handleApiResponse(response)
  },

  removeItem: async (collectionId: string, itemId: string) => {
    const response = await api.delete(`/collections/${collectionId}/items/${itemId}`)
    return handleApiResponse(response)
  },
}

// Battles API
export const battlesApi = {
  getAll: async (params?: Record<string, any>) => {
    const response = await api.get('/battles', { params })
    return handleApiResponse(response)
  },

  getById: async (id: string) => {
    const response = await api.get(`/battles/${id}`)
    return handleApiResponse(response)
  },

  create: async (data: CreateBattleRequest) => {
    const response = await api.post('/battles', data)
    return handleApiResponse(response)
  },

  update: async (id: string, data: Partial<CreateBattleRequest>) => {
    const response = await api.put(`/battles/${id}`, data)
    return handleApiResponse(response)
  },

  delete: async (id: string) => {
    const response = await api.delete(`/battles/${id}`)
    return handleApiResponse(response)
  },

  vote: async (battleId: string, data: VoteBattleRequest) => {
    const response = await api.post(`/battles/${battleId}/vote`, data)
    return handleApiResponse(response)
  },
}

// AI API
export const aiApi = {
  categorize: async (data: AICategorizationRequest) => {
    const response = await api.post('/ai/categorize', data)
    return handleApiResponse(response)
  },

  submitFeedback: async (data: AICategorFeedbackRequest) => {
    const response = await api.post('/ai/feedback', data)
    return handleApiResponse(response)
  },

  getFragranceCategorization: async (fragranceId: string) => {
    const response = await api.get(`/ai/categorize/${fragranceId}`)
    return handleApiResponse(response)
  },

  checkHealth: async () => {
    const response = await api.get('/ai/health')
    return handleApiResponse(response)
  },

  batchCategorize: async (fragranceIds: string[]) => {
    const response = await api.post('/ai/categorize-batch', { fragranceIds })
    return handleApiResponse(response)
  },
}

// Users API
export const usersApi = {
  getAnalytics: async () => {
    const response = await api.get('/users/analytics')
    return handleApiResponse(response)
  },

  getProfile: async () => {
    const response = await api.get('/users/profile')
    return handleApiResponse(response)
  },

  updateProfile: async (data: { username?: string; email?: string }) => {
    const response = await api.put('/users/profile', data)
    return handleApiResponse(response)
  },

  getFavorites: async (params?: Record<string, any>) => {
    const response = await api.get('/users/favorites', { params })
    return handleApiResponse(response)
  },
}

export default api
