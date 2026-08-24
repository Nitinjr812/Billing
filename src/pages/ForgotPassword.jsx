import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../components/ThemeContext";
import {
  AuthShell,
  AnimatedInput,
  PasswordInput,
  MoneyButton,
} from "./authUi";

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
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleRequestOtp = async (e) => {
    e.preventDefault();

    setError("");
    setInfo("");
    setLoading(true);

    try {
      await forgotPassword(email);

      setStep("reset");
      setInfo("OTP email pe bheja gaya hai");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();

    setError("");
    setInfo("");

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
    if (resendCooldown > 0) return;

    setError("");
    setInfo("");

    try {
      await forgotPassword(email);

      setInfo("OTP dobara bheja gaya");
      setResendCooldown(30);

      const iv = setInterval(() => {
        setResendCooldown((c) => {
          if (c <= 1) {
            clearInterval(iv);
            return 0;
          }

          return c - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  /* =========================
     EMAIL SCREEN
  ========================= */
  if (step === "email") {
    return (
      <AuthShell eyebrow="Account recovery">
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: "26px",
            color: t.textPrimary,
            margin: "0 0 4px",
            letterSpacing: "-0.02em",
          }}
        >
          Forgot password?
        </h1>

        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            color: t.textMuted,
            marginBottom: "22px",
          }}
        >
          Email daalo, hum tumhe password reset OTP bhejenge
        </p>

        <form
          onSubmit={handleRequestOtp}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <AnimatedInput
            label="Email"
            type="email"
            placeholder="you@business.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {error && (
            <p
              style={{
                color: t.red,
                fontSize: "12px",
                margin: 0,
                background: t.red + "14",
                border: `1px solid ${t.red}33`,
                borderRadius: "8px",
                padding: "8px 12px",
              }}
            >
              {error}
            </p>
          )}

          <MoneyButton disabled={loading} loading={loading}>
            {loading ? "Sending..." : "Send OTP"}
          </MoneyButton>
        </form>

        <p
          style={{
            fontSize: "12px",
            color: t.textMuted,
            marginTop: "22px",
            textAlign: "center",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Password yaad aa gaya?{" "}
          <Link
            to="/login"
            style={{
              color: t.accent,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Login
          </Link>
        </p>
      </AuthShell>
    );
  }

  /* =========================
     RESET SCREEN
  ========================= */
  return (
    <AuthShell eyebrow="Reset password" badges={false}>
      <h1
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: "26px",
          color: t.textPrimary,
          margin: "0 0 4px",
          letterSpacing: "-0.02em",
        }}
      >
        Create new password
      </h1>

      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "13px",
          color: t.textMuted,
          marginBottom: "22px",
        }}
      >
        {email} pe bheja gaya OTP daalo aur naya password set karo
      </p>

      <form
        onSubmit={handleReset}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <AnimatedInput
          label="6-digit code"
          type="text"
          placeholder="••••••"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          maxLength={6}
          required
          style={{
            textAlign: "center",
            letterSpacing: "10px",
            fontSize: "20px",
            fontWeight: 700,
            fontFamily: "'Syne', sans-serif",
          }}
        />

        <PasswordInput
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password"
          required
        />

        <PasswordInput
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          required
        />

        {info && !error && (
          <p
            style={{
              color: t.accent,
              fontSize: "12px",
              margin: 0,
            }}
          >
            {info}
          </p>
        )}

        {error && (
          <p
            style={{
              color: t.red,
              fontSize: "12px",
              margin: 0,
              background: t.red + "14",
              border: `1px solid ${t.red}33`,
              borderRadius: "8px",
              padding: "8px 12px",
            }}
          >
            {error}
          </p>
        )}

        <MoneyButton disabled={loading} loading={loading}>
          {loading ? "Resetting..." : "Reset Password"}
        </MoneyButton>
      </form>

      <p
        style={{
          fontSize: "12px",
          color: t.textMuted,
          marginTop: "18px",
          textAlign: "center",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        OTP nahi mila?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          style={{
            background: "none",
            border: "none",
            fontWeight: 700,
            fontSize: "12px",
            padding: 0,
            color:
              resendCooldown > 0
                ? t.textMuted
                : t.accent,
            cursor:
              resendCooldown > 0
                ? "not-allowed"
                : "pointer",
          }}
        >
          {resendCooldown > 0
            ? `Resend in ${resendCooldown}s`
            : "Resend"}
        </button>
      </p>

      <p
        style={{
          fontSize: "12px",
          color: t.textMuted,
          marginTop: "12px",
          textAlign: "center",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Wrong email?{" "}
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setOtp("");
            setNewPassword("");
            setConfirmPassword("");
            setError("");
            setInfo("");
          }}
          style={{
            background: "none",
            border: "none",
            color: t.accent,
            fontWeight: 700,
            fontSize: "12px",
            padding: 0,
            cursor: "pointer",
          }}
        >
          Go back
        </button>
      </p>
    </AuthShell>
  );
}
