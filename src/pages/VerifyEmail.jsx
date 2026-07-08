import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../components/ThemeContext";
import { buttonStyle } from "./Login";

export default function VerifyEmail() {
  const { token } = useParams();
  const { verifyEmail } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const [status, setStatus] = useState("verifying"); // verifying | success | error
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

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bgPage, padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: 380, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "32px", textAlign: "center" }}>
        {status === "verifying" && <p style={{ color: t.textMuted }}>Verifying...</p>}

        {status === "success" && (
          <>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, color: t.textPrimary }}>✅ Email Verified!</h2>
            <button onClick={() => navigate("/dashboard")} style={{ ...buttonStyle(t, false), marginTop: "16px" }}>
              Go to Dashboard
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, color: t.red }}>❌ Verification Failed</h2>
            <p style={{ fontSize: "13px", color: t.textMuted, margin: "12px 0" }}>{error}</p>
            <Link to="/login" style={{ color: t.accent, fontWeight: 600 }}>Back to Login</Link>
          </>
        )}
      </div>
    </div>
  );
}