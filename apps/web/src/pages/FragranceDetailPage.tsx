import type { Collection, Fragrance } from '@fragrance-battle/types'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { collectionsApi, fragrancesApi } from '../lib/api'
import { formatDisplayName, formatConcentration } from '../utils/fragrance'
import './FragranceDetailPage.css'

export const FragranceDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [fragrance, setFragrance] = useState<Fragrance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [addingToCollection, setAddingToCollection] = useState(false)

  // Fetch fragrance data
  useEffect(() => {
    const fetchFragrance = async () => {
      if (!id) {
        setError('Invalid fragrance ID')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        console.log(`🔍 Fetching fragrance with ID: ${id}`)

        const fragranceData = await fragrancesApi.getById(id)
        setFragrance(fragranceData as Fragrance)

        // Also fetch user's collections for adding functionality
        try {
          const collectionsData = await collectionsApi.getAll()
          setCollections((collectionsData as any).collections || [])
        } catch (collectionError) {
          console.log('Collections not loaded (user may not be authenticated)')
        }
      } catch (err) {
        console.error('❌ Error fetching fragrance:', err)
        if (err instanceof Error && err.message.includes('404')) {
          setError('Fragrance not found')
        } else {
          setError(
            `Failed to load fragrance: ${err instanceof Error ? err.message : 'Unknown error'}`
          )
        }
      } finally {
        setLoading(false)
      }
    }

    fetchFragrance()
  }, [id])

  // Add to collection handler
  const handleAddToCollection = async (collectionId: string) => {
    if (!fragrance) return

    try {
      setAddingToCollection(true)
      await collectionsApi.addItem(collectionId, {
        fragranceId: fragrance.id,
      })
      setShowCollectionModal(false)
      alert('Added to collection successfully!')
    } catch (err) {
      console.error('Error adding to collection:', err)
      alert(`Failed to add to collection: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setAddingToCollection(false)
    }
  }

  // Helper functions
  const formatNotes = (notes: string[]) => {
    if (!notes || notes.length === 0) return ['Not specified']
    return notes
  }

  const getRatingColor = (rating?: number) => {
    if (!rating) return '#94a3b8'
    if (rating >= 4.5) return '#22c55e'
    if (rating >= 4.0) return '#3b82f6'
    if (rating >= 3.5) return '#f59e0b'
    return '#ef4444'
  }

  const getPerformanceColor = (value?: number) => {
    if (!value) return '#e2e8f0'
    if (value >= 8) return '#22c55e'
    if (value >= 6) return '#3b82f6'
    if (value >= 4) return '#f59e0b'
    return '#ef4444'
  }

  const getPerformanceLabel = (value?: number) => {
    if (!value) return 'Unknown'
    if (value >= 8) return 'Excellent'
    if (value >= 6) return 'Good'
    if (value >= 4) return 'Moderate'
    return 'Poor'
  }

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          flexDirection: 'column',
          gap: '16px',
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
        <p style={{ color: '#64748b', fontSize: '14px' }}>Loading fragrance details...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <h2
            style={{
              color: '#dc2626',
              fontSize: '1.5rem',
              marginBottom: '8px',
            }}
          >
            {error.includes('not found') ? 'Fragrance Not Found' : 'Error Loading Fragrance'}
          </h2>
          <p style={{ color: '#dc2626', marginBottom: '0' }}>{error}</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '12px 24px',
              backgroundColor: '#1e293b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Go Back
          </button>
          <Link
            to="/fragrances"
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: '#1e293b',
              border: '2px solid #1e293b',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            Browse Fragrances
          </Link>
        </div>
      </div>
    )
  }

  // No fragrance data
  if (!fragrance) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ color: '#64748b' }}>No fragrance data available</p>
      </div>
    )
  }

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
      }}
    >
      {/* Breadcrumb Navigation */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '32px',
          fontSize: '14px',
          color: '#64748b',
        }}
      >
        <Link
          to="/fragrances"
          style={{
            color: '#1e293b',
            textDecoration: 'none',
            fontWeight: '500',
          }}
        >
          Fragrances
        </Link>
        <span>→</span>
        <span>{formatDisplayName(fragrance.brand)}</span>
        <span>→</span>
        <span style={{ color: '#1e293b', fontWeight: '500' }}>{formatDisplayName(fragrance.name)}</span>
      </nav>

      {/* FragranceHeader */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '24px',
          }}
        >
          <div style={{ flex: '1', minWidth: '300px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
                flexWrap: 'wrap',
              }}
            >
              <h1
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  margin: '0',
                  lineHeight: '1.2',
                }}
              >
                {formatDisplayName(fragrance.name)}
              </h1>
              {fragrance.verified && (
                <span
                  style={{
                    backgroundColor: '#22c55e',
                    color: 'white',
                    fontSize: '12px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontWeight: '600',
                  }}
                >
                  ✓ VERIFIED
                </span>
              )}
            </div>

            <h2
              style={{
                fontSize: '1.5rem',
                color: '#64748b',
                margin: '0 0 16px 0',
                fontWeight: '500',
              }}
            >
                                by {formatDisplayName(fragrance.brand)}
            </h2>

            <div
              style={{
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              {fragrance.year && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      color: '#64748b',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    Year:
                  </span>
                  <span
                    style={{
                      backgroundColor: '#1e293b',
                      color: 'white',
                      fontSize: '14px',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontWeight: '600',
                    }}
                  >
                    {fragrance.year}
                  </span>
                </div>
              )}

              {fragrance.concentration && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      color: '#64748b',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    Type:
                  </span>
                  <span
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      fontSize: '14px',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontWeight: '600',
                    }}
                  >
                    {formatConcentration(fragrance.concentration)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              minWidth: '200px',
            }}
          >
            <button
              onClick={() => setShowCollectionModal(true)}
              disabled={collections.length === 0}
              style={{
                padding: '12px 24px',
                backgroundColor: collections.length > 0 ? '#1e293b' : '#94a3b8',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: collections.length > 0 ? 'pointer' : 'not-allowed',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              + Add to Collection
            </button>

            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                                          title: `${formatDisplayName(fragrance.name)} by ${formatDisplayName(fragrance.brand)}`,
                    url: window.location.href,
                  })
                } else {
                  navigator.clipboard.writeText(window.location.href)
                  alert('Link copied to clipboard!')
                }
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: '#1e293b',
                border: '2px solid #1e293b',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="fragrance-detail-grid">
        {/* FragranceNotes - Note Pyramid */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          <h3
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#1e293b',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            🎭 Fragrance Pyramid
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top Notes */}
            <div
              style={{
                backgroundColor: '#fef3c7',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                border: '2px solid #f59e0b',
              }}
            >
              <h4
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  color: '#92400e',
                  marginBottom: '12px',
                }}
              >
                ☀️ Top Notes
              </h4>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  justifyContent: 'center',
                }}
              >
                {formatNotes(fragrance.topNotes).map((note, index) => (
                  <span
                    key={index}
                    style={{
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>

            {/* Middle Notes */}
            <div
              style={{
                backgroundColor: '#dcfce7',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                border: '2px solid #22c55e',
              }}
            >
              <h4
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  color: '#166534',
                  marginBottom: '12px',
                }}
              >
                💚 Heart Notes
              </h4>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  justifyContent: 'center',
                }}
              >
                {formatNotes(fragrance.middleNotes).map((note, index) => (
                  <span
                    key={index}
                    style={{
                      backgroundColor: '#22c55e',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>

            {/* Base Notes */}
            <div
              style={{
                backgroundColor: '#e0e7ff',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                border: '2px solid #3b82f6',
              }}
            >
              <h4
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  color: '#1e40af',
                  marginBottom: '12px',
                }}
              >
                🌙 Base Notes
              </h4>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  justifyContent: 'center',
                }}
              >
                {formatNotes(fragrance.baseNotes).map((note, index) => (
                  <span
                    key={index}
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FragranceMetrics - Performance & Rating */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          <h3
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#1e293b',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            📊 Performance & Rating
          </h3>

          {/* Community Rating */}
          {fragrance.communityRating && (
            <div
              style={{
                textAlign: 'center',
                marginBottom: '32px',
                padding: '20px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  color: getRatingColor(fragrance.communityRating),
                  marginBottom: '8px',
                }}
              >
                ★ {fragrance.communityRating.toFixed(1)}
              </div>
              <p
                style={{
                  color: '#64748b',
                  fontSize: '14px',
                  fontWeight: '500',
                  margin: '0',
                }}
              >
                Fragantica Community Rating
              </p>
            </div>
          )}

          {/* Performance Metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Longevity */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1e293b',
                  }}
                >
                  ⏱️ Longevity
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    color: getPerformanceColor(fragrance.longevity),
                    fontWeight: '600',
                  }}
                >
                  {fragrance.longevity ? `${fragrance.longevity}/10` : 'N/A'}
                </span>
              </div>
              <div
                style={{
                  height: '8px',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(fragrance.longevity || 0) * 10}%`,
                    backgroundColor: getPerformanceColor(fragrance.longevity),
                    transition: 'width 0.3s ease',
                  }}
                ></div>
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  margin: '4px 0 0 0',
                }}
              >
                {getPerformanceLabel(fragrance.longevity)}
              </p>
            </div>

            {/* Sillage */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1e293b',
                  }}
                >
                  🌊 Sillage
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    color: getPerformanceColor(fragrance.sillage),
                    fontWeight: '600',
                  }}
                >
                  {fragrance.sillage ? `${fragrance.sillage}/10` : 'N/A'}
                </span>
              </div>
              <div
                style={{
                  height: '8px',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(fragrance.sillage || 0) * 10}%`,
                    backgroundColor: getPerformanceColor(fragrance.sillage),
                    transition: 'width 0.3s ease',
                  }}
                ></div>
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  margin: '4px 0 0 0',
                }}
              >
                {getPerformanceLabel(fragrance.sillage)}
              </p>
            </div>

            {/* Projection */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1e293b',
                  }}
                >
                  📡 Projection
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    color: getPerformanceColor(fragrance.projection),
                    fontWeight: '600',
                  }}
                >
                  {fragrance.projection ? `${fragrance.projection}/10` : 'N/A'}
                </span>
              </div>
              <div
                style={{
                  height: '8px',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(fragrance.projection || 0) * 10}%`,
                    backgroundColor: getPerformanceColor(fragrance.projection),
                    transition: 'width 0.3s ease',
                  }}
                ></div>
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  margin: '4px 0 0 0',
                }}
              >
                {getPerformanceLabel(fragrance.projection)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FragranceCategories - AI Classifications */}
      {(fragrance.aiSeasons?.length > 0 ||
        fragrance.aiOccasions?.length > 0 ||
        fragrance.aiMoods?.length > 0) && (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          <h3
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#1e293b',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            🤖 AI Classifications
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px',
            }}
          >
            {/* Seasons */}
            {fragrance.aiSeasons?.length > 0 && (
              <div>
                <h4
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  🌤️ Best Seasons
                </h4>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  {fragrance.aiSeasons.map(season => (
                    <span
                      key={season}
                      style={{
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        border: '1px solid #3b82f6',
                      }}
                    >
                      {season}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Occasions */}
            {fragrance.aiOccasions?.length > 0 && (
              <div>
                <h4
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  🎭 Perfect For
                </h4>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  {fragrance.aiOccasions.map(occasion => (
                    <span
                      key={occasion}
                      style={{
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        border: '1px solid #f59e0b',
                      }}
                    >
                      {occasion}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Moods */}
            {fragrance.aiMoods?.length > 0 && (
              <div>
                <h4
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  😊 Mood & Vibe
                </h4>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  {fragrance.aiMoods.map(mood => (
                    <span
                      key={mood}
                      style={{
                        backgroundColor: '#dcfce7',
                        color: '#166534',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        border: '1px solid #22c55e',
                      }}
                    >
                      {mood}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Battle Performance Placeholder */}
      <div
        id="battle-performance-placeholder"
        style={{
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          padding: '48px 32px',
          textAlign: 'center',
          border: '2px dashed #cbd5e1',
          marginBottom: '24px',
        }}
      >
        <h3
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#64748b',
            marginBottom: '12px',
          }}
        >
          ⚔️ Battle Performance
        </h3>
        <p
          style={{
            color: '#64748b',
            fontSize: '14px',
            marginBottom: '0',
          }}
        >
          Battle performance metrics and head-to-head comparisons will be displayed here once the
          battle system is implemented.
        </p>
      </div>

      {/* Collection Modal */}
      {showCollectionModal && (
        <div
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '1000',
            padding: '24px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
          >
            <h3
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#1e293b',
                marginBottom: '24px',
              }}
            >
              Add to Collection
            </h3>

            {collections.length === 0 ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#64748b', marginBottom: '16px' }}>
                  You don't have any collections yet.
                </p>
                <Link
                  to="/collections"
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#1e293b',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontWeight: '500',
                  }}
                >
                  Create Collection
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {collections.map(collection => (
                  <button
                    key={collection.id}
                    onClick={() => handleAddToCollection(collection.id)}
                    disabled={addingToCollection}
                    style={{
                      padding: '16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      cursor: addingToCollection ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      if (!addingToCollection) {
                        ;(e.target as HTMLElement).style.borderColor = '#1e293b'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!addingToCollection) {
                        ;(e.target as HTMLElement).style.borderColor = '#e2e8f0'
                      }
                    }}
                  >
                    <div
                      style={{
                        fontWeight: '600',
                        color: '#1e293b',
                        marginBottom: '4px',
                      }}
                    >
                      {collection.name}
                    </div>
                    {collection.description && (
                      <div
                        style={{
                          fontSize: '14px',
                          color: '#64748b',
                        }}
                      >
                        {collection.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '24px',
              }}
            >
              <button
                onClick={() => setShowCollectionModal(false)}
                disabled={addingToCollection}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: '#64748b',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  cursor: addingToCollection ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline styles are now handled by CSS file */}
    </div>
  )
}
