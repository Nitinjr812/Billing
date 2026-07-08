import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../components/ThemeContext";
import { inputStyle, buttonStyle } from "./Login";

export default function ForgotPassword() {
  const { forgotPassword, resetPassword } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const [step, setStep] = useState("email"); // "email" | "reset"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setStep("reset");
      setInfo("OTP sent to your email");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, otp, newPassword);
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await forgotPassword(email);
      setInfo("OTP resent");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bgPage, padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: 380, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "32px" }}>
        {step === "email" ? (
          <>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "24px", color: t.textPrimary, marginBottom: "4px" }}>
              Forgot password
            </h1>
            <p style={{ fontSize: "13px", color: t.textMuted, marginBottom: "24px" }}>
              Enter your email to receive a reset code
            </p>

            <form onSubmit={handleRequestOtp} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle(t)}
              />

              {error && <p style={{ color: t.red, fontSize: "12px", margin: 0 }}>{error}</p>}

              <button type="submit" disabled={loading} style={buttonStyle(t, loading)}>
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>

            <p style={{ fontSize: "12px", color: t.textMuted, marginTop: "20px", textAlign: "center" }}>
              Remembered your password? <Link to="/login" style={{ color: t.accent, fontWeight: 600 }}>Login</Link>
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "24px", color: t.textPrimary, marginBottom: "4px" }}>
              Reset password
            </h1>
            <p style={{ fontSize: "13px", color: t.textMuted, marginBottom: "24px" }}>
              Enter the OTP sent to {email} and set a new password
            </p>

            <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                type="text"
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
                style={{ ...inputStyle(t), textAlign: "center", letterSpacing: "6px", fontSize: "18px" }}
              />
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={inputStyle(t)}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={inputStyle(t)}
              />

              {info && !error && <p style={{ color: t.accent, fontSize: "12px", margin: 0 }}>{info}</p>}
              {error && <p style={{ color: t.red, fontSize: "12px", margin: 0 }}>{error}</p>}

              <button type="submit" disabled={loading} style={buttonStyle(t, loading)}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>

            <p style={{ fontSize: "12px", color: t.textMuted, marginTop: "16px", textAlign: "center" }}>
              Didn't get the OTP?{" "}
              <button
                onClick={handleResend}
                style={{ background: "none", border: "none", color: t.accent, fontWeight: 600, cursor: "pointer", fontSize: "12px", padding: 0 }}
              >
                Resend
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}