import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { fragrancesApi } from "../lib/api";
import { Fragrance } from "@fragrance-battle/types";

const featureCardStyle = {
  background: "white",
  borderRadius: "12px",
  padding: "32px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  transition: "all 0.3s ease",
  border: "1px solid rgba(0,0,0,0.05)"
};

const featureCardHoverStyle = {
  transform: "translateY(-4px)",
  boxShadow: "0 8px 30px rgba(0,0,0,0.12)"
};

const buttonStyle = {
  display: "inline-block",
  padding: "16px 32px",
  borderRadius: "8px",
  fontWeight: "600",
  fontSize: "16px",
  textDecoration: "none",
  transition: "all 0.2s ease",
  cursor: "pointer",
  border: "none"
};

const primaryButtonStyle = {
  ...buttonStyle,
  backgroundColor: "#1e293b",
  color: "white"
};

const secondaryButtonStyle = {
  ...buttonStyle,
  backgroundColor: "transparent",
  color: "#1e293b",
  border: "2px solid #1e293b"
};

export const HomePage = () => {
  const [popularFragrances, setPopularFragrances] = useState<Fragrance[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);

  // Fetch popular fragrances
  useEffect(() => {
    const fetchPopularFragrances = async () => {
      try {
        setPopularLoading(true);
        const result = await fragrancesApi.getAll({
          page: 1,
          limit: 6,
          sortBy: 'popularity',
          sortOrder: 'desc'
        });
        setPopularFragrances((result as any).fragrances);
      } catch (error) {
        console.error('Error fetching popular fragrances:', error);
      } finally {
        setPopularLoading(false);
      }
    };

    fetchPopularFragrances();
  }, []);

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
    {/* Hero Section */}
    <section style={{
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      padding: "80px 32px",
      textAlign: "center"
    }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{
          fontSize: "3.5rem",
          fontWeight: "bold",
          marginBottom: "24px",
          lineHeight: 1.2
        }}>
          Discover Your Perfect Fragrance with AI
        </h1>
        <p style={{
          fontSize: "1.3rem",
          marginBottom: "40px",
          opacity: 0.9,
          lineHeight: 1.6
        }}>
          Battle test fragrances, build your collection, and get personalized AI recommendations
          from our database of over 23,000 scents.
        </p>
        <div style={{
          display: "flex",
          gap: "20px",
          justifyContent: "center",
          flexWrap: "wrap"
        }}>
          <Link
            to="/register"
            style={primaryButtonStyle}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = "#0f172a";
              (e.target as HTMLElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = "#1e293b";
              (e.target as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            Get Started Free
          </Link>
          <Link
            to="/fragrances"
            style={secondaryButtonStyle}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.1)";
              (e.target as HTMLElement).style.color = "white";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = "transparent";
              (e.target as HTMLElement).style.color = "white";
            }}
          >
            Browse Fragrances
          </Link>
        </div>
      </div>
    </section>

    {/* Stats Section */}
    <section style={{
      padding: "60px 32px",
      backgroundColor: "white"
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "40px",
        textAlign: "center"
      }}>
        <div>
          <h3 style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            color: "#1e293b",
            marginBottom: "8px"
          }}>
            23,000+
          </h3>
          <p style={{ color: "#64748b", fontSize: "1.1rem" }}>
            Fragrances in Database
          </p>
        </div>
        <div>
          <h3 style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            color: "#1e293b",
            marginBottom: "8px"
          }}>
            AI-Powered
          </h3>
          <p style={{ color: "#64748b", fontSize: "1.1rem" }}>
            Smart Recommendations
          </p>
        </div>
        <div>
          <h3 style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            color: "#1e293b",
            marginBottom: "8px"
          }}>
            Battle Test
          </h3>
          <p style={{ color: "#64748b", fontSize: "1.1rem" }}>
            Blind Fragrance Trials
          </p>
        </div>
        <div>
          <h3 style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            color: "#1e293b",
            marginBottom: "8px"
          }}>
            Collections
          </h3>
          <p style={{ color: "#64748b", fontSize: "1.1rem" }}>
            Personal Curation
          </p>
        </div>
      </div>
    </section>

    {/* Popular Right Now Section */}
    <section style={{
      padding: "80px 32px",
      backgroundColor: "white"
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "48px"
        }}>
          <div>
            <h2 style={{
              fontSize: "2.5rem",
              fontWeight: "bold",
              color: "#1e293b",
              marginBottom: "8px"
            }}>
              🔥 Popular Right Now
            </h2>
            <p style={{
              color: "#64748b",
              fontSize: "1.1rem"
            }}>
              Discover the most loved fragrances in our community
            </p>
          </div>
          <Link
            to="/fragrances?sortBy=popularity"
            style={{
              ...primaryButtonStyle,
              padding: "12px 24px",
              fontSize: "14px"
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = "#0f172a";
              (e.target as HTMLElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = "#1e293b";
              (e.target as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            View All Popular
          </Link>
        </div>

        {popularLoading ? (
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "200px"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              border: "4px solid #e2e8f0",
              borderTop: "4px solid #1e293b",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }}></div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px"
          }}>
            {popularFragrances.map((fragrance) => (
              <Link
                key={fragrance.id}
                to={`/fragrances/${fragrance.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit"
                }}
              >
                <div style={{
                  ...featureCardStyle,
                  padding: "20px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column"
                }}
                onMouseEnter={(e) => {
                  Object.assign((e.target as HTMLElement).style, featureCardHoverStyle);
                }}
                onMouseLeave={(e) => {
                  Object.assign((e.target as HTMLElement).style, featureCardStyle);
                }}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "12px"
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: "1.25rem",
                        fontWeight: "bold",
                        color: "#1e293b",
                        marginBottom: "4px",
                        lineHeight: 1.2
                      }}>
                        {fragrance.name}
                      </h3>
                      <p style={{
                        color: "#64748b",
                        fontSize: "1rem",
                        marginBottom: "8px"
                      }}>
                        {fragrance.brand}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      {fragrance.year && (
                        <span style={{
                          backgroundColor: "#64748b",
                          color: "white",
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: "600"
                        }}>
                          {fragrance.year}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px"
                  }}>
                    {fragrance.communityRating && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          color: fragrance.communityRating >= 4.5 ? "#22c55e" :
                                 fragrance.communityRating >= 4.0 ? "#3b82f6" :
                                 fragrance.communityRating >= 3.5 ? "#f59e0b" : "#ef4444"
                        }}>
                          ★ {fragrance.communityRating.toFixed(1)}
                        </span>
                        <span style={{
                          fontSize: "12px",
                          color: "#94a3b8"
                        }}>
                          Fragantica
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{
                    fontSize: "14px",
                    color: "#64748b",
                    lineHeight: 1.4,
                    marginTop: "auto"
                  }}>
                    <strong>Top Notes:</strong> {fragrance.topNotes?.slice(0, 3).join(", ") || "Not specified"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>

    {/* Features Section */}
    <section style={{
      padding: "80px 32px",
      backgroundColor: "#f8fafc"
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h2 style={{
          fontSize: "2.5rem",
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: "60px",
          color: "#1e293b"
        }}>
          Everything You Need to Discover Fragrances
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "40px"
        }}>
          <div
            style={featureCardStyle}
            onMouseEnter={(e) => {
              Object.assign((e.target as HTMLElement).style, featureCardHoverStyle);
            }}
            onMouseLeave={(e) => {
              Object.assign((e.target as HTMLElement).style, featureCardStyle);
            }}
          >
            <div style={{
              fontSize: "3rem",
              marginBottom: "20px"
            }}>
              🤖
            </div>
            <h3 style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              marginBottom: "16px",
              color: "#1e293b"
            }}>
              AI-Powered Categorization
            </h3>
            <p style={{
              color: "#64748b",
              lineHeight: 1.6,
              fontSize: "1rem"
            }}>
              Our advanced AI analyzes fragrance notes and characteristics to provide
              intelligent categorization and personalized recommendations.
            </p>
          </div>

          <div
            style={featureCardStyle}
            onMouseEnter={(e) => {
              Object.assign((e.target as HTMLElement).style, featureCardHoverStyle);
            }}
            onMouseLeave={(e) => {
              Object.assign((e.target as HTMLElement).style, featureCardStyle);
            }}
          >
            <div style={{
              fontSize: "3rem",
              marginBottom: "20px"
            }}>
              ⚔️
            </div>
            <h3 style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              marginBottom: "16px",
              color: "#1e293b"
            }}>
              Fragrance Battles
            </h3>
            <p style={{
              color: "#64748b",
              lineHeight: 1.6,
              fontSize: "1rem"
            }}>
              Test your preferences with blind fragrance battles. Compare scents
              side-by-side and discover what you truly love.
            </p>
          </div>

          <div
            style={featureCardStyle}
            onMouseEnter={(e) => {
              Object.assign((e.target as HTMLElement).style, featureCardHoverStyle);
            }}
            onMouseLeave={(e) => {
              Object.assign((e.target as HTMLElement).style, featureCardStyle);
            }}
          >
            <div style={{
              fontSize: "3rem",
              marginBottom: "20px"
            }}>
              📚
            </div>
            <h3 style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              marginBottom: "16px",
              color: "#1e293b"
            }}>
              Personal Collections
            </h3>
            <p style={{
              color: "#64748b",
              lineHeight: 1.6,
              fontSize: "1rem"
            }}>
              Build and organize your fragrance collection. Track your favorites,
              wishlist items, and share discoveries with the community.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* CTA Section */}
    <section style={{
      padding: "80px 32px",
      backgroundColor: "#1e293b",
      color: "white",
      textAlign: "center"
    }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{
          fontSize: "2.5rem",
          fontWeight: "bold",
          marginBottom: "24px"
        }}>
          Ready to Find Your Signature Scent?
        </h2>
        <p style={{
          fontSize: "1.2rem",
          marginBottom: "40px",
          opacity: 0.9
        }}>
          Join thousands of fragrance enthusiasts using AI to discover their perfect match.
        </p>
        <Link
          to="/register"
          style={{
            ...primaryButtonStyle,
            backgroundColor: "white",
            color: "#1e293b",
            fontSize: "18px",
            padding: "18px 36px"
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.backgroundColor = "#f1f5f9";
            (e.target as HTMLElement).style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.backgroundColor = "white";
            (e.target as HTMLElement).style.transform = "translateY(0)";
          }}
        >
          Start Your Journey
        </Link>
      </div>
    </section>

    {/* Add CSS animation for spinner */}
    <style dangerouslySetInnerHTML={{
      __html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `
    }} />
      </div>
  );
};
