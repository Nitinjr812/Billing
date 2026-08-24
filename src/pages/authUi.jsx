import { useState, useRef, useCallback } from "react";
import { useTheme } from "../components/ThemeContext"; // ⬅️ adjust path to match your project
import Navbar from "../components/Navbar";

/* ============================================================================
   AUTH UI KIT
   Shared building blocks for Login.jsx and Signup.jsx:
     - AuthShell     → page background, floating cards, navbar, centered card
     - AnimatedInput → labeled input with a glowing focus ring
     - PasswordInput → AnimatedInput + show/hide toggle
     - MoneyButton   → primary button with a ₹ "cha-ching" burst on click
   ========================================================================== */

/* ── ₹ burst particles, spawned from the center of whatever button uses it ── */
let burstId = 0;
function useMoneyBurst() {
  const [particles, setParticles] = useState([]);
  const burst = useCallback(() => {
    const count = 10 + Math.floor(Math.random() * 4);
    const batch = Array.from({ length: count }).map(() => {
      const angle = Math.random() * Math.PI - Math.PI; // spread upward/outward
      const dist = 46 + Math.random() * 58;
      return {
        id: burstId++,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 26,
        rot: (Math.random() - 0.5) * 200,
        delay: Math.random() * 60,
        glyph: Math.random() > 0.4 ? "₹" : "•",
      };
    });
    setParticles((p) => [...p, ...batch]);
    setTimeout(() => {
      setParticles((p) => p.filter((particle) => !batch.some((b) => b.id === particle.id)));
    }, 900);
  }, []);
  return { particles, burst };
}

export function MoneyButton({ children, disabled, loading, style = {}, onClick, type = "submit", ...rest }) {
  const { t } = useTheme();
  const { particles, burst } = useMoneyBurst();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={(e) => { if (!disabled) burst(); onClick && onClick(e); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      className="lux-btn-focus"
      style={{
        position: "relative", overflow: "visible",
        fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "14px",
        padding: "13px 20px", borderRadius: "12px", cursor: disabled ? "not-allowed" : "pointer",
        border: "1px solid transparent", width: "100%",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
        background: disabled ? t.border : hovered ? t.accentLight : t.accent,
        color: "#fff",
        opacity: disabled ? 0.7 : 1,
        boxShadow: disabled ? "none" : hovered ? `0 10px 26px -10px ${t.accent}99` : `0 6px 18px -10px ${t.accent}77`,
        transform: pressed ? "scale(0.97)" : hovered ? "scale(1.01)" : "scale(1)",
        transition: "all 0.18s cubic-bezier(0.22,1,0.36,1)",
        ...style,
      }}
      {...rest}
    >
      {loading && <span className="btn-spinner" />}
      {children}
      {particles.map((p) => (
        <span
          key={p.id}
          className="money-particle"
          style={{ "--tx": `${p.tx}px`, "--ty": `${p.ty}px`, "--rot": `${p.rot}deg`, animationDelay: `${p.delay}ms` }}
        >{p.glyph}</span>
      ))}
    </button>
  );
}

export function AnimatedInput({ label, error, right, style = {}, ...props }) {
  const { t } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <label style={{ display: "block" }}>
      {label && (
        <span style={{
          display: "block", fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 700,
          letterSpacing: "0.06em", textTransform: "uppercase",
          color: focused ? t.accent : t.textMuted, marginBottom: "6px",
          transition: "color 0.15s ease",
        }}>{label}</span>
      )}
      <div style={{ position: "relative" }}>
        <input
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus && props.onFocus(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur && props.onBlur(e); }}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: right ? "12px 42px 12px 14px" : "12px 14px",
            borderRadius: "10px",
            border: `1.5px solid ${error ? t.red : focused ? t.accent : t.border}`,
            background: t.bgPage, color: t.textPrimary,
            fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
            outline: "none",
            boxShadow: focused ? `0 0 0 4px ${(error ? t.red : t.accent)}22` : "none",
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            ...style,
          }}
        />
        {right && (
          <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)" }}>
            {right}
          </span>
        )}
      </div>
    </label>
  );
}

export function PasswordInput({ label = "Password", ...props }) {
  const { t } = useTheme();
  const [show, setShow] = useState(false);
  return (
    <AnimatedInput
      label={label}
      type={show ? "text" : "password"}
      {...props}
      right={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: t.textMuted, display: "flex" }}
        >
          {show ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A9.7 9.7 0 0112 5c5 0 9 4 10 7-.4 1.2-1.2 2.5-2.3 3.7M6.5 6.6C4.3 8 2.8 10 2 12c1 3 5 7 10 7 1.2 0 2.3-.2 3.4-.6" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
          )}
        </button>
      }
    />
  );
}

/* ── Small decorative card floating around the auth card (desktop only) ── */
function FloatingBadge({ icon, text, color, style }) {
  const { t } = useTheme();
  return (
    <div className="auth-float" style={{
      position: "absolute", display: "flex", alignItems: "center", gap: "8px",
      background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: "12px",
      padding: "10px 14px", boxShadow: "0 12px 28px -14px rgba(0,0,0,0.25)",
      animation: "authFloatY 5s ease-in-out infinite",
      fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600, color: t.textPrimary,
      ...style,
    }}>
      <span style={{ color: color || t.accent, fontSize: "14px" }}>{icon}</span>{text}
    </div>
  );
}

export function AuthShell({ children, eyebrow, badges = true }) {
  const { t } = useTheme();
  return (
    <div style={{ minHeight: "100vh", background: t.bg, position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes authFloatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes authCardIn { from { opacity: 0; transform: translateY(18px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes authBlobMove { 0%,100% { transform: translate(-50%,-10%) scale(1); } 50% { transform: translate(-50%,-6%) scale(1.08); } }
        @keyframes menuFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes moneyPop {
          0% { transform: translate(-50%,-50%) scale(0.4); opacity: 0; }
          18% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(var(--rot)) scale(0.5); opacity: 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .money-particle {
          position: absolute; left: 50%; top: 50%;
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 13px; color: #fff;
          pointer-events: none; transform: translate(-50%, -50%);
          animation: moneyPop 0.9s cubic-bezier(0.15,0.7,0.3,1) forwards;
          will-change: transform, opacity;
        }
        .btn-spinner {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
          animation: spin 0.7s linear infinite;
        }
        .lux-btn-focus:focus-visible { outline: 2px solid ${t.accent}; outline-offset: 2px; border-radius: 8px; }
        @media (max-width: 900px) {
          .landing-nav-links, .landing-nav-actions { display: none !important; }
          .landing-nav-burger { display: block !important; }
          .auth-float { display: none !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <Navbar />

      {/* ambient gradient blob, same language as the landing hero */}
      <div style={{
        position: "absolute", top: "-140px", left: "50%",
        width: "820px", height: "520px", borderRadius: "50%",
        background: `radial-gradient(circle, ${t.accent}22, transparent 70%)`,
        filter: "blur(46px)", pointerEvents: "none",
        animation: "authBlobMove 9s ease-in-out infinite",
      }} />

      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "104px 20px 40px", position: "relative",
      }}>
        <div style={{ position: "relative", width: "100%", maxWidth: 400 }}>
          {badges && (
            <>
              <FloatingBadge icon="✦" text="AI-powered insights" color={t.accent} style={{ top: "-34px", left: "-150px" }} />
              <FloatingBadge icon="◪" text="Bank-grade security" color="#3b82f6" style={{ bottom: "18px", right: "-168px", animationDelay: "1.4s" }} />
            </>
          )}

          <div style={{
            background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: "20px",
            padding: "34px 32px", position: "relative", overflow: "hidden",
            boxShadow: "0 20px 50px -20px rgba(0,0,0,0.22)",
            animation: "authCardIn 0.5s cubic-bezier(0.22,1,0.36,1)",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "3px",
              background: `linear-gradient(90deg, ${t.accent}, #3b82f6)`,
            }} />
            {eyebrow && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase", color: t.accent, marginBottom: "10px",
              }}>
                <span style={{ width: "14px", height: "1px", background: t.accent, display: "inline-block" }} />
                {eyebrow}
              </span>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}