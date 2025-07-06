import { Outlet } from "react-router-dom";

export const Layout = () => (
  <div style={{ minHeight: "100vh", backgroundColor: "#f7fafc" }}>
    <header style={{
      backgroundColor: "#3a6ea5",
      color: "white",
      padding: "16px 32px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      marginBottom: "0"
    }}>
      <h1 style={{
        margin: 0,
        fontSize: "1.8rem",
        fontWeight: "bold",
        textAlign: "center"
      }}>
        🧪 Fragrance Battle AI
      </h1>
      <p style={{
        margin: "8px 0 0 0",
        fontSize: "0.9rem",
        opacity: 0.9,
        textAlign: "center"
      }}>
        AI-powered fragrance testing and collection management
      </p>
    </header>
    <main style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
      <Outlet />
    </main>
  </div>
);
