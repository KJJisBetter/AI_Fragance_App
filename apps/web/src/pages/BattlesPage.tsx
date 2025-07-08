import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { battlesApi, fragrancesApi } from "../lib/api";
import { BattleWithItems, BattleStatus, Fragrance } from "@fragrance-battle/types";

export const BattlesPage = () => {
  const [battles, setBattles] = useState<BattleWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  // Create battle form
  const [newBattleTitle, setNewBattleTitle] = useState("");
  const [newBattleDescription, setNewBattleDescription] = useState("");
  const [selectedFragrances, setSelectedFragrances] = useState<Fragrance[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Fragrance[]>([]);
  const [searching, setSearching] = useState(false);

  // Fetch battles
  useEffect(() => {
    const fetchBattles = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("🔍 Fetching user battles...");

        const battlesData = await battlesApi.getAll();
        setBattles((battlesData as any).battles || []);

      } catch (err) {
        console.error("❌ Error fetching battles:", err);
        setError(`Failed to load battles: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchBattles();
  }, []);

  // Search fragrances for battle creation
  const searchFragrances = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const searchData = await fragrancesApi.search({
        query: query.trim(),
        page: 1,
        limit: 10
      });
      setSearchResults((searchData as any).fragrances || []);
    } catch (err) {
      console.error("Error searching fragrances:", err);
    } finally {
      setSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchFragrances(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Create new battle
  const handleCreateBattle = async () => {
    if (!newBattleTitle.trim()) {
      alert("Please enter a battle title");
      return;
    }

    if (selectedFragrances.length < 2) {
      alert("Please select at least 2 fragrances for the battle");
      return;
    }

    try {
      setCreating(true);
      const newBattle = await battlesApi.create({
        title: newBattleTitle.trim(),
        description: newBattleDescription.trim() || undefined,
        fragranceIds: selectedFragrances.map(f => f.id)
      });

      setBattles(prev => [newBattle as BattleWithItems, ...prev]);
      setShowCreateModal(false);
      resetCreateForm();

    } catch (err) {
      console.error("Error creating battle:", err);
      alert(`Failed to create battle: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  // Reset create form
  const resetCreateForm = () => {
    setNewBattleTitle("");
    setNewBattleDescription("");
    setSelectedFragrances([]);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Delete battle
  const handleDeleteBattle = async (battleId: string) => {
    const battle = battles.find(b => b.id === battleId);
    if (!battle) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the battle "${battle.title}"?`
    );
    if (!confirmed) return;

    try {
      setDeleting(prev => new Set(prev).add(battleId));
      await battlesApi.delete(battleId);
      setBattles(prev => prev.filter(b => b.id !== battleId));
    } catch (err) {
      console.error("Error deleting battle:", err);
      alert(`Failed to delete battle: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeleting(prev => {
        const newSet = new Set(prev);
        newSet.delete(battleId);
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

  const getStatusColor = (status: BattleStatus) => {
    switch (status) {
      case BattleStatus.ACTIVE:
        return "#22c55e";
      case BattleStatus.COMPLETED:
        return "#3b82f6";
      case BattleStatus.CANCELLED:
        return "#ef4444";
      default:
        return "#94a3b8";
    }
  };

  const getStatusIcon = (status: BattleStatus) => {
    switch (status) {
      case BattleStatus.ACTIVE:
        return "🔥";
      case BattleStatus.COMPLETED:
        return "🏆";
      case BattleStatus.CANCELLED:
        return "❌";
      default:
        return "❓";
    }
  };

  const getTotalVotes = (battle: BattleWithItems) => {
    return battle.items.reduce((total, item) => total + item.votes, 0);
  };

  const getWinner = (battle: BattleWithItems) => {
    return battle.items.find(item => item.winner);
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
        <p style={{ color: "#64748b", fontSize: "14px" }}>Loading battles...</p>
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
            Error Loading Battles
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
            ⚔️ My Battles
          </h1>
          <p style={{
            fontSize: "1.1rem",
            color: "#64748b",
            margin: "0"
          }}>
            {battles.length === 0
              ? "Create your first fragrance battle"
              : `${battles.length} battle${battles.length !== 1 ? 's' : ''} • ${battles.filter(b => b.status === BattleStatus.ACTIVE).length} active`
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
          ⚔️ Create Battle
        </button>
      </div>

      {/* Battles List */}
      {battles.length === 0 ? (
        <div style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "64px",
          textAlign: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          border: "1px solid rgba(0,0,0,0.05)"
        }}>
          <div style={{ fontSize: "4rem", marginBottom: "24px" }}>⚔️</div>
          <h3 style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: "#1e293b",
            marginBottom: "12px"
          }}>
            No battles yet
          </h3>
          <p style={{
            color: "#64748b",
            fontSize: "1.1rem",
            marginBottom: "32px",
            lineHeight: "1.6"
          }}>
            Create fragrance battles to compare your favorites and<br />
            see which ones come out on top!
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
            Create Your First Battle
          </button>
        </div>
      ) : (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          {battles.map((battle) => {
            const totalVotes = getTotalVotes(battle);
            const winner = getWinner(battle);

            return (
              <div
                key={battle.id}
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
                  onClick={() => handleDeleteBattle(battle.id)}
                  disabled={deleting.has(battle.id)}
                  style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    backgroundColor: deleting.has(battle.id) ? "#94a3b8" : "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "12px",
                    cursor: deleting.has(battle.id) ? "not-allowed" : "pointer",
                    fontWeight: "500",
                    opacity: "0.7",
                    transition: "opacity 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    if (!deleting.has(battle.id)) {
                      (e.target as HTMLElement).style.opacity = "1";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.opacity = "0.7";
                  }}
                >
                  {deleting.has(battle.id) ? "..." : "🗑️"}
                </button>

                <Link
                  to={`/battles/${battle.id}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "block"
                  }}
                >
                  {/* Battle Header */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "16px",
                    paddingRight: "32px"
                  }}>
                    <div>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "8px"
                      }}>
                        <h3 style={{
                          fontSize: "1.3rem",
                          fontWeight: "bold",
                          color: "#1e293b",
                          margin: "0"
                        }}>
                          {battle.title}
                        </h3>
                        <span style={{
                          backgroundColor: getStatusColor(battle.status),
                          color: "white",
                          fontSize: "12px",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          {getStatusIcon(battle.status)} {battle.status}
                        </span>
                      </div>

                      {battle.description && (
                        <p style={{
                          color: "#64748b",
                          fontSize: "14px",
                          margin: "0 0 8px 0",
                          lineHeight: "1.4"
                        }}>
                          {battle.description}
                        </p>
                      )}

                      <div style={{
                        fontSize: "12px",
                        color: "#94a3b8",
                        display: "flex",
                        gap: "16px"
                      }}>
                        <span>Created {formatDate(battle.createdAt)}</span>
                        {battle.completedAt && (
                          <span>Completed {formatDate(battle.completedAt)}</span>
                        )}
                        <span>{battle.items.length} participants</span>
                        <span>{totalVotes} total votes</span>
                      </div>
                    </div>
                  </div>

                  {/* Winner Display (for completed battles) */}
                  {battle.status === BattleStatus.COMPLETED && winner && (
                    <div style={{
                      backgroundColor: "#f0f9ff",
                      border: "2px solid #3b82f6",
                      borderRadius: "8px",
                      padding: "12px",
                      marginBottom: "16px"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px"
                      }}>
                        <span style={{ fontSize: "20px" }}>🏆</span>
                        <div>
                          <div style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1e40af"
                          }}>
                            Winner: {winner.fragrance.name}
                          </div>
                          <div style={{
                            fontSize: "12px",
                            color: "#64748b"
                          }}>
                            {winner.fragrance.brand} • {winner.votes} votes ({Math.round((winner.votes / totalVotes) * 100)}%)
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Battle Participants Preview */}
                  <div>
                    <h4 style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#1e293b",
                      marginBottom: "12px"
                    }}>
                      Participants
                    </h4>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "12px"
                    }}>
                      {battle.items
                        .sort((a, b) => b.votes - a.votes)
                        .map((item, index) => (
                          <div
                            key={item.id}
                            style={{
                              backgroundColor: "#f8fafc",
                              border: item.winner ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                              borderRadius: "6px",
                              padding: "12px",
                              position: "relative"
                            }}
                          >
                            {/* Position Badge */}
                            <div style={{
                              position: "absolute",
                              top: "8px",
                              right: "8px",
                              backgroundColor: index === 0 ? "#fbbf24" : index === 1 ? "#94a3b8" : "#cd7c2f",
                              color: "white",
                              borderRadius: "50%",
                              width: "20px",
                              height: "20px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "10px",
                              fontWeight: "bold"
                            }}>
                              {index + 1}
                            </div>

                            <div style={{
                              fontSize: "14px",
                              fontWeight: "600",
                              color: "#1e293b",
                              marginBottom: "4px",
                              paddingRight: "24px"
                            }}>
                              {item.fragrance.name}
                            </div>
                            <div style={{
                              fontSize: "12px",
                              color: "#64748b",
                              marginBottom: "8px"
                            }}>
                              {item.fragrance.brand}
                            </div>
                            <div style={{
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#1e293b"
                            }}>
                              {item.votes} votes
                              {totalVotes > 0 && (
                                <span style={{ color: "#64748b", fontWeight: "normal" }}>
                                  {" "}({Math.round((item.votes / totalVotes) * 100)}%)
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Call to Action */}
                  <div style={{
                    marginTop: "16px",
                    paddingTop: "16px",
                    borderTop: "1px solid #e2e8f0",
                    textAlign: "center"
                  }}>
                    <span style={{
                      color: "#1e293b",
                      fontWeight: "600",
                      fontSize: "14px"
                    }}>
                      {battle.status === BattleStatus.ACTIVE
                        ? "🗳️ Click to vote and manage battle"
                        : "📊 View detailed results"
                      } →
                    </span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Battle Modal */}
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
            maxWidth: "600px",
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
              Create New Battle
            </h3>

            {/* Battle Info */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#1e293b",
                marginBottom: "8px"
              }}>
                Battle Title *
              </label>
              <input
                type="text"
                value={newBattleTitle}
                onChange={(e) => setNewBattleTitle(e.target.value)}
                placeholder="e.g., Best Summer Fragrance 2024"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none"
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
                value={newBattleDescription}
                onChange={(e) => setNewBattleDescription(e.target.value)}
                placeholder="Describe what this battle is about..."
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
              />
            </div>

            {/* Selected Fragrances */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#1e293b",
                marginBottom: "8px"
              }}>
                Selected Fragrances ({selectedFragrances.length}/6)
              </label>

              {selectedFragrances.length > 0 ? (
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginBottom: "16px"
                }}>
                  {selectedFragrances.map((fragrance) => (
                    <div
                      key={fragrance.id}
                      style={{
                        backgroundColor: "#dbeafe",
                        color: "#1e40af",
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      {fragrance.name} - {fragrance.brand}
                      <button
                        onClick={() => {
                          setSelectedFragrances(prev =>
                            prev.filter(f => f.id !== fragrance.id)
                          );
                        }}
                        style={{
                          backgroundColor: "transparent",
                          border: "none",
                          color: "#1e40af",
                          cursor: "pointer",
                          padding: "0",
                          fontSize: "14px"
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{
                  color: "#64748b",
                  fontSize: "14px",
                  fontStyle: "italic",
                  margin: "0 0 16px 0"
                }}>
                  No fragrances selected yet. Search and add at least 2 fragrances.
                </p>
              )}
            </div>

            {/* Search Fragrances */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#1e293b",
                marginBottom: "8px"
              }}>
                Search Fragrances to Add
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for fragrances..."
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none"
                }}
              />

              {/* Search Results */}
              {searchQuery && (
                <div style={{
                  marginTop: "12px",
                  maxHeight: "200px",
                  overflow: "auto",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px"
                }}>
                  {searching ? (
                    <div style={{
                      padding: "16px",
                      textAlign: "center",
                      color: "#64748b"
                    }}>
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((fragrance) => (
                      <div
                        key={fragrance.id}
                        style={{
                          padding: "12px",
                          borderBottom: "1px solid #e2e8f0",
                          cursor: selectedFragrances.find(f => f.id === fragrance.id)
                            ? "not-allowed"
                            : "pointer",
                          backgroundColor: selectedFragrances.find(f => f.id === fragrance.id)
                            ? "#f8fafc"
                            : "white",
                          opacity: selectedFragrances.find(f => f.id === fragrance.id) ? 0.5 : 1
                        }}
                        onClick={() => {
                          const alreadySelected = selectedFragrances.find(f => f.id === fragrance.id);
                          if (!alreadySelected && selectedFragrances.length < 6) {
                            setSelectedFragrances(prev => [...prev, fragrance]);
                          }
                        }}
                      >
                        <div style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#1e293b"
                        }}>
                          {fragrance.name}
                        </div>
                        <div style={{
                          fontSize: "12px",
                          color: "#64748b"
                        }}>
                          {fragrance.brand}
                          {selectedFragrances.find(f => f.id === fragrance.id) && (
                            <span style={{ color: "#22c55e", marginLeft: "8px" }}>
                              ✓ Selected
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      padding: "16px",
                      textAlign: "center",
                      color: "#64748b"
                    }}>
                      No fragrances found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end"
            }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
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
                onClick={handleCreateBattle}
                disabled={creating || !newBattleTitle.trim() || selectedFragrances.length < 2}
                style={{
                  padding: "12px 24px",
                  backgroundColor: creating || !newBattleTitle.trim() || selectedFragrances.length < 2
                    ? "#94a3b8"
                    : "#1e293b",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: creating || !newBattleTitle.trim() || selectedFragrances.length < 2
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: "500",
                  fontSize: "14px"
                }}
              >
                {creating ? "Creating..." : "Create Battle"}
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
            .battles-header {
              flex-direction: column;
              align-items: flex-start;
            }
          }
        `}
      </style>
    </div>
  );
};
