import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../components/ThemeContext";

export default function Login() {
  const { login } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: t.bgPage, padding: "20px",
    }}>
      <div style={{
        width: "100%", maxWidth: 380, background: t.bgCard, border: `1px solid ${t.border}`,
        borderRadius: "16px", padding: "32px",
      }}>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "24px",
          color: t.textPrimary, marginBottom: "4px",
        }}>Welcome back</h1>
        <p style={{ fontSize: "13px", color: t.textMuted, marginBottom: "24px" }}>
          Login to your shop dashboard
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle(t)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle(t)}
          />

          {error && (
            <p style={{ color: t.red, fontSize: "12px", margin: 0 }}>{error}</p>
          )}

          <button type="submit" disabled={loading} style={buttonStyle(t, loading)}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p style={{ fontSize: "12px", color: t.textMuted, marginTop: "20px", textAlign: "center" }}>
          Don't have an account? <Link to="/signup" style={{ color: t.accent, fontWeight: 600 }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export function inputStyle(t) {
  return {
    padding: "10px 14px", borderRadius: "10px", border: `1px solid ${t.border}`,
    background: t.bgPage, color: t.textPrimary, fontSize: "13px", outline: "none",
    fontFamily: "'DM Sans', sans-serif",
  };
}

export function buttonStyle(t, loading) {
  return {
    padding: "11px", borderRadius: "10px", border: "none",
    background: loading ? `${t.accent}80` : t.accent, color: "#fff",
    fontWeight: 700, fontSize: "13px", cursor: loading ? "not-allowed" : "pointer",
    fontFamily: "'DM Sans', sans-serif", marginTop: "6px",
  };
}