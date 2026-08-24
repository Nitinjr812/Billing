import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../components/ThemeContext";
import { AuthShell, AnimatedInput, PasswordInput, MoneyButton } from "./authUi";

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
  const [pendingShopId, setPendingShopId] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

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
    if (resendCooldown > 0) return;
    setError("");
    try {
      await resendOtp(pendingEmail);
      setInfo("OTP dobara bheja gaya");
      setResendCooldown(30);
      const iv = setInterval(() => {
        setResendCooldown((c) => {
          if (c <= 1) { clearInterval(iv); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  /* ── OTP verification screen (owner + staff dono ke liye common) ── */
  if (step === "otp") {
    return (
      <AuthShell eyebrow="One last step" badges={false}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "24px", color: t.textPrimary, marginBottom: "4px" }}>
          Verify your email
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: t.textMuted, marginBottom: "22px" }}>
          {pendingEmail} pe bheja gaya OTP daalo
        </p>

        {pendingShopId && (
          <div style={{
            background: `linear-gradient(135deg, ${t.accent}14, transparent)`,
            border: `1px dashed ${t.accent}`, borderRadius: "12px",
            padding: "14px", marginBottom: "18px", textAlign: "center",
          }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textMuted, margin: "0 0 4px" }}>
              Your Shop ID
            </p>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "18px", color: t.accent, margin: 0, wordBreak: "break-all" }}>
              {pendingShopId}
            </p>
          </div>
        )}

        <form onSubmit={handleOtpSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <AnimatedInput
            label="6-digit code"
            type="text"
            placeholder="••••••"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            required
            style={{ textAlign: "center", letterSpacing: "10px", fontSize: "20px", fontWeight: 700, fontFamily: "'Syne', sans-serif" }}
          />

          {info && !error && <p style={{ color: t.accent, fontSize: "12px", margin: 0 }}>{info}</p>}
          {error && (
            <p style={{ color: t.red, fontSize: "12px", margin: 0, background: t.red + "14", border: `1px solid ${t.red}33`, borderRadius: "8px", padding: "8px 12px" }}>{error}</p>
          )}

          <MoneyButton disabled={loading} loading={loading}>
            {loading ? "Verifying..." : "Verify & Continue"}
          </MoneyButton>
        </form>

        <p style={{ fontSize: "12px", color: t.textMuted, marginTop: "18px", textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>
          OTP nahi mila?{" "}
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            style={{
              background: "none", border: "none", fontWeight: 700, fontSize: "12px", padding: 0,
              color: resendCooldown > 0 ? t.textMuted : t.accent,
              cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
            }}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
          </button>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Create account">
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "26px", color: t.textPrimary, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
        Create your account
      </h1>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: t.textMuted, marginBottom: "22px" }}>
        Naya shop banao ya apni team join karo
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "22px", background: t.bgPage, padding: "4px", borderRadius: "12px", border: `1px solid ${t.border}` }}>
        {["owner", "staff"].map((tabName) => (
          <button
            key={tabName}
            type="button"
            onClick={() => setTab(tabName)}
            style={{
              flex: 1, padding: "9px", borderRadius: "9px", border: "none",
              background: tab === tabName ? t.accent : "transparent",
              color: tab === tabName ? "#fff" : t.textMuted,
              fontWeight: 700, fontSize: "12px", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: tab === tabName ? `0 4px 12px -6px ${t.accent}88` : "none",
              transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            {tabName === "owner" ? "New Shop (Owner)" : "Join Shop (Staff)"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <AnimatedInput label="Full Name" placeholder="Rahul Sharma" value={form.name} onChange={update("name")} required />
        <AnimatedInput label="Email" type="email" placeholder="you@business.com" value={form.email} onChange={update("email")} required />
        <PasswordInput value={form.password} onChange={update("password")} placeholder="••••••••" required />

        {tab === "owner" ? (
          <AnimatedInput label="Shop Name" placeholder="Sharma General Store" value={form.shopName} onChange={update("shopName")} required />
        ) : (
          <AnimatedInput label="Shop ID" placeholder="Owner se lo" value={form.shopId} onChange={update("shopId")} required />
        )}

        {error && (
          <p style={{ color: t.red, fontSize: "12px", margin: 0, background: t.red + "14", border: `1px solid ${t.red}33`, borderRadius: "8px", padding: "8px 12px" }}>{error}</p>
        )}

        <MoneyButton disabled={loading} loading={loading}>
          {loading ? "Creating..." : "Sign Up"}
        </MoneyButton>
      </form>

      <p style={{ fontSize: "12px", color: t.textMuted, marginTop: "22px", textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>
        Already have an account? <Link to="/login" style={{ color: t.accent, fontWeight: 700, textDecoration: "none" }}>Login</Link>
      </p>
    </AuthShell>
  );
}