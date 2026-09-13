import { useEffect, useState } from "react";

export default function SplashScreen({ onFinish, minDuration = 2200 }) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      const pct = Math.min(100, Math.round(((Date.now() - start) / minDuration) * 100));
      setProgress(pct);
    }, 40);

    const exitTimer = setTimeout(() => setExiting(true), minDuration);
    const removeTimer = setTimeout(() => {
      setVisible(false);
      onFinish?.();
    }, minDuration + 600);

    return () => {
      clearInterval(tick);
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
        transform: exiting ? "scale(1.08)" : "scale(1)",
        filter: exiting ? "blur(6px)" : "blur(0px)",
        transition: "opacity 0.6s ease, transform 0.7s cubic-bezier(.4,0,.2,1), filter 0.6s ease",
        pointerEvents: exiting ? "none" : "auto",
        overflow: "hidden",
      }}
    >
      {/* ambient warm glow orbs, drifting slowly */}
      <div style={splashStyles.orb1} />
      <div style={splashStyles.orb2} />

      {/* floating "invoice" bits drifting up in the background */}
      {invoiceBits.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: b.left,
            bottom: -40,
            width: b.w,
            height: b.h,
            borderRadius: 3,
            background: "rgba(240,230,211,0.05)",
            border: "1px solid rgba(249,115,22,0.12)",
            animation: `sp-drift ${b.dur}s ${b.delay}s ease-in infinite`,
          }}
        />
      ))}

      {/* ── LOGO: monogram card with rotating dashed rings + pulse ── */}
      <div style={{ position: "relative", width: 130, height: 130, marginBottom: 26 }}>
        <div style={{
          position: "absolute", inset: -6, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(249,115,22,0.35) 0%, transparent 65%)",
          animation: "sp-pulse 2.2s ease-in-out infinite",
        }} />

        <svg width="130" height="130" viewBox="0 0 130 130" style={{ position: "absolute", inset: 0, animation: "sp-ringspin 6s linear infinite" }}>
          <circle
            cx="65" cy="65" r="60"
            fill="none" stroke="#f97316" strokeOpacity="0.45"
            strokeWidth="1.6" strokeDasharray="3 7" strokeLinecap="round"
          />
        </svg>

        <svg width="130" height="130" viewBox="0 0 130 130" style={{ position: "absolute", inset: 0, animation: "sp-ringspin-rev 9s linear infinite" }}>
          <circle
            cx="65" cy="65" r="49"
            fill="none" stroke="#fb923c" strokeOpacity="0.32"
            strokeWidth="1" strokeDasharray="1 5" strokeLinecap="round"
          />
        </svg>

        {/* thin orbiting dot, like a coin/receipt marker circling the logo */}
        <div style={{ position: "absolute", inset: 0, animation: "sp-ringspin 3.4s linear infinite" }}>
          <div style={{
            position: "absolute", top: -3, left: "50%", width: 7, height: 7,
            borderRadius: "50%", background: "#fb923c", transform: "translateX(-50%)",
            boxShadow: "0 0 10px 2px rgba(251,146,60,0.7)",
          }} />
        </div>

        {/* the "D" monogram card, matching the app icon */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 74, height: 74, borderRadius: 20,
            background: "linear-gradient(160deg, #1a1814, #0f0e0c)",
            border: "1px solid #2a2620",
            boxShadow: "0 0 0 1px rgba(249,115,22,0.08), 0 0 40px rgba(249,115,22,0.28), 0 20px 40px -12px rgba(0,0,0,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "sp-pop 0.7s cubic-bezier(.34,1.56,.64,1) both, sp-breathe 2.6s 1s ease-in-out infinite",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", width: 90, height: 90, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(249,115,22,0.35) 0%, transparent 70%)",
            }} />
            {/* sheen sweep across the card */}
            <div style={{
              position: "absolute", top: 0, left: "-60%", width: "40%", height: "100%",
              background: "linear-gradient(75deg, transparent, rgba(255,255,255,0.16), transparent)",
              animation: "sp-sheen 2.8s 1.3s ease-in-out infinite",
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
          position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 6,
        }}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#f0e6d3", opacity: 0,
              animation: `sp-dotpop 0.3s ${1.0 + i * 0.08}s ease forwards, sp-twinkle 1.8s ${1.6 + i * 0.15}s ease-in-out infinite`,
            }} />
          ))}
        </div>
      </div>

      {/* ── Wordmark, letter by letter ── */}
      <div style={{ display: "flex", alignItems: "baseline" }}>
        {"Draft".split("").map((ch, i) => (
          <span key={`d${i}`} style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 30,
            letterSpacing: "-0.03em", color: "#f0e6d3",
            display: "inline-block", opacity: 0,
            animation: `sp-letterup 0.45s ${0.5 + i * 0.045}s cubic-bezier(.2,.8,.2,1) forwards`,
          }}>{ch}</span>
        ))}
        {"bill".split("").map((ch, i) => (
          <span key={`b${i}`} style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 30,
            letterSpacing: "-0.03em", color: "#f97316",
            display: "inline-block", opacity: 0,
            animation: `sp-letterup 0.45s ${0.72 + i * 0.045}s cubic-bezier(.2,.8,.2,1) forwards`,
          }}>{ch}</span>
        ))}
      </div>

      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, color: "#7a7570",
        marginTop: 6, letterSpacing: "0.02em",
        animation: "sp-fadeup 0.6s 1.0s ease both",
      }}>
        Invoicing, made simple
      </p>

      {/* ── Loading bar with live percentage ── */}
      <div style={{
        marginTop: 34, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        animation: "sp-fadeup 0.6s 1.15s ease both",
      }}>
        <div style={{
          width: 150, height: 3, borderRadius: 99,
          background: "#1e1c19", overflow: "hidden", position: "relative",
        }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: 99,
            width: `${progress}%`,
            background: "linear-gradient(90deg, #f97316, #fb923c)",
            boxShadow: "0 0 10px rgba(249,115,22,0.6)",
            transition: "width 0.08s linear",
          }} />
          <div style={{
            position: "absolute", top: 0, left: 0, height: "100%", width: "30%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
            animation: "sp-shimmer 1.1s linear infinite",
          }} />
        </div>
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#5a564f",
          letterSpacing: "0.04em", fontVariantNumeric: "tabular-nums",
        }}>
          {progress}%
        </span>
      </div>

      <style>{`
        @keyframes sp-ringspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes sp-ringspin-rev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes sp-pop {
          0% { transform: scale(0.4); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes sp-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.035); }
        }
        @keyframes sp-pulse {
          0%, 100% { opacity: 0.6; transform: scale(0.94); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes sp-sheen {
          0% { left: -60%; }
          100% { left: 130%; }
        }
        @keyframes sp-draw-d {
          0% { opacity: 0; transform: scale(0.5) rotate(-10deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes sp-dotpop {
          0% { opacity: 0; transform: translateY(-4px) scale(0.5); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes sp-twinkle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @keyframes sp-letterup {
          from { opacity: 0; transform: translateY(14px) rotate(-4deg); }
          to { opacity: 1; transform: translateY(0) rotate(0deg); }
        }
        @keyframes sp-fadeup {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sp-shimmer {
          from { transform: translateX(-120%); }
          to { transform: translateX(420%); }
        }
        @keyframes sp-orbfloat {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -15px); }
        }
        @keyframes sp-drift {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-120vh) rotate(25deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>
    </div>
  );
}

const invoiceBits = [
  { left: "8%",  w: 18, h: 24, dur: 9,  delay: 0 },
  { left: "22%", w: 14, h: 18, dur: 11, delay: 1.5 },
  { left: "78%", w: 20, h: 26, dur: 10, delay: 0.6 },
  { left: "88%", w: 12, h: 16, dur: 8,  delay: 2.2 },
  { left: "40%", w: 10, h: 14, dur: 12, delay: 3 },
  { left: "62%", w: 16, h: 20, dur: 9.5, delay: 1.1 },
];

const splashStyles = {
  orb1: {
    position: "absolute", width: 500, height: 500, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(249,115,22,0.14) 0%, transparent 70%)",
    top: "-15%", left: "-10%", filter: "blur(50px)",
    animation: "sp-fadeup 1.2s ease both, sp-orbfloat 10s ease-in-out infinite",
  },
  orb2: {
    position: "absolute", width: 400, height: 400, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(251,146,60,0.10) 0%, transparent 70%)",
    bottom: "-15%", right: "-10%", filter: "blur(60px)",
    animation: "sp-fadeup 1.2s 0.2s ease both, sp-orbfloat 12s 0.5s ease-in-out infinite reverse",
  },
};