import { useEffect, useState } from "react";

export default function SplashScreen({ onFinish, minDuration = 1800 }) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), minDuration);
    const removeTimer = setTimeout(() => {
      setVisible(false);
      onFinish?.();
    }, minDuration + 500);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [minDuration, onFinish]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(1200px 700px at 50% -10%, #1e2a6e 0%, #0a0e27 55%, #050712 100%)",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.04)" : "scale(1)",
        transition: "opacity 0.5s ease, transform 0.6s ease",
        pointerEvents: exiting ? "none" : "auto",
        overflow: "hidden",
      }}
    >
      {/* ambient glow orbs */}
      <div style={splashStyles.orb1} />
      <div style={splashStyles.orb2} />

      {/* ── LOGO: animated receipt/bill with dashed rotating seal ring ── */}
      <div style={{ position: "relative", width: 120, height: 120, marginBottom: 28 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ position: "absolute", inset: 0, animation: "sp-ringspin 6s linear infinite" }}>
          <circle
            cx="60" cy="60" r="56"
            fill="none" stroke="#818cf8" strokeOpacity="0.5"
            strokeWidth="1.6" strokeDasharray="3 7" strokeLinecap="round"
          />
        </svg>

        <svg width="120" height="120" viewBox="0 0 120 120" style={{ position: "absolute", inset: 0, animation: "sp-ringspin-rev 9s linear infinite" }}>
          <circle
            cx="60" cy="60" r="46"
            fill="none" stroke="#4f46e5" strokeOpacity="0.35"
            strokeWidth="1" strokeDasharray="1 5" strokeLinecap="round"
          />
        </svg>

        {/* the bill/receipt icon itself, drawn in with stroke animation */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 68, height: 68, borderRadius: 20,
            background: "linear-gradient(145deg, #4f46e5, #6366f1)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 20px 40px -12px rgba(79,70,229,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "sp-pop 0.7s cubic-bezier(.34,1.56,.64,1) both",
          }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 2h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"
                stroke="#fff" strokeWidth="1.6" strokeLinejoin="round"
                strokeDasharray="60" strokeDashoffset="60"
                style={{ animation: "sp-draw 0.9s 0.3s ease forwards" }}
              />
              <path d="M15 2v4h4" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round"
                strokeDasharray="10" strokeDashoffset="10"
                style={{ animation: "sp-draw 0.4s 1.1s ease forwards" }}
              />
              {[8, 11.2, 14.4].map((y, i) => (
                <line
                  key={y} x1="7.5" y1={y} x2="14" y2={y}
                  stroke="#c7d2fe" strokeWidth="1.3" strokeLinecap="round"
                  strokeDasharray="7" strokeDashoffset="7"
                  style={{ animation: `sp-draw 0.35s ${1.3 + i * 0.15}s ease forwards` }}
                />
              ))}
              <circle
                cx="17.5" cy="17.5" r="3.4" fill="#22c55e"
                opacity="0" style={{ animation: "sp-checkin 0.4s 1.9s ease forwards" }}
              />
              <path
                d="M16 17.6l1 1 2-2.1" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
                fill="none" strokeDasharray="6" strokeDashoffset="6"
                style={{ animation: "sp-draw 0.3s 2.15s ease forwards" }}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Wordmark ── */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 1, animation: "sp-fadeup 0.6s 0.5s ease both" }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 30, letterSpacing: "-0.03em", color: "#fff" }}>Draft</span>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 30, letterSpacing: "-0.03em", color: "#818cf8" }}>bill</span>
      </div>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, color: "#9ca3ec",
        marginTop: 6, letterSpacing: "0.02em",
        animation: "sp-fadeup 0.6s 0.7s ease both",
      }}>
        Invoicing, made simple
      </p>

      {/* ── Loading bar ── */}
      <div style={{
        marginTop: 34, width: 140, height: 3, borderRadius: 99,
        background: "rgba(255,255,255,0.08)", overflow: "hidden",
        animation: "sp-fadeup 0.6s 0.9s ease both",
      }}>
        <div style={{
          width: "40%", height: "100%", borderRadius: 99,
          background: "linear-gradient(90deg, #4f46e5, #818cf8)",
          animation: "sp-loadbar 1.3s ease-in-out infinite",
        }} />
      </div>

      <style>{`
        @keyframes sp-ringspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes sp-ringspin-rev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes sp-pop {
          0% { transform: scale(0.4); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes sp-draw { to { stroke-dashoffset: 0; } }
        @keyframes sp-checkin {
          0% { opacity: 0; transform: scale(0.3); }
          70% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes sp-fadeup {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sp-loadbar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(150%); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>
    </div>
  );
}

const splashStyles = {
  orb1: {
    position: "absolute", width: 500, height: 500, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
    top: "-15%", left: "-10%", filter: "blur(40px)",
    animation: "sp-fadeup 1.2s ease both",
  },
  orb2: {
    position: "absolute", width: 400, height: 400, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(129,140,248,0.18) 0%, transparent 70%)",
    bottom: "-15%", right: "-10%", filter: "blur(50px)",
    animation: "sp-fadeup 1.2s 0.2s ease both",
  },
};