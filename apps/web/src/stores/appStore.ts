import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { User } from '@fragrance-battle/types'

// Theme types
type Theme = 'light' | 'dark' | 'system'

// User state interface
interface UserState {
  user: Omit<User, 'passwordHash'> | null
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
}

// App state interface
interface AppState {
  // Theme state
  theme: Theme
  isDarkMode: boolean

  // User state
  user: Omit<User, 'passwordHash'> | null
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null

  // UI state
  sidebarOpen: boolean
  searchBarFocused: boolean
  showMobileMenu: boolean

  // Notifications
  notifications: Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
    timestamp: Date
  }>

  // Actions
  // Theme actions
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  updateSystemTheme: (isDark: boolean) => void

  // User actions
  setUser: (user: Omit<User, 'passwordHash'> | null) => void
  setToken: (token: string | null) => void
  setIsLoading: (loading: boolean) => void
  login: (user: Omit<User, 'passwordHash'>, token: string) => void
  logout: () => void
  updateUser: (updates: Partial<Omit<User, 'passwordHash'>>) => void

  // UI actions
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSearchBarFocused: (focused: boolean) => void
  setShowMobileMenu: (show: boolean) => void

  // Notification actions
  addNotification: (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

// Helper to detect system theme
const getSystemTheme = (): boolean => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
}

// Helper to apply theme to document
const applyTheme = (theme: Theme, systemIsDark: boolean) => {
  if (typeof window !== 'undefined') {
    const root = document.documentElement
    const isDark = theme === 'dark' || (theme === 'system' && systemIsDark)

    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    return isDark
  }
  return false
}

// Load persisted user data
const loadUserData = (): UserState => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    const userData = localStorage.getItem('user')

    if (token && userData) {
      try {
        const user = JSON.parse(userData)
        return {
          user,
          isAuthenticated: true,
          isLoading: false,
          token
        }
      } catch (error) {
        // Clear invalid data
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
      }
    }
  }

  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    token: null
  }
}

// Create the store
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => {
        const initialUserState = loadUserData()
        const initialSystemTheme = getSystemTheme()

        return {
          // Initial theme state
          theme: 'system',
          isDarkMode: initialSystemTheme,

          // Initial user state
          ...initialUserState,

          // Initial UI state
          sidebarOpen: false,
          searchBarFocused: false,
          showMobileMenu: false,

          // Initial notifications
          notifications: [],

          // Theme actions
          setTheme: (theme: Theme) => {
            const systemIsDark = getSystemTheme()
            const isDarkMode = applyTheme(theme, systemIsDark)

            set({ theme, isDarkMode })
          },

          toggleTheme: () => {
            const { theme } = get()
            const newTheme = theme === 'light' ? 'dark' : 'light'
            get().setTheme(newTheme)
          },

          updateSystemTheme: (isDark: boolean) => {
            const { theme } = get()
            if (theme === 'system') {
              const isDarkMode = applyTheme(theme, isDark)
              set({ isDarkMode })
            }
          },

          // User actions
          setUser: (user) => {
            const isAuthenticated = !!user

            if (user) {
              localStorage.setItem('user', JSON.stringify(user))
            } else {
              localStorage.removeItem('user')
            }

            set({ user, isAuthenticated })
          },

          setToken: (token) => {
            if (token) {
              localStorage.setItem('auth_token', token)
            } else {
              localStorage.removeItem('auth_token')
            }

            set({ token })
          },

          setIsLoading: (isLoading) => {
            set({ isLoading })
          },

          login: (user, token) => {
            localStorage.setItem('user', JSON.stringify(user))
            localStorage.setItem('auth_token', token)

            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false
            })
          },

          logout: () => {
            localStorage.removeItem('user')
            localStorage.removeItem('auth_token')

            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false
            })
          },

          updateUser: (updates) => {
            const { user } = get()
            if (user) {
              const updatedUser = { ...user, ...updates }
              localStorage.setItem('user', JSON.stringify(updatedUser))
              set({ user: updatedUser })
            }
          },

          // UI actions
          toggleSidebar: () => {
            set((state) => ({ sidebarOpen: !state.sidebarOpen }))
          },

          setSidebarOpen: (sidebarOpen) => {
            set({ sidebarOpen })
          },

          setSearchBarFocused: (searchBarFocused) => {
            set({ searchBarFocused })
          },

          setShowMobileMenu: (showMobileMenu) => {
            set({ showMobileMenu })
          },

          // Notification actions
          addNotification: (notification) => {
            const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
            const timestamp = new Date()

            set((state) => ({
              notifications: [
                ...state.notifications,
                { ...notification, id, timestamp }
              ]
            }))

            // Auto-remove notification after 5 seconds
            setTimeout(() => {
              get().removeNotification(id)
            }, 5000)
          },

          removeNotification: (id) => {
            set((state) => ({
              notifications: state.notifications.filter(n => n.id !== id)
            }))
          },

          clearNotifications: () => {
            set({ notifications: [] })
          }
        }
      },
      {
        name: 'app-store',
        // Only persist certain keys
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
          // Don't persist user data here - it's handled separately
        }),
      }
    ),
    {
      name: 'app-store',
    }
  )
)

// System theme listener
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const handleSystemThemeChange = (e: MediaQueryListEvent) => {
    useAppStore.getState().updateSystemTheme(e.matches)
  }

  mediaQuery.addEventListener('change', handleSystemThemeChange)

  // Initial theme application
  const { theme } = useAppStore.getState()
  applyTheme(theme, mediaQuery.matches)
}

// Selector hooks for performance
export const useTheme = () => useAppStore((state) => ({
  theme: state.theme,
  isDarkMode: state.isDarkMode,
  setTheme: state.setTheme,
  toggleTheme: state.toggleTheme,
}))

export const useUser = () => useAppStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  token: state.token,
  setUser: state.setUser,
  setToken: state.setToken,
  setIsLoading: state.setIsLoading,
  login: state.login,
  logout: state.logout,
  updateUser: state.updateUser,
}))

export const useUI = () => useAppStore((state) => ({
  sidebarOpen: state.sidebarOpen,
  searchBarFocused: state.searchBarFocused,
  showMobileMenu: state.showMobileMenu,
  toggleSidebar: state.toggleSidebar,
  setSidebarOpen: state.setSidebarOpen,
  setSearchBarFocused: state.setSearchBarFocused,
  setShowMobileMenu: state.setShowMobileMenu,
}))

export const useNotifications = () => useAppStore((state) => ({
  notifications: state.notifications,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
}))

// Export the store for external access
export default useAppStore
