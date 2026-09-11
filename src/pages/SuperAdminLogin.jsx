import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperAdminAuth } from "../context/SuperAdminAuthContext";

export default function SuperAdminLogin() {
  const { login } = useSuperAdminAuth();
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
      navigate("/sa-x7k9q2-dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0a0a0f", fontFamily: "'DM Sans', sans-serif",
    }}>
      <form onSubmit={handleSubmit} style={{
        width: 360, padding: 32, borderRadius: 16,
        background: "#15151f", border: "1px solid #2a2a3a",
      }}>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 22,
          color: "#fff", marginBottom: 4,
        }}>Super Admin</h1>
        <p style={{ fontSize: 12, color: "#8888a0", marginBottom: 24 }}>Restricted access</p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px 14px",
            borderRadius: 10, border: "1px solid #2a2a3a", background: "#0a0a0f",
            color: "#fff", fontSize: 13, marginBottom: 12, outline: "none",
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px 14px",
            borderRadius: 10, border: "1px solid #2a2a3a", background: "#0a0a0f",
            color: "#fff", fontSize: 13, marginBottom: 16, outline: "none",
          }}
        />

        {error && (
          <p style={{ color: "#f87171", fontSize: 12, marginBottom: 12 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
            background: "#6366f1", color: "#fff", fontWeight: 700, fontSize: 13,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
          }}
        >{loading ? "Logging in..." : "Login"}</button>
      </form>
    </div>
  );
}