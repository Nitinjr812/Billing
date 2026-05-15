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
      borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "10px",
      background: t.bgCard, border: `1px solid ${t.border}`,
      transition: "background 0.25s ease, border-color 0.25s ease",
    }}>
      <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, fontFamily: "'DM Sans', sans-serif" }}>{label}</p>
      <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "26px", fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</p>
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
      borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column",
      background: t.bgCard, border: `1px solid ${t.border}`,
      transition: "background 0.25s ease, border-color 0.25s ease", ...style,
    }}>
      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "14px", color: t.textPrimary }}>{title}</h3>
        {sub && <p style={{ fontSize: "11px", color: t.textMuted, marginTop: "2px" }}>{sub}</p>}
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
      pointRadius: 5,
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
      x: { grid: { display: false }, ticks: { color: t.textMuted, font: { size: 11 } } },
      y: { grid: { color: t.gridColor }, ticks: { color: t.textMuted, font: { size: 11 }, callback: (v) => "₹" + v / 1000 + "k" } },
    },
  };
  return <div style={{ height: 200 }}><Line data={data} options={options} /></div>;
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
      x: { grid: { display: false }, ticks: { color: t.textMuted, font: { size: 11 } } },
      y: { grid: { color: t.gridColor }, ticks: { color: t.textMuted, font: { size: 11 } } },
    },
  };
  return <div style={{ height: 200 }}><Bar data={data} options={options} /></div>;
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
      legend: { position: "bottom", labels: { color: t.textMuted, font: { size: 12 }, padding: 14, boxWidth: 10 } },
      tooltip: { backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1, titleColor: t.tooltipTitle, bodyColor: t.tooltipBody,
        callbacks: { label: (ctx) => " ₹" + ctx.raw.toLocaleString("en-IN") } },
    },
  };
  return <div style={{ height: 220 }}><Doughnut data={data} options={options} /></div>;
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
      x: { grid: { display: false }, ticks: { color: t.textMuted, font: { size: 11 } } },
      y: { grid: { color: t.gridColor }, ticks: { color: t.textMuted, font: { size: 11 } } },
    },
  };
  return <div style={{ height: 180 }}><Line data={data} options={options} /></div>;
}

// ─── AI CHAT PANEL ────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  "Revenue trend analysis",
  "Which product should I restock?",
  "Top customer insights",
  "This month's summary",
];

function AiChat({ t }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "👋 Hi! I'm your AI Business Analyst. I have full access to your May 2024 dashboard data — revenue, orders, customers, inventory, and more.\n\nHere's what you can ask me:\n\n📈 Performance\n• \"How is revenue trending?\"\n• \"What's our best performing category?\"\n• \"Compare this month vs last month\"\n\n📦 Inventory & Products\n• \"Which products need restocking urgently?\"\n• \"What's our fastest growing product?\"\n• \"Which SKUs are out of stock?\"\n\n👥 Customers\n• \"How many premium customers do we have?\"\n• \"What's our new customer acquisition this month?\"\n\n⚠️ Risks & Opportunities\n• \"What are the biggest risks right now?\"\n• \"Where should I focus to grow revenue?\"\n• \"Which orders are still pending?\"\n\nJust type your question below!" }
  ]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");

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
      const reply = data?.content?.[0]?.text || "Sorry, kuch problem ho gayi. Dobara try karo.";
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
      display: "flex", flexDirection: "column", height: "100%", minHeight: 520,
      transition: "background 0.25s ease, border-color 0.25s ease", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px", borderBottom: `1px solid ${t.border}`,
        display: "flex", alignItems: "center", gap: "10px", flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "10px",
          background: `${t.accent}22`, border: `1px solid ${t.accent}44`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px",
        }}>✦</div>
        <div>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px", color: t.textPrimary, lineHeight: 1.2 }}>AI Analyst</p>
          <p style={{ fontSize: "10px", color: t.green, fontWeight: 600 }}>● Online</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            <div style={{
              maxWidth: "85%",
              padding: "10px 14px",
              borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: msg.role === "user" ? t.accent : `${t.accent}12`,
              color: msg.role === "user" ? "#fff" : t.textPrimary,
              fontSize: "12px",
              lineHeight: 1.6,
              fontFamily: "'DM Sans', sans-serif",
              border: msg.role === "assistant" ? `1px solid ${t.border}` : "none",
              whiteSpace: "pre-wrap",
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
      <div style={{ padding: "0 12px 8px", display: "flex", gap: "6px", flexWrap: "wrap", flexShrink: 0 }}>
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
              transition: "all 0.15s",
            }}
          >{q}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: "12px", borderTop: `1px solid ${t.border}`,
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
        .rpt-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap: 12px; }
        .rpt-main-layout { display: grid; grid-template-columns: 1fr 320px; gap: 16px; align-items: start; }
        .rpt-charts-col { display: flex; flex-direction: column; gap: 16px; }
        .rpt-row-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px,1fr)); gap: 16px; }
        @media (max-width: 900px) {
          .rpt-main-layout { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .rpt-stat-grid { grid-template-columns: repeat(2,1fr); }
          .rpt-row-2 { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Header */}
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "28px", fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em", transition: "color 0.25s ease" }}>Reports</h1>
          <p style={{ fontSize: "13px", color: t.textMuted, marginTop: "4px" }}>Business performance overview — ask the AI analyst for deeper insights</p>
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

              {/* Top Products Table */}
              <ChartCard title="Top Products" sub="By revenue this month">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                      {["Product", "Revenue", "Orders", "Growth"].map((h) => (
                        <th key={h} style={{
                          textAlign: "left", paddingBottom: "8px", fontSize: "10px", fontWeight: 600,
                          textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMuted,
                          fontFamily: "'DM Sans', sans-serif", paddingRight: "12px",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TOP_PRODUCTS.map((p, i) => (
                      <tr key={p.name} style={{ borderBottom: i < TOP_PRODUCTS.length - 1 ? `1px solid ${t.borderLight ?? t.border}` : "none" }}>
                        <td style={{ padding: "8px 12px 8px 0", fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>{p.name}</td>
                        <td style={{ padding: "8px 12px 8px 0", fontWeight: 700, color: t.textPrimary, fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap" }}>{p.revenue}</td>
                        <td style={{ padding: "8px 12px 8px 0", fontSize: "11px", color: t.textMuted }}>{p.orders}</td>
                        <td style={{ padding: "8px 0" }}>
                          <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 8px", borderRadius: "99px", color: t.green, background: t.greenBg }}>{p.growth}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ChartCard>
            </div>

          </div>

          {/* AI Chat Sidebar */}
          <div style={{ position: "sticky", top: "88px" }}>
            <AiChat t={t} />
          </div>

        </div>
      </div>
    </>
  );
}