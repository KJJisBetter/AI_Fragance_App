import { CollectionItem, type CollectionWithItems, Fragrance } from '@fragrance-battle/types'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { collectionsApi } from '../lib/api'

export const CollectionDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [collection, setCollection] = useState<CollectionWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set())

  // Fetch collection data
  useEffect(() => {
    const fetchCollection = async () => {
      if (!id) {
        setError('Invalid collection ID')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        console.log(`🔍 Fetching collection with ID: ${id}`)

        const collectionData = await collectionsApi.getById(id)
        setCollection(collectionData as CollectionWithItems)
        setEditName(collectionData.name)
        setEditDescription(collectionData.description || '')
      } catch (err) {
        console.error('❌ Error fetching collection:', err)
        if (err instanceof Error && err.message.includes('404')) {
          setError('Collection not found')
        } else {
          setError(
            `Failed to load collection: ${err instanceof Error ? err.message : 'Unknown error'}`
          )
        }
      } finally {
        setLoading(false)
      }
    }

    fetchCollection()
  }, [id])

  // Save collection changes
  const handleSave = async () => {
    if (!collection) return

    try {
      setSaving(true)
      const updatedCollection = await collectionsApi.update(collection.id, {
        name: editName,
        description: editDescription,
      })
      setCollection(updatedCollection as CollectionWithItems)
      setEditMode(false)
    } catch (err) {
      console.error('Error updating collection:', err)
      alert(`Failed to update collection: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  // Remove fragrance from collection
  const handleRemoveItem = async (itemId: string) => {
    if (!collection) return

    const confirmed = window.confirm(
      'Are you sure you want to remove this fragrance from your collection?'
    )
    if (!confirmed) return

    try {
      setDeletingItems(prev => new Set(prev).add(itemId))
      await collectionsApi.removeItem(collection.id, itemId)

      // Update local state
      setCollection(prev =>
        prev
          ? {
              ...prev,
              items: prev.items.filter(item => item.id !== itemId),
            }
          : null
      )
    } catch (err) {
      console.error('Error removing item:', err)
      alert(`Failed to remove fragrance: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setDeletingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  // Calculate analytics
  const getAnalytics = () => {
    if (!collection) return null

    const items = collection.items
    const totalItems = items.length
    const ratedItems = items.filter(item => item.personalRating).length
    const averageRating =
      ratedItems > 0
        ? items.reduce((sum, item) => sum + (item.personalRating || 0), 0) / ratedItems
        : 0

    // Brand distribution
    const brandCounts = items.reduce(
      (acc, item) => {
        const brand = item.fragrance.brand
        acc[brand] = (acc[brand] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const topBrands = Object.entries(brandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    // Year distribution
    const yearCounts = items.reduce(
      (acc, item) => {
        const year = item.fragrance.year
        if (year) {
          const decade = Math.floor(year / 10) * 10
          acc[decade] = (acc[decade] || 0) + 1
        }
        return acc
      },
      {} as Record<number, number>
    )

    return {
      totalItems,
      ratedItems,
      averageRating,
      topBrands,
      yearCounts,
    }
  }

  const analytics = getAnalytics()

  // Helper functions
  const getRatingColor = (rating?: number) => {
    if (!rating) return '#94a3b8'
    if (rating >= 4.5) return '#22c55e'
    if (rating >= 4.0) return '#3b82f6'
    if (rating >= 3.5) return '#f59e0b'
    return '#ef4444'
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
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
        <p style={{ color: '#64748b', fontSize: '14px' }}>Loading collection...</p>
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
            {error.includes('not found') ? 'Collection Not Found' : 'Error Loading Collection'}
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
            to="/collections"
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
            My Collections
          </Link>
        </div>
      </div>
    )
  }

  // No collection data
  if (!collection) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ color: '#64748b' }}>No collection data available</p>
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
          to="/collections"
          style={{
            color: '#1e293b',
            textDecoration: 'none',
            fontWeight: '500',
          }}
        >
          My Collections
        </Link>
        <span>→</span>
        <span style={{ color: '#1e293b', fontWeight: '500' }}>{collection.name}</span>
      </nav>

      {/* Collection Header */}
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
            {editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Collection name"
                  style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: '#1e293b',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px',
                    width: '100%',
                  }}
                />
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="Collection description (optional)"
                  rows={3}
                  style={{
                    fontSize: '1rem',
                    color: '#64748b',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px',
                    width: '100%',
                    resize: 'vertical',
                  }}
                />
              </div>
            ) : (
              <>
                <h1
                  style={{
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    color: '#1e293b',
                    margin: '0 0 8px 0',
                    lineHeight: '1.2',
                  }}
                >
                  {collection.name}
                </h1>

                {collection.description && (
                  <p
                    style={{
                      fontSize: '1.1rem',
                      color: '#64748b',
                      margin: '0 0 16px 0',
                      lineHeight: '1.5',
                    }}
                  >
                    {collection.description}
                  </p>
                )}
              </>
            )}

            <div
              style={{
                display: 'flex',
                gap: '24px',
                flexWrap: 'wrap',
                marginTop: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
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
                  {collection.items.length} fragrances
                </span>
              </div>

              <div
                style={{
                  fontSize: '14px',
                  color: '#64748b',
                }}
              >
                Created {formatDate(collection.createdAt)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              minWidth: '200px',
            }}
          >
            {editMode ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: saving ? '#94a3b8' : '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setEditMode(false)
                    setEditName(collection.name)
                    setEditDescription(collection.description || '')
                  }}
                  disabled={saving}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'transparent',
                    color: '#64748b',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditMode(true)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#1e293b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                  }}
                >
                  Edit Collection
                </button>
                <Link
                  to="/fragrances"
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'transparent',
                    color: '#1e293b',
                    border: '2px solid #1e293b',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '14px',
                    textAlign: 'center',
                  }}
                >
                  Add Fragrances
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Collection Analytics */}
      {analytics && collection.items.length > 0 && (
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
            }}
          >
            📊 Collection Insights
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '24px',
            }}
          >
            {/* Basic Stats */}
            <div
              style={{
                textAlign: 'center',
                padding: '20px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  marginBottom: '8px',
                }}
              >
                {analytics.totalItems}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#64748b',
                }}
              >
                Total Fragrances
              </div>
            </div>

            {analytics.ratedItems > 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '20px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                }}
              >
                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: getRatingColor(analytics.averageRating),
                    marginBottom: '8px',
                  }}
                >
                  ★ {analytics.averageRating.toFixed(1)}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#64748b',
                  }}
                >
                  Average Rating
                </div>
              </div>
            )}

            {/* Top Brands */}
            <div
              style={{
                padding: '20px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
              }}
            >
              <h4
                style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '12px',
                }}
              >
                Top Brands
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {analytics.topBrands.slice(0, 3).map(([brand, count]) => (
                  <div
                    key={brand}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#64748b',
                        fontWeight: '500',
                      }}
                    >
                      {brand}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#1e293b',
                        fontWeight: '600',
                      }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {collection.items.length === 0 && (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              fontSize: '4rem',
              marginBottom: '16px',
            }}
          >
            🫙
          </div>
          <h3
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#1e293b',
              marginBottom: '8px',
            }}
          >
            No fragrances yet
          </h3>
          <p
            style={{
              color: '#64748b',
              marginBottom: '24px',
            }}
          >
            Start building your collection by adding your favorite fragrances
          </p>
          <Link
            to="/fragrances"
            style={{
              padding: '12px 24px',
              backgroundColor: '#1e293b',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
            }}
          >
            Browse Fragrances
          </Link>
        </div>
      )}

      {/* Fragrances Grid */}
      {collection.items.length > 0 && (
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
            }}
          >
            Your Fragrances ({collection.items.length})
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '24px',
            }}
          >
            {collection.items.map(item => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '20px',
                  backgroundColor: '#f8fafc',
                  position: 'relative',
                }}
              >
                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={deletingItems.has(item.id)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: deletingItems.has(item.id) ? '#94a3b8' : '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: deletingItems.has(item.id) ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                  }}
                >
                  {deletingItems.has(item.id) ? '...' : '×'}
                </button>

                {/* Fragrance Info */}
                <Link
                  to={`/fragrances/${item.fragrance.id}`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block',
                    marginBottom: '16px',
                  }}
                >
                  <h4
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      color: '#1e293b',
                      marginBottom: '4px',
                      paddingRight: '30px',
                    }}
                  >
                    {item.fragrance.name}
                  </h4>
                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: '#64748b',
                      marginBottom: '8px',
                    }}
                  >
                    {item.fragrance.brand}
                  </p>

                  {/* Community Rating */}
                  {item.fragrance.communityRating && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: getRatingColor(item.fragrance.communityRating),
                        }}
                      >
                        ★ {item.fragrance.communityRating.toFixed(1)}
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                        }}
                      >
                        Fragantica
                      </span>
                    </div>
                  )}
                </Link>

                {/* Personal Info */}
                <div
                  style={{
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {item.personalRating && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          fontWeight: '500',
                        }}
                      >
                        My Rating:
                      </span>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: getRatingColor(item.personalRating),
                        }}
                      >
                        ★ {item.personalRating}/10
                      </span>
                    </div>
                  )}

                  {item.bottleSize && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          fontWeight: '500',
                        }}
                      >
                        Bottle Size:
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#1e293b',
                          fontWeight: '500',
                        }}
                      >
                        {item.bottleSize}
                      </span>
                    </div>
                  )}

                  {item.personalNotes && (
                    <div
                      style={{
                        marginTop: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          fontWeight: '500',
                          display: 'block',
                          marginBottom: '4px',
                        }}
                      >
                        My Notes:
                      </span>
                      <p
                        style={{
                          fontSize: '12px',
                          color: '#1e293b',
                          lineHeight: '1.4',
                          backgroundColor: 'white',
                          padding: '8px',
                          borderRadius: '4px',
                          margin: '0',
                        }}
                      >
                        {item.personalNotes}
                      </p>
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: '11px',
                      color: '#94a3b8',
                      marginTop: '8px',
                    }}
                  >
                    Added {formatDate(item.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading Animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @media (max-width: 768px) {
            .collection-header {
              flex-direction: column;
              align-items: flex-start;
            }
            .collection-actions {
              width: 100%;
            }
            .collection-actions button,
            .collection-actions a {
              width: 100%;
              margin-bottom: 8px;
            }
          }
        `}
      </style>
    </div>
  )
}
