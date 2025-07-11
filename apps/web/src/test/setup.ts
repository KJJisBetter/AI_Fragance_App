import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock tRPC client
vi.mock('@/lib/trpc', () => ({
  api: {
    fragrances: {
      search: {
        useQuery: vi.fn(),
        useMutation: vi.fn(),
      },
      getById: {
        useQuery: vi.fn(),
      },
      getAll: {
        useQuery: vi.fn(),
      },
      getPopular: {
        useQuery: vi.fn(),
      },
      getFilters: {
        useQuery: vi.fn(),
      },
    },
    users: {
      getProfile: {
        useQuery: vi.fn(),
      },
      updateProfile: {
        useMutation: vi.fn(),
      },
    },
    collections: {
      getAll: {
        useQuery: vi.fn(),
      },
      create: {
        useMutation: vi.fn(),
      },
    },
  },
  trpcClient: {
    fragrances: {
      search: {
        query: vi.fn(),
      },
    },
  },
  queryClient: {
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
  },
}))

// Mock Zustand stores
vi.mock('@/stores/searchStore', () => ({
  useSearchStore: vi.fn(() => ({
    query: '',
    setQuery: vi.fn(),
    filters: {},
    setFilters: vi.fn(),
    recentSearches: [],
    addRecentSearch: vi.fn(),
    preferences: {
      enableVoiceSearch: false,
      autoComplete: true,
    },
  })),
  useSearchQuery: vi.fn(() => ({
    query: '',
    setQuery: vi.fn(),
    isSearching: false,
    setIsSearching: vi.fn(),
  })),
}))

vi.mock('@/stores/appStore', () => ({
  useAppStore: vi.fn(() => ({
    theme: 'light',
    toggleTheme: vi.fn(),
    user: null,
    setUser: vi.fn(),
    sidebarOpen: false,
    toggleSidebar: vi.fn(),
  })),
}))

// Mock Voice Search API
Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    continuous: false,
    lang: 'en-US',
    interimResults: false,
    start: vi.fn(),
    stop: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
})

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: window.SpeechRecognition,
})

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  }
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
})

// Set up console.error to fail tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    originalError(...args)
    throw new Error(`Console error: ${args.join(' ')}`)
  }
})

afterAll(() => {
  console.error = originalError
})

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})
