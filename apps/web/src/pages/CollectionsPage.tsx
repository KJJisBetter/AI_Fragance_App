import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collectionsApi } from "../lib/api";
import { CollectionWithItems } from "@fragrance-battle/types";

export const CollectionsPage = () => {
  const [collections, setCollections] = useState<CollectionWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  // Create collection form
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");

  // Fetch collections
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("🔍 Fetching user collections...");

        const collectionsData = await collectionsApi.getAll();
        setCollections((collectionsData as any).collections || []);

      } catch (err) {
        console.error("❌ Error fetching collections:", err);
        setError(`Failed to load collections: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);

  // Create new collection
  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      alert("Please enter a collection name");
      return;
    }

    try {
      setCreating(true);
      const newCollection = await collectionsApi.create({
        name: newCollectionName.trim(),
        description: newCollectionDescription.trim() || undefined
      });

      setCollections(prev => [newCollection as CollectionWithItems, ...prev]);
      setShowCreateModal(false);
      setNewCollectionName("");
      setNewCollectionDescription("");

    } catch (err) {
      console.error("Error creating collection:", err);
      alert(`Failed to create collection: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  // Delete collection
  const handleDeleteCollection = async (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${collection.name}"? This will remove all ${collection.items?.length || 0} fragrances from this collection.`
    );
    if (!confirmed) return;

    try {
      setDeleting(prev => new Set(prev).add(collectionId));
      await collectionsApi.delete(collectionId);
      setCollections(prev => prev.filter(c => c.id !== collectionId));
    } catch (err) {
      console.error("Error deleting collection:", err);
      alert(`Failed to delete collection: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeleting(prev => {
        const newSet = new Set(prev);
        newSet.delete(collectionId);
        return newSet;
      });
    }
  };

  // Helper functions
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTotalFragrances = () => {
    return collections.reduce((total, collection) => total + (collection.items?.length || 0), 0);
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
        flexDirection: "column",
        gap: "16px"
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "4px solid #e2e8f0",
          borderTop: "4px solid #1e293b",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}></div>
        <p style={{ color: "#64748b", fontSize: "14px" }}>Loading collections...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "48px 24px",
        textAlign: "center"
      }}>
        <div style={{
          backgroundColor: "#fef2f2",
          border: "1px solid #fca5a5",
          borderRadius: "8px",
          padding: "24px",
          marginBottom: "24px"
        }}>
          <h2 style={{
            color: "#dc2626",
            fontSize: "1.5rem",
            marginBottom: "8px"
          }}>
            Error Loading Collections
          </h2>
          <p style={{ color: "#dc2626", marginBottom: "0" }}>
            {error}
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "12px 24px",
            backgroundColor: "#1e293b",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "500"
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "24px"
    }}>
      {/* Page Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "32px",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div>
          <h1 style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            color: "#1e293b",
            margin: "0 0 8px 0"
          }}>
            My Collections
          </h1>
          <p style={{
            fontSize: "1.1rem",
            color: "#64748b",
            margin: "0"
          }}>
            {collections.length === 0
              ? "Start building your fragrance collections"
              : `${collections.length} collection${collections.length !== 1 ? 's' : ''} • ${getTotalFragrances()} total fragrances`
            }
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: "12px 24px",
            backgroundColor: "#1e293b",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          ➕ Create Collection
        </button>
      </div>

      {/* Collections Grid */}
      {collections.length === 0 ? (
        <div style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "64px",
          textAlign: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          border: "1px solid rgba(0,0,0,0.05)"
        }}>
          <div style={{ fontSize: "4rem", marginBottom: "24px" }}>📁</div>
          <h3 style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: "#1e293b",
            marginBottom: "12px"
          }}>
            No collections yet
          </h3>
          <p style={{
            color: "#64748b",
            fontSize: "1.1rem",
            marginBottom: "32px",
            lineHeight: "1.6"
          }}>
            Collections help you organize and keep track of your favorite fragrances.<br />
            Create your first collection to get started!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: "16px 32px",
              backgroundColor: "#1e293b",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "16px"
            }}
          >
            Create Your First Collection
          </button>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "24px"
        }}>
          {collections.map((collection) => (
            <div
              key={collection.id}
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                border: "1px solid rgba(0,0,0,0.05)",
                transition: "all 0.2s ease",
                position: "relative"
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
              }}
            >
              {/* Delete Button */}
              <button
                onClick={() => handleDeleteCollection(collection.id)}
                disabled={deleting.has(collection.id)}
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  backgroundColor: deleting.has(collection.id) ? "#94a3b8" : "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "12px",
                  cursor: deleting.has(collection.id) ? "not-allowed" : "pointer",
                  fontWeight: "500",
                  opacity: "0.7",
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={(e) => {
                  if (!deleting.has(collection.id)) {
                    (e.target as HTMLElement).style.opacity = "1";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.opacity = "0.7";
                }}
              >
                {deleting.has(collection.id) ? "..." : "🗑️"}
              </button>

              {/* Collection Content */}
              <Link
                to={`/collections/${collection.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "block"
                }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "16px"
                }}>
                  <div style={{
                    fontSize: "2rem"
                  }}>
                    📁
                  </div>
                  <div style={{ flex: 1, paddingRight: "32px" }}>
                    <h3 style={{
                      fontSize: "1.3rem",
                      fontWeight: "bold",
                      color: "#1e293b",
                      margin: "0 0 4px 0",
                      lineHeight: "1.2"
                    }}>
                      {collection.name}
                    </h3>
                    {collection.description && (
                      <p style={{
                        fontSize: "14px",
                        color: "#64748b",
                        margin: "0",
                        lineHeight: "1.4"
                      }}>
                        {collection.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Collection Stats */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                  marginBottom: "16px"
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: "#1e293b"
                    }}>
                      {collection.items?.length || 0}
                    </div>
                    <div style={{
                      fontSize: "12px",
                      color: "#64748b",
                      fontWeight: "500"
                    }}>
                      Fragrances
                    </div>
                  </div>

                  {collection.items && collection.items.length > 0 && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                        color: "#22c55e"
                      }}>
                        ★ {(
                          collection.items
                            .filter(item => item.personalRating)
                            .reduce((sum, item) => sum + (item.personalRating || 0), 0) /
                          collection.items.filter(item => item.personalRating).length || 0
                        ).toFixed(1)}
                      </div>
                      <div style={{
                        fontSize: "12px",
                        color: "#64748b",
                        fontWeight: "500"
                      }}>
                        Avg Rating
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent Fragrances Preview */}
                {collection.items && collection.items.length > 0 && (
                  <div>
                    <h4 style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#1e293b",
                      marginBottom: "8px"
                    }}>
                      Recent Additions
                    </h4>
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px"
                    }}>
                      {collection.items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                        >
                          <span>{item.fragrance.name} - {item.fragrance.brand}</span>
                          {item.personalRating && (
                            <span style={{ color: "#22c55e", fontWeight: "500" }}>
                              ★ {item.personalRating}
                            </span>
                          )}
                        </div>
                      ))}
                      {collection.items.length > 3 && (
                        <div style={{
                          fontSize: "12px",
                          color: "#94a3b8",
                          fontStyle: "italic"
                        }}>
                          +{collection.items.length - 3} more...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div style={{
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "12px",
                  color: "#94a3b8"
                }}>
                  <span>Created {formatDate(collection.createdAt)}</span>
                  <span style={{
                    color: "#1e293b",
                    fontWeight: "500"
                  }}>
                    View Details →
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div style={{
          position: "fixed",
          top: "0",
          left: "0",
          right: "0",
          bottom: "0",
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: "1000",
          padding: "24px"
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "500px",
            width: "100%",
            maxHeight: "90vh",
            overflow: "auto"
          }}>
            <h3 style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#1e293b",
              marginBottom: "24px"
            }}>
              Create New Collection
            </h3>

            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#1e293b",
                marginBottom: "8px"
              }}>
                Collection Name *
              </label>
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g., My Favorite Summer Fragrances"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none"
                }}
                onFocus={(e) => {
                  (e.target as HTMLElement).style.borderColor = "#1e293b";
                }}
                onBlur={(e) => {
                  (e.target as HTMLElement).style.borderColor = "#e2e8f0";
                }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#1e293b",
                marginBottom: "8px"
              }}>
                Description (optional)
              </label>
              <textarea
                value={newCollectionDescription}
                onChange={(e) => setNewCollectionDescription(e.target.value)}
                placeholder="Describe what makes this collection special..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                  resize: "vertical"
                }}
                onFocus={(e) => {
                  (e.target as HTMLElement).style.borderColor = "#1e293b";
                }}
                onBlur={(e) => {
                  (e.target as HTMLElement).style.borderColor = "#e2e8f0";
                }}
              />
            </div>

            <div style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end"
            }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCollectionName("");
                  setNewCollectionDescription("");
                }}
                disabled={creating}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "transparent",
                  color: "#64748b",
                  border: "2px solid #e2e8f0",
                  borderRadius: "8px",
                  cursor: creating ? "not-allowed" : "pointer",
                  fontWeight: "500",
                  fontSize: "14px"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={creating || !newCollectionName.trim()}
                style={{
                  padding: "12px 24px",
                  backgroundColor: creating || !newCollectionName.trim() ? "#94a3b8" : "#1e293b",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: creating || !newCollectionName.trim() ? "not-allowed" : "pointer",
                  fontWeight: "500",
                  fontSize: "14px"
                }}
              >
                {creating ? "Creating..." : "Create Collection"}
              </button>
            </div>
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
            .collections-header {
              flex-direction: column;
              align-items: flex-start;
            }
            .collections-grid {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>
    </div>
  );
};
