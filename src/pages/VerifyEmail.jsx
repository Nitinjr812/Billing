import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../components/ThemeContext";
import { AuthShell, MoneyButton } from "./authUi";

export default function VerifyEmail() {
  const { token } = useParams();
  const { verifyEmail } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const [status, setStatus] = useState("verifying");
  const [error, setError] = useState("");

  useEffect(() => {
    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setError(err.message);
        setStatus("error");
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (status === "verifying") {
    return (
      <AuthShell eyebrow="Email verification" badges={false}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              margin: "0 auto 18px",
              borderRadius: "50%",
              border: `3px solid ${t.border}`,
              borderTopColor: t.accent,
              animation: "spin 0.8s linear infinite",
            }}
          />

          <h2
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: "24px",
              color: t.textPrimary,
              margin: "0 0 6px",
            }}
          >
            Verifying email
          </h2>

          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: t.textMuted,
              margin: 0,
            }}
          >
            Please wait while we verify your email...
          </p>
        </div>
      </AuthShell>
    );
  }

  if (status === "success") {
    return (
      <AuthShell eyebrow="Verification complete" badges={false}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 18px",
              borderRadius: "50%",
              background: `${t.accent}18`,
              border: `1px solid ${t.accent}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
            }}
          >
            ✓
          </div>

          <h2
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: "24px",
              color: t.textPrimary,
              margin: "0 0 6px",
            }}
          >
            Email Verified!
          </h2>

          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: t.textMuted,
              margin: "0 0 22px",
            }}
          >
            Your email has been successfully verified.
          </p>

          <MoneyButton
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard
          </MoneyButton>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Verification failed" badges={false}>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            margin: "0 auto 18px",
            borderRadius: "50%",
            background: `${t.red}14`,
            border: `1px solid ${t.red}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
            color: t.red,
          }}
        >
          ×
        </div>

        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: "24px",
            color: t.red,
            margin: "0 0 8px",
          }}
        >
          Verification Failed
        </h2>

        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            color: t.textMuted,
            margin: "0 0 20px",
            lineHeight: 1.5,
          }}
        >
          {error}
        </p>

        <Link
          to="/login"
          style={{
            color: t.accent,
            fontWeight: 700,
            fontSize: "13px",
            textDecoration: "none",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Back to Login
        </Link>
      </div>
    </AuthShell>
  );
}
