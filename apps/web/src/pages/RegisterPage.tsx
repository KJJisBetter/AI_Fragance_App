import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../lib/api";

export const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Call the backend API to register the user
      const response = await authApi.register({
        username,
        email,
        password
      });

      // Save the token and user info
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      setSuccess(`Welcome ${response.user.username}! Registration successful!`);

      // Redirect to home page after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f8fafc",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px"
    }}>
      {/* Header */}
      <div style={{
        textAlign: "center",
        marginBottom: "48px"
      }}>
        <h1 style={{
          fontSize: "2.5rem",
          fontWeight: "bold",
          color: "#1e293b",
          margin: "0 0 8px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px"
        }}>
          🌸 Fragrance Battle AI
        </h1>
        <p style={{
          fontSize: "1.1rem",
          color: "#64748b",
          margin: "0"
        }}>
          Discover, compare, and battle your favorite fragrances
        </p>
      </div>

      {/* Register Form */}
      <div style={{
        maxWidth: "400px",
        width: "100%",
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "32px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "1px solid rgba(0,0,0,0.05)"
      }}>
        <div style={{
          textAlign: "center",
          marginBottom: "32px"
        }}>
          <h2 style={{
            fontSize: "1.8rem",
            fontWeight: "bold",
            color: "#1e293b",
            margin: "0 0 8px 0"
          }}>
            Create Account
          </h2>
          <p style={{
            color: "#64748b",
            fontSize: "14px",
            margin: "0"
          }}>
            Join the fragrance community and start your journey
          </p>
        </div>

        {error && (
          <div style={{
            padding: "12px 16px",
            backgroundColor: "#fef2f2",
            color: "#dc2626",
            border: "1px solid #fca5a5",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span>⚠️</span>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: "12px 16px",
            backgroundColor: "#f0fdf4",
            color: "#16a34a",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span>✅</span>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
              color: "#374151",
              fontSize: "14px"
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              disabled={loading}
              placeholder="Choose a username"
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "2px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "16px",
                transition: "all 0.2s ease",
                outline: "none",
                backgroundColor: loading ? "#f9fafb" : "white"
              }}
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor = "#10b981";
                (e.target as HTMLElement).style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1)";
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor = "#e5e7eb";
                (e.target as HTMLElement).style.boxShadow = "none";
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
              color: "#374151",
              fontSize: "14px"
            }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your email"
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "2px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "16px",
                transition: "all 0.2s ease",
                outline: "none",
                backgroundColor: loading ? "#f9fafb" : "white"
              }}
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor = "#10b981";
                (e.target as HTMLElement).style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1)";
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor = "#e5e7eb";
                (e.target as HTMLElement).style.boxShadow = "none";
              }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
              color: "#374151",
              fontSize: "14px"
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="Create a password"
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "2px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "16px",
                transition: "all 0.2s ease",
                outline: "none",
                backgroundColor: loading ? "#f9fafb" : "white"
              }}
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor = "#10b981";
                (e.target as HTMLElement).style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1)";
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor = "#e5e7eb";
                (e.target as HTMLElement).style.boxShadow = "none";
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px 16px",
              backgroundColor: loading ? "#9ca3af" : "#10b981",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.target as HTMLElement).style.backgroundColor = "#059669";
                (e.target as HTMLElement).style.transform = "translateY(-1px)";
                (e.target as HTMLElement).style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                (e.target as HTMLElement).style.backgroundColor = "#10b981";
                (e.target as HTMLElement).style.transform = "translateY(0)";
                (e.target as HTMLElement).style.boxShadow = "none";
              }
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid #ffffff",
                  borderTop: "2px solid transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }}></div>
                Creating Account...
              </>
            ) : (
              <>
                🚀 Create Account
              </>
            )}
          </button>
        </form>

        {/* Navigation to Login */}
        <div style={{
          marginTop: "24px",
          paddingTop: "24px",
          borderTop: "1px solid #e5e7eb",
          textAlign: "center"
        }}>
          <p style={{
            color: "#6b7280",
            fontSize: "14px",
            margin: "0 0 8px 0"
          }}>
            Already have an account?
          </p>
          <Link
            to="/login"
            style={{
              color: "#10b981",
              fontSize: "14px",
              fontWeight: "600",
              textDecoration: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              transition: "all 0.2s ease",
              display: "inline-block"
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = "#f0fdf4";
              (e.target as HTMLElement).style.color = "#059669";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = "transparent";
              (e.target as HTMLElement).style.color = "#10b981";
            }}
          >
            Sign in to your account →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: "center",
        marginTop: "32px",
        color: "#9ca3af",
        fontSize: "12px"
      }}>
        <p style={{ margin: "0" }}>
          © 2024 Fragrance Battle AI • Discover your perfect scent
        </p>
      </div>

      {/* Loading Animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};
