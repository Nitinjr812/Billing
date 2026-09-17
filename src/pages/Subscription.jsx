import { useState, useEffect } from "react";
import { useTheme } from "../components/ThemeContext";
import { useAuth } from "../context/AuthContext";
import useApi from "../hooks/useApi"; // adjust this path to wherever useApi.js actually lives in your project

// ─── PLAN DATA ────────────────────────────────────────────────────────────────
// NOTE: monthlyPrice / yearlyPrice here MUST exactly match routes/payments.js
// PRICING object on the backend. The backend is the source of truth for what
// actually gets charged — this is just what's displayed. If you change a
// price, change it in BOTH files or the UI will show one number and Cashfree
// will charge another.
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

// Backend Shop.subscription.plan enum ("free"|"pro"|"premium") → frontend plan id
const BACKEND_TO_PLAN_ID = { free: "starter", pro: "pro", premium: "enterprise" };

// ─── RESPONSIVE STYLES ────────────────────────────────────────────────────────
const styles = `
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
  }
  .plans-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
    align-items: start;
  }
  .faq-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 10px;
  }
  .billing-table-wrap {
    overflow-x: auto;
  }
  @media (max-width: 640px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .plans-grid {
      grid-template-columns: 1fr;
    }
    .faq-grid {
      grid-template-columns: 1fr;
    }
    .plan-card-popular {
      transform: scale(1) !important;
    }
  }
`;

// ─── LOAD CASHFREE SDK ONCE ───────────────────────────────────────────────
function useCashfreeSdk() {
  const [ready, setReady] = useState(!!window.Cashfree);

  useEffect(() => {
    if (window.Cashfree) {
      setReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => setReady(true);
    document.body.appendChild(script);
    // no cleanup removal — SDK is fine to persist across the app
  }, []);

  return ready;
}

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
      <p style={{
        fontSize: "10px", fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.1em", color: t.textMuted, fontFamily: "'DM Sans',sans-serif",
      }}>{label}</p>
      <p style={{
        fontFamily: "'Syne',sans-serif", fontSize: "22px", fontWeight: 900,
        color: color || t.textPrimary, letterSpacing: "-0.03em", lineHeight: 1,
      }}>{value}</p>
      {sub && <p style={{ fontSize: "11px", color: t.textMuted }}>{sub}</p>}
    </div>
  );
}

// ─── CHECK / CROSS ICON ───────────────────────────────────────────────────────
function Check({ included, color }) {
  const { t } = useTheme();
  if (included) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="8" cy="8" r="8" fill={color + "22"} />
        <path d="M5 8l2 2 4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="8" fill={t.borderLight} />
      <path d="M5.5 10.5l5-5M10.5 10.5l-5-5" stroke={t.textMuted} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ─── PLAN CARD ────────────────────────────────────────────────────────────────
function PlanCard({ plan, billing, isCurrent, onUpgrade, loadingPlanId, sdkReady }) {
  const { t } = useTheme();
  const price = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  const savings = Math.round(((plan.monthlyPrice - plan.yearlyPrice) / plan.monthlyPrice) * 100);
  const isLoading = loadingPlanId === plan.id;

  return (
    <div
      className={plan.popular ? "plan-card-popular" : ""}
      style={{
        position: "relative",
        background: t.bgCard,
        border: `1.5px solid ${plan.popular ? plan.color + "60" : t.border}`,
        borderRadius: "20px",
        padding: "28px 24px",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        boxShadow: plan.popular ? `0 0 40px ${plan.color}18` : "none",
        transform: plan.popular ? "scale(1.02)" : "scale(1)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = plan.popular ? "scale(1.04)" : "scale(1.02)";
        e.currentTarget.style.boxShadow = `0 8px 32px ${plan.color}22`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = plan.popular ? "scale(1.02)" : "scale(1)";
        e.currentTarget.style.boxShadow = plan.popular ? `0 0 40px ${plan.color}18` : "none";
      }}
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
        <h3 style={{
          fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "18px",
          color: t.textPrimary, marginBottom: "4px",
        }}>{plan.name}</h3>
        <p style={{ fontSize: "12px", color: t.textMuted }}>{plan.tagline}</p>
      </div>

      {/* Price */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
          <span style={{
            fontFamily: "'Syne',sans-serif", fontSize: "36px", fontWeight: 900,
            color: t.textPrimary, letterSpacing: "-0.04em", lineHeight: 1,
          }}>
            ₹{price.toLocaleString("en-IN")}
          </span>
          <span style={{
            fontSize: "12px", color: t.textMuted,
            marginBottom: "4px", fontFamily: "'DM Sans',sans-serif",
          }}>/mo</span>
        </div>
        {billing === "yearly" && (
          <p style={{ fontSize: "11px", color: plan.color, marginTop: "4px", fontWeight: 600 }}>
            Save {savings}% vs monthly
          </p>
        )}
      </div>

      {/* CTA Button */}
      <button
        disabled={isCurrent || isLoading || !sdkReady}
        onClick={() => !isCurrent && onUpgrade(plan)}
        style={{
          width: "100%",
          padding: "11px",
          borderRadius: "10px",
          fontSize: "13px",
          fontWeight: 700,
          fontFamily: "'DM Sans',sans-serif",
          cursor: isCurrent ? "default" : "pointer",
          border: isCurrent
            ? `1.5px solid ${t.border}`
            : plan.popular ? "none"
            : `1.5px solid ${plan.color}60`,
          background: isCurrent
            ? t.bgHover
            : plan.popular
            ? `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`
            : "transparent",
          color: isCurrent ? t.textMuted : plan.popular ? "#fff" : plan.color,
          marginBottom: "24px",
          transition: "opacity 0.15s ease",
          letterSpacing: "0.01em",
          opacity: isLoading || !sdkReady ? 0.7 : 1,
        }}
        onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.opacity = "0.85"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = isLoading || !sdkReady ? "0.7" : "1"; }}
      >
        {isCurrent
          ? "✓ Current Plan"
          : isLoading
          ? "Redirecting..."
          : plan.id === "starter" ? "Downgrade" : "Upgrade Now"}
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
        <span style={{
          fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
          fontSize: "13px", color: t.textPrimary,
        }}>{q}</span>
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
        <div style={{
          padding: "0 20px 16px",
          fontSize: "12px",
          color: t.textMuted,
          lineHeight: 1.7,
          fontFamily: "'DM Sans',sans-serif",
        }}>
          {a}
        </div>
      )}
    </div>
  );
}

// ─── SUBSCRIPTION PAGE ────────────────────────────────────────────────────────
export default function Subscription() {
  const { t } = useTheme();
  const { user } = useAuth();
  const [billing, setBilling] = useState("monthly");
  const [loadingPlanId, setLoadingPlanId] = useState(null);
  const [error, setError] = useState(null);

  // ── Real subscription data from the backend ──
  const [subscription, setSubscription] = useState(null); // { plan, monthlyAmount, discountPercent, renewalHistory }
  const [subLoading, setSubLoading] = useState(true);

  const sdkReady = useCashfreeSdk();
  const callApi = useApi();

  const fetchSubscription = async () => {
    try {
      const data = await callApi("/settings/subscription");
      setSubscription(data);
    } catch (err) {
      console.error("Failed to load subscription:", err);
      setError("Could not load your subscription details.");
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── If we just came back from a Cashfree redirect (?order_id=...),
  // re-check that order's status (the backend now also updates the
  // subscription itself as a fallback in this same call — see
  // routes/payments.js order-status route) and refresh the subscription
  // once that's had a moment to land. ─────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order_id");
    if (!orderId) return;

    let cancelled = false;
    (async () => {
      try {
        await callApi(`/payments/order-status/${orderId}`);
      } catch (err) {
        console.error("Order status check failed:", err);
      } finally {
        // give the webhook/fallback a moment, then refresh regardless of the check above
        setTimeout(() => {
          if (!cancelled) fetchSubscription();
        }, 2000);
      }
    })();

    // clean the query param out of the URL so a refresh doesn't re-trigger this
    window.history.replaceState({}, "", window.location.pathname);

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentPlanId = BACKEND_TO_PLAN_ID[subscription?.plan] || "starter";
  const history = subscription?.renewalHistory || [];
  const lastPayment = history.length > 0 ? history[history.length - 1] : null;

  async function handleUpgrade(plan) {
    setError(null);
    setLoadingPlanId(plan.id);
    try {
      // Amount is computed server-side from planId+billing — we never send
      // the price from the client, so it can't be tampered with.
      const data = await callApi("/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ planId: plan.id, billing }),
      });

      const cashfree = window.Cashfree({ mode: "sandbox" }); // change to "production" when live
      cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        redirectTarget: "_self",
      });
      // Note: on success/failure Cashfree redirects to return_url configured
      // on the backend, so execution here effectively ends with the redirect.
    } catch (err) {
      console.error(err);
      setError("Something went wrong starting the payment. Please try again.");
      setLoadingPlanId(null);
    }
  }

  return (
    <>
      <style>{styles}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

        {/* Page Header */}
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

        {error && (
          <div style={{
            background: "#ef444415",
            border: "1px solid #ef444460",
            color: "#ef4444",
            borderRadius: "10px",
            padding: "12px 16px",
            fontSize: "13px",
            fontFamily: "'DM Sans',sans-serif",
          }}>
            {error}
          </div>
        )}

        {/* Current Plan Stats */}
        <div className="stats-grid">
          <StatCard
            label="Current Plan"
            value={subLoading ? "…" : PLANS.find(p => p.id === currentPlanId)?.name || "Free"}
            sub={subscription?.discountPercent > 0 ? `${subscription.discountPercent}% discount applied` : "—"}
            color="#f97316"
          />
          <StatCard
            label="Monthly Amount"
            value={subLoading ? "…" : `₹${(subscription?.monthlyAmount || 0).toLocaleString("en-IN")}`}
            sub={lastPayment ? `Last paid ${new Date(lastPayment.date).toLocaleDateString("en-IN")}` : "No payments yet"}
          />
          <StatCard
            label="Total Renewals"
            value={subLoading ? "…" : history.length}
            sub="Payments recorded"
          />
          <StatCard
            label="Total Paid"
            value={subLoading ? "…" : `₹${history.reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString("en-IN")}`}
            sub="Lifetime"
          />
        </div>

        {/* Billing Toggle + Plans */}
        <div>
          {/* Toggle */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "32px",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
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
          <div className="plans-grid">
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                billing={billing}
                isCurrent={plan.id === currentPlanId}
                onUpgrade={handleUpgrade}
                loadingPlanId={loadingPlanId}
                sdkReady={sdkReady}
              />
            ))}
          </div>
        </div>

        {/* Billing History — real data from subscription.renewalHistory */}
        <div style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: "16px",
          padding: "24px",
        }}>
          <div style={{
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}>
            <div>
              <h3 style={{
                fontFamily: "'Syne',sans-serif", fontWeight: 700,
                fontSize: "15px", color: t.textPrimary,
              }}>Billing History</h3>
              <p style={{ fontSize: "11px", color: t.textMuted, marginTop: "2px" }}>
                Your recent invoices and payments
              </p>
            </div>
          </div>

          <div className="billing-table-wrap">
            {subLoading ? (
              <p style={{ fontSize: "12px", color: t.textMuted, padding: "12px 0" }}>Loading billing history…</p>
            ) : history.length === 0 ? (
              <p style={{ fontSize: "12px", color: t.textMuted, padding: "12px 0" }}>No payments recorded yet.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: "420px" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                    {["Invoice", "Plan", "Date", "Amount"].map((h, i) => (
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
                  {[...history].reverse().map((row, i, arr) => (
                    <tr key={row.orderId || i} style={{
                      borderBottom: i < arr.length - 1 ? `1px solid ${t.borderLight}` : "none",
                    }}>
                      <td style={{ padding: "11px 0", fontFamily: "monospace", fontSize: "11px", color: t.textMuted }}>
                        {row.orderId ? `#${row.orderId.slice(-10)}` : `#SUB-${String(arr.length - i).padStart(4, "0")}`}
                      </td>
                      <td style={{ padding: "11px 0", fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans',sans-serif", textTransform: "capitalize" }}>
                        {BACKEND_TO_PLAN_ID[row.plan] || row.plan}
                      </td>
                      <td style={{ padding: "11px 0", fontSize: "11px", color: t.textMuted }}>
                        {new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td style={{ padding: "11px 0", fontFamily: "'Syne',sans-serif", fontWeight: 700, color: t.textPrimary }}>
                        ₹{row.amount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h3 style={{
            fontFamily: "'Syne',sans-serif",
            fontWeight: 800,
            fontSize: "18px",
            color: t.textPrimary,
            marginBottom: "16px",
            letterSpacing: "-0.02em",
          }}>Frequently Asked Questions</h3>
          <div className="faq-grid">
            {[
              { q: "Can I change my plan anytime?",       a: "Yes! You can upgrade or downgrade at any time. Changes take effect on your next billing cycle." },
              { q: "Is there a free trial?",              a: "We offer a 14-day free trial on all plans. No credit card required to get started." },
              { q: "What payment methods do you accept?", a: "We accept all major credit/debit cards, UPI, net banking, and bank transfers for annual plans." },
              { q: "Can I cancel anytime?",               a: "Absolutely. Cancel anytime from your dashboard. You'll retain access until the end of your billing period." },
            ].map((f, i) => <FaqItem key={i} {...f} />)}
          </div>
        </div>

      </div>
    </>
  );
}