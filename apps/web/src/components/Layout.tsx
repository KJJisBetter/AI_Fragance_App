import { Search } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useClickAway } from 'react-use'
import { useGlobalSearch } from '../hooks/useGlobalSearch'
import { fragrancesApi } from '../lib/api'
import { searchAnalytics } from '../lib/searchAnalytics'
import { useAppStore } from '../stores/appStore'
import { useSearchStore } from '../stores/searchStore'

export const Layout = () => {
  // Use individual selectors to avoid infinite loops
  const user = useAppStore(state => state.user)
  const isAuthenticated = useAppStore(state => state.isAuthenticated)
  const logout = useAppStore(state => state.logout)

  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // State for the global search bar
  const [search, setSearch] = React.useState('')
  const [searchInitiated, setSearchInitiated] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // State for suggestions
  const [suggestions, setSuggestions] = React.useState<any[]>([])
  // Add a loading flag for API suggestions
  const [isSuggestLoading, setIsSuggestLoading] = React.useState(false)
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const suggestionsRef = React.useRef(null)

  // Brand list for suggestions
  const [brandList, setBrandList] = useState<string[]>([])

  // fetch brand list once
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const res = (await fragrancesApi.getFilters()) as any
        setBrandList(res?.brands?.map((b: any) => b.name) || [])
      } catch (err) {
        console.error('Failed to load brand list', err)
      }
    }
    loadBrands()
  }, [])

  // Debounced effect to build suggestions list: combine analytics + live API suggestions
  React.useEffect(() => {
    if (!search.trim() || searchInitiated) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      // 1. Start with analytics suggestions
      const all = searchAnalytics.getAllSuggestions(search)
      const flatAnalytics = [...all.completions, ...all.trending, ...all.popular, ...all.recent]

      // 1b. Brand name matches
      const queryLower = search.toLowerCase()
      const brandMatches = brandList
        .filter(b => b.toLowerCase().includes(queryLower))
        .slice(0, 5)
        .map(b => ({ query: b, type: 'brand' }))

      // 2. Fetch live API suggestions (top fragrances matching the query)
      try {
        setIsSuggestLoading(true)
        const resp = (await fragrancesApi.search(
          {
            query: search,
            limit: 5,
            page: 1,
          },
          { signal: controller.signal }
        )) as any

        const fragrances = resp?.fragrances ?? []

        const apiSuggestions = fragrances.map((f: any) => ({
          query: f.name,
          type: 'fragrance',
          id: f.id,
          brand: f.brand,
        }))

        // 3. Combine & dedupe (brands, api, analytics)
        const combined = [...brandMatches, ...apiSuggestions, ...flatAnalytics]
        const seen = new Set<string>()
        const unique = combined.filter(s => {
          if (seen.has(s.query)) return false
          seen.add(s.query)
          return true
        })

        setSuggestions(unique)
        setShowSuggestions(unique.length > 0)
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Suggestion API error:', err)
        }
      } finally {
        setIsSuggestLoading(false)
      }
    }, 250) // debounce 250ms

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [search, searchInitiated])

  // Keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      // On Enter, perform search with current text value (do not auto-pick suggestion)
      handleSearchSubmit(e as any)
    }
  }

  // Click outside to close suggestions
  useClickAway(suggestionsRef, () => setShowSuggestions(false))

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: any) => {
    setSearch(suggestion.query)
    setShowSuggestions(false) // Ensure suggestions close on click
    setSearchInitiated(true)
    inputRef.current?.blur() // remove focus from input

    // If we have a fragrance ID from the API, go straight to its detail page, otherwise go
    // to the list view filtered by the query.
    if (suggestion.id) {
      navigate(`/fragrances/${suggestion.id}`)
    } else {
      navigate(`/fragrances?search=${encodeURIComponent(suggestion.query)}`)
    }
  }

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowSuggestions(false)
    setSearchInitiated(true)
    inputRef.current?.blur() // remove focus from input
    if (search.trim()) {
      navigate(`/fragrances?search=${encodeURIComponent(search.trim())}`)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: '#1e293b',
          color: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
      >
        {/* Top Navigation Bar */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 32px',
            maxWidth: '1200px',
            margin: '0 auto',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Logo + Tagline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link
              to="/"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '1.5rem',
                fontWeight: 'bold',
              }}
            >
              <span style={{ fontSize: '1.8rem' }}>🧪</span>
              <span>Fragrance Battle AI</span>
            </Link>
            <span
              style={{
                fontSize: '0.9rem',
                color: '#cbd5e1',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              Discover your perfect scent
            </span>
          </div>

          {/* Global Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            style={{
              flex: 1,
              maxWidth: 480,
              margin: '0 32px',
              display: 'flex',
              alignItems: 'center',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid #e5e7eb',
              padding: '4px 16px',
            }}
          >
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search for perfumes, brands, collections..."
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setSelectedIndex(0)
                setSearchInitiated(false)
              }}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '1.1rem',
                background: 'transparent',
                color: '#1e293b',
              }}
              autoComplete="off"
            />
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  zIndex: 1001,
                  maxHeight: 320,
                  overflowY: 'auto',
                  marginTop: 2,
                }}
              >
                {suggestions.map((s, i) => (
                  <div
                    key={s.query + i}
                    onClick={() => handleSuggestionClick(s)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    style={{
                      padding: '12px 20px',
                      background: i === selectedIndex ? '#f1f5f9' : 'white',
                      color: '#1e293b',
                      cursor: 'pointer',
                      fontWeight: 500,
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>🔍</span>
                    <span>{s.query}</span>
                    <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
                      {s.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button
              type="submit"
              style={{
                background: '#1e293b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                marginLeft: '8px',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              Search
            </button>
          </form>

          {/* Navigation Links */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            <Link
              to="/battles"
              style={{
                textDecoration: 'none',
                color: 'white',
                fontWeight: '500',
                transition: 'color 0.2s',
                padding: '8px 0',
              }}
              onMouseOver={e => ((e.target as HTMLElement).style.color = '#94a3b8')}
              onMouseOut={e => ((e.target as HTMLElement).style.color = 'white')}
            >
              Battles
            </Link>
            <Link
              to="/collections"
              style={{
                textDecoration: 'none',
                color: 'white',
                fontWeight: '500',
                transition: 'color 0.2s',
                padding: '8px 0',
              }}
              onMouseOver={e => ((e.target as HTMLElement).style.color = '#94a3b8')}
              onMouseOut={e => ((e.target as HTMLElement).style.color = 'white')}
            >
              Collections
            </Link>
          </div>

          {/* Auth Section */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {isAuthenticated ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'white',
                    fontSize: '14px',
                  }}
                >
                  <span>👤 {user?.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    textDecoration: 'none',
                    color: 'white',
                    padding: '8px 16px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '6px',
                    fontWeight: '500',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    display: 'inline-block',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                  onMouseOver={e => {
                    ;(e.target as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.1)'
                    ;(e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)'
                  }}
                  onMouseOut={e => {
                    ;(e.target as HTMLElement).style.backgroundColor = 'transparent'
                    ;(e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)'
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  style={{
                    textDecoration: 'none',
                    color: 'white',
                    padding: '8px 16px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '6px',
                    fontWeight: '500',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    display: 'inline-block',
                  }}
                  onMouseOver={e => {
                    ;(e.target as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.1)'
                    ;(e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)'
                  }}
                  onMouseOut={e => {
                    ;(e.target as HTMLElement).style.backgroundColor = 'transparent'
                    ;(e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)'
                  }}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  style={{
                    textDecoration: 'none',
                    color: '#1e293b',
                    backgroundColor: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    display: 'inline-block',
                  }}
                  onMouseOver={e => {
                    ;(e.target as HTMLElement).style.backgroundColor = '#f1f5f9'
                    ;(e.target as HTMLElement).style.transform = 'translateY(-1px)'
                  }}
                  onMouseOut={e => {
                    ;(e.target as HTMLElement).style.backgroundColor = 'white'
                    ;(e.target as HTMLElement).style.transform = 'translateY(0)'
                  }}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>
        {/* Gradient separator */}
        <div
          style={{ height: 4, background: 'linear-gradient(90deg,#667eea 0%,#764ba2 100%)' }}
        ></div>
      </header>

      {/* Main Content */}
      <main
        style={{
          padding: '32px',
          maxWidth: '1200px',
          margin: '0 auto',
          minHeight: 'calc(100vh - 120px)',
        }}
      >
        <Outlet />
      </main>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: '#1e293b',
          color: 'white',
          padding: '24px 32px',
          marginTop: 'auto',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            textAlign: 'center',
            fontSize: '14px',
            opacity: 0.8,
          }}
        >
          <p style={{ margin: 0 }}>
            © 2024 Fragrance Battle AI. Powered by AI for fragrance enthusiasts.
          </p>
        </div>
      </footer>
    </div>
  )
}
