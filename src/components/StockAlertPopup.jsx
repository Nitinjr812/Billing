import { useState, useEffect } from "react";
import { useTheme } from "./ThemeContext";
import { useNotifications } from "./NotificationContext";

const BACKEND = "https://billing-backend-tawny.vercel.app";

export default function StockAlertPopup() {
  const { t } = useTheme();
  const { scanStock } = useNotifications();

  const [alerts, setAlerts] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [suggestion, setSuggestion] = useState("");
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  useEffect(() => {
    // Show at most once per browser tab session — reopens next session
    // if issues are still unresolved.
    if (sessionStorage.getItem("stockAlertShown")) {
      setDismissed(true);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${BACKEND}/api/products/alerts`);
        const data = await res.json();
        const total =
          (data.outOfStock?.length || 0) +
          (data.lowStock?.length || 0) +
          (data.slowMoving?.length || 0);
        if (total > 0) setAlerts(data);
        else setDismissed(true);
      } catch {
        setDismissed(true);
      }
    })();
  }, []);

  const handleOk = async (product) => {
    setActiveId(product._id);
    setSuggestionLoading(true);
    setSuggestion("");
    try {
      const res = await fetch(`${BACKEND}/api/products/${product._id}/suggestion`, {
        method: "POST",
      });
      const data = await res.json();
      setSuggestion(data.suggestion);
    } catch {
      setSuggestion("Couldn't load a suggestion right now — please try again shortly.");
    } finally {
      setSuggestionLoading(false);
    }
    // Also push this into the persistent bell-icon notification list
    scanStock();
  };

  const handleClose = () => {
    sessionStorage.setItem("stockAlertShown", "1");
    setDismissed(true);
  };

  if (dismissed || !alerts) return null;

  const allIssues = [
    ...(alerts.outOfStock || []).map((p) => ({ ...p, _type: "Out of Stock", _color: t.red })),
    ...(alerts.lowStock || []).map((p) => ({ ...p, _type: "Low Stock", _color: t.orange })),
    ...(alerts.slowMoving || []).map((p) => ({ ...p, _type: "Slow Moving", _color: t.accent })),
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: "16px",
          maxWidth: "440px",
          width: "100%",
          maxHeight: "82vh",
          overflowY: "auto",
          padding: "22px",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 900,
            fontSize: "18px",
            color: t.textPrimary,
            margin: "0 0 4px",
          }}
        >
          Stock Alerts
        </h2>
        <p style={{ fontSize: "12px", color: t.textMuted, margin: "0 0 16px" }}>
          {allIssues.length} product{allIssues.length !== 1 ? "s" : ""} need attention
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {allIssues.map((p) => (
            <div
              key={`${p._id}-${p._type}`}
              style={{ border: `1px solid ${t.border}`, borderRadius: "10px", padding: "12px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: "13px", color: t.textPrimary }}>
                  {p.name}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "99px",
                    color: p._color,
                    background: `${p._color}18`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {p._type}
                </span>
              </div>
              <p style={{ fontSize: "11px", color: t.textMuted, margin: "0 0 8px" }}>
                Stock: {p.stock} units · ₹{(p.price || 0).toLocaleString("en-IN")}
              </p>

              {activeId === p._id ? (
                suggestionLoading ? (
                  <p style={{ fontSize: "12px", color: t.textMuted, margin: 0 }}>
                    Loading suggestion…
                  </p>
                ) : (
                  <p
                    style={{
                      fontSize: "12px",
                      color: t.textPrimary,
                      background: `${t.accent}10`,
                      padding: "8px",
                      borderRadius: "8px",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    💡 {suggestion}
                  </p>
                )
              ) : (
                <button
                  onClick={() => handleOk(p)}
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "5px 12px",
                    borderRadius: "8px",
                    background: t.accent,
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  OK, suggest something
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleClose}
          style={{
            marginTop: "18px",
            width: "100%",
            padding: "10px",
            borderRadius: "10px",
            background: "transparent",
            border: `1px solid ${t.border}`,
            color: t.textMuted,
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}