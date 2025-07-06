import { Link } from "react-router-dom";

const linkStyle = {
  display: "inline-block",
  padding: "12px 24px",
  backgroundColor: "#3a6ea5",
  color: "white",
  textDecoration: "none",
  borderRadius: "6px",
  fontWeight: "bold",
  transition: "all 0.2s ease",
  cursor: "pointer"
};

const linkHoverStyle = {
  backgroundColor: "#2c5282",
  transform: "translateY(-1px)",
  boxShadow: "0 4px 8px rgba(0,0,0,0.2)"
};

export const HomePage = () => (
  <div style={{
    maxWidth: 600,
    margin: "40px auto",
    background: "#fff",
    borderRadius: 12,
    padding: 32,
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    transition: "box-shadow 0.3s ease"
  }}>
    <h2 style={{ color: "#3a6ea5", marginBottom: 16 }}>Welcome to Fragrance Battle AI</h2>
    <p style={{ color: "#666", fontSize: "1.1rem", lineHeight: 1.6 }}>
      Manage your fragrance collection, test blind, and get AI-powered recommendations!
    </p>
    <ul style={{ color: "#555", marginBottom: 32 }}>
      <li style={{ marginBottom: 8 }}>Login or register to get started</li>
      <li style={{ marginBottom: 8 }}>Try a blind test battle</li>
      <li style={{ marginBottom: 8 }}>Track your favorites and discover new scents</li>
    </ul>
    <div style={{ marginTop: 24, display: "flex", gap: 16 }}>
      <Link
        to="/login"
        style={linkStyle}
        onMouseEnter={(e) => {
          Object.assign((e.target as HTMLElement).style, linkHoverStyle);
        }}
        onMouseLeave={(e) => {
          Object.assign((e.target as HTMLElement).style, linkStyle);
        }}
      >
        Login
      </Link>
      <Link
        to="/register"
        style={{
          ...linkStyle,
          backgroundColor: "#48bb78",
        }}
        onMouseEnter={(e) => {
          Object.assign((e.target as HTMLElement).style, {
            backgroundColor: "#38a169",
            transform: "translateY(-1px)",
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)"
          });
        }}
        onMouseLeave={(e) => {
          Object.assign((e.target as HTMLElement).style, {
            ...linkStyle,
            backgroundColor: "#48bb78",
          });
        }}
      >
        Register
      </Link>
    </div>
  </div>
);
