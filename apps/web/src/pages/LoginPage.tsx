import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../lib/api";

const inputStyle = {
  width: "100%",
  padding: "12px",
  border: "2px solid #e2e8f0",
  borderRadius: "6px",
  fontSize: "16px",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  outline: "none"
};

const inputFocusStyle = {
  borderColor: "#3a6ea5",
  boxShadow: "0 0 0 3px rgba(58, 110, 165, 0.1)"
};

const buttonStyle = {
  width: "100%",
  padding: "14px",
  backgroundColor: "#3a6ea5",
  color: "white",
  border: "none",
  borderRadius: "6px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  transition: "all 0.2s ease"
};

const buttonHoverStyle = {
  backgroundColor: "#2c5282",
  transform: "translateY(-1px)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
};

const buttonDisabledStyle = {
  backgroundColor: "#a0aec0",
  cursor: "not-allowed",
  transform: "none",
  boxShadow: "none"
};

export const LoginPage = () => {
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
      // Call the backend API to login the user
      const response = await authApi.login({
        email,
        password
      });

      // Save the token and user info
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      setSuccess(`Welcome back, ${response.user.username}!`);

      // Redirect to home page after 1 second
      setTimeout(() => {
        navigate('/');
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: 400,
      margin: "40px auto",
      background: "#fff",
      borderRadius: 12,
      padding: 32,
      boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
    }}>
      <h2 style={{ color: "#3a6ea5", marginBottom: 24, textAlign: "center" }}>Login</h2>

      {error && (
        <div style={{
          padding: "12px",
          backgroundColor: "#fed7d7",
          color: "#c53030",
          borderRadius: "6px",
          marginBottom: "20px",
          fontSize: "14px"
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: "12px",
          backgroundColor: "#c6f6d5",
          color: "#2f855a",
          borderRadius: "6px",
          marginBottom: "20px",
          fontSize: "14px"
        }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: "500", color: "#4a5568" }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
            style={inputStyle}
            onFocus={(e) => Object.assign((e.target as HTMLElement).style, inputFocusStyle)}
            onBlur={(e) => Object.assign((e.target as HTMLElement).style, { borderColor: "#e2e8f0", boxShadow: "none" })}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: "500", color: "#4a5568" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={loading}
            style={inputStyle}
            onFocus={(e) => Object.assign((e.target as HTMLElement).style, inputFocusStyle)}
            onBlur={(e) => Object.assign((e.target as HTMLElement).style, { borderColor: "#e2e8f0", boxShadow: "none" })}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={loading ? buttonDisabledStyle : buttonStyle}
          onMouseEnter={(e) => {
            if (!loading) {
              Object.assign((e.target as HTMLElement).style, buttonHoverStyle);
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              Object.assign((e.target as HTMLElement).style, buttonStyle);
            }
          }}
        >
          {loading ? "Signing In..." : "Login"}
        </button>
      </form>
    </div>
  );
};
