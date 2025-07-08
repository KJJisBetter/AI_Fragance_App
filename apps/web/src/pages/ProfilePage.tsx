import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { usersApi, authApi } from "../lib/api";
import { UserAnalytics } from "@fragrance-battle/types";

interface UserProfile {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
  collections: Array<{
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
    _count: { items: number };
  }>;
  battles: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: Date;
    completedAt?: Date;
  }>;
  feedbacks: Array<{
    id: string;
    feedbackType: string;
    createdAt: Date;
    fragrance: { name: string; brand: string };
  }>;
}

interface Activity {
  type: string;
  timestamp: Date;
  data: any;
}

export const ProfilePage = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode states
  const [editMode, setEditMode] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'collections' | 'battles' | 'activity' | 'settings'>('overview');

  // Fetch profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all profile data in parallel
        const [profileData, analyticsData, activityData, favoritesData] = await Promise.all([
          usersApi.getProfile(),
          usersApi.getAnalytics(),
          usersApi.getActivity(),
          usersApi.getFavorites({ limit: 6 })
        ]);

        setProfile(profileData as UserProfile);
        setAnalytics(analyticsData as UserAnalytics);
        setActivities((activityData as any).activities || []);
        setFavorites(favoritesData as any);

        // Initialize edit fields
        setEditUsername((profileData as UserProfile).username);
        setEditEmail((profileData as UserProfile).email);

      } catch (err) {
        console.error("❌ Error fetching profile data:", err);
        setError(`Failed to load profile: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      const updatedProfile = await usersApi.updateProfile({
        username: editUsername,
        email: editEmail
      });

      setProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
      setEditMode(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      alert(`Failed to update profile: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return "#22c55e";
      case 'COMPLETED':
        return "#3b82f6";
      case 'CANCELLED':
        return "#ef4444";
      default:
        return "#94a3b8";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'collection_add':
        return "📁";
      case 'battle_created':
        return "⚔️";
      case 'ai_feedback':
        return "🤖";
      default:
        return "📝";
    }
  };

  const getActivityDescription = (activity: Activity) => {
    switch (activity.type) {
      case 'collection_add':
        return `Added ${activity.data.fragrance.name} to ${activity.data.collection.name}`;
      case 'battle_created':
        return `Created battle: ${activity.data.title}`;
      case 'ai_feedback':
        return `Provided AI feedback for ${activity.data.fragrance.name}`;
      default:
        return 'Unknown activity';
    }
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
        <p style={{ color: "#64748b", fontSize: "14px" }}>Loading profile...</p>
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
            Error Loading Profile
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

  // No profile data
  if (!profile) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center" }}>
        <p style={{ color: "#64748b" }}>No profile data available</p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "24px"
    }}>
      {/* Profile Header */}
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
              gap: "16px",
              marginBottom: "16px"
            }}>
              <div style={{
                width: "80px",
                height: "80px",
                backgroundColor: "#1e293b",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "2rem",
                fontWeight: "bold"
              }}>
                {profile.username.charAt(0).toUpperCase()}
              </div>

              <div>
                <h1 style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: "#1e293b",
                  margin: "0 0 4px 0"
                }}>
                  {profile.username}
                </h1>
                <p style={{
                  color: "#64748b",
                  fontSize: "1rem",
                  margin: "0 0 8px 0"
                }}>
                  {profile.email}
                </p>
                <div style={{
                  fontSize: "14px",
                  color: "#94a3b8"
                }}>
                  Member since {formatDate(profile.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{
            display: "flex",
            gap: "24px",
            minWidth: "300px"
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: "2rem",
                fontWeight: "bold",
                color: "#1e293b"
              }}>
                {analytics?.totalFragrances || 0}
              </div>
              <div style={{
                fontSize: "12px",
                color: "#64748b",
                fontWeight: "500"
              }}>
                Fragrances
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: "2rem",
                fontWeight: "bold",
                color: "#1e293b"
              }}>
                {profile.collections.length}
              </div>
              <div style={{
                fontSize: "12px",
                color: "#64748b",
                fontWeight: "500"
              }}>
                Collections
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: "2rem",
                fontWeight: "bold",
                color: "#1e293b"
              }}>
                {analytics?.totalBattles || 0}
              </div>
              <div style={{
                fontSize: "12px",
                color: "#64748b",
                fontWeight: "500"
              }}>
                Battles
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        marginBottom: "24px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        border: "1px solid rgba(0,0,0,0.05)",
        overflow: "hidden"
      }}>
        <div style={{
          display: "flex",
          overflowX: "auto"
        }}>
          {[
            { id: 'overview', label: '📊 Overview', count: null },
            { id: 'collections', label: '📁 Collections', count: profile.collections.length },
            { id: 'battles', label: '⚔️ Battles', count: analytics?.totalBattles },
            { id: 'activity', label: '📝 Activity', count: activities.length },
            { id: 'settings', label: '⚙️ Settings', count: null }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: "16px 24px",
                border: "none",
                backgroundColor: activeTab === tab.id ? "#1e293b" : "transparent",
                color: activeTab === tab.id ? "white" : "#64748b",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "14px",
                borderBottom: activeTab === tab.id ? "none" : "1px solid #e2e8f0",
                minWidth: "120px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              {tab.label}
              {tab.count !== null && (
                <span style={{
                  backgroundColor: activeTab === tab.id ? "rgba(255,255,255,0.2)" : "#e2e8f0",
                  color: activeTab === tab.id ? "white" : "#64748b",
                  fontSize: "12px",
                  padding: "2px 6px",
                  borderRadius: "10px",
                  fontWeight: "600"
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "32px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        border: "1px solid rgba(0,0,0,0.05)"
      }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <h3 style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#1e293b",
              marginBottom: "24px"
            }}>
              Your Fragrance Journey
            </h3>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "24px",
              marginBottom: "32px"
            }}>
              {/* Analytics Card */}
              {analytics && (
                <div style={{
                  backgroundColor: "#f8fafc",
                  padding: "24px",
                  borderRadius: "8px"
                }}>
                  <h4 style={{
                    fontSize: "1.2rem",
                    fontWeight: "600",
                    color: "#1e293b",
                    marginBottom: "16px"
                  }}>
                    📈 Your Stats
                  </h4>

                  {analytics.averageRating > 0 && (
                    <div style={{ marginBottom: "12px" }}>
                      <span style={{ fontSize: "14px", color: "#64748b" }}>Average Rating:</span>
                      <span style={{
                        fontSize: "16px",
                        fontWeight: "bold",
                        color: "#1e293b",
                        marginLeft: "8px"
                      }}>
                        ★ {analytics.averageRating}/10
                      </span>
                    </div>
                  )}

                  {analytics.favoriteSeasons.length > 0 && (
                    <div style={{ marginBottom: "12px" }}>
                      <span style={{ fontSize: "14px", color: "#64748b", display: "block" }}>Favorite Seasons:</span>
                      <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                        {analytics.favoriteSeasons.map((season) => (
                          <span
                            key={season}
                            style={{
                              backgroundColor: "#dbeafe",
                              color: "#1e40af",
                              fontSize: "12px",
                              padding: "2px 8px",
                              borderRadius: "12px"
                            }}
                          >
                            {season}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analytics.mostUsedBrands.length > 0 && (
                    <div>
                      <span style={{ fontSize: "14px", color: "#64748b", display: "block" }}>Top Brands:</span>
                      <div style={{ fontSize: "12px", color: "#1e293b", marginTop: "4px" }}>
                        {analytics.mostUsedBrands.slice(0, 3).join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recent Activity */}
              <div style={{
                backgroundColor: "#f8fafc",
                padding: "24px",
                borderRadius: "8px"
              }}>
                <h4 style={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  color: "#1e293b",
                  marginBottom: "16px"
                }}>
                  🕒 Recent Activity
                </h4>

                {activities.slice(0, 5).map((activity, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "12px",
                      paddingBottom: "12px",
                      borderBottom: index < 4 ? "1px solid #e2e8f0" : "none"
                    }}
                  >
                    <span style={{ fontSize: "16px" }}>
                      {getActivityIcon(activity.type)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: "14px",
                        color: "#1e293b",
                        marginBottom: "2px"
                      }}>
                        {getActivityDescription(activity)}
                      </div>
                      <div style={{
                        fontSize: "12px",
                        color: "#94a3b8"
                      }}>
                        {formatDate(activity.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}

                {activities.length === 0 && (
                  <p style={{ color: "#64748b", fontSize: "14px" }}>
                    No recent activity
                  </p>
                )}
              </div>
            </div>

            {/* Favorite Fragrances */}
            {favorites.length > 0 && (
              <div>
                <h4 style={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  color: "#1e293b",
                  marginBottom: "16px"
                }}>
                  ⭐ Your Favorites
                </h4>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                  gap: "16px"
                }}>
                  {favorites.slice(0, 6).map((favorite) => (
                    <Link
                      key={favorite.id}
                      to={`/fragrances/${favorite.fragrance.id}`}
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                        display: "block"
                      }}
                    >
                      <div style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "16px",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.borderColor = "#1e293b";
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.borderColor = "#e2e8f0";
                      }}>
                        <h5 style={{
                          fontSize: "1rem",
                          fontWeight: "600",
                          color: "#1e293b",
                          marginBottom: "4px"
                        }}>
                          {favorite.fragrance.name}
                        </h5>
                        <p style={{
                          fontSize: "14px",
                          color: "#64748b",
                          marginBottom: "8px"
                        }}>
                          {favorite.fragrance.brand}
                        </p>
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <span style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#22c55e"
                          }}>
                            ★ {favorite.personalRating}/10
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Collections Tab */}
        {activeTab === 'collections' && (
          <div>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px"
            }}>
              <h3 style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                color: "#1e293b",
                margin: "0"
              }}>
                Your Collections ({profile.collections.length})
              </h3>
              <Link
                to="/collections"
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#1e293b",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
              >
                View All
              </Link>
            </div>

            {profile.collections.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "48px",
                color: "#64748b"
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📁</div>
                <p>No collections yet. Start building your first collection!</p>
                <Link
                  to="/collections"
                  style={{
                    padding: "12px 24px",
                    backgroundColor: "#1e293b",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: "6px",
                    fontWeight: "500"
                  }}
                >
                  Create Collection
                </Link>
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "16px"
              }}>
                {profile.collections.map((collection) => (
                  <Link
                    key={collection.id}
                    to={`/collections/${collection.id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit"
                    }}
                  >
                    <div style={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "20px",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.borderColor = "#1e293b";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.borderColor = "#e2e8f0";
                    }}>
                      <h4 style={{
                        fontSize: "1.1rem",
                        fontWeight: "600",
                        color: "#1e293b",
                        marginBottom: "8px"
                      }}>
                        {collection.name}
                      </h4>

                      {collection.description && (
                        <p style={{
                          fontSize: "14px",
                          color: "#64748b",
                          marginBottom: "12px",
                          lineHeight: "1.4"
                        }}>
                          {collection.description}
                        </p>
                      )}

                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "12px",
                        color: "#94a3b8"
                      }}>
                        <span>{collection._count.items} fragrances</span>
                        <span>{formatDate(collection.createdAt)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Battles Tab */}
        {activeTab === 'battles' && (
          <div>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px"
            }}>
              <h3 style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                color: "#1e293b",
                margin: "0"
              }}>
                Your Battles ({profile.battles.length})
              </h3>
              <Link
                to="/battles"
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#1e293b",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
              >
                View All
              </Link>
            </div>

            {profile.battles.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "48px",
                color: "#64748b"
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "16px" }}>⚔️</div>
                <p>No battles yet. Create your first fragrance battle!</p>
                <Link
                  to="/battles"
                  style={{
                    padding: "12px 24px",
                    backgroundColor: "#1e293b",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: "6px",
                    fontWeight: "500"
                  }}
                >
                  Create Battle
                </Link>
              </div>
            ) : (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                {profile.battles.map((battle) => (
                  <Link
                    key={battle.id}
                    to={`/battles/${battle.id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit"
                    }}
                  >
                    <div style={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "16px",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.borderColor = "#1e293b";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.borderColor = "#e2e8f0";
                    }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <div>
                          <h4 style={{
                            fontSize: "1rem",
                            fontWeight: "600",
                            color: "#1e293b",
                            marginBottom: "4px"
                          }}>
                            {battle.title}
                          </h4>
                          <div style={{
                            fontSize: "12px",
                            color: "#94a3b8"
                          }}>
                            Created {formatDate(battle.createdAt)}
                            {battle.completedAt && ` • Completed ${formatDate(battle.completedAt)}`}
                          </div>
                        </div>

                        <span style={{
                          backgroundColor: getStatusColor(battle.status),
                          color: "white",
                          fontSize: "12px",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontWeight: "500"
                        }}>
                          {battle.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div>
            <h3 style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#1e293b",
              marginBottom: "24px"
            }}>
              Activity Feed
            </h3>

            {activities.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "48px",
                color: "#64748b"
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📝</div>
                <p>No activity yet. Start exploring fragrances to see your activity here!</p>
              </div>
            ) : (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              }}>
                {activities.map((activity, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "16px"
                    }}
                  >
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px"
                    }}>
                      <span style={{ fontSize: "20px" }}>
                        {getActivityIcon(activity.type)}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: "14px",
                          color: "#1e293b",
                          marginBottom: "4px"
                        }}>
                          {getActivityDescription(activity)}
                        </div>
                        <div style={{
                          fontSize: "12px",
                          color: "#94a3b8"
                        }}>
                          {formatDate(activity.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <h3 style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#1e293b",
              marginBottom: "24px"
            }}>
              Account Settings
            </h3>

            <div style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "24px"
            }}>
              <h4 style={{
                fontSize: "1.1rem",
                fontWeight: "600",
                color: "#1e293b",
                marginBottom: "16px"
              }}>
                Profile Information
              </h4>

              {editMode ? (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px"
                }}>
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#1e293b",
                      marginBottom: "4px"
                    }}>
                      Username
                    </label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        fontSize: "14px"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#1e293b",
                      marginBottom: "4px"
                    }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        fontSize: "14px"
                      }}
                    />
                  </div>

                  <div style={{
                    display: "flex",
                    gap: "12px",
                    marginTop: "8px"
                  }}>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: saving ? "#94a3b8" : "#22c55e",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: saving ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "500"
                      }}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setEditUsername(profile.username);
                        setEditEmail(profile.email);
                      }}
                      disabled={saving}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "transparent",
                        color: "#64748b",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        cursor: saving ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "500"
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: "12px" }}>
                    <span style={{
                      fontSize: "14px",
                      color: "#64748b",
                      display: "block",
                      marginBottom: "4px"
                    }}>
                      Username
                    </span>
                    <span style={{
                      fontSize: "16px",
                      color: "#1e293b",
                      fontWeight: "500"
                    }}>
                      {profile.username}
                    </span>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <span style={{
                      fontSize: "14px",
                      color: "#64748b",
                      display: "block",
                      marginBottom: "4px"
                    }}>
                      Email
                    </span>
                    <span style={{
                      fontSize: "16px",
                      color: "#1e293b",
                      fontWeight: "500"
                    }}>
                      {profile.email}
                    </span>
                  </div>

                  <button
                    onClick={() => setEditMode(true)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#1e293b",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500"
                    }}
                  >
                    Edit Profile
                  </button>
                </div>
              )}
            </div>
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
            .profile-header {
              flex-direction: column;
              align-items: flex-start;
            }
            .profile-stats {
              width: 100%;
              justify-content: space-around;
            }
            .tab-navigation {
              overflow-x: auto;
            }
          }
        `}
      </style>
    </div>
  );
};
