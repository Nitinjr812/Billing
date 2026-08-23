import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../components/ThemeContext"; // ⬅️ adjust path if needed

/* ============================================================================
   LANDING PAGE — matches the existing dashboard's design language:
   Syne (headings/numbers) + DM Sans (body/UI), 16–18px rounded cards,
   1px borders, soft backgrounds, minimal shadows, accent-driven UI,
   green/orange/red/blue semantic colors, uppercase tracked labels.
   ========================================================================== */

// ─── shared micro-utilities ───────────────────────────────────────────────
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, visible];
}

function useCountUp(target, active, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = null;
    let raf;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return val;
}

function AnimatedStat({ label, prefix = "", suffix = "", target, decimals = 0, up }) {
  const { t } = useTheme();
  const [ref, visible] = useReveal();
  const raw = useCountUp(target, visible);
  const display = decimals ? (raw / Math.pow(10, decimals)).toFixed(1) : raw.toLocaleString("en-IN");
  return (
    <div ref={ref}>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textMuted, margin: "0 0 4px" }}>{label}</p>
      <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "20px", color: t.textPrimary, margin: 0 }}>
        {prefix}{display}{suffix}{" "}
        {up !== undefined && (
          <span style={{ fontSize: "11px", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: up ? "#2fae60" : "#e5484d" }}>{up ? "▲" : "▼"}</span>
        )}
      </p>
    </div>
  );
}

function Reveal({ children, delay = 0, style = {} }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children, color }) {
  const { t } = useTheme();
  return (
    <span style={{
      display: "inline-block", fontFamily: "'DM Sans', sans-serif",
      fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em",
      textTransform: "uppercase", color: color || t.accent,
      marginBottom: "14px",
    }}>{children}</span>
  );
}

function SectionHeading({ eyebrow, eyebrowColor, title, sub, align = "center", maxWidth = "640px" }) {
  const { t } = useTheme();
  return (
    <Reveal style={{ textAlign: align, maxWidth, margin: align === "center" ? "0 auto 56px" : "0 0 56px" }}>
      {eyebrow && <Eyebrow color={eyebrowColor}>{eyebrow}</Eyebrow>}
      <h2 style={{
        fontFamily: "'Syne', sans-serif", fontWeight: 800,
        fontSize: "clamp(28px, 4vw, 42px)", letterSpacing: "-0.02em",
        color: t.textPrimary, margin: "0 0 14px", lineHeight: 1.15,
      }}>{title}</h2>
      {sub && <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: "16px",
        color: t.textMuted, lineHeight: 1.6, margin: 0,
      }}>{sub}</p>}
    </Reveal>
  );
}

function Card({ children, style = {}, hover = true, className = "" }) {
  const { t } = useTheme();
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={className}
      onMouseEnter={() => hover && setHovered(true)}
      onMouseLeave={() => hover && setHovered(false)}
      style={{
        background: t.bgCard, border: `1px solid ${t.border}`,
        borderRadius: "18px", transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered ? "0 10px 30px -12px rgba(0,0,0,0.18)" : "none",
        borderColor: hovered ? t.accent + "55" : t.border,
        ...style,
      }}
    >{children}</div>
  );
}

function Pill({ children, color }) {
  const { t } = useTheme();
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase",
      padding: "4px 10px", borderRadius: "99px",
      background: (color || t.accent) + "18", color: color || t.accent,
    }}>{children}</span>
  );
}

function Button({ children, variant = "primary", onClick, style = {} }) {
  const { t } = useTheme();
  const [hovered, setHovered] = useState(false);
  const base = {
    fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "14px",
    padding: "13px 24px", borderRadius: "10px", cursor: "pointer",
    border: "1px solid transparent", transition: "all 0.15s ease",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
  };
  const variants = {
    primary: { background: hovered ? t.accentLight : t.accent, color: "#fff" },
    secondary: { background: "transparent", borderColor: t.border, color: t.textPrimary, ...(hovered ? { background: t.bgHover } : {}) },
    ghost: { background: "transparent", color: t.textMuted, ...(hovered ? { color: t.textPrimary } : {}) },
  };
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...base, ...variants[variant], ...style }}
    >{children}</button>
  );
}

function StatLine({ label, value, color, up }) {
  const { t } = useTheme();
  return (
    <div>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textMuted, margin: "0 0 4px" }}>{label}</p>
      <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "20px", color: t.textPrimary, margin: 0 }}>
        {value} {up !== undefined && (
          <span style={{ fontSize: "11px", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: up ? "#2fae60" : "#e5484d" }}>
            {up ? "▲" : "▼"}
          </span>
        )}
      </p>
    </div>
  );
}

// ─── Mini bar chart (inspired by Revenue Overview) ────────────────────────
function MiniBarChart({ color }) {
  const { t } = useTheme();
  const [ref, visible] = useReveal();
  const bars = [40, 55, 48, 70, 62, 85, 78];
  return (
    <div ref={ref} style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "70px" }}>
      {bars.map((h, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: "4px 4px 0 0", background: (color || t.accent) + "cc",
          height: visible ? `${h}%` : "0%",
          transition: `height 0.6s cubic-bezier(0.34,1.2,0.64,1) ${i * 60}ms`,
        }} />
      ))}
    </div>
  );
}

// ─── Animated SVG line chart (draws in on scroll) ──────────────────────────
function AnimatedLineChart({ color, points, height = 90 }) {
  const { t } = useTheme();
  const [ref, visible] = useReveal();
  const w = 280;
  const data = points || [30, 45, 38, 60, 52, 74, 68, 88];
  const max = Math.max(...data), min = Math.min(...data);
  const step = w / (data.length - 1);
  const coords = data.map((d, i) => [i * step, height - ((d - min) / (max - min || 1)) * (height - 14) - 6]);
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const areaPath = `${path} L${w},${height} L0,${height} Z`;
  const c = color || t.accent;
  const pathRef = useRef(null);
  const [len, setLen] = useState(0);
  useEffect(() => { if (pathRef.current) setLen(pathRef.current.getTotalLength()); }, []);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`grad-${c.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.28" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${c.replace("#", "")})`} opacity={visible ? 1 : 0} style={{ transition: "opacity 0.6s ease 0.4s" }} />
      <path
        ref={pathRef}
        d={path} fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={len} strokeDashoffset={visible ? 0 : len}
        style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.65,0,0.35,1)" }}
      />
      {visible && coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={c}
          style={{ opacity: 0, animation: `fadeInDot 0.4s ease forwards ${0.4 + i * 0.08}s` }} />
      ))}
    </svg>
  );
}

// ─── Floating insight card used around hero dashboard ─────────────────────
function FloatingCard({ title, body, color, style, icon }) {
  const { t } = useTheme();
  return (
    <div style={{
      position: "absolute", background: t.bgCard, border: `1px solid ${t.border}`,
      borderRadius: "14px", padding: "14px 16px", width: "210px",
      boxShadow: "0 12px 32px -14px rgba(0,0,0,0.25)",
      animation: "floatY 5s ease-in-out infinite",
      ...style,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <span style={{ fontSize: "13px" }}>{icon}</span>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: color || t.accent, margin: 0 }}>{title}</p>
      </div>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: t.textMuted, margin: 0, lineHeight: 1.4 }}>{body}</p>
    </div>
  );
}

/* ============================================================================
   1. HERO
   ========================================================================== */
function Hero({ onStart, onExplore }) {
  const { t } = useTheme();
  return (
    <section style={{ position: "relative", padding: "150px 24px 100px", overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: "-120px", left: "50%", transform: "translateX(-50%)",
        width: "800px", height: "500px", borderRadius: "50%",
        background: `radial-gradient(circle, ${t.accent}22, transparent 70%)`,
        filter: "blur(40px)", pointerEvents: "none",
      }} />
      <div style={{ maxWidth: "760px", margin: "0 auto 80px", textAlign: "center", position: "relative" }}>
        <Reveal>
          <Eyebrow>AI-Powered Business Platform</Eyebrow>
          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 800,
            fontSize: "clamp(36px, 6vw, 60px)", letterSpacing: "-0.03em",
            lineHeight: 1.08, color: t.textPrimary, margin: "0 0 20px",
          }}>Run Your Business Smarter With AI.</h1>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: "17px", lineHeight: 1.6,
            color: t.textMuted, maxWidth: "560px", margin: "0 auto 34px",
          }}>Billing, inventory, analytics, automation and intelligent business insights — all in one powerful platform.</p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Button variant="primary" onClick={onStart}>Start Free →</Button>
            <Button variant="secondary" onClick={onExplore}>Explore the Platform</Button>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: t.textMuted, marginTop: "18px" }}>
            No complicated setup. Built for modern businesses.
          </p>
        </Reveal>
      </div>

      {/* Product preview */}
      <Reveal delay={150} style={{ position: "relative", maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{
          position: "absolute", inset: "-2px", borderRadius: "20px",
          background: `linear-gradient(135deg, ${t.accent}55, transparent 60%)`,
          filter: "blur(24px)", opacity: 0.5, pointerEvents: "none",
        }} />
        <Card hover={false} style={{ position: "relative", padding: "20px", overflow: "visible" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "15px", color: t.textPrimary }}>Dashboard</span>
            <Pill>Live</Pill>
          </div>
          <div className="hero-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
            <AnimatedStat label="Revenue" prefix="₹" target={48} suffix="L" decimals={1} up />
            <AnimatedStat label="Orders" target={312} up />
            <AnimatedStat label="Customers" target={1204} up />
            <AnimatedStat label="Pending Invoices" target={18} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
            <Card hover={false} style={{ padding: "16px" }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: t.textMuted, margin: "0 0 6px" }}>Revenue Overview</p>
              <AnimatedLineChart height={70} />
            </Card>
            <Card hover={false} style={{ padding: "16px" }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: t.textMuted, margin: "0 0 10px" }}>Business Health</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "18px", color: "#2fae60", margin: "0 0 4px" }}>Improving</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: t.textMuted, margin: 0 }}>Net profit trending up this month.</p>
            </Card>
          </div>
        </Card>

        <div className="hero-float"><FloatingCard icon="✦" title="AI Insight" body="Sales are trending upward this week." color={t.accent} style={{ top: "40px", left: "-40px" }} /></div>
        <div className="hero-float"><FloatingCard icon="◈" title="Stock Alert" body="3 products may need restocking." color="#e08a2c" style={{ top: "20px", right: "-40px", animationDelay: "1.2s" }} /></div>
        <div className="hero-float"><FloatingCard icon="◪" title="Business Health" body="Net profit is improving." color="#2fae60" style={{ bottom: "-30px", left: "60px", animationDelay: "2.4s" }} /></div>
      </Reveal>
    </section>
  );
}

/* ============================================================================
   2. TRUST STRIP
   ========================================================================== */
function TrustStrip() {
  const { t } = useTheme();
  const items = ["Secure", "Cloud-based", "Real-time data", "AI-powered", "Role-based access", "Automated insights"];
  return (
    <section style={{ padding: "40px 24px", borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}` }}>
      <Reveal style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: t.textMuted, marginBottom: "22px" }}>
          Everything your business needs. In one intelligent platform.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
          {items.map((i) => <Pill key={i} color={t.accent}>{i}</Pill>)}
        </div>
      </Reveal>
    </section>
  );
}

/* ============================================================================
   3. PROBLEM → SOLUTION
   ========================================================================== */
function ProblemSolution() {
  const { t } = useTheme();
  const rows = [
    { from: "Manual billing", to: "Smart billing" },
    { from: "Inventory confusion", to: "Intelligent inventory" },
    { from: "Scattered reports", to: "AI analytics" },
    { from: "Delayed decisions", to: "AI recommendations" },
    { from: "Suspicious activity going unnoticed", to: "AI fraud detection" },
    { from: "Time-consuming repetitive work", to: "Automation" },
  ];
  return (
    <section style={{ padding: "100px 24px" }}>
      <SectionHeading title="Running a business shouldn't mean juggling a dozen tools." maxWidth="620px" />
      <div style={{ maxWidth: "780px", margin: "0 auto 40px" }}>
        {rows.map((r, i) => (
          <Reveal key={r.from} delay={i * 60}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderRadius: "14px",
              background: t.bgCard, border: `1px solid ${t.border}`, marginBottom: "10px",
            }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: t.textMuted }}>{r.from}</span>
              <span style={{ color: t.accent, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>→</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 700, color: t.textPrimary }}>{r.to}</span>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "20px", color: t.textPrimary }}>
          One platform. One source of truth.
        </p>
      </Reveal>
    </section>
  );
}

/* ============================================================================
   4. CORE PLATFORM FEATURE GRID
   ========================================================================== */
function CoreFeatures() {
  const { t } = useTheme();
  const features = [
    { icon: "◳", title: "Smart Billing", items: ["Fast invoicing", "Automatic calculations", "Discounts & taxes", "Returns", "Payment tracking", "Order management"] },
    { icon: "◫", title: "Inventory Management", items: ["Real-time stock", "Product variants & sizes", "Categories", "Barcode support", "Low-stock alerts", "Out-of-stock monitoring"] },
    { icon: "◉", title: "Payments", items: ["Cash, UPI, Card", "Payment tracking", "Pending payments", "Transaction history"] },
    { icon: "◪", title: "Business Analytics", items: ["Revenue & profit", "Orders & customers", "Product performance", "Growth trends", "Business health"] },
    { icon: "◐", title: "Employee Management", items: ["Employee accounts", "Roles & permissions", "Activity tracking", "Sales performance", "Audit history"] },
    { icon: "◈", title: "Reports", items: ["Daily / weekly / monthly", "Revenue & profit", "Inventory reports", "Sales performance"] },
  ];
  return (
    <section style={{ padding: "100px 24px", background: t.bgHover + "40" }}>
      <SectionHeading eyebrow="Core Platform" title="Everything you need to run your business." />
      <div className="core-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", maxWidth: "1100px", margin: "0 auto" }}>
        {features.map((f, i) => (
          <Reveal key={f.title} delay={i * 60}>
            <Card className="lift-hover feature-card" style={{ padding: "24px", height: "100%" }}>
              <div className="feature-icon" style={{
                width: "40px", height: "40px", borderRadius: "10px",
                background: t.accent + "18", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px", color: t.accent, marginBottom: "16px", transition: "transform 0.3s ease, background 0.3s ease",
              }}>{f.icon}</div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "17px", color: t.textPrimary, margin: "0 0 12px" }}>{f.title}</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {f.items.map((it) => (
                  <li key={it} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: t.textMuted, marginBottom: "6px", display: "flex", gap: "8px" }}>
                    <span style={{ color: t.accent }}>·</span>{it}
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ============================================================================
   5. AI COPILOT
   ========================================================================== */
function AICopilot() {
  const { t } = useTheme();
  const convo = [
    { q: "Which products need urgent restocking?", a: "3 products are currently low on stock. Product A is the highest priority based on recent sales velocity.", chip: "Restock alerts" },
    { q: "How is my business performing?", a: "Revenue is trending upward while pending customer payments remain the main area needing attention.", chip: "Cancellation rate" },
    { q: "Which products are slow-moving?", a: "These products have shown low sales activity. Consider reviewing pricing, placement or promotional offers.", chip: "Slow products" },
    { q: "Suggest a good offer to boost sales.", a: "A bundle discount on slow-moving products alongside your top sellers could help move stock while protecting margins.", chip: "Best offer idea" },
  ];

  const [ref, visible] = useReveal();
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState("userTyping"); // userTyping -> thinking -> alexTyping -> done
  const [qChars, setQChars] = useState(0);
  const [aChars, setAChars] = useState(0);
  const timers = useRef([]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const after = (ms, fn) => { const id = setTimeout(fn, ms); timers.current.push(id); return id; };

  const runConvo = (index) => {
    clearTimers();
    setQChars(0);
    setAChars(0);
    setPhase("userTyping");
    const q = convo[index].q;
    const a = convo[index].a;

    // type the question
    for (let i = 1; i <= q.length; i++) {
      after(i * 26, () => setQChars(i));
    }
    // switch to "thinking"
    after(q.length * 26 + 350, () => setPhase("thinking"));
    // switch to typing the answer
    const answerStart = q.length * 26 + 350 + 900;
    after(answerStart, () => setPhase("alexTyping"));
    for (let i = 1; i <= a.length; i++) {
      after(answerStart + i * 14, () => setAChars(i));
    }
    // pause, then move to next question
    const doneAt = answerStart + a.length * 14 + 2600;
    after(doneAt, () => setPhase("done"));
    after(doneAt + 400, () => {
      const next = (index + 1) % convo.length;
      setActive(next);
      runConvo(next);
    });
  };

  useEffect(() => {
    if (!visible) return;
    runConvo(0);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const jumpTo = (index) => { setActive(index); runConvo(index); };

  const q = convo[active].q.slice(0, qChars);
  const a = convo[active].a.slice(0, aChars);
  const showQCursor = phase === "userTyping";
  const showThinking = phase === "thinking";
  const showAnswer = phase === "alexTyping" || phase === "done";
  const showACursor = phase === "alexTyping";

  return (
    <section style={{ padding: "100px 24px" }}>
      <SectionHeading eyebrow="AI Business Analyst" eyebrowColor="#3b82f6" title="Meet the AI behind your business." sub="Ask questions. Understand your data. Make better decisions." />
      <Reveal style={{ maxWidth: "680px", margin: "0 auto" }}>
        <div ref={ref} />
        <Card hover={false} style={{ padding: "22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "9px", background: `linear-gradient(135deg, ${t.accent}, #3b82f6)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "13px" }}>A</div>
            <div>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "14px", color: t.textPrimary, margin: 0 }}>Alex · AI Analyst</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: t.textMuted, margin: 0, display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2fae60", display: "inline-block" }} />
                Connected to your live business data
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px", minHeight: "128px" }}>
            {/* user bubble */}
            <div style={{
              alignSelf: "flex-end", background: t.accent, color: "#fff", padding: "10px 14px",
              borderRadius: "12px 12px 2px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
              maxWidth: "85%", minHeight: q.length ? "auto" : "0px",
            }}>
              {q}
              {showQCursor && <span className="ai-caret" style={{ background: "#fff" }} />}
            </div>

            {/* thinking indicator */}
            {showThinking && (
              <div style={{
                alignSelf: "flex-start", background: t.bgHover, padding: "12px 16px",
                borderRadius: "12px 12px 12px 2px", display: "flex", gap: "4px", alignItems: "center",
              }}>
                {[0, 1, 2].map((d) => (
                  <span key={d} style={{
                    width: "6px", height: "6px", borderRadius: "50%", background: t.textMuted,
                    animation: `typingDot 1.1s ease-in-out infinite`, animationDelay: `${d * 0.15}s`,
                  }} />
                ))}
              </div>
            )}

            {/* alex reply bubble */}
            {showAnswer && a.length > 0 && (
              <div style={{
                alignSelf: "flex-start", background: t.bgHover, color: t.textPrimary, padding: "10px 14px",
                borderRadius: "12px 12px 12px 2px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", maxWidth: "85%",
              }}>
                {a}
                {showACursor && <span className="ai-caret" style={{ background: t.textPrimary }} />}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {convo.map((c, i) => (
              <button key={c.chip} onClick={() => jumpTo(i)} style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600,
                padding: "7px 13px", borderRadius: "99px", cursor: "pointer",
                border: `1px solid ${i === active ? t.accent : t.border}`,
                background: i === active ? t.accent + "18" : "transparent",
                color: i === active ? t.accent : t.textMuted,
                transition: "all 0.2s ease",
              }}>{c.chip}</button>
            ))}
          </div>
        </Card>
      </Reveal>
    </section>
  );
}

/* ============================================================================
   6. VOICE COMMANDS
   ========================================================================== */
function VoiceCommands() {
  const { t } = useTheme();
  const examples = [
    { u: "\u201cCreate a bill for Rahul for ₹2,450.\u201d", s: "Bill created successfully." },
    { u: "\u201cHow much did I sell today?\u201d", s: "Your current sales total is available instantly." },
    { u: "\u201cShow products with low stock.\u201d", s: "7 products need attention." },
  ];
  return (
    <section style={{ padding: "100px 24px", background: t.bgHover + "40" }}>
      <SectionHeading eyebrow="Voice Commands" title="Just say it. Your business listens." sub="Talk naturally. Get things done." />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "40px", maxWidth: "700px", margin: "0 auto" }}>
        <Reveal>
          <div style={{ position: "relative", width: "88px", height: "88px", borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${t.accent}`, animation: "pulseRing 2.2s ease-out infinite" }} />
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/></svg>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "16px", width: "100%" }}>
          {examples.map((e, i) => (
            <Reveal key={e.u} delay={i * 80}>
              <Card style={{ padding: "18px" }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: t.textPrimary, fontWeight: 600, margin: "0 0 10px" }}>{e.u}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: "#2fae60", fontSize: "12px" }}>●</span>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: t.textMuted, margin: 0 }}>{e.s}</p>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   7. AI BUSINESS INTELLIGENCE (data -> ai -> insight -> action)
   ========================================================================== */
function BusinessIntelligence() {
  const { t } = useTheme();
  const cards = [
    { title: "Predictive Insights", body: "Understand what your business data is telling you." },
    { title: "Smart Recommendations", body: "Get actionable suggestions based on current business activity." },
    { title: "AI Reports", body: "Turn complex business data into clear summaries." },
    { title: "Intelligent Search", body: "Ask your business questions in natural language." },
  ];
  const flow = ["Data", "AI", "Insight", "Action"];
  return (
    <section style={{ padding: "100px 24px" }}>
      <SectionHeading title="Your data shouldn't just sit there." />
      <div className="bi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "16px", maxWidth: "1000px", margin: "0 auto 56px" }}>
        {cards.map((c, i) => (
          <Reveal key={c.title} delay={i * 60}>
            <Card className="lift-hover" style={{ padding: "20px" }}>
              <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "15px", color: t.textPrimary, margin: "0 0 8px" }}>{c.title}</h4>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: t.textMuted, margin: 0, lineHeight: 1.5 }}>{c.body}</p>
            </Card>
          </Reveal>
        ))}
      </div>
      <Reveal style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        {flow.map((f, i) => (
          <span key={f} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Pill color={i === 1 ? "#3b82f6" : t.accent}>{f}</Pill>
            {i < flow.length - 1 && <span style={{ color: t.textMuted }}>→</span>}
          </span>
        ))}
      </Reveal>
    </section>
  );
}

/* ============================================================================
   8. FRAUD & SECURITY
   ========================================================================== */
function FraudSecurity() {
  const { t } = useTheme();
  const categories = ["Unusual refunds", "Suspicious discounts", "Abnormal transactions", "Repeated cancellations", "Unusual employee activity", "Cash discrepancies", "Suspicious login patterns"];
  return (
    <section style={{ padding: "100px 24px", background: t.bgHover + "40" }}>
      <SectionHeading eyebrow="Fraud & Security" eyebrowColor="#e5484d" title="Built to protect your business." sub="Detect unusual activity before it becomes a bigger problem." />
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "24px", maxWidth: "1000px", margin: "0 auto", alignItems: "start" }} className="fraud-grid">
        <Reveal>
          <Card style={{ padding: "22px", borderColor: "#e5484d40" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#e5484d" }} />
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#e5484d", margin: 0 }}>Suspicious Activity Detected</p>
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: t.textPrimary, margin: "0 0 14px" }}>Unusual refund activity detected.</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Pill color="#e5484d">Risk Level: High</Pill>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 700, color: t.accent, cursor: "pointer" }}>Review Activity →</span>
            </div>
          </Card>
        </Reveal>
        <Reveal delay={100}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {categories.map((c) => (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: "10px" }}>
                <span style={{ color: "#e5484d", fontSize: "12px" }}>⚠</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: t.textMuted }}>{c}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
      <p style={{ textAlign: "center", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: t.textMuted, maxWidth: "500px", margin: "30px auto 0" }}>
        The platform helps identify unusual activity and investigate potential fraud — it does not guarantee fraud prevention.
      </p>
    </section>
  );
}

/* ============================================================================
   9. BUSINESS HEALTH
   ========================================================================== */
function BusinessHealth() {
  const { t } = useTheme();
  const stats = [
    { label: "Total Invested", target: 12.4, decimals: 1 },
    { label: "Revenue", target: 18.9, decimals: 1, up: true },
    { label: "Net Profit", target: 6.5, decimals: 1, up: true },
    { label: "Supplier Pending", target: 1.2, decimals: 1 },
    { label: "Customer Pending", target: 0.8, decimals: 1 },
  ];
  return (
    <section style={{ padding: "100px 24px" }}>
      <SectionHeading title="Know the real health of your business." sub="See what you've invested, what you've earned and what still needs attention." />
      <Reveal>
        <Card className="lift-hover" style={{ padding: "26px", maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "22px" }}>
            {stats.map((s) => (
              <AnimatedStat key={s.label} label={s.label} prefix="₹" suffix="L" target={s.target * 10} decimals={1} up={s.up} />
            ))}
          </div>
        </Card>
      </Reveal>
    </section>
  );
}

/* ============================================================================
   10. ANALYTICS
   ========================================================================== */
function Analytics() {
  const { t } = useTheme();
  return (
    <section style={{ padding: "100px 24px", background: t.bgHover + "40" }}>
      <SectionHeading title="From numbers to clarity." />
      <div className="analytics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "18px", maxWidth: "1000px", margin: "0 auto" }}>
        {[
          { title: "Revenue Overview", body: <AnimatedLineChart color={t.accent} /> },
          { title: "Order Status", body: <AnimatedStat label="Completed" target={284} up /> },
          { title: "Stock Levels", body: <AnimatedLineChart color="#3b82f6" points={[80, 76, 82, 70, 74, 65, 68, 60]} /> },
          { title: "Customer Growth", body: <AnimatedStat label="New This Month" target={96} up /> },
        ].map((c, i) => (
          <Reveal key={c.title} delay={i * 60}>
            <Card className="lift-hover" style={{ padding: "18px", overflow: "hidden" }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: t.textMuted, margin: "0 0 14px" }}>{c.title}</p>
              {c.body}
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ============================================================================
   11. AUTOMATION
   ========================================================================== */
function Automation() {
  const { t } = useTheme();
  const flows = [
    { e: "Low stock", a: "Smart alert" },
    { e: "Pending payment", a: "Reminder" },
    { e: "Daily closing", a: "Business summary" },
    { e: "Suspicious activity", a: "Security alert" },
    { e: "New transaction", a: "Dashboard update" },
  ];
  return (
    <section style={{ padding: "100px 24px" }}>
      <SectionHeading title="Let the platform handle the repetitive work." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "14px", maxWidth: "1000px", margin: "0 auto" }}>
        {flows.map((f, i) => (
          <Reveal key={f.e} delay={i * 60}>
            <Card style={{ padding: "18px", textAlign: "center" }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: t.textMuted, margin: "0 0 8px" }}>{f.e}</p>
              <p style={{ color: t.accent, margin: "0 0 8px" }}>↓</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "14px", color: t.textPrimary, margin: 0 }}>{f.a}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ============================================================================
   12. EMPLOYEE & ACCESS CONTROL
   ========================================================================== */
function EmployeeAccess() {
  const { t } = useTheme();
  const roles = ["Owner", "Manager", "Employee"];
  const features = ["Role-based permissions", "Employee accounts", "Activity tracking", "Sales performance", "Audit logs", "Access control"];
  return (
    <section style={{ padding: "100px 24px", background: t.bgHover + "40" }}>
      <SectionHeading title="Give your team access. Keep control." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "24px", maxWidth: "900px", margin: "0 auto" }} className="fraud-grid">
        <Reveal>
          <Card style={{ padding: "24px" }}>
            {roles.map((r, i) => (
              <div key={r} style={{ textAlign: "center" }}>
                <div style={{ padding: "10px 18px", borderRadius: "10px", background: i === 0 ? t.accent : t.bgHover, color: i === 0 ? "#fff" : t.textPrimary, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px", display: "inline-block", marginBottom: i < roles.length - 1 ? "6px" : 0 }}>{r}</div>
                {i < roles.length - 1 && <p style={{ color: t.textMuted, margin: "2px 0" }}>↓</p>}
              </div>
            ))}
          </Card>
        </Reveal>
        <Reveal delay={100}>
          <div className="employee-feat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {features.map((f) => (
              <div key={f} style={{ padding: "12px 14px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: "10px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: t.textMuted, transition: "border-color 0.15s ease" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = t.accent + "55"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = t.border}
              >{f}</div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================================
   13. WHO IT'S FOR
   ========================================================================== */
function WhoItsFor() {
  const { t } = useTheme();
  const items = [
    { title: "Retail", body: "Manage fast-moving stock and daily billing with ease.", icon: "◫", color: "#3b82f6" },
    { title: "Fashion", body: "Track sizes, variants and seasonal inventory.", icon: "◐", color: "#e08a2c" },
    { title: "Electronics", body: "Handle serial numbers, warranties and returns.", icon: "◈", color: t.accent },
    { title: "Supermarkets", body: "Manage high SKU counts and rapid checkout.", icon: "◉", color: "#2fae60" },
    { title: "Multi-store Businesses", body: "Get a unified view across every location.", icon: "◪", color: "#8b5cf6" },
  ];
  return (
    <section style={{ padding: "100px 24px" }}>
      <SectionHeading title="Built for every kind of business." />
      <div className="who-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "16px", maxWidth: "1100px", margin: "0 auto" }}>
        {items.map((it, i) => (
          <Reveal key={it.title} delay={i * 50}>
            <Card className="lift-hover" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{
                height: "84px", position: "relative", overflow: "hidden",
                background: `linear-gradient(135deg, ${it.color}30, ${it.color}08)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{
                  fontSize: "30px", color: it.color, transition: "transform 0.3s ease",
                }} className="who-icon">{it.icon}</span>
                <span style={{
                  position: "absolute", width: "120px", height: "120px", borderRadius: "50%",
                  background: it.color + "22", top: "-50px", right: "-30px",
                }} />
              </div>
              <div style={{ padding: "18px 20px" }}>
                <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "15px", color: t.textPrimary, margin: "0 0 8px" }}>{it.title}</h4>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: t.textMuted, margin: 0, lineHeight: 1.5 }}>{it.body}</p>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ============================================================================
   14. WORKFLOW
   ========================================================================== */
function Workflow() {
  const { t } = useTheme();
  const steps = ["Set up your business", "Add products", "Start billing", "Track inventory", "Understand your data", "Let AI help you decide"];
  return (
    <section style={{ padding: "100px 24px", background: t.bgHover + "40" }}>
      <SectionHeading title="Getting started is simple." />
      <div style={{ display: "flex", gap: "16px", maxWidth: "1100px", margin: "0 auto", overflowX: "auto", paddingBottom: "8px" }} className="workflow-row">
        {steps.map((s, i) => (
          <Reveal key={s} delay={i * 60} style={{ minWidth: "150px", flex: "1" }}>
            <div>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "22px", color: t.accent + "88", margin: "0 0 8px" }}>{String(i + 1).padStart(2, "0")}</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 600, color: t.textPrimary, margin: 0 }}>{s}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ============================================================================
   15. PRICING
   ========================================================================== */
function Pricing({ onStart }) {
  const { t } = useTheme();
  const [yearly, setYearly] = useState(false);
  const plans = [
    { name: "Starter", desc: "For individuals getting started.", price: yearly ? "₹—/yr" : "₹—/mo", features: ["Billing & invoicing", "Basic inventory", "1 employee account"] },
    { name: "Pro", desc: "For growing businesses.", price: yearly ? "₹—/yr" : "₹—/mo", features: ["Everything in Starter", "AI Business Analyst", "Advanced analytics", "5 employee accounts"], featured: true },
    { name: "Business", desc: "For established businesses.", price: yearly ? "₹—/yr" : "₹—/mo", features: ["Everything in Pro", "Fraud detection", "Voice commands", "Unlimited employees"] },
    { name: "Enterprise", desc: "For multi-store operations.", price: "Contact us", features: ["Everything in Business", "Multi-store management", "Dedicated support", "Custom integrations"] },
  ];
  return (
    <section style={{ padding: "100px 24px" }}>
      <SectionHeading eyebrow="Pricing" title="Simple pricing that grows with you." />
      <Reveal style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "40px" }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: !yearly ? t.textPrimary : t.textMuted, fontWeight: 600 }}>Monthly</span>
        <button onClick={() => setYearly(!yearly)} style={{ width: "42px", height: "24px", borderRadius: "99px", background: yearly ? t.accent : t.border, border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
          <span style={{ position: "absolute", top: "3px", left: yearly ? "21px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
        </button>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: yearly ? t.textPrimary : t.textMuted, fontWeight: 600 }}>Yearly</span>
      </Reveal>
      <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "18px", maxWidth: "1100px", margin: "0 auto" }}>
        {plans.map((p, i) => (
          <Reveal key={p.name} delay={i * 60}>
            <Card className="lift-hover" style={{ padding: "24px", borderColor: p.featured ? t.accent : t.border, position: "relative" }}>
              {p.featured && <div style={{ position: "absolute", top: "-11px", left: "20px" }}><Pill>Most Popular</Pill></div>}
              <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "17px", color: t.textPrimary, margin: "6px 0 4px" }}>{p.name}</h4>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: t.textMuted, margin: "0 0 16px" }}>{p.desc}</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "24px", color: t.textPrimary, margin: "0 0 18px" }}>{p.price}</p>
              <ul style={{ margin: "0 0 20px", padding: 0, listStyle: "none" }}>
                {p.features.map((f) => (
                  <li key={f} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: t.textMuted, marginBottom: "8px", display: "flex", gap: "8px" }}>
                    <span style={{ color: "#2fae60" }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Button variant={p.featured ? "primary" : "secondary"} onClick={onStart} style={{ width: "100%" }}>Start Free</Button>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ============================================================================
   16. COMPARISON
   ========================================================================== */
function Comparison() {
  const { t } = useTheme();
  const rows = ["Billing", "Inventory", "Analytics", "AI Business Assistant", "Voice Commands", "AI Insights", "Fraud Monitoring", "Automation", "Employee Management", "Business Intelligence"];
  const traditional = [1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
  return (
    <section style={{ padding: "100px 24px", background: t.bgHover + "40" }}>
      <SectionHeading title="More than billing software." />
      <Reveal>
        <div style={{ maxWidth: "700px", margin: "0 auto", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: "18px", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", padding: "14px 20px", borderBottom: `1px solid ${t.border}` }}>
            <span />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 700, color: t.textMuted, textAlign: "center" }}>Traditional</span>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: "12px", fontWeight: 700, color: t.accent, textAlign: "center" }}>This Platform</span>
          </div>
          {rows.map((r, i) => (
            <div key={r} className="compare-row" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", padding: "12px 20px", borderBottom: i < rows.length - 1 ? `1px solid ${t.border}` : "none", alignItems: "center", transition: "background 0.15s ease" }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: t.textPrimary }}>{r}</span>
              <span style={{ textAlign: "center", color: traditional[i] ? "#2fae60" : t.textMuted }}>{traditional[i] ? "✓" : "—"}</span>
              <span style={{ textAlign: "center", color: "#2fae60" }}>✓</span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ============================================================================
   17. TESTIMONIALS (placeholder-safe)
   ========================================================================== */
function Testimonials() {
  const { t } = useTheme();
  return (
    <section style={{ padding: "100px 24px" }}>
      <SectionHeading title="From businesses using the platform." />
      <Reveal style={{ maxWidth: "480px", margin: "0 auto", textAlign: "center" }}>
        <Card style={{ padding: "40px 28px" }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: t.textMuted, margin: 0 }}>
            Customer stories will appear here as businesses share their experience with the platform.
          </p>
        </Card>
      </Reveal>
    </section>
  );
}

/* ============================================================================
   18. FAQ
   ========================================================================== */
function FAQ() {
  const { t } = useTheme();
  const faqs = [
    ["What is this platform?", "An AI-powered platform for billing, inventory, analytics and business management."],
    ["Who is it built for?", "Retail, fashion, electronics, supermarkets and multi-store businesses of any size."],
    ["Does it support billing and invoicing?", "Yes — fast invoicing with automatic calculations, discounts, taxes and returns."],
    ["Can I manage inventory?", "Yes — real-time stock, variants, categories, barcodes and low-stock alerts."],
    ["Can employees have separate accounts?", "Yes — role-based accounts with permissions and activity tracking."],
    ["What payment methods can I track?", "Cash, UPI and card, along with pending payments and transaction history."],
    ["How does the AI assistant work?", "It analyses your live business data and answers questions in plain language."],
    ["Can I use voice commands?", "Yes — for supported actions like creating bills and checking sales."],
    ["How does suspicious activity detection work?", "The platform flags unusual patterns such as refunds or discrepancies for you to review."],
    ["Is my data secure?", "Data is protected with secure authentication, encrypted communication and audit logs."],
    ["Can I access the platform from mobile?", "Yes — the dashboard adapts to desktop, tablet and mobile."],
    ["Does it support multiple stores?", "Yes, on plans that include multi-store management."],
  ];
  const [open, setOpen] = useState(null);
  return (
    <section style={{ padding: "100px 24px", background: t.bgHover + "40" }}>
      <SectionHeading title="Frequently asked questions." />
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        {faqs.map(([q, a], i) => (
          <Reveal key={q} delay={i * 30}>
            <div className="faq-row" style={{ borderBottom: `1px solid ${t.border}`, borderRadius: "10px", transition: "background 0.15s ease" }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{
                width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer",
                padding: "16px 4px", display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 600, color: t.textPrimary }}>{q}</span>
                <span style={{ color: t.accent, transform: open === i ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>
              </button>
              {open === i && (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: t.textMuted, margin: "0 0 16px", lineHeight: 1.6 }}>{a}</p>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ============================================================================
   19. FINAL CTA
   ========================================================================== */
function FinalCTA({ onStart, onExplore }) {
  const { t } = useTheme();
  return (
    <section style={{ position: "relative", padding: "110px 24px", overflow: "hidden", textAlign: "center" }}>
      <div style={{
        position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 40%, ${t.accent}18, transparent 65%)`,
        pointerEvents: "none",
      }} />
      <Reveal style={{ position: "relative", maxWidth: "560px", margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "clamp(28px,4vw,40px)", color: t.textPrimary, margin: "0 0 12px", letterSpacing: "-0.02em" }}>
          Run your business with clarity.
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: t.textMuted, margin: "0 0 30px" }}>
          Smarter billing. Intelligent insights. Better decisions.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Button variant="primary" onClick={onStart}>Start Free →</Button>
          <Button variant="secondary" onClick={onExplore}>Explore the Platform</Button>
        </div>
      </Reveal>
    </section>
  );
}

/* ============================================================================
   FOOTER
   ========================================================================== */
function Footer({ navigate }) {
  const { t } = useTheme();
  const cols = [
    { title: "Product", links: [["Overview", "/"], ["Billing", "/billing"], ["Inventory", "/inventory"], ["Analytics", "/reports"], ["AI Assistant", "/ai"], ["Voice Commands", "/voice"]] },
    { title: "Solutions", links: [["Retail", "/solutions/retail"], ["Fashion", "/solutions/fashion"], ["Electronics", "/solutions/electronics"], ["Supermarkets", "/solutions/supermarkets"], ["Multi-store", "/solutions/multi-store"]] },
    { title: "Company", links: [["About", "/about"], ["Contact", "/contact"], ["Careers", "/careers"]] },
    { title: "Resources", links: [["Documentation", "/docs"], ["Help Center", "/help"], ["API", "/api"], ["Blog", "/blog"]] },
    { title: "Legal", links: [["Privacy", "/privacy"], ["Terms", "/terms"], ["Refund Policy", "/refund-policy"]] },
  ];
  return (
    <footer style={{ padding: "70px 24px 30px", borderTop: `1px solid ${t.border}` }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(5, 1fr)", gap: "24px", maxWidth: "1100px", margin: "0 auto 40px" }} className="footer-grid">
        <div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "20px", letterSpacing: "-0.04em" }}>
            <span style={{ color: t.textPrimary }}>BIL</span><span style={{ color: t.accent }}>L</span><span style={{ color: t.textPrimary }}>LING</span>
          </span>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: t.textMuted, marginTop: "10px", maxWidth: "220px", lineHeight: 1.6 }}>
            The AI-powered operating system for modern businesses.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textMuted, margin: "0 0 12px" }}>{c.title}</p>
            {c.links.map(([label, path]) => (
              <p key={label} onClick={() => navigate(path)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: t.textPrimary, margin: "0 0 9px", cursor: "pointer" }}>{label}</p>
            ))}
          </div>
        ))}
      </div>
      <p style={{ textAlign: "center", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: t.textMuted, borderTop: `1px solid ${t.border}`, paddingTop: "24px" }}>
        © {new Date().getFullYear()} BILLING. All rights reserved.
      </p>
    </footer>
  );
}

/* ============================================================================
   LANDING NAVBAR (new, landing-page specific)
   ========================================================================== */
function LandingNavbar({ navigate }) {
  const { t } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const menus = {
    Product: [["Overview", "/"], ["Dashboard", "/dashboard"], ["Billing", "/billing"], ["Inventory", "/inventory"], ["Analytics", "/reports"]],
    AI: [["AI Business Analyst", "/ai"], ["Voice Commands", "/voice"], ["Smart Insights", "/ai#insights"], ["AI Automation", "/automation"], ["Fraud Detection", "/security"]],
    Features: null,
    Solutions: [["Retail", "/solutions/retail"], ["Fashion", "/solutions/fashion"], ["Electronics", "/solutions/electronics"], ["Supermarkets", "/solutions/supermarkets"], ["Multi-store Businesses", "/solutions/multi-store"]],
    Security: null,
    Pricing: null,
  };
  const singlePaths = { Features: "/#features", Security: "/#security", Pricing: "/#pricing" };

  // login / signup — routes them to auth pages
  const goLogin = () => navigate("/login");
  const goSignup = () => navigate("/signup");

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", height: "64px",
      background: scrolled ? t.bg : t.bg + "cc",
      backdropFilter: "blur(10px)",
      borderBottom: `1px solid ${scrolled ? t.border : "transparent"}`,
      transition: "background 0.25s ease, border-color 0.25s ease",
    }}>
      <span onClick={() => navigate("/")} style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "22px", letterSpacing: "-0.04em", cursor: "pointer", userSelect: "none" }}>
        <span style={{ color: t.textPrimary }}>BIL</span><span style={{ color: t.accent }}>L</span><span style={{ color: t.textPrimary }}>LING</span>
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: "2px" }} className="landing-nav-links">
        {Object.keys(menus).map((label) => (
          <div key={label} onMouseEnter={() => setOpenMenu(label)} onMouseLeave={() => setOpenMenu(null)} style={{ position: "relative" }}>
            <button onClick={() => !menus[label] && navigate(singlePaths[label])} style={{
              padding: "8px 14px", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px", fontWeight: 500, color: t.textMuted, background: "transparent",
              border: "none", cursor: "pointer",
            }}>{label}</button>
            {menus[label] && openMenu === label && (
              <div style={{
                position: "absolute", top: "100%", left: 0, minWidth: "220px",
                background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: "14px",
                padding: "8px", boxShadow: "0 12px 30px -10px rgba(0,0,0,0.25)",
              }}>
                {menus[label].map(([l, p]) => (
                  <p key={l} onClick={() => { navigate(p); setOpenMenu(null); }} style={{
                    margin: 0, padding: "9px 12px", borderRadius: "8px", cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: t.textPrimary,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = t.bgHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >{l}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }} className="landing-nav-actions">
        <Button variant="ghost" onClick={goLogin}>Log in</Button>
        <Button variant="primary" onClick={goSignup}>Start Free</Button>
      </div>

      <button className="landing-nav-burger" onClick={() => setMobileOpen(!mobileOpen)} style={{ display: "none", background: "transparent", border: "none", cursor: "pointer" }}>
        <svg width="20" height="20" fill="none" stroke={t.textPrimary} strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      {mobileOpen && (
        <div style={{ position: "fixed", top: "64px", left: 0, right: 0, bottom: 0, background: t.bg, zIndex: 99, padding: "20px", overflowY: "auto" }}>
          {Object.entries(menus).map(([label, items]) => (
            <div key={label} style={{ marginBottom: "14px" }}>
              <p onClick={() => { if (!items) { navigate(singlePaths[label]); setMobileOpen(false); } }} style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "15px", color: t.textPrimary, margin: "0 0 8px" }}>{label}</p>
              {items && items.map(([l, p]) => (
                <p key={l} onClick={() => { navigate(p); setMobileOpen(false); }} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: t.textMuted, margin: "0 0 8px", paddingLeft: "10px" }}>{l}</p>
              ))}
            </div>
          ))}
          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <Button variant="secondary" onClick={() => { goLogin(); setMobileOpen(false); }} style={{ flex: 1 }}>Log in</Button>
            <Button variant="primary" onClick={() => { goSignup(); setMobileOpen(false); }} style={{ flex: 1 }}>Start Free</Button>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ============================================================================
   PAGE
   ========================================================================== */
export default function LandingPage() {
  const { t } = useTheme();
  const navigate = useNavigate();
  const goSignup = () => navigate("/signup");
  const goExplore = () => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }) || navigate("/dashboard");

  return (
    <div style={{ background: t.bg, color: t.textPrimary, minHeight: "100vh" }}>
      <style>{`
        @keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes pulseRing { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.8); opacity: 0; } }
        @keyframes fadeInDot { from { opacity: 0; transform: scale(0.3); } to { opacity: 1; transform: scale(1); } }
        @keyframes typingDot { 0%,60%,100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }
        .ai-caret { display: inline-block; width: 2px; height: 12px; margin-left: 2px; vertical-align: middle; animation: caretBlink 0.8s step-end infinite; }
        @keyframes caretBlink { 0%,50% { opacity: 1; } 51%,100% { opacity: 0; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes gradientMove { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }

        /* ── Tablet ── */
        @media (max-width: 900px) {
          .landing-nav-links, .landing-nav-actions { display: none !important; }
          .landing-nav-burger { display: block !important; }
          .fraud-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: repeat(2,1fr) !important; }
          .hero-float { display: none !important; }
        }
        /* ── Mobile ── */
        @media (max-width: 640px) {
          .footer-grid { grid-template-columns: repeat(2,1fr) !important; gap: 28px 16px !important; }
          .who-grid, .core-grid, .analytics-grid, .bi-grid, .pricing-grid, .employee-feat-grid { grid-template-columns: 1fr !important; }
          .hero-stats-grid { grid-template-columns: repeat(2,1fr) !important; gap: 16px !important; }
          .workflow-row { flex-wrap: nowrap !important; scroll-snap-type: x mandatory; }
          .workflow-row > div { scroll-snap-align: start; }
          section { padding-left: 18px !important; padding-right: 18px !important; }
        }
        .who-grid > div:hover .who-icon { transform: scale(1.15) rotate(-6deg); }
        .feature-card:hover .feature-icon { transform: scale(1.1) rotate(-4deg); }
        .faq-row:hover { background: ${t.bgHover}; }
        .compare-row:hover { background: ${t.bgHover}; }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <LandingNavbar navigate={navigate} />
      <Hero onStart={goSignup} onExplore={goExplore} />
      <TrustStrip />
      <ProblemSolution />
      <div id="features"><CoreFeatures /></div>
      <AICopilot />
      <VoiceCommands />
      <BusinessIntelligence />
      <div id="security"><FraudSecurity /></div>
      <BusinessHealth />
      <Analytics />
      <Automation />
      <EmployeeAccess />
      <WhoItsFor />
      <Workflow />
      <div id="pricing"><Pricing onStart={goSignup} /></div>
      <Comparison />
      <Testimonials />
      <FAQ />
      <FinalCTA onStart={goSignup} onExplore={goExplore} />
      <Footer navigate={navigate} />
    </div>
  );
}