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

export default function Login() {
  const { login, verifyLoginOtp, resendOtp } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const [step, setStep] = useState("password"); // "password" | "otp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      await login(email, password);

      setStep("otp");
      setInfo("OTP email pe bheja gaya hai");
    } catch (err) {
      if (err.needsSignupVerification) {
        setError(
          "Account is not verified. Please verify your signup OTP."
        );
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      await verifyLoginOtp(email, otp);
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
    setInfo("");

    try {
      await resendOtp(email);

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
     OTP SCREEN
  ========================= */
  if (step === "otp") {
    return (
      <AuthShell eyebrow="One last step" badges={false}>
        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: "24px",
            color: t.textPrimary,
            marginBottom: "4px",
          }}
        >
          Verify your email
        </h2>

        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            color: t.textMuted,
            marginBottom: "22px",
          }}
        >
          {email} pe bheja gaya OTP daalo
        </p>

        <form
          onSubmit={handleOtpSubmit}
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
            {loading ? "Verifying..." : "Verify & Login"}
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
                resendCooldown > 0 ? t.textMuted : t.accent,
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
              setStep("password");
              setOtp("");
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

  /* =========================
     LOGIN SCREEN
  ========================= */
  return (
    <AuthShell eyebrow="Welcome back">
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
        Welcome back
      </h1>

      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "13px",
          color: t.textMuted,
          marginBottom: "22px",
        }}
      >
        Login karke apna shop dashboard manage karo
      </p>

      <form
        onSubmit={handlePasswordSubmit}
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

        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        <div style={{ textAlign: "right", marginTop: "-6px" }}>
          <Link
            to="/forgot-password"
            style={{
              fontSize: "12px",
              color: t.accent,
              fontWeight: 700,
              textDecoration: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Forgot password?
          </Link>
        </div>

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
          {loading ? "Checking..." : "Continue"}
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
        Don't have an account?{" "}
        <Link
          to="/signup"
          style={{
            color: t.accent,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
