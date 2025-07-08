import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { battlesApi } from "../lib/api";
import { BattleWithItems, BattleStatus } from "@fragrance-battle/types";

export const BattleDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [battle, setBattle] = useState<BattleWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Fetch battle data
  useEffect(() => {
    const fetchBattle = async () => {
      if (!id) {
        setError("Invalid battle ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log(`🔍 Fetching battle with ID: ${id}`);

        const battleData = await battlesApi.getById(id);
        setBattle(battleData as BattleWithItems);

      } catch (err) {
        console.error("❌ Error fetching battle:", err);
        if (err instanceof Error && err.message.includes('404')) {
          setError("Battle not found");
        } else {
          setError(`Failed to load battle: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBattle();
  }, [id]);

  // Vote for a fragrance
  const handleVote = async (fragranceId: string) => {
    if (!battle || battle.status !== BattleStatus.ACTIVE) return;

    try {
      setVoting(true);
      const updatedBattle = await battlesApi.vote(battle.id, { fragranceId });
      setBattle(updatedBattle as BattleWithItems);
    } catch (err) {
      console.error("Error voting:", err);
      alert(`Failed to vote: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setVoting(false);
    }
  };

  // Complete the battle
  const handleCompleteBattle = async () => {
    if (!battle || battle.status !== BattleStatus.ACTIVE) return;

    const confirmed = window.confirm("Are you sure you want to complete this battle? This action cannot be undone.");
    if (!confirmed) return;

    try {
      setCompleting(true);
      const response = await fetch(`/api/battles/${battle.id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to complete battle');
      }

      const result = await response.json();
      setBattle(result.data);
    } catch (err) {
      console.error("Error completing battle:", err);
      alert(`Failed to complete battle: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCompleting(false);
    }
  };

  // Helper functions
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

  const getTotalVotes = () => {
    if (!battle) return 0;
    return battle.items.reduce((total, item) => total + item.votes, 0);
  };

  const getVotePercentage = (votes: number) => {
    const total = getTotalVotes();
    return total > 0 ? Math.round((votes / total) * 100) : 0;
  };

  const getWinners = () => {
    if (!battle) return [];
    return battle.items.filter(item => item.winner);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        <p style={{ color: "#64748b", fontSize: "14px" }}>Loading battle...</p>
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
            {error.includes('not found') ? 'Battle Not Found' : 'Error Loading Battle'}
          </h2>
          <p style={{ color: "#dc2626", marginBottom: "0" }}>
            {error}
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => navigate(-1)}
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
            Go Back
          </button>
          <Link
            to="/battles"
            style={{
              padding: "12px 24px",
              backgroundColor: "transparent",
              color: "#1e293b",
              border: "2px solid #1e293b",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: "500"
            }}
          >
            My Battles
          </Link>
        </div>
      </div>
    );
  }

  // No battle data
  if (!battle) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center" }}>
        <p style={{ color: "#64748b" }}>No battle data available</p>
      </div>
    );
  }

  const totalVotes = getTotalVotes();
  const winners = getWinners();

  return (
    <div style={{
      maxWidth: "1000px",
      margin: "0 auto",
      padding: "24px"
    }}>
      {/* Breadcrumb Navigation */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "32px",
        fontSize: "14px",
        color: "#64748b"
      }}>
        <Link
          to="/battles"
          style={{
            color: "#1e293b",
            textDecoration: "none",
            fontWeight: "500"
          }}
        >
          My Battles
        </Link>
        <span>→</span>
        <span style={{ color: "#1e293b", fontWeight: "500" }}>
          {battle.title}
        </span>
      </nav>

      {/* Battle Header */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "32px",
        marginBottom: "24px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        border: "1px solid rgba(0,0,0,0.05)"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "24px"
        }}>
          <div style={{ flex: "1", minWidth: "300px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "8px",
              flexWrap: "wrap"
            }}>
              <h1 style={{
                fontSize: "2.5rem",
                fontWeight: "bold",
                color: "#1e293b",
                margin: "0",
                lineHeight: "1.2"
              }}>
                {battle.title}
              </h1>
              <span style={{
                backgroundColor: getStatusColor(battle.status),
                color: "white",
                fontSize: "12px",
                padding: "4px 12px",
                borderRadius: "6px",
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
                fontSize: "1.1rem",
                color: "#64748b",
                margin: "0 0 16px 0",
                lineHeight: "1.5"
              }}>
                {battle.description}
              </p>
            )}

            <div style={{
              display: "flex",
              gap: "24px",
              flexWrap: "wrap",
              fontSize: "14px",
              color: "#64748b"
            }}>
              <div>
                <strong>Created:</strong> {formatDate(battle.createdAt)}
              </div>
              {battle.completedAt && (
                <div>
                  <strong>Completed:</strong> {formatDate(battle.completedAt)}
                </div>
              )}
              <div>
                <strong>Total Votes:</strong> {totalVotes}
              </div>
              <div>
                <strong>Participants:</strong> {battle.items.length}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            minWidth: "200px"
          }}>
            {battle.status === BattleStatus.ACTIVE && (
              <button
                onClick={handleCompleteBattle}
                disabled={completing}
                style={{
                  padding: "12px 24px",
                  backgroundColor: completing ? "#94a3b8" : "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: completing ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                {completing ? "Completing..." : "Complete Battle"}
              </button>
            )}

            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: battle.title,
                    url: window.location.href
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link copied to clipboard!");
                }
              }}
              style={{
                padding: "12px 24px",
                backgroundColor: "transparent",
                color: "#1e293b",
                border: "2px solid #1e293b",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px"
              }}
            >
              Share Battle
            </button>
          </div>
        </div>
      </div>

      {/* Battle Results/Winners (for completed battles) */}
      {battle.status === BattleStatus.COMPLETED && winners.length > 0 && (
        <div style={{
          backgroundColor: "#f0f9ff",
          border: "2px solid #3b82f6",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
          textAlign: "center"
        }}>
          <h3 style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: "#1e40af",
            marginBottom: "16px"
          }}>
            🏆 {winners.length > 1 ? "Winners" : "Winner"}
          </h3>
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            justifyContent: "center"
          }}>
            {winners.map((winner) => (
              <div
                key={winner.id}
                style={{
                  backgroundColor: "white",
                  border: "2px solid #3b82f6",
                  borderRadius: "8px",
                  padding: "16px",
                  textAlign: "center",
                  minWidth: "200px"
                }}
              >
                <Link
                  to={`/fragrances/${winner.fragrance.id}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit"
                  }}
                >
                  <h4 style={{
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                    color: "#1e293b",
                    marginBottom: "4px"
                  }}>
                    {winner.fragrance.name}
                  </h4>
                  <p style={{
                    fontSize: "0.9rem",
                    color: "#64748b",
                    marginBottom: "8px"
                  }}>
                    {winner.fragrance.brand}
                  </p>
                </Link>
                <div style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: "#3b82f6"
                }}>
                  {winner.votes} votes ({getVotePercentage(winner.votes)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Battle Participants */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "32px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        border: "1px solid rgba(0,0,0,0.05)"
      }}>
        <h3 style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          color: "#1e293b",
          marginBottom: "24px",
          textAlign: "center"
        }}>
          {battle.status === BattleStatus.ACTIVE ? "🗳️ Vote for Your Favorite" : "⚔️ Battle Participants"}
        </h3>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px"
        }}>
          {battle.items
            .sort((a, b) => b.votes - a.votes) // Sort by votes (highest first)
            .map((item, index) => (
              <div
                key={item.id}
                style={{
                  border: item.winner ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "20px",
                  backgroundColor: item.winner ? "#f0f9ff" : "#f8fafc",
                  position: "relative",
                  transition: "all 0.2s ease"
                }}
              >
                {/* Position Badge */}
                <div style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  backgroundColor: index === 0 ? "#fbbf24" : index === 1 ? "#94a3b8" : "#cd7c2f",
                  color: "white",
                  borderRadius: "50%",
                  width: "24px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "bold"
                }}>
                  {index + 1}
                </div>

                {/* Winner Badge */}
                {item.winner && (
                  <div style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    fontSize: "12px",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontWeight: "600"
                  }}>
                    🏆 WINNER
                  </div>
                )}

                {/* Fragrance Info */}
                <Link
                  to={`/fragrances/${item.fragrance.id}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "block",
                    marginBottom: "16px",
                    marginTop: item.winner ? "20px" : "0"
                  }}
                >
                  <h4 style={{
                    fontSize: "1.2rem",
                    fontWeight: "bold",
                    color: "#1e293b",
                    marginBottom: "4px",
                    paddingRight: "30px"
                  }}>
                    {item.fragrance.name}
                  </h4>
                  <p style={{
                    fontSize: "1rem",
                    color: "#64748b",
                    marginBottom: "8px"
                  }}>
                    {item.fragrance.brand}
                  </p>

                  {item.fragrance.year && (
                    <span style={{
                      backgroundColor: "#64748b",
                      color: "white",
                      fontSize: "12px",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontWeight: "500"
                    }}>
                      {item.fragrance.year}
                    </span>
                  )}
                </Link>

                {/* Vote Count & Button */}
                <div style={{
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "16px"
                }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px"
                  }}>
                    <div>
                      <div style={{
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                        color: "#1e293b"
                      }}>
                        {item.votes} votes
                      </div>
                      {totalVotes > 0 && (
                        <div style={{
                          fontSize: "12px",
                          color: "#64748b"
                        }}>
                          {getVotePercentage(item.votes)}% of total
                        </div>
                      )}
                    </div>

                    {battle.status === BattleStatus.ACTIVE && (
                      <button
                        onClick={() => handleVote(item.fragrance.id)}
                        disabled={voting}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: voting ? "#94a3b8" : "#22c55e",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: voting ? "not-allowed" : "pointer",
                          fontWeight: "600",
                          fontSize: "14px"
                        }}
                      >
                        {voting ? "..." : "Vote"}
                      </button>
                    )}
                  </div>

                  {/* Vote Progress Bar */}
                  {totalVotes > 0 && (
                    <div style={{
                      height: "8px",
                      backgroundColor: "#e2e8f0",
                      borderRadius: "4px",
                      overflow: "hidden"
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${getVotePercentage(item.votes)}%`,
                        backgroundColor: item.winner ? "#3b82f6" : "#22c55e",
                        transition: "width 0.3s ease"
                      }}></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* Battle Instructions */}
        {battle.status === BattleStatus.ACTIVE && (
          <div style={{
            marginTop: "24px",
            padding: "16px",
            backgroundColor: "#f0f9ff",
            borderRadius: "8px",
            textAlign: "center"
          }}>
            <p style={{
              color: "#1e40af",
              fontSize: "14px",
              margin: "0",
              fontWeight: "500"
            }}>
              💡 Click "Vote" on your favorite fragrance to participate in this battle!
            </p>
          </div>
        )}
      </div>

      {/* Loading Animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @media (max-width: 768px) {
            .battle-header {
              flex-direction: column;
              align-items: flex-start;
            }
            .battle-actions {
              width: 100%;
            }
            .battle-actions button {
              width: 100%;
              margin-bottom: 8px;
            }
            .battle-participants {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>
    </div>
  );
};
