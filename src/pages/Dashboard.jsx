import { useState, useRef, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { useTheme } from "../components/ThemeContext";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler
);
const QUICK_PROMPTS = [
  { label: "📦 Restock kya karein?", text: "Kaun se products urgently restock karne chahiye aur kyun?" },
  { label: "💸 Slow products?", text: "Kaun se products slow chal rahe hain? Kya offer dena chahiye?" },
  { label: "🚨 Cancellations?", text: "Cancellation rate kaisi hai? Kya fix karna chahiye?" },
  { label: "🎯 Best offer idea?", text: "Abhi ke data ke hisaab se konsa offer/flash sale best rahega?" },
];

const BACKEND = "https://billing-backend-tawny.vercel.app";

async function fetchLiveDashboardContext() {
  try {
    const [statsRes, productsRes, alertsRes, ordersRes] = await Promise.all([
      fetch(`${BACKEND}/api/orders/stats`),
      fetch(`${BACKEND}/api/products`),
      fetch(`${BACKEND}/api/products/alerts`),
      fetch(`${BACKEND}/api/orders`),
    ]);

    const stats = await statsRes.json();
    const products = await productsRes.json();
    const alerts = await alertsRes.json();
    const orders = await ordersRes.json();

    // Top 5 orders by amount
    const topOrders = [...orders]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Category revenue breakdown
    const categoryRevenue = orders.reduce((acc, o) => {
      if (o.status !== "Cancelled") {
        acc[o.product] = (acc[o.product] || 0) + o.amount;
      }
      return acc;
    }, {});

    return `
You are an expert business analyst AI assistant embedded in a live business analytics dashboard.
Always respond in clear, professional English. Be concise, insightful, and actionable (2-4 sentences max unless asked for detail).
Always use ₹ for currency. Be direct and data-driven.

=== LIVE BUSINESS SNAPSHOT ===
- Total Orders: ${stats.total}
- Total Revenue: ₹${stats.totalRevenue?.toLocaleString("en-IN")}
- Delivered: ${stats.delivered} | Pending: ${stats.pending} | Processing: ${stats.processing} | Cancelled: ${stats.cancelled}
- Cancellation Rate: ${stats.total ? ((stats.cancelled / stats.total) * 100).toFixed(1) : 0}%

=== PRODUCTS IN STOCK ===
${products.map((p) => `- ${p.name} (${p.category}): ${p.stock} units @ ₹${p.price?.toLocaleString("en-IN")} | Growth: +${p.growthPercent}%`).join("\n")}

=== STOCK ALERTS ===
Low Stock: ${alerts.lowStock?.map((p) => `${p.name} (${p.stock} units)`).join(", ") || "None"}
Out of Stock: ${alerts.outOfStock?.map((p) => p.name).join(", ") || "None"}

=== TOP 5 ORDERS ===
${topOrders.map((o) => `- ${o.orderId} | ${o.customer} | ₹${o.amount?.toLocaleString("en-IN")} | ${o.status}`).join("\n")}

=== REVENUE BY PRODUCT ===
${Object.entries(categoryRevenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, rev]) => `- ${name}: ₹${rev.toLocaleString("en-IN")}`)
        .join("\n")}
    `.trim();
  } catch (err) {
    // Fallback to static context if backend is down
    return `
You are a business analyst AI. The live backend is currently unavailable.
Let the user know data may not be real-time, but assist with general business queries.
    `.trim();
  }
}

function AiChatWidget({ t }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "👋 Hi! I'm your AI Analyst — connected to live data. Ask me about orders, stock, revenue, or alerts!",
    },
  ]);
  const [input, setInput] = useState("");
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
      const res = await fetch("https://billing-backend-tawny.vercel.app/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }), // sirf latest message
      });

      const data = await res.json();
      const reply = data?.reply || "Kuch gadbad hui, dobara try karo.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }

  };
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  return (
    <div
      style={{
        borderRadius: "16px",
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "background 0.25s ease, border-color 0.25s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 14px",
          borderBottom: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "9px",
            background: `${t.accent}22`,
            border: `1px solid ${t.accent}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            flexShrink: 0,
          }}
        >
          ✦
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "13px",
              color: t.textPrimary,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            AI Analyst
          </p>
          <p style={{ fontSize: "10px", color: t.green, fontWeight: 600, margin: 0 }}>
            ● Online
          </p>
        </div>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: "99px",
            color: t.accent,
            background: `${t.accent}15`,
            border: `1px solid ${t.accent}25`,
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          May 2024
        </span>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          maxHeight: 200,
          minHeight: 160,
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "90%",
                padding: "7px 11px",
                borderRadius:
                  msg.role === "user"
                    ? "12px 12px 3px 12px"
                    : "12px 12px 12px 3px",
                background:
                  msg.role === "user" ? t.accent : `${t.accent}12`,
                color: msg.role === "user" ? "#fff" : t.textPrimary,
                fontSize: "12px",
                lineHeight: 1.6,
                fontFamily: "'DM Sans', sans-serif",
                border:
                  msg.role === "assistant" ? `1px solid ${t.border}` : "none",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                padding: "9px 13px",
                borderRadius: "12px 12px 12px 3px",
                background: `${t.accent}12`,
                border: `1px solid ${t.border}`,
                display: "flex",
                gap: "4px",
                alignItems: "center",
              }}
            >
              {[0, 1, 2].map((d) => (
                <div
                  key={d}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: t.accent,
                    animation: "dashBounce 1.2s infinite",
                    animationDelay: `${d * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div
        style={{
          padding: "6px 10px 4px",
          display: "flex",
          gap: "5px",
          flexWrap: "wrap",
          flexShrink: 0,
          borderTop: `1px solid ${t.border}`,
        }}
      >
        <p
          style={{
            width: "100%",
            fontSize: "9px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: t.textMuted,
            margin: "2px 0 3px",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Quick Ask
        </p>
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q.label}
            onClick={() => sendMessage(q.text)}
            disabled={loading}
            style={{
              fontSize: "10px",
              fontWeight: 600,
              padding: "3px 9px",
              borderRadius: "99px",
              background: `${t.accent}12`,
              border: `1px solid ${t.accent}28`,
              color: t.accent,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              opacity: loading ? 0.5 : 1,
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          padding: "8px 10px",
          borderTop: `1px solid ${t.border}`,
          display: "flex",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about your business…"
          rows={1}
          disabled={loading}
          style={{
            flex: 1,
            resize: "none",
            background: `${t.accent}08`,
            border: `1px solid ${t.border}`,
            borderRadius: "10px",
            padding: "7px 10px",
            fontSize: "12px",
            color: t.textPrimary,
            fontFamily: "'DM Sans', sans-serif",
            outline: "none",
            lineHeight: 1.5,
            minWidth: 0,
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{
            width: 32,
            height: 32,
            borderRadius: "9px",
            flexShrink: 0,
            background:
              loading || !input.trim() ? `${t.accent}30` : t.accent,
            border: "none",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            color: "#fff",
            transition: "background 0.2s",
          }}
        >
          ↑
        </button>
      </div>

      <style>{`
        @keyframes dashBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, trend, trendDir, sub }) {
  const { t } = useTheme();
  const colors = { up: t.green, down: t.red, neu: t.orange };
  const bgs = { up: t.greenBg, down: t.redBg, neu: t.orangeBg };

  return (
    <div
      style={{
        borderRadius: "14px",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        transition: "background 0.25s ease, border-color 0.25s ease",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <p
        style={{
          fontSize: "9px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: t.textMuted,
          fontFamily: "'DM Sans', sans-serif",
          margin: 0,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "clamp(16px, 4vw, 24px)",
          fontWeight: 900,
          color: t.textPrimary,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          margin: 0,
          wordBreak: "break-all",
        }}
      >
        {value}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "99px",
            color: colors[trendDir],
            background: bgs[trendDir],
            whiteSpace: "nowrap",
          }}
        >
          {trend}
        </span>
        {sub && (
          <span style={{ fontSize: "10px", color: t.textMuted, whiteSpace: "nowrap" }}>{sub}</span>
        )}
      </div>
    </div>
  );
}

// ─── CHART CARD WRAPPER ───────────────────────────────────────────────────────
function ChartCard({ title, sub, children, style = {} }) {
  const { t } = useTheme();
  return (
    <div
      style={{
        borderRadius: "14px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        transition: "background 0.25s ease, border-color 0.25s ease",
        minWidth: 0,
        overflow: "hidden",
        ...style,
      }}
    >
      <div style={{ marginBottom: "14px" }}>
        <h3
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "14px",
            color: t.textPrimary,
            margin: 0,
          }}
        >
          {title}
        </h3>
        {sub && (
          <p style={{ fontSize: "11px", color: t.textMuted, marginTop: "2px", marginBottom: 0 }}>
            {sub}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── REVENUE CHART ────────────────────────────────────────────────────────────
function RevenueChart() {
  const { t } = useTheme();
  const labels = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
  const values = [320000, 285000, 410000, 370000, 445000, 482310];
  const tooltipDefaults = {
    backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1,
    titleColor: t.tooltipTitle, bodyColor: t.tooltipBody,
  };
  const data = {
    labels,
    datasets: [
      {
        type: "bar", label: "Revenue", data: values,
        backgroundColor: `${t.accent}18`, borderColor: `${t.accent}90`,
        borderWidth: 1.5, borderRadius: 6, borderSkipped: false, yAxisID: "y",
      },
      {
        type: "line", label: "Trend", data: values,
        borderColor: t.accent, borderWidth: 2.5,
        pointRadius: 4, pointBackgroundColor: t.accent,
        pointBorderColor: t.bgCard, pointBorderWidth: 2,
        tension: 0.45, fill: false, yAxisID: "y",
      },
    ],
  };
  const options = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { ...tooltipDefaults, callbacks: { label: (ctx) => " ₹" + ctx.raw.toLocaleString("en-IN") } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: t.textMuted, font: { size: 11 } } },
      y: { grid: { color: t.gridColor }, ticks: { color: t.textMuted, font: { size: 10 }, callback: (v) => "₹" + v / 1000 + "k" } },
    },
  };
  return <div style={{ height: 220 }}><Bar data={data} options={options} /></div>;
}

// ─── ORDER DONUT ──────────────────────────────────────────────────────────────
function OrderDonut() {
  const { t } = useTheme();
  const tooltipDefaults = {
    backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1,
    titleColor: t.tooltipTitle, bodyColor: t.tooltipBody,
  };
  const data = {
    labels: ["Delivered", "Pending", "Processing", "Cancelled"],
    datasets: [{
      data: [580, 312, 268, 88],
      backgroundColor: [t.green, t.orange, t.blue, t.red],
      borderColor: t.bgCard, borderWidth: 3, hoverOffset: 8,
    }],
  };
  const options = {
    responsive: true, maintainAspectRatio: false, cutout: "70%",
    plugins: {
      legend: { position: "bottom", labels: { color: t.textMuted, font: { size: 11 }, padding: 12, boxWidth: 10 } },
      tooltip: tooltipDefaults,
    },
  };
  return <div style={{ height: 220 }}><Doughnut data={data} options={options} /></div>;
}

// ─── STOCK BAR ────────────────────────────────────────────────────────────────
function StockBar() {
  const { t } = useTheme();
  const tooltipDefaults = {
    backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1,
    titleColor: t.tooltipTitle, bodyColor: t.tooltipBody,
  };
  const data = {
    labels: ["Prod-Alpha", "Prod-Beta", "Prod-Gamma", "Prod-Delta", "Prod-Sigma"],
    datasets: [{
      label: "In Stock",
      data: [420, 280, 610, 190, 380],
      backgroundColor: [`${t.orange}20`, `${t.green}20`, `${t.blue}20`, `${t.orange}20`, "#a855f720"],
      borderColor: [t.orange, t.green, t.blue, t.accentLight, "#a855f7"],
      borderWidth: 1.5, borderRadius: 5,
    }],
  };
  const options = {
    indexAxis: "y", responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: tooltipDefaults },
    scales: {
      x: { grid: { color: t.gridColor }, ticks: { color: t.textMuted, font: { size: 10 } } },
      y: { grid: { display: false }, ticks: { color: t.textMuted, font: { size: 11 } } },
    },
  };
  return <div style={{ height: 210 }}><Bar data={data} options={options} /></div>;
}

// ─── CUSTOMER GROWTH AREA ─────────────────────────────────────────────────────
function CustomerArea() {
  const { t } = useTheme();
  const tooltipDefaults = {
    backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1,
    titleColor: t.tooltipTitle, bodyColor: t.tooltipBody,
  };
  const data = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
    datasets: [{
      label: "Customers", data: [210, 245, 280, 305, 326],
      borderColor: t.blue, borderWidth: 2.5,
      backgroundColor: `${t.blue}18`,
      pointRadius: 4, pointBackgroundColor: t.blue,
      pointBorderColor: t.bgCard, pointBorderWidth: 2,
      tension: 0.4, fill: true,
    }],
  };
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: tooltipDefaults },
    scales: {
      x: { grid: { display: false }, ticks: { color: t.textMuted, font: { size: 11 } } },
      y: { grid: { color: t.gridColor }, ticks: { color: t.textMuted, font: { size: 10 } } },
    },
  };
  return <div style={{ height: 150 }}><Line data={data} options={options} /></div>;
}

// ─── INVOICES TABLE ───────────────────────────────────────────────────────────
const INVOICES = [
  { id: "#INV-0091", customer: "Arjun Sharma", amount: "₹12,400", status: "Paid", date: "07 May" },
  { id: "#INV-0090", customer: "Priya Verma", amount: "₹8,750", status: "Pending", date: "06 May" },
  { id: "#INV-0089", customer: "Ravi Patel", amount: "₹21,000", status: "Paid", date: "05 May" },
  { id: "#INV-0088", customer: "Sneha Mehta", amount: "₹5,300", status: "Overdue", date: "02 May" },
  { id: "#INV-0087", customer: "Vikram Das", amount: "₹9,800", status: "Paid", date: "01 May" },
];

function InvoicesTable() {
  const { t } = useTheme();
  const statusStyle = {
    Paid: { color: t.green, bg: t.greenBg },
    Pending: { color: t.orange, bg: t.orangeBg },
    Overdue: { color: t.red, bg: t.redBg },
  };
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: "280px" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${t.border}` }}>
            {["Invoice", "Customer", "Amount", "Status"].map((h) => (
              <th key={h} style={{
                textAlign: "left", paddingBottom: "10px", fontSize: "9px", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMuted,
                fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {INVOICES.map((inv, i) => (
            <tr key={inv.id} style={{ borderBottom: i < INVOICES.length - 1 ? `1px solid ${t.borderLight}` : "none" }}>
              <td style={{ padding: "9px 0", fontFamily: "monospace", fontSize: "10px", color: t.textMuted, whiteSpace: "nowrap" }}>{inv.id}</td>
              <td style={{ padding: "9px 8px 9px 0", fontWeight: 500, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", maxWidth: "90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.customer}</td>
              <td style={{ padding: "9px 8px 9px 0", fontWeight: 700, color: t.textPrimary, fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap" }}>{inv.amount}</td>
              <td style={{ padding: "9px 0" }}>
                <span style={{
                  fontSize: "9px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px",
                  color: statusStyle[inv.status].color, background: statusStyle[inv.status].bg,
                  whiteSpace: "nowrap",
                }}>{inv.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── RESPONSIVE STYLES ────────────────────────────────────────────────────────
const styles = `
  /* ── Mobile-first base (320px+) ── */
  .dash-kpi-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .dash-main-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
    align-items: start;
  }
  .dash-charts-col {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .dash-charts-row-1 {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
  .dash-charts-row-2 {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
  .dash-ai-sticky {
    position: static;
  }

  /* ── Tablet (700px+) ── */
  @media (min-width: 700px) {
    .dash-kpi-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }
    .dash-charts-row-1 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .dash-charts-row-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
  }

  /* ── Desktop (1024px+) ── */
  @media (min-width: 1024px) {
    .dash-main-layout {
      grid-template-columns: 1fr 300px;
      gap: 16px;
    }
    .dash-charts-row-2 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .dash-ai-sticky {
      position: sticky;
      top: 88px;
    }
  }

  /* ── Tiny screens (below 360px) ── */
  @media (max-width: 359px) {
    .dash-kpi-grid { gap: 6px; }
    .dash-charts-row-1,
    .dash-charts-row-2 { gap: 8px; }
  }
`;

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t } = useTheme();

  return (
    <>
      <style>{styles}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: 0, overflow: "hidden" }}>

        {/* Page Header */}
        <div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(20px, 6vw, 28px)",
            fontWeight: 900,
            color: t.textPrimary,
            letterSpacing: "-0.03em",
            transition: "color 0.25s ease",
            margin: 0,
          }}>Dashboard</h1>
          <p style={{ fontSize: "12px", color: t.textMuted, marginTop: "4px", marginBottom: 0 }}>
            Welcome back — here's your business at a glance
          </p>
        </div>

        {/* KPI Row */}
        <div className="dash-kpi-grid">
          <KpiCard label="Total Revenue" value="₹4,82,310" trend="↑ 12.4%" trendDir="up" sub="vs last month" />
          <KpiCard label="Total Orders" value="1,248" trend="↑ 8.1%" trendDir="up" sub="this month" />
          <KpiCard label="Customers" value="326" trend="+14 new" trendDir="neu" sub="this month" />
          <KpiCard label="Pending Invoices" value="₹38,500" trend="3 overdue" trendDir="down" sub="needs attention" />
        </div>

        {/* Main layout: Charts + AI Chat */}
        <div className="dash-main-layout">

          {/* Left: Charts Column */}
          <div className="dash-charts-col">

            {/* Revenue + Donut */}
            <div className="dash-charts-row-1">
              <ChartCard title="Revenue Overview" sub="Monthly — last 6 months">
                <RevenueChart />
              </ChartCard>
              <ChartCard title="Order Status" sub="This month breakdown">
                <OrderDonut />
              </ChartCard>
            </div>

            {/* Stock, Customers, Invoices */}
            <div className="dash-charts-row-2">
              <ChartCard title="Stock Levels" sub="Top 5 products">
                <StockBar />
              </ChartCard>

              <ChartCard title="Customer Growth" sub="Last 5 months">
                <CustomerArea />
                <div style={{ marginTop: "12px", display: "flex", gap: "20px", flexWrap: "wrap" }}>
                  {[["Total", "326"], ["Active", "291"], ["New", "+14"]].map(([l, v]) => (
                    <div key={l}>
                      <p style={{ fontSize: "11px", color: t.textMuted, margin: 0 }}>{l}</p>
                      <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "18px", color: t.textPrimary, margin: 0 }}>{v}</p>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Recent Invoices" sub="Latest 5 transactions">
                <InvoicesTable />
              </ChartCard>
            </div>

          </div>

          {/* Right: AI Chat */}
          <div className="dash-ai-sticky">
            <AiChatWidget t={t} />
          </div>

        </div>
      </div>
    </>
  );
}