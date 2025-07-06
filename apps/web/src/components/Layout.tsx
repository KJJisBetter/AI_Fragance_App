import { Outlet, Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export const Layout = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/fragrances?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <header style={{
        backgroundColor: "#1e293b",
        color: "white",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        position: "sticky",
        top: 0,
        zIndex: 1000
      }}>
        {/* Top Navigation Bar */}
        <nav style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          maxWidth: "1200px",
          margin: "0 auto",
          flexWrap: "wrap",
          gap: "16px"
        }}>
          {/* Logo/Brand */}
          <Link
            to="/"
            style={{
              textDecoration: "none",
              color: "inherit",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "1.5rem",
              fontWeight: "bold"
            }}
          >
            <span style={{ fontSize: "1.8rem" }}>🧪</span>
            <span>Fragrance Battle AI</span>
          </Link>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: "8px",
              padding: "8px 16px",
              border: "1px solid rgba(255,255,255,0.2)",
              flex: "1",
              maxWidth: "400px",
              minWidth: "200px"
            }}
          >
            <input
              type="text"
              placeholder="Search fragrances..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "white",
                fontSize: "14px",
                width: "100%",
                outline: "none"
              }}
            />
            <button
              type="submit"
              style={{
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                padding: "4px",
                marginLeft: "8px"
              }}
            >
              🔍
            </button>
          </form>

          {/* Navigation Links */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "24px"
          }}>
            <Link
              to="/fragrances"
              style={{
                textDecoration: "none",
                color: "white",
                fontWeight: "500",
                transition: "color 0.2s",
                padding: "8px 0"
              }}
              onMouseOver={(e) => e.target.style.color = "#94a3b8"}
              onMouseOut={(e) => e.target.style.color = "white"}
            >
              Fragrances
            </Link>
            <Link
              to="/battles"
              style={{
                textDecoration: "none",
                color: "white",
                fontWeight: "500",
                transition: "color 0.2s",
                padding: "8px 0"
              }}
              onMouseOver={(e) => e.target.style.color = "#94a3b8"}
              onMouseOut={(e) => e.target.style.color = "white"}
            >
              Battles
            </Link>
            <Link
              to="/collections"
              style={{
                textDecoration: "none",
                color: "white",
                fontWeight: "500",
                transition: "color 0.2s",
                padding: "8px 0"
              }}
              onMouseOver={(e) => e.target.style.color = "#94a3b8"}
              onMouseOut={(e) => e.target.style.color = "white"}
            >
              Collections
            </Link>
          </div>

          {/* Auth Buttons */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <Link
              to="/login"
              style={{
                textDecoration: "none",
                color: "white",
                padding: "8px 16px",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "6px",
                fontWeight: "500",
                fontSize: "14px",
                transition: "all 0.2s",
                display: "inline-block"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                e.target.style.borderColor = "rgba(255,255,255,0.5)";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.borderColor = "rgba(255,255,255,0.3)";
              }}
            >
              Login
            </Link>
            <Link
              to="/register"
              style={{
                textDecoration: "none",
                color: "#1e293b",
                backgroundColor: "white",
                padding: "8px 16px",
                borderRadius: "6px",
                fontWeight: "600",
                fontSize: "14px",
                transition: "all 0.2s",
                display: "inline-block"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#f1f5f9";
                e.target.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "white";
                e.target.style.transform = "translateY(0)";
              }}
            >
              Sign Up
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main style={{
        padding: "32px",
        maxWidth: "1200px",
        margin: "0 auto",
        minHeight: "calc(100vh - 120px)"
      }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{
        backgroundColor: "#1e293b",
        color: "white",
        padding: "24px 32px",
        marginTop: "auto",
        borderTop: "1px solid rgba(255,255,255,0.1)"
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          textAlign: "center",
          fontSize: "14px",
          opacity: 0.8
        }}>
          <p style={{ margin: 0 }}>
            © 2024 Fragrance Battle AI. Powered by AI for fragrance enthusiasts.
          </p>
        </div>
      </footer>
    </div>
  );
};
