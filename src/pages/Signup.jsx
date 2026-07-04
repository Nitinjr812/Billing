import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../components/ThemeContext";
import { inputStyle, buttonStyle } from "./Login";

export default function Signup() {
  const { signupOwner, signupStaff } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const [tab, setTab] = useState("owner"); // "owner" | "staff"
  const [form, setForm] = useState({ name: "", email: "", password: "", shopName: "", shopId: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ownerShopId, setOwnerShopId] = useState(""); // signup ke baad dikhane ke liye

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "owner") {
        const data = await signupOwner({
          name: form.name, email: form.email, password: form.password, shopName: form.shopName,
        });
        setOwnerShopId(data.shopId); // pehle Shop ID dikhao, phir navigate
      } else {
        await signupStaff({
          name: form.name, email: form.email, password: form.password, shopId: form.shopId,
        });
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Owner signup ke baad Shop ID dikhane wala screen ──
  if (ownerShopId) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bgPage, padding: "20px" }}>
        <div style={{ width: "100%", maxWidth: 380, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "32px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, color: t.textPrimary }}>🎉 Shop Created!</h2>
          <p style={{ fontSize: "13px", color: t.textMuted, margin: "12px 0" }}>
            Apna Shop ID staff members ke saath share karo taaki wo join kar sakein:
          </p>
          <div style={{
            background: t.bgPage, border: `1px dashed ${t.accent}`, borderRadius: "10px",
            padding: "14px", fontFamily: "monospace", fontSize: "16px", fontWeight: 700,
            color: t.accent, marginBottom: "20px", wordBreak: "break-all",
          }}>
            {ownerShopId}
          </div>
          <button onClick={() => navigate("/dashboard")} style={buttonStyle(t, false)}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bgPage, padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: 380, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "32px" }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "24px", color: t.textPrimary, marginBottom: "4px" }}>
          Create account
        </h1>
        <p style={{ fontSize: "13px", color: t.textMuted, marginBottom: "20px" }}>
          Naya shop banao ya apni team join karo
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {["owner", "staff"].map((tabName) => (
            <button
              key={tabName}
              onClick={() => setTab(tabName)}
              style={{
                flex: 1, padding: "8px", borderRadius: "8px", border: `1px solid ${t.border}`,
                background: tab === tabName ? t.accent : "transparent",
                color: tab === tabName ? "#fff" : t.textMuted,
                fontWeight: 600, fontSize: "12px", cursor: "pointer",
                textTransform: "capitalize", fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {tabName === "owner" ? "New Shop (Owner)" : "Join Shop (Staff)"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input placeholder="Full Name" value={form.name} onChange={update("name")} required style={inputStyle(t)} />
          <input type="email" placeholder="Email" value={form.email} onChange={update("email")} required style={inputStyle(t)} />
          <input type="password" placeholder="Password" value={form.password} onChange={update("password")} required style={inputStyle(t)} />

          {tab === "owner" ? (
            <input placeholder="Shop Name" value={form.shopName} onChange={update("shopName")} required style={inputStyle(t)} />
          ) : (
            <input placeholder="Shop ID (owner se lo)" value={form.shopId} onChange={update("shopId")} required style={inputStyle(t)} />
          )}

          {error && <p style={{ color: t.red, fontSize: "12px", margin: 0 }}>{error}</p>}

          <button type="submit" disabled={loading} style={buttonStyle(t, loading)}>
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </form>

        <p style={{ fontSize: "12px", color: t.textMuted, marginTop: "20px", textAlign: "center" }}>
          Already have an account? <Link to="/login" style={{ color: t.accent, fontWeight: 600 }}>Login</Link>
        </p>
      </div>
    </div>
  );
}