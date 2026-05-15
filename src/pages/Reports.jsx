import { useState, useRef, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { useTheme } from "../components/ThemeContext";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler
);

// ─── REPORT DATA ──────────────────────────────────────────────────────────────
const MONTHLY_REVENUE   = [285000, 320000, 295000, 410000, 370000, 445000, 482310];
const MONTHLY_ORDERS    = [198, 224, 208, 267, 241, 289, 312];
const MONTHLY_CUSTOMERS = [210, 228, 245, 262, 280, 305, 326];
const MONTHS            = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];

const CATEGORY_REVENUE = {
  labels: ["Electronics", "Apparel", "Home Goods"],
  data:   [218400, 154800, 109110],
};

const TOP_PRODUCTS = [
  { name: "Prod-Gamma",  revenue: "₹71,400", orders: 21, growth: "+18%" },
  { name: "Prod-Alpha",  revenue: "₹58,800", orders: 49, growth: "+12%" },
  { name: "Prod-Omega",  revenue: "₹56,000", orders: 10, growth: "+9%"  },
  { name: "Prod-Kappa",  revenue: "₹48,900", orders: 6,  growth: "+5%"  },
  { name: "Prod-Sigma",  revenue: "₹42,000", orders: 24, growth: "+22%" },
];

// ─── CONTEXT FOR AI ───────────────────────────────────────────────────────────
const REPORT_CONTEXT = `
You are an expert business analyst AI assistant embedded in a business analytics dashboard for an Indian e-commerce company. Always respond in clear, professional English. Be concise, insightful, and actionable.

Current business snapshot (May 2024):
- Total Revenue: ₹4,82,310 (↑12.4% vs last month)
- Total Orders: 1,248 (↑8.1% vs last month)
- Average Order Value: ₹3,864 (↑3.9%)
- Active Customers: 326 (14 new this month)
- Pending Invoices: ₹38,500 (3 overdue)
- Cancelled Orders: 88 (7.1% cancellation rate)

Revenue by Category:
- Electronics: ₹2,18,400 (45.3%)
- Apparel: ₹1,54,800 (32.1%)
- Home Goods: ₹1,09,110 (22.6%)

Top Products (by revenue):
1. Prod-Gamma — ₹71,400 | 21 orders | +18% growth
2. Prod-Alpha — ₹58,800 | 49 orders | +12% growth
3. Prod-Omega — ₹56,000 | 10 orders | +9% growth
4. Prod-Kappa — ₹48,900 | 6 orders  | +5% growth
5. Prod-Sigma — ₹42,000 | 24 orders | +22% growth (fastest growing)

Monthly Revenue Trend:
Nov ₹2.85L → Dec ₹3.20L → Jan ₹2.95L → Feb ₹4.10L → Mar ₹3.70L → Apr ₹4.45L → May ₹4.82L

Monthly Orders Trend:
Nov 198 → Dec 224 → Jan 208 → Feb 267 → Mar 241 → Apr 289 → May 312

Customer Segments:
- Premium: 6 customers (highest spenders)
- Regular: 6 customers
- New: 3 customers (joined recently)
- Active: 291 | Inactive: 35

Order Fulfillment Breakdown:
- Delivered: 580 | Pending: 312 | Processing: 268 | Cancelled: 88

Inventory Alerts:
- Low Stock (3 SKUs): Prod-Delta (42 units), Prod-Zeta (28 units), Prod-Theta (18 units)
- Out of Stock (2 SKUs): Prod-Omega, Prod-Kappa
- Healthiest stock: Prod-Lambda (815 units), Prod-Gamma (610 units)

Supplier Info:
- TechCorp Ltd: supplies Electronics
- FabriX Pvt & StyleHouse: supply Apparel
- HomeBase Co: supplies Home Goods

Always respond in English. Use ₹ for currency. Give data-driven, specific answers. When relevant, highlight risks, opportunities, or actionable recommendations.
`;

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, trend, trendDir, sub }) {
  const { t } = useTheme();
  const colors = { up: t.green, down: t.red, neu: t.orange };
  const bgs    = { up: t.greenBg, down: t.redBg, neu: t.orangeBg };
  return (
    <div style={{
      borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px",
      background: t.bgCard, border: `1px solid ${t.border}`,
      transition: "background 0.25s ease, border-color 0.25s ease",
    }}>
      <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>{label}</p>
      <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(20px, 4vw, 26px)", fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em", lineHeight: 1, margin: 0 }}>{value}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {trend && <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", color: colors[trendDir], background: bgs[trendDir] }}>{trend}</span>}
        {sub && <span style={{ fontSize: "11px", color: t.textMuted }}>{sub}</span>}
      </div>
    </div>
  );
}

function ChartCard({ title, sub, children, style = {} }) {
  const { t } = useTheme();
  return (
    <div style={{
      borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column",
      background: t.bgCard, border: `1px solid ${t.border}`,
      transition: "background 0.25s ease, border-color 0.25s ease", ...style,
    }}>
      <div style={{ marginBottom: "14px" }}>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "14px", color: t.textPrimary, margin: 0 }}>{title}</h3>
        {sub && <p style={{ fontSize: "11px", color: t.textMuted, marginTop: "2px", marginBottom: 0 }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── CHARTS ───────────────────────────────────────────────────────────────────
function RevenueLineChart() {
  const { t } = useTheme();
  const data = {
    labels: MONTHS,
    datasets: [{
      label: "Revenue",
      data: MONTHLY_REVENUE,
      borderColor: t.accent,
      borderWidth: 2.5,
      backgroundColor: `${t.accent}18`,
      pointRadius: 4,
      pointBackgroundColor: t.accent,
      pointBorderColor: t.bgCard,
      pointBorderWidth: 2,
      tension: 0.4,
      fill: true,
    }],
  };
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1, titleColor: t.tooltipTitle, bodyColor: t.tooltipBody,
        callbacks: { label: (ctx) => " ₹" + ctx.raw.toLocaleString("en-IN") } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: t.textMuted, font: { size: 10 } } },
      y: { grid: { color: t.gridColor }, ticks: { color: t.textMuted, font: { size: 10 }, callback: (v) => "₹" + v / 1000 + "k" } },
    },
  };
  return <div style={{ height: 180 }}><Line data={data} options={options} /></div>;
}

function OrdersBarChart() {
  const { t } = useTheme();
  const data = {
    labels: MONTHS,
    datasets: [{
      label: "Orders",
      data: MONTHLY_ORDERS,
      backgroundColor: `${t.blue}22`,
      borderColor: t.blue,
      borderWidth: 1.5,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1, titleColor: t.tooltipTitle, bodyColor: t.tooltipBody },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: t.textMuted, font: { size: 10 } } },
      y: { grid: { color: t.gridColor }, ticks: { color: t.textMuted, font: { size: 10 } } },
    },
  };
  return <div style={{ height: 180 }}><Bar data={data} options={options} /></div>;
}

function CategoryDonut() {
  const { t } = useTheme();
  const data = {
    labels: CATEGORY_REVENUE.labels,
    datasets: [{
      data: CATEGORY_REVENUE.data,
      backgroundColor: [t.accent + "cc", t.blue + "cc", t.green + "cc"],
      borderColor: t.bgCard,
      borderWidth: 3,
      hoverOffset: 8,
    }],
  };
  const options = {
    responsive: true, maintainAspectRatio: false, cutout: "68%",
    plugins: {
      legend: { position: "bottom", labels: { color: t.textMuted, font: { size: 11 }, padding: 12, boxWidth: 10 } },
      tooltip: { backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1, titleColor: t.tooltipTitle, bodyColor: t.tooltipBody,
        callbacks: { label: (ctx) => " ₹" + ctx.raw.toLocaleString("en-IN") } },
    },
  };
  return <div style={{ height: 200 }}><Doughnut data={data} options={options} /></div>;
}

function CustomerGrowthChart() {
  const { t } = useTheme();
  const data = {
    labels: MONTHS,
    datasets: [{
      label: "Customers",
      data: MONTHLY_CUSTOMERS,
      borderColor: t.green,
      borderWidth: 2.5,
      backgroundColor: `${t.green}18`,
      pointRadius: 4,
      pointBackgroundColor: t.green,
      pointBorderColor: t.bgCard,
      pointBorderWidth: 2,
      tension: 0.4,
      fill: true,
    }],
  };
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1, titleColor: t.tooltipTitle, bodyColor: t.tooltipBody },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: t.textMuted, font: { size: 10 } } },
      y: { grid: { color: t.gridColor }, ticks: { color: t.textMuted, font: { size: 10 } } },
    },
  };
  return <div style={{ height: 160 }}><Line data={data} options={options} /></div>;
}

// ─── AI CHAT PANEL ────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  "Revenue trend",
  "Restock urgently?",
  "Customer insights",
  "Month summary",
];

function AiChat({ t }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "👋 Hi! I'm your AI Business Analyst. I have full access to your May 2024 dashboard data.\n\nYou can ask me about:\n📈 Revenue & orders trends\n📦 Inventory & product performance\n👥 Customer insights\n⚠️ Risks & opportunities\n\nJust type below!" }
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false); // mobile: collapsed by default
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");
    if (!expanded) setExpanded(true); // auto-expand on mobile when sending

    const newMessages = [...messages, { role: "user", text: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const apiMessages = newMessages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.text,
      }));

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: REPORT_CONTEXT,
          messages: apiMessages,
        }),
      });

      const data = await res.json();
      const reply = data?.content?.[0]?.text || "Sorry, something went wrong. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Network error occurred. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div style={{
      borderRadius: "16px", background: t.bgCard, border: `1px solid ${t.border}`,
      display: "flex", flexDirection: "column",
      transition: "background 0.25s ease, border-color 0.25s ease", overflow: "hidden",
    }}>
      {/* Header — tappable on mobile to expand/collapse */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{
          padding: "14px 16px", borderBottom: expanded ? `1px solid ${t.border}` : "none",
          display: "flex", alignItems: "center", gap: "10px", flexShrink: 0,
          cursor: "pointer", userSelect: "none",
        }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: "9px",
          background: `${t.accent}22`, border: `1px solid ${t.accent}44`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px",
          flexShrink: 0,
        }}>✦</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px", color: t.textPrimary, lineHeight: 1.2, margin: 0 }}>AI Analyst</p>
          <p style={{ fontSize: "10px", color: t.green, fontWeight: 600, margin: 0 }}>● Online</p>
        </div>
        {/* Chevron indicator */}
        <span style={{
          fontSize: 12, color: t.textMuted,
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
          display: "inline-block",
        }}>▼</span>
      </div>

      {/* Collapsible body */}
      {expanded && (
        <>
          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "14px",
            display: "flex", flexDirection: "column", gap: "10px",
            maxHeight: 360,
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "88%",
                  padding: "9px 13px",
                  borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: msg.role === "user" ? t.accent : `${t.accent}12`,
                  color: msg.role === "user" ? "#fff" : t.textPrimary,
                  fontSize: "12px",
                  lineHeight: 1.6,
                  fontFamily: "'DM Sans', sans-serif",
                  border: msg.role === "assistant" ? `1px solid ${t.border}` : "none",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>{msg.text}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  padding: "10px 16px", borderRadius: "14px 14px 14px 4px",
                  background: `${t.accent}12`, border: `1px solid ${t.border}`,
                  display: "flex", gap: "4px", alignItems: "center",
                }}>
                  {[0,1,2].map((d) => (
                    <div key={d} style={{
                      width: 6, height: 6, borderRadius: "50%", background: t.accent,
                      animation: "bounce 1.2s infinite",
                      animationDelay: `${d * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          <div style={{ padding: "0 10px 8px", display: "flex", gap: "6px", flexWrap: "wrap", flexShrink: 0 }}>
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={loading}
                style={{
                  fontSize: "10px", fontWeight: 600, padding: "4px 10px", borderRadius: "99px",
                  background: `${t.accent}15`, border: `1px solid ${t.accent}30`,
                  color: t.accent, cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.5 : 1,
                  transition: "all 0.15s", whiteSpace: "nowrap",
                }}
              >{q}</button>
            ))}
          </div>

          {/* Input */}
          <div style={{
            padding: "10px 12px", borderTop: `1px solid ${t.border}`,
            display: "flex", gap: "8px", flexShrink: 0,
          }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything about your business…"
              rows={1}
              disabled={loading}
              style={{
                flex: 1, resize: "none", background: `${t.accent}08`,
                border: `1px solid ${t.border}`, borderRadius: "10px",
                padding: "8px 12px", fontSize: "12px", color: t.textPrimary,
                fontFamily: "'DM Sans', sans-serif", outline: "none",
                transition: "border-color 0.2s", lineHeight: 1.5,
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: "10px", flexShrink: 0,
                background: loading || !input.trim() ? `${t.accent}30` : t.accent,
                border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px", color: "#fff", transition: "background 0.2s",
              }}
            >↑</button>
          </div>
        </>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

// ─── REPORTS PAGE ─────────────────────────────────────────────────────────────
export default function Reports() {
  const { t } = useTheme();

  return (
    <>
      <style>{`
        .rpt-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .rpt-main-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 16px;
          align-items: start;
        }
        .rpt-charts-col { display: flex; flex-direction: column; gap: 16px; }
        .rpt-row-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .rpt-ai-sticky { position: sticky; top: 88px; }

        /* Tablet */
        @media (max-width: 900px) {
          .rpt-main-layout { grid-template-columns: 1fr; }
          .rpt-ai-sticky { position: static; }
        }

        /* Mobile */
        @media (max-width: 640px) {
          .rpt-stat-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .rpt-row-2 { grid-template-columns: 1fr; gap: 12px; }
          .rpt-main-layout { gap: 12px; }
        }

        /* Tiny mobile */
        @media (max-width: 360px) {
          .rpt-stat-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* Header */}
        <div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(22px, 5vw, 28px)",
            fontWeight: 900, color: t.textPrimary,
            letterSpacing: "-0.03em", transition: "color 0.25s ease", margin: 0,
          }}>Reports</h1>
          <p style={{ fontSize: "13px", color: t.textMuted, marginTop: "4px", marginBottom: 0 }}>
            Business performance overview — ask the AI analyst for deeper insights
          </p>
        </div>

        {/* KPI Row */}
        <div className="rpt-stat-grid">
          <StatCard label="Revenue (May)"   value="₹4,82,310" trend="↑ 12.4%" trendDir="up"   sub="vs Apr" />
          <StatCard label="Orders (May)"    value="1,248"     trend="↑ 8.1%"  trendDir="up"   sub="vs Apr" />
          <StatCard label="Avg Order Value" value="₹3,864"    trend="↑ 3.9%"  trendDir="up"   sub="this month" />
          <StatCard label="Cancelled"       value="88"        trend="7.1%"    trendDir="down" sub="of total orders" />
        </div>

        {/* Main layout: Charts + AI Chat */}
        <div className="rpt-main-layout">

          {/* Charts Column */}
          <div className="rpt-charts-col">

            {/* Revenue Line */}
            <ChartCard title="Revenue Trend" sub="Last 7 months">
              <RevenueLineChart />
            </ChartCard>

            {/* Orders Bar + Category Donut */}
            <div className="rpt-row-2">
              <ChartCard title="Monthly Orders" sub="Last 7 months">
                <OrdersBarChart />
              </ChartCard>
              <ChartCard title="Revenue by Category" sub="May breakdown">
                <CategoryDonut />
              </ChartCard>
            </div>

            {/* Customer Growth + Top Products */}
            <div className="rpt-row-2">
              <ChartCard title="Customer Growth" sub="Last 7 months">
                <CustomerGrowthChart />
              </ChartCard>

              {/* Top Products Table — horizontally scrollable on mobile */}
              <ChartCard title="Top Products" sub="By revenue this month">
                <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                  <table style={{ width: "100%", minWidth: 280, borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                        {["Product", "Revenue", "Orders", "Growth"].map((h) => (
                          <th key={h} style={{
                            textAlign: "left", paddingBottom: "8px", fontSize: "10px", fontWeight: 600,
                            textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMuted,
                            fontFamily: "'DM Sans', sans-serif", paddingRight: "10px", whiteSpace: "nowrap",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TOP_PRODUCTS.map((p, i) => (
                        <tr key={p.name} style={{ borderBottom: i < TOP_PRODUCTS.length - 1 ? `1px solid ${t.borderLight ?? t.border}` : "none" }}>
                          <td style={{ padding: "7px 10px 7px 0", fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>{p.name}</td>
                          <td style={{ padding: "7px 10px 7px 0", fontWeight: 700, color: t.textPrimary, fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap" }}>{p.revenue}</td>
                          <td style={{ padding: "7px 10px 7px 0", fontSize: "11px", color: t.textMuted }}>{p.orders}</td>
                          <td style={{ padding: "7px 0" }}>
                            <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 8px", borderRadius: "99px", color: t.green, background: t.greenBg, whiteSpace: "nowrap" }}>{p.growth}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            </div>

          </div>
 
          <div className="rpt-ai-sticky">
            <AiChat t={t} />
          </div>

        </div>
      </div>
    </>
  );
}