import type { Fragrance } from '@fragrance-battle/types'
import { Clock, Search, TrendingUp, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandScroller } from '../components/BrandScroller'
import { FragranceCard } from '../components/FragranceCard'
import { fragrancesApi } from '../lib/api'
import { searchAnalytics } from '../lib/searchAnalytics'
import { useSearchStore } from '../stores/searchStore'

const featureCardStyle = {
  background: 'white',
  borderRadius: '12px',
  padding: '32px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  transition: 'all 0.3s ease',
  border: '1px solid rgba(0,0,0,0.05)',
}

const featureCardHoverStyle = {
  transform: 'translateY(-4px)',
  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
}

const buttonStyle = {
  display: 'inline-block',
  padding: '16px 32px',
  borderRadius: '8px',
  fontWeight: '600',
  fontSize: '16px',
  textDecoration: 'none',
  transition: 'all 0.2s ease',
  cursor: 'pointer',
  border: 'none',
}

const primaryButtonStyle = {
  ...buttonStyle,
  backgroundColor: '#1e293b',
  color: 'white',
}

const secondaryButtonStyle = {
  ...buttonStyle,
  backgroundColor: 'transparent',
  color: '#1e293b',
  border: '2px solid #1e293b',
}

export const HomePage = () => {
  const [popularFragrances, setPopularFragrances] = useState<Fragrance[]>([])
  const [popularLoading, setPopularLoading] = useState(true)
  const [trendingSearches, setTrendingSearches] = useState<string[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [brands, setBrands] = useState<string[]>([])

  // Get search data from Zustand store
  const recentSearchesFromStore = useSearchStore(state => state.recentSearches)
  const filterOptions = useSearchStore(state => state.filterOptions)

  // Fetch popular fragrances
  useEffect(() => {
    const fetchPopularFragrances = async () => {
      try {
        setPopularLoading(true)
        const result = await fragrancesApi.getAll({
          page: 1,
          limit: 6,
          sortBy: 'popularity',
          sortOrder: 'desc',
        })
        setPopularFragrances((result as any).fragrances)
      } catch (error) {
        console.error('Error fetching popular fragrances:', error)
      } finally {
        setPopularLoading(false)
      }
    }

    fetchPopularFragrances()

    // Also fetch brands list once
    const fetchBrands = async () => {
      try {
        const result = await fragrancesApi.getFilters()
        // result.brands is array of { name, count }
        setBrands(result.brands.map((b: any) => b.name))
      } catch (err) {
        console.error('Error fetching brand list', err)
      }
    }
    fetchBrands()
  }, [])

  // Get trending and recent searches
  useEffect(() => {
    const getSearchData = () => {
      // Get trending searches from analytics
      const trending = searchAnalytics.getTrendingSearches(6)
      setTrendingSearches(trending.map(s => s.query))

      // Get recent searches from Zustand store
      const recent = recentSearchesFromStore.slice(0, 6)
      setRecentSearches(recent.map(s => s.query))
    }

    getSearchData()
  }, [recentSearchesFromStore])

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* Stats Section */}
      <section
        style={{
          padding: '60px 32px',
          backgroundColor: 'white',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '40px',
            textAlign: 'center',
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: '#1e293b',
                marginBottom: '8px',
              }}
            >
              23,000+
            </h3>
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Fragrances in Database</p>
          </div>
          <div>
            <h3
              style={{
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: '#1e293b',
                marginBottom: '8px',
              }}
            >
              AI-Powered
            </h3>
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Smart Recommendations</p>
          </div>
          <div>
            <h3
              style={{
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: '#1e293b',
                marginBottom: '8px',
              }}
            >
              Battle Test
            </h3>
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Blind Fragrance Trials</p>
          </div>
          <div>
            <h3
              style={{
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: '#1e293b',
                marginBottom: '8px',
              }}
            >
              Collections
            </h3>
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Personal Curation</p>
          </div>
        </div>
      </section>

      {/* Popular Right Now Section */}
      <section
        style={{
          padding: '80px 32px',
          backgroundColor: 'white',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '48px',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  marginBottom: '8px',
                }}
              >
                🔥 Popular Right Now
              </h2>
              <p
                style={{
                  color: '#64748b',
                  fontSize: '1.1rem',
                }}
              >
                Discover the most loved fragrances in our community
              </p>
            </div>
            <Link
              to="/fragrances?sortBy=popularity"
              style={{
                ...primaryButtonStyle,
                padding: '12px 24px',
                fontSize: '14px',
              }}
              onMouseEnter={e => {
                ;(e.target as HTMLElement).style.backgroundColor = '#0f172a'
                ;(e.target as HTMLElement).style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                ;(e.target as HTMLElement).style.backgroundColor = '#1e293b'
                ;(e.target as HTMLElement).style.transform = 'translateY(0)'
              }}
            >
              View All Popular
            </Link>
          </div>

          {popularLoading ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '200px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid #e2e8f0',
                  borderTop: '4px solid #1e293b',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              ></div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px',
              }}
            >
              {popularFragrances.map(fragrance => (
                <FragranceCard key={fragrance.id} fragrance={fragrance} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trending & Recent Searches Section */}
      <section
        style={{
          padding: '60px 32px',
          backgroundColor: '#f8fafc',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '40px',
            }}
          >
            {/* Trending Searches */}
            <div
              style={{
                ...featureCardStyle,
                padding: '24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                <TrendingUp className="w-6 h-6 text-orange-500" />
                <h3
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#1e293b',
                    margin: 0,
                  }}
                >
                  🔥 Trending Searches
                </h3>
              </div>
              <p
                style={{
                  color: '#64748b',
                  fontSize: '1rem',
                  marginBottom: '20px',
                  lineHeight: 1.5,
                }}
              >
                See what fragrances and brands are trending in our community
              </p>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                {trendingSearches.length > 0 ? (
                  trendingSearches.map((search, index) => (
                    <Link
                      key={index}
                      to={`/fragrances?search=${encodeURIComponent(search)}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                        border: '1px solid #fde68a',
                      }}
                      onMouseEnter={e => {
                        ;(e.target as HTMLElement).style.backgroundColor = '#fde68a'
                        ;(e.target as HTMLElement).style.transform = 'translateY(-1px)'
                      }}
                      onMouseLeave={e => {
                        ;(e.target as HTMLElement).style.backgroundColor = '#fef3c7'
                        ;(e.target as HTMLElement).style.transform = 'translateY(0)'
                      }}
                    >
                      <Zap className="w-3 h-3" />
                      {search}
                    </Link>
                  ))
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    {['Sauvage', 'Aventus', 'Chanel', 'Tom Ford', 'Versace', 'Dior'].map(
                      (search, index) => (
                        <span
                          key={index}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            backgroundColor: '#f3f4f6',
                            color: '#6b7280',
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: '500',
                          }}
                        >
                          <Zap className="w-3 h-3" />
                          {search}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Searches */}
            <div
              style={{
                ...featureCardStyle,
                padding: '24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                <Clock className="w-6 h-6 text-blue-500" />
                <h3
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#1e293b',
                    margin: 0,
                  }}
                >
                  ⏰ Recent Searches
                </h3>
              </div>
              <p
                style={{
                  color: '#64748b',
                  fontSize: '1rem',
                  marginBottom: '20px',
                  lineHeight: 1.5,
                }}
              >
                Continue exploring your recent fragrance discoveries
              </p>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                {recentSearches.length > 0 ? (
                  recentSearches.map((search, index) => (
                    <Link
                      key={index}
                      to={`/fragrances?search=${encodeURIComponent(search)}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                        border: '1px solid #bfdbfe',
                      }}
                      onMouseEnter={e => {
                        ;(e.target as HTMLElement).style.backgroundColor = '#bfdbfe'
                        ;(e.target as HTMLElement).style.transform = 'translateY(-1px)'
                      }}
                      onMouseLeave={e => {
                        ;(e.target as HTMLElement).style.backgroundColor = '#dbeafe'
                        ;(e.target as HTMLElement).style.transform = 'translateY(0)'
                      }}
                    >
                      <Search className="w-3 h-3" />
                      {search}
                    </Link>
                  ))
                ) : (
                  <div
                    style={{
                      color: '#9ca3af',
                      fontSize: '14px',
                      fontStyle: 'italic',
                    }}
                  >
                    No recent searches yet. Start exploring fragrances!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        style={{
          padding: '80px 32px',
          backgroundColor: '#f8fafc',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '60px',
              color: '#1e293b',
            }}
          >
            Everything You Need to Discover Fragrances
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '40px',
            }}
          >
            <div
              style={featureCardStyle}
              onMouseEnter={e => {
                Object.assign((e.target as HTMLElement).style, featureCardHoverStyle)
              }}
              onMouseLeave={e => {
                Object.assign((e.target as HTMLElement).style, featureCardStyle)
              }}
            >
              <div
                style={{
                  fontSize: '3rem',
                  marginBottom: '20px',
                }}
              >
                🤖
              </div>
              <h3
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginBottom: '16px',
                  color: '#1e293b',
                }}
              >
                AI-Powered Categorization
              </h3>
              <p
                style={{
                  color: '#64748b',
                  lineHeight: 1.6,
                  fontSize: '1rem',
                }}
              >
                Our advanced AI analyzes fragrance notes and characteristics to provide intelligent
                categorization and personalized recommendations.
              </p>
            </div>

            <div
              style={featureCardStyle}
              onMouseEnter={e => {
                Object.assign((e.target as HTMLElement).style, featureCardHoverStyle)
              }}
              onMouseLeave={e => {
                Object.assign((e.target as HTMLElement).style, featureCardStyle)
              }}
            >
              <div
                style={{
                  fontSize: '3rem',
                  marginBottom: '20px',
                }}
              >
                ⚔️
              </div>
              <h3
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginBottom: '16px',
                  color: '#1e293b',
                }}
              >
                Fragrance Battles
              </h3>
              <p
                style={{
                  color: '#64748b',
                  lineHeight: 1.6,
                  fontSize: '1rem',
                }}
              >
                Test your preferences with blind fragrance battles. Compare scents side-by-side and
                discover what you truly love.
              </p>
            </div>

            <div
              style={featureCardStyle}
              onMouseEnter={e => {
                Object.assign((e.target as HTMLElement).style, featureCardHoverStyle)
              }}
              onMouseLeave={e => {
                Object.assign((e.target as HTMLElement).style, featureCardStyle)
              }}
            >
              <div
                style={{
                  fontSize: '3rem',
                  marginBottom: '20px',
                }}
              >
                📚
              </div>
              <h3
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginBottom: '16px',
                  color: '#1e293b',
                }}
              >
                Personal Collections
              </h3>
              <p
                style={{
                  color: '#64748b',
                  lineHeight: 1.6,
                  fontSize: '1rem',
                }}
              >
                Build and organize your fragrance collection. Track your favorites, wishlist items,
                and share discoveries with the community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Brand scroller */}
      <section style={{ background: 'white', padding: '40px 32px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '1.75rem',
              fontWeight: 'bold',
              color: '#1e293b',
              marginBottom: '16px',
            }}
          >
            Shop by Brand
          </h2>
          {brands.length > 0 && <BrandScroller brands={brands.map(b => ({ name: b }))} />}
        </div>
      </section>

      {/* CTA Section */}
      <section
        style={{
          padding: '80px 32px',
          backgroundColor: '#1e293b',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              marginBottom: '24px',
            }}
          >
            Ready to Find Your Signature Scent?
          </h2>
          <p
            style={{
              fontSize: '1.2rem',
              marginBottom: '40px',
              opacity: 0.9,
            }}
          >
            Join thousands of fragrance enthusiasts using AI to discover their perfect match.
          </p>
          <Link
            to="/register"
            style={{
              ...primaryButtonStyle,
              backgroundColor: 'white',
              color: '#1e293b',
              fontSize: '18px',
              padding: '18px 36px',
            }}
            onMouseEnter={e => {
              ;(e.target as HTMLElement).style.backgroundColor = '#f1f5f9'
              ;(e.target as HTMLElement).style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              ;(e.target as HTMLElement).style.backgroundColor = 'white'
              ;(e.target as HTMLElement).style.transform = 'translateY(0)'
            }}
          >
            Start Your Journey
          </Link>
        </div>
      </section>

      {/* Add CSS animation for spinner */}
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
