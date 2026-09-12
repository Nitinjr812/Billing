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
        background: "radial-gradient(1100px 650px at 50% -5%, #241f16 0%, #100f0d 55%, #0a0908 100%)",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.04)" : "scale(1)",
        transition: "opacity 0.5s ease, transform 0.6s ease",
        pointerEvents: exiting ? "none" : "auto",
        overflow: "hidden",
      }}
    >
      {/* ambient warm glow orbs */}
      <div style={splashStyles.orb1} />
      <div style={splashStyles.orb2} />

      {/* ── LOGO: monogram card with rotating dashed rings ── */}
      <div style={{ position: "relative", width: 120, height: 120, marginBottom: 26 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ position: "absolute", inset: 0, animation: "sp-ringspin 6s linear infinite" }}>
          <circle
            cx="60" cy="60" r="56"
            fill="none" stroke="#f97316" strokeOpacity="0.4"
            strokeWidth="1.6" strokeDasharray="3 7" strokeLinecap="round"
          />
        </svg>

        <svg width="120" height="120" viewBox="0 0 120 120" style={{ position: "absolute", inset: 0, animation: "sp-ringspin-rev 9s linear infinite" }}>
          <circle
            cx="60" cy="60" r="46"
            fill="none" stroke="#fb923c" strokeOpacity="0.3"
            strokeWidth="1" strokeDasharray="1 5" strokeLinecap="round"
          />
        </svg>

        {/* the "D" monogram card, matching the app icon */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: "linear-gradient(160deg, #1a1814, #0f0e0c)",
            border: "1px solid #2a2620",
            boxShadow: "0 0 0 1px rgba(249,115,22,0.08), 0 0 40px rgba(249,115,22,0.25), 0 20px 40px -12px rgba(0,0,0,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "sp-pop 0.7s cubic-bezier(.34,1.56,.64,1) both",
            position: "relative", overflow: "hidden",
          }}>
            {/* soft inner glow */}
            <div style={{
              position: "absolute", width: 90, height: 90, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(249,115,22,0.35) 0%, transparent 70%)",
            }} />
            <span style={{
              position: "relative",
              fontFamily: "'Syne', sans-serif",
              fontWeight: 900,
              fontSize: 34,
              background: "linear-gradient(160deg, #fb923c, #f97316)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "sp-draw-d 0.6s 0.35s cubic-bezier(.34,1.56,.64,1) both",
            }}>D</span>
          </div>
        </div>

        {/* perforation dots dropping in, echoing the icon's receipt-tear detail */}
        <div style={{
          position: "absolute", bottom: -2, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 6,
        }}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#f0e6d3", opacity: 0,
              animation: `sp-dotpop 0.3s ${1.0 + i * 0.08}s ease forwards`,
            }} />
          ))}
        </div>
      </div>

      {/* ── Wordmark ── */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 1, animation: "sp-fadeup 0.6s 0.5s ease both" }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 30, letterSpacing: "-0.03em", color: "#f0e6d3" }}>Draft</span>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 30, letterSpacing: "-0.03em", color: "#f97316" }}>bill</span>
      </div>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, color: "#7a7570",
        marginTop: 6, letterSpacing: "0.02em",
        animation: "sp-fadeup 0.6s 0.7s ease both",
      }}>
        Invoicing, made simple
      </p>

      {/* ── Loading bar ── */}
      <div style={{
        marginTop: 34, width: 140, height: 3, borderRadius: 99,
        background: "#1e1c19", overflow: "hidden",
        animation: "sp-fadeup 0.6s 0.9s ease both",
      }}>
        <div style={{
          width: "40%", height: "100%", borderRadius: 99,
          background: "linear-gradient(90deg, #f97316, #fb923c)",
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
        @keyframes sp-draw-d {
          0% { opacity: 0; transform: scale(0.5) rotate(-10deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes sp-dotpop {
          0% { opacity: 0; transform: translateY(-4px) scale(0.5); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
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
    background: "radial-gradient(circle, rgba(249,115,22,0.14) 0%, transparent 70%)",
    top: "-15%", left: "-10%", filter: "blur(50px)",
    animation: "sp-fadeup 1.2s ease both",
  },
  orb2: {
    position: "absolute", width: 400, height: 400, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(251,146,60,0.10) 0%, transparent 70%)",
    bottom: "-15%", right: "-10%", filter: "blur(60px)",
    animation: "sp-fadeup 1.2s 0.2s ease both",
  },
};