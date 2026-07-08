import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../components/ThemeContext";
import { inputStyle, buttonStyle } from "./Login";

export default function Signup() {
  const { signupOwner, signupStaff, verifySignupOtp, resendOtp } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const [tab, setTab] = useState("owner"); // "owner" | "staff"
  const [form, setForm] = useState({ name: "", email: "", password: "", shopName: "", shopId: "" });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState("form"); // "form" | "otp"
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingShopId, setPendingShopId] = useState(""); // owner ka shopId, verify ke baad dikhane ke liye
  const [otp, setOtp] = useState("");

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
        setPendingShopId(data.shopId);
        setPendingEmail(data.email);
      } else {
        const data = await signupStaff({
          name: form.name, email: form.email, password: form.password, shopId: form.shopId,
        });
        setPendingEmail(data.email);
      }
      setStep("otp");
      setInfo("OTP email pe bheja gaya hai");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifySignupOtp(pendingEmail, otp);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await resendOtp(pendingEmail);
      setInfo("OTP dobara bheja gaya");
    } catch (err) {
      setError(err.message);
    }
  };

  // ── OTP verification screen (owner + staff dono ke liye common) ──
  if (step === "otp") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bgPage, padding: "20px" }}>
        <div style={{ width: "100%", maxWidth: 380, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "32px" }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "22px", color: t.textPrimary, marginBottom: "4px" }}>
            Verify your email
          </h2>
          <p style={{ fontSize: "13px", color: t.textMuted, marginBottom: "20px" }}>
            {pendingEmail} pe bheja gaya OTP daalo
          </p>

          {pendingShopId && (
            <div style={{
              background: t.bgPage, border: `1px dashed ${t.accent}`, borderRadius: "10px",
              padding: "12px", fontFamily: "monospace", fontSize: "14px", fontWeight: 700,
              color: t.accent, marginBottom: "16px", wordBreak: "break-all", textAlign: "center",
            }}>
              Shop ID: {pendingShopId}
            </div>
          )}

          <form onSubmit={handleOtpSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              type="text"
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              required
              style={{ ...inputStyle(t), textAlign: "center", letterSpacing: "6px", fontSize: "18px" }}
            />

            {info && !error && <p style={{ color: t.accent, fontSize: "12px", margin: 0 }}>{info}</p>}
            {error && <p style={{ color: t.red, fontSize: "12px", margin: 0 }}>{error}</p>}

            <button type="submit" disabled={loading} style={buttonStyle(t, loading)}>
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
          </form>

          <p style={{ fontSize: "12px", color: t.textMuted, marginTop: "16px", textAlign: "center" }}>
            OTP nahi mila?{" "}
            <button
              onClick={handleResend}
              style={{ background: "none", border: "none", color: t.accent, fontWeight: 600, cursor: "pointer", fontSize: "12px", padding: 0 }}
            >
              Resend
            </button>
          </p>
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