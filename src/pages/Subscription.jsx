import { useState } from "react";
import { useTheme } from "../components/ThemeContext";

// ─── PLAN DATA ────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Perfect for small businesses",
    monthlyPrice: 499,
    yearlyPrice: 399,
    color: "#6366f1",
    colorBg: "#6366f115",
    icon: "◈",
    popular: false,
    features: [
      { text: "Up to 50 invoices/month",     included: true  },
      { text: "5 customers",                  included: true  },
      { text: "Basic reports",                included: true  },
      { text: "Email support",                included: true  },
      { text: "Inventory management",         included: false },
      { text: "Advanced analytics",           included: false },
      { text: "Custom branding",              included: false },
      { text: "Priority support",             included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For growing businesses",
    monthlyPrice: 1299,
    yearlyPrice: 999,
    color: "#f97316",
    colorBg: "#f9731618",
    icon: "⬡",
    popular: true,
    features: [
      { text: "Unlimited invoices",           included: true  },
      { text: "Unlimited customers",          included: true  },
      { text: "Advanced reports",             included: true  },
      { text: "Priority email support",       included: true  },
      { text: "Inventory management",         included: true  },
      { text: "Advanced analytics",           included: true  },
      { text: "Custom branding",              included: false },
      { text: "Priority support",             included: false },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For large-scale operations",
    monthlyPrice: 2999,
    yearlyPrice: 2399,
    color: "#22c55e",
    colorBg: "#22c55e15",
    icon: "✦",
    popular: false,
    features: [
      { text: "Unlimited invoices",           included: true  },
      { text: "Unlimited customers",          included: true  },
      { text: "Custom reports & exports",     included: true  },
      { text: "24/7 phone support",           included: true  },
      { text: "Inventory management",         included: true  },
      { text: "Advanced analytics",           included: true  },
      { text: "Custom branding",              included: true  },
      { text: "Dedicated account manager",    included: true  },
    ],
  },
];

// ─── CURRENT PLAN (mock) ──────────────────────────────────────────────────────
const CURRENT_PLAN = "pro";

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  const { t } = useTheme();
  return (
    <div style={{
      background: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: "14px",
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    }}>
      <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, fontFamily: "'DM Sans',sans-serif" }}>{label}</p>
      <p style={{ fontFamily: "'Syne',sans-serif", fontSize: "22px", fontWeight: 900, color: color || t.textPrimary, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: "11px", color: t.textMuted }}>{sub}</p>}
    </div>
  );
}

// ─── CHECK / CROSS ICON ───────────────────────────────────────────────────────
function Check({ included, color }) {
  const { t } = useTheme();
  if (included) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="8" fill={color + "22"} />
        <path d="M5 8l2 2 4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="8" fill={t.borderLight} />
      <path d="M5.5 10.5l5-5M10.5 10.5l-5-5" stroke={t.textMuted} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ─── PLAN CARD ────────────────────────────────────────────────────────────────
function PlanCard({ plan, billing, isCurrent }) {
  const { t } = useTheme();
  const price = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  const savings = Math.round(((plan.monthlyPrice - plan.yearlyPrice) / plan.monthlyPrice) * 100);

  return (
    <div style={{
      position: "relative",
      background: t.bgCard,
      border: `1.5px solid ${plan.popular ? plan.color + "60" : t.border}`,
      borderRadius: "20px",
      padding: "28px 24px",
      display: "flex",
      flexDirection: "column",
      gap: "0",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      boxShadow: plan.popular ? `0 0 40px ${plan.color}18` : "none",
      transform: plan.popular ? "scale(1.02)" : "scale(1)",
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = plan.popular ? "scale(1.04)" : "scale(1.02)"; e.currentTarget.style.boxShadow = `0 8px 32px ${plan.color}22`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = plan.popular ? "scale(1.02)" : "scale(1)"; e.currentTarget.style.boxShadow = plan.popular ? `0 0 40px ${plan.color}18` : "none"; }}
    >

      {/* Popular Badge */}
      {plan.popular && (
        <div style={{
          position: "absolute",
          top: "-13px",
          left: "50%",
          transform: "translateX(-50%)",
          background: `linear-gradient(90deg, ${plan.color}, ${plan.color}cc)`,
          color: "#fff",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          padding: "4px 14px",
          borderRadius: "99px",
          fontFamily: "'DM Sans',sans-serif",
          whiteSpace: "nowrap",
        }}>
          ✦ Most Popular
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{
          width: "40px", height: "40px",
          borderRadius: "10px",
          background: plan.colorBg,
          border: `1px solid ${plan.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "18px",
          marginBottom: "14px",
        }}>
          <span style={{ color: plan.color }}>{plan.icon}</span>
        </div>
        <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "18px", color: t.textPrimary, marginBottom: "4px" }}>{plan.name}</h3>
        <p style={{ fontSize: "12px", color: t.textMuted }}>{plan.tagline}</p>
      </div>

      {/* Price */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: "36px", fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.04em", lineHeight: 1 }}>
            ₹{price.toLocaleString("en-IN")}
          </span>
          <span style={{ fontSize: "12px", color: t.textMuted, marginBottom: "4px", fontFamily: "'DM Sans',sans-serif" }}>/mo</span>
        </div>
        {billing === "yearly" && (
          <p style={{ fontSize: "11px", color: plan.color, marginTop: "4px", fontWeight: 600 }}>
            Save {savings}% vs monthly
          </p>
        )}
      </div>

      {/* CTA Button */}
      <button
        style={{
          width: "100%",
          padding: "11px",
          borderRadius: "10px",
          fontSize: "13px",
          fontWeight: 700,
          fontFamily: "'DM Sans',sans-serif",
          cursor: isCurrent ? "default" : "pointer",
          border: isCurrent ? `1.5px solid ${t.border}` : plan.popular ? "none" : `1.5px solid ${plan.color}60`,
          background: isCurrent
            ? t.bgHover
            : plan.popular
            ? `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`
            : "transparent",
          color: isCurrent ? t.textMuted : plan.popular ? "#fff" : plan.color,
          marginBottom: "24px",
          transition: "opacity 0.15s ease",
          letterSpacing: "0.01em",
        }}
        onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.opacity = "0.85"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        {isCurrent ? "✓ Current Plan" : plan.id === "starter" ? "Downgrade" : "Upgrade Now"}
      </button>

      {/* Divider */}
      <div style={{ height: "1px", background: t.border, marginBottom: "20px" }} />

      {/* Features */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {plan.features.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Check included={f.included} color={plan.color} />
            <span style={{
              fontSize: "12px",
              color: f.included ? t.textPrimary : t.textMuted,
              fontFamily: "'DM Sans',sans-serif",
              textDecoration: f.included ? "none" : "none",
            }}>{f.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FAQ ITEM ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: "12px",
      overflow: "hidden",
      transition: "border-color 0.15s ease",
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          gap: "12px",
        }}
      >
        <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: "13px", color: t.textPrimary }}>{q}</span>
        <span style={{
          color: t.textMuted,
          fontSize: "18px",
          lineHeight: 1,
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease",
          flexShrink: 0,
        }}>+</span>
      </button>
      {open && (
        <div style={{ padding: "0 20px 16px", fontSize: "12px", color: t.textMuted, lineHeight: 1.7, fontFamily: "'DM Sans',sans-serif" }}>
          {a}
        </div>
      )}
    </div>
  );
}

// ─── SUBSCRIPTION PAGE ────────────────────────────────────────────────────────
export default function Subscription() {
  const { t } = useTheme();
  const [billing, setBilling] = useState("monthly");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

      {/* ── Page Header ── */}
      <div>
        <h1 style={{
          fontFamily: "'Syne',sans-serif",
          fontSize: "28px",
          fontWeight: 900,
          color: t.textPrimary,
          letterSpacing: "-0.03em",
        }}>Subscription</h1>
        <p style={{ fontSize: "13px", color: t.textMuted, marginTop: "4px" }}>
          Manage your plan, billing, and usage
        </p>
      </div>

      {/* ── Current Plan Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
        <StatCard label="Current Plan"     value="Pro"          sub="Active since Jan 2024"    color="#f97316" />
        <StatCard label="Next Billing"     value="₹1,299"       sub="Due on 1 Jun 2025"                       />
        <StatCard label="Invoices Used"    value="842"          sub="of unlimited this month"                  />
        <StatCard label="Active Customers" value="218"          sub="of unlimited"                             />
      </div>

      {/* ── Billing Toggle + Plans ── */}
      <div>
        {/* Toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "32px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0",
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: "10px",
            padding: "4px",
          }}>
            {["monthly", "yearly"].map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                style={{
                  padding: "7px 20px",
                  borderRadius: "7px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  fontFamily: "'DM Sans',sans-serif",
                  transition: "all 0.15s ease",
                  background: billing === b ? "#f97316" : "transparent",
                  color: billing === b ? "#fff" : t.textMuted,
                  letterSpacing: "0.02em",
                }}
              >
                {b === "monthly" ? "Monthly" : "Yearly"}
                {b === "yearly" && (
                  <span style={{
                    marginLeft: "6px",
                    fontSize: "9px",
                    fontWeight: 700,
                    background: billing === "yearly" ? "rgba(255,255,255,0.25)" : "#22c55e22",
                    color: billing === "yearly" ? "#fff" : "#22c55e",
                    padding: "2px 6px",
                    borderRadius: "99px",
                  }}>SAVE 20%</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", alignItems: "start" }}>
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              billing={billing}
              isCurrent={plan.id === CURRENT_PLAN}
            />
          ))}
        </div>
      </div>

      {/* ── Billing History ── */}
      <div style={{
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: "16px",
        padding: "24px",
      }}>
        <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "15px", color: t.textPrimary }}>Billing History</h3>
            <p style={{ fontSize: "11px", color: t.textMuted, marginTop: "2px" }}>Your recent invoices and payments</p>
          </div>
          <button style={{
            padding: "7px 14px",
            borderRadius: "8px",
            border: `1px solid ${t.border}`,
            background: "transparent",
            color: t.textMuted,
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif",
          }}>
            Download All
          </button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.border}` }}>
              {["Invoice", "Plan", "Date", "Amount", "Status", ""].map((h, i) => (
                <th key={i} style={{
                  textAlign: "left",
                  paddingBottom: "10px",
                  fontSize: "10px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: t.textMuted,
                  fontFamily: "'DM Sans',sans-serif",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { id: "#SUB-0012", plan: "Pro",     date: "01 May 2025", amount: "₹1,299", status: "Paid"   },
              { id: "#SUB-0011", plan: "Pro",     date: "01 Apr 2025", amount: "₹1,299", status: "Paid"   },
              { id: "#SUB-0010", plan: "Pro",     date: "01 Mar 2025", amount: "₹1,299", status: "Paid"   },
              { id: "#SUB-0009", plan: "Starter", date: "01 Feb 2025", amount: "₹499",   status: "Paid"   },
              { id: "#SUB-0008", plan: "Starter", date: "01 Jan 2025", amount: "₹499",   status: "Paid"   },
            ].map((row, i, arr) => (
              <tr key={row.id} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${t.borderLight}` : "none" }}>
                <td style={{ padding: "11px 0", fontFamily: "monospace", fontSize: "11px", color: t.textMuted }}>{row.id}</td>
                <td style={{ padding: "11px 0", fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans',sans-serif" }}>{row.plan}</td>
                <td style={{ padding: "11px 0", fontSize: "11px", color: t.textMuted }}>{row.date}</td>
                <td style={{ padding: "11px 0", fontFamily: "'Syne',sans-serif", fontWeight: 700, color: t.textPrimary }}>{row.amount}</td>
                <td style={{ padding: "11px 0" }}>
                  <span style={{
                    fontSize: "10px", fontWeight: 600,
                    padding: "3px 9px", borderRadius: "99px",
                    color: t.green, background: t.greenBg,
                  }}>{row.status}</span>
                </td>
                <td style={{ padding: "11px 0", textAlign: "right" }}>
                  <button style={{
                    background: "transparent",
                    border: `1px solid ${t.border}`,
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "10px",
                    fontWeight: 600,
                    color: t.textMuted,
                    cursor: "pointer",
                    fontFamily: "'DM Sans',sans-serif",
                  }}>PDF</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── FAQ ── */}
      <div>
        <h3 style={{
          fontFamily: "'Syne',sans-serif",
          fontWeight: 800,
          fontSize: "18px",
          color: t.textPrimary,
          marginBottom: "16px",
          letterSpacing: "-0.02em",
        }}>Frequently Asked Questions</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[
            { q: "Can I change my plan anytime?",         a: "Yes! You can upgrade or downgrade at any time. Changes take effect on your next billing cycle." },
            { q: "Is there a free trial?",                a: "We offer a 14-day free trial on all plans. No credit card required to get started." },
            { q: "What payment methods do you accept?",   a: "We accept all major credit/debit cards, UPI, net banking, and bank transfers for annual plans." },
            { q: "Can I cancel anytime?",                 a: "Absolutely. Cancel anytime from your dashboard. You'll retain access until the end of your billing period." },
          ].map((f, i) => <FaqItem key={i} {...f} />)}
        </div>
      </div>

    </div>
  );
}