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
  { label: "📦 Restock alerts", text: "Which products need urgent restocking and why?" },
  { label: "💸 Slow products?", text: "Which products are slow moving? Should we run any offers?" },
  { label: "🚨 Cancellations?", text: "How is the cancellation rate? What should we fix?" },
  { label: "🎯 Best offer idea?", text: "Based on current data, what offer or flash sale would work best?" },
];

const BACKEND = "https://billing-backend-tawny.vercel.app";

// ─── helpers ──────────────────────────────────────────────────────────────
function getOrderDate(o) {
  const raw = o.date || o.createdAt || o.orderDate || o.updatedAt;
  const d = raw ? new Date(raw) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}

function getCustomerKey(o) {
  return o.customerId || o.customer || o.customerEmail || "unknown";
}

function monthLabel(d) {
  return d.toLocaleString("en-US", { month: "short" });
}

function inr(n) {
  return "₹" + (Number(n) || 0).toLocaleString("en-IN");
}

// last `count` calendar months (oldest → newest), each keyed by "YYYY-M"
function lastMonths(count) {
  const now = new Date();
  const months = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthLabel(d), y: d.getFullYear(), m: d.getMonth() });
  }
  return months;
}

function buildMonthlyRevenue(orders) {
  const months = lastMonths(6);
  orders.forEach((o) => {
    if (o.status === "Cancelled") return;
    const d = getOrderDate(o);
    if (!d) return;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = months.find((m) => m.key === key);
    if (bucket) bucket.total = (bucket.total || 0) + (Number(o.amount) || 0);
  });
  return months.map((m) => ({ label: m.label, total: m.total || 0 }));
}

// cumulative unique-customer count, month by month (last 5 months)
function buildCustomerGrowth(orders) {
  const months = lastMonths(5);
  const firstSeen = new Map();
  const sorted = [...orders].sort(
    (a, b) => (getOrderDate(a)?.getTime() || 0) - (getOrderDate(b)?.getTime() || 0)
  );
  sorted.forEach((o) => {
    const cust = getCustomerKey(o);
    const d = getOrderDate(o);
    if (!d || firstSeen.has(cust)) return;
    firstSeen.set(cust, d.getFullYear() * 12 + d.getMonth());
  });
  return months.map((m) => {
    const cutoff = m.y * 12 + m.m;
    const total = [...firstSeen.values()].filter((v) => v <= cutoff).length;
    return { label: m.label, total };
  });
}

function computeKpis(stats, orders) {
  const monthlyRevenue = buildMonthlyRevenue(orders);
  const thisMonth = monthlyRevenue[monthlyRevenue.length - 1]?.total || 0;
  const lastMonth = monthlyRevenue[monthlyRevenue.length - 2]?.total || 0;
  const revenueTrendPct = lastMonth ? (((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1) : "0.0";

  const now = new Date();
  const uniqueCustomers = new Set(orders.map(getCustomerKey)).size;

  const firstSeen = new Map();
  const sorted = [...orders].sort(
    (a, b) => (getOrderDate(a)?.getTime() || 0) - (getOrderDate(b)?.getTime() || 0)
  );
  sorted.forEach((o) => {
    const cust = getCustomerKey(o);
    const d = getOrderDate(o);
    if (!d || firstSeen.has(cust)) return;
    firstSeen.set(cust, d);
  });
  let newCustomersThisMonth = 0;
  firstSeen.forEach((d) => {
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) newCustomersThisMonth++;
  });

  const pendingOrders = orders.filter((o) => o.status === "Pending");
  const pendingAmount = pendingOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const overdueCount = pendingOrders.filter((o) => {
    const d = getOrderDate(o);
    if (!d) return false;
    return (now - d) / (1000 * 60 * 60 * 24) > 7;
  }).length;

  const totalOrdersThisMonth = orders.filter((o) => {
    const d = getOrderDate(o);
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const totalOrdersLastMonth = orders.filter((o) => {
    const d = getOrderDate(o);
    if (!d) return false;
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  }).length;
  const ordersTrendPct = totalOrdersLastMonth
    ? (((totalOrdersThisMonth - totalOrdersLastMonth) / totalOrdersLastMonth) * 100).toFixed(1)
    : "0.0";

  return {
    totalRevenue: stats?.totalRevenue ?? orders.reduce((s, o) => (o.status !== "Cancelled" ? s + (Number(o.amount) || 0) : s), 0),
    revenueTrendPct,
    totalOrders: stats?.total ?? orders.length,
    ordersTrendPct,
    uniqueCustomers,
    newCustomersThisMonth,
    pendingAmount,
    overdueCount,
  };
}

// ─── live data hook (single source of truth for the whole dashboard) ──────
// Pulls straight from the real MongoDB-backed legacy routes — no shop
// selection, no seed data. One shop, real orders/products/stats.
function useDashboardData(pollMs = 60000) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    stats: null,
    products: [],
    orders: [],
    alerts: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [ordersRes, statsRes, productsRes, alertsRes] = await Promise.all([
          fetch(`${BACKEND}/api/orders`),
          fetch(`${BACKEND}/api/orders/stats`),
          fetch(`${BACKEND}/api/products`),
          fetch(`${BACKEND}/api/products/alerts`),
        ]);

        if (!ordersRes.ok || !statsRes.ok || !productsRes.ok || !alertsRes.ok) {
          throw new Error("One or more dashboard requests failed");
        }

        const [orders, stats, products, alerts] = await Promise.all([
          ordersRes.json(),
          statsRes.json(),
          productsRes.json(),
          alertsRes.json(),
        ]);

        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            stats,
            products: Array.isArray(products) ? products : [],
            orders: Array.isArray(orders) ? orders : [],
            alerts,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: "Live data unavailable. Showing last known / empty state.",
          }));
        }
      }
    }

    load();
    const interval = setInterval(load, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMs]);

  return state;
}

// ─── AI CHAT WIDGET (unchanged) ────────────────────────────────────────────
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

    const topOrders = [...orders].sort((a, b) => b.amount - a.amount).slice(0, 5);

    const categoryRevenue = orders.reduce((acc, o) => {
      if (o.status !== "Cancelled") {
        acc[o.product] = (acc[o.product] || 0) + o.amount;
      }
      return acc;
    }, {});

    // Compute status breakdown directly from orders so it stays correct
    // regardless of what the /stats endpoint returns.
    const completedCount = orders.filter((o) => o.status === "Completed").length;
    const pendingCount = orders.filter((o) => o.status === "Pending").length;
    const cancelledCount = orders.filter((o) => o.status === "Cancelled").length;

    return `
You are an expert business analyst AI assistant embedded in a live business analytics dashboard.
Always respond in clear, professional English. Be concise, insightful, and actionable (2-4 sentences max unless asked for detail).
Always use ₹ for currency. Be direct and data-driven.

=== LIVE BUSINESS SNAPSHOT ===
- Total Orders: ${stats.total ?? orders.length}
- Total Revenue: ₹${(stats.totalRevenue ?? 0).toLocaleString("en-IN")}
- Completed: ${completedCount} | Pending: ${pendingCount} | Cancelled: ${cancelledCount}
- Cancellation Rate: ${orders.length ? ((cancelledCount / orders.length) * 100).toFixed(1) : 0}%

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
      const res = await fetch(`${BACKEND}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      const data = await res.json();
      const reply = data?.reply || "Something went wrong. Please try again.";
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
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px", color: t.textPrimary, margin: 0, lineHeight: 1.2 }}>
            AI Analyst
          </p>
          <p style={{ fontSize: "10px", color: t.green, fontWeight: 600, margin: 0 }}>● Online</p>
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
          Live
        </span>
      </div>

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
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div
              style={{
                maxWidth: "90%",
                padding: "7px 11px",
                borderRadius: msg.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                background: msg.role === "user" ? t.accent : `${t.accent}12`,
                color: msg.role === "user" ? "#fff" : t.textPrimary,
                fontSize: "12px",
                lineHeight: 1.6,
                fontFamily: "'DM Sans', sans-serif",
                border: msg.role === "assistant" ? `1px solid ${t.border}` : "none",
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
            <div style={{ padding: "9px 13px", borderRadius: "12px 12px 12px 3px", background: `${t.accent}12`, border: `1px solid ${t.border}`, display: "flex", gap: "4px", alignItems: "center" }}>
              {[0, 1, 2].map((d) => (
                <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: t.accent, animation: "dashBounce 1.2s infinite", animationDelay: `${d * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "6px 10px 4px", display: "flex", gap: "5px", flexWrap: "wrap", flexShrink: 0, borderTop: `1px solid ${t.border}` }}>
        <p style={{ width: "100%", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, margin: "2px 0 3px", fontFamily: "'DM Sans', sans-serif" }}>
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

      <div style={{ padding: "8px 10px", borderTop: `1px solid ${t.border}`, display: "flex", gap: "8px", flexShrink: 0 }}>
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
            background: loading || !input.trim() ? `${t.accent}30` : t.accent,
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

// ─── KPI CARD ─────────────────────────────────────────────────────────────
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
      <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
        {label}
      </p>
      <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(16px, 4vw, 24px)", fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em", lineHeight: 1, margin: 0, wordBreak: "break-all" }}>
        {value}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", color: colors[trendDir], background: bgs[trendDir], whiteSpace: "nowrap" }}>
          {trend}
        </span>
        {sub && <span style={{ fontSize: "10px", color: t.textMuted, whiteSpace: "nowrap" }}>{sub}</span>}
      </div>
    </div>
  );
}

// ─── CHART CARD WRAPPER ───────────────────────────────────────────────────
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
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "14px", color: t.textPrimary, margin: 0 }}>
          {title}
        </h3>
        {sub && <p style={{ fontSize: "11px", color: t.textMuted, marginTop: "2px", marginBottom: 0 }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── REVENUE CHART (dynamic — last 6 months from real orders) ─────────────
function RevenueChart({ monthly, loading }) {
  const { t } = useTheme();
  const tooltipDefaults = { backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1, titleColor: t.tooltipTitle, bodyColor: t.tooltipBody };

  if (loading) return <p style={{ color: t.textMuted, fontSize: 12 }}>Loading revenue…</p>;

  const labels = monthly.map((m) => m.label);
  const values = monthly.map((m) => m.total);

  const data = {
    labels,
    datasets: [
      { type: "bar", label: "Revenue", data: values, backgroundColor: `${t.accent}18`, borderColor: `${t.accent}90`, borderWidth: 1.5, borderRadius: 6, borderSkipped: false, yAxisID: "y" },
      { type: "line", label: "Trend", data: values, borderColor: t.accent, borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: t.accent, pointBorderColor: t.bgCard, pointBorderWidth: 2, tension: 0.45, fill: false, yAxisID: "y" },
    ],
  };
  const options = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { display: false }, tooltip: { ...tooltipDefaults, callbacks: { label: (ctx) => " " + inr(ctx.raw) } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: t.textMuted, font: { size: 11 } } },
      y: { grid: { color: t.gridColor }, ticks: { color: t.textMuted, font: { size: 10 }, callback: (v) => "₹" + v / 1000 + "k" } },
    },
  };
  return <div style={{ height: 220 }}><Bar data={data} options={options} /></div>;
}

// ─── ORDER DONUT (dynamic — computed directly from live orders array) ─────
// Simplified to 3 real-world states for an offline/in-person business:
// Completed (sale finalized), Pending (payment/order not finalized yet),
// Cancelled. "Processing"/"Delivered" are shipping-era concepts we don't need.
function OrderDonut({ orders, loading }) {
  const { t } = useTheme();
  const tooltipDefaults = { backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1, titleColor: t.tooltipTitle, bodyColor: t.tooltipBody };

  if (loading) return <p style={{ color: t.textMuted, fontSize: 12 }}>Loading order status…</p>;

  const completed = orders.filter((o) => o.status === "Completed").length;
  const pending = orders.filter((o) => o.status === "Pending").length;
  const cancelled = orders.filter((o) => o.status === "Cancelled").length;

  const data = {
    labels: ["Completed", "Pending", "Cancelled"],
    datasets: [{
      data: [completed, pending, cancelled],
      backgroundColor: [t.green, t.orange, t.red],
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

// ─── STOCK BAR (dynamic — shared products, no own fetch) ──────────────────
function StockBar({ products, loading }) {
  const { t } = useTheme();
  const tooltipDefaults = { backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1, titleColor: t.tooltipTitle, bodyColor: t.tooltipBody };
  const palette = [t.orange, t.green, t.blue, t.accentLight, "#a855f7"];
  const top5 = (products || []).slice(0, 5);

  const data = {
    labels: top5.map((p) => p.name),
    datasets: [{
      label: "In Stock",
      data: top5.map((p) => p.stock),
      backgroundColor: top5.map((_, i) => `${palette[i % palette.length]}20`),
      borderColor: top5.map((_, i) => palette[i % palette.length]),
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
  if (loading) return <p style={{ color: t.textMuted, fontSize: 12 }}>Loading stock data...</p>;
  if (!top5.length) return <p style={{ color: t.textMuted, fontSize: 12 }}>No products found.</p>;
  return <div style={{ height: 210 }}><Bar data={data} options={options} /></div>;
}

// ─── CUSTOMER GROWTH AREA (dynamic — unique customers from real orders) ───
function CustomerArea({ growth, loading }) {
  const { t } = useTheme();
  const tooltipDefaults = { backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1, titleColor: t.tooltipTitle, bodyColor: t.tooltipBody };

  if (loading) return <p style={{ color: t.textMuted, fontSize: 12 }}>Loading customer growth…</p>;

  const data = {
    labels: growth.map((g) => g.label),
    datasets: [{
      label: "Customers", data: growth.map((g) => g.total),
      borderColor: t.blue, borderWidth: 2.5, backgroundColor: `${t.blue}18`,
      pointRadius: 4, pointBackgroundColor: t.blue, pointBorderColor: t.bgCard, pointBorderWidth: 2,
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

// ─── ORDERS / INVOICES TABLE (dynamic — real orders, latest 5) ────────────
function InvoicesTable({ orders, loading }) {
  const { t } = useTheme();
  const statusStyle = {
    Completed: { color: t.green, bg: t.greenBg },
    Pending: { color: t.orange, bg: t.orangeBg },
    Cancelled: { color: t.red, bg: t.redBg },
  };

  if (loading) return <p style={{ color: t.textMuted, fontSize: 12 }}>Loading recent orders…</p>;

  const latest = [...orders]
    .sort((a, b) => (getOrderDate(b)?.getTime() || 0) - (getOrderDate(a)?.getTime() || 0))
    .slice(0, 5);

  if (!latest.length) return <p style={{ color: t.textMuted, fontSize: 12 }}>No orders yet.</p>;

  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: "280px" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${t.border}` }}>
            {["Order", "Customer", "Amount"].map((h) => (
              <th key={h} style={{ textAlign: "left", paddingBottom: "10px", fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMuted, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {latest.map((o, i) => {
            const style = statusStyle[o.status] || { color: t.textMuted, bg: `${t.textMuted}18` };
            return (
              <tr key={o.orderId || o._id || i} style={{ borderBottom: i < latest.length - 1 ? `1px solid ${t.borderLight}` : "none" }}>
                <td style={{ padding: "9px 0", fontFamily: "monospace", fontSize: "10px", color: t.textMuted, whiteSpace: "nowrap" }}>{o.orderId || o._id || "—"}</td>
                <td style={{ padding: "9px 8px 9px 0", fontWeight: 500, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", maxWidth: "90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.customer || "—"}</td>
                <td style={{ padding: "9px 8px 9px 0", fontWeight: 700, color: t.textPrimary, fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap" }}>{inr(o.amount)}</td>
                
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── RESPONSIVE STYLES ─────────────────────────────────────────────────────
const styles = `
  .dash-kpi-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .dash-main-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; align-items: start; }
  .dash-charts-col { display: flex; flex-direction: column; gap: 12px; }
  .dash-charts-row-1 { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .dash-charts-row-2 { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .dash-ai-sticky { position: static; }

  @media (min-width: 700px) {
    .dash-kpi-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .dash-charts-row-1 { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .dash-charts-row-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  }

  @media (min-width: 1024px) {
    .dash-main-layout { grid-template-columns: 1fr 300px; gap: 16px; }
    .dash-charts-row-2 { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .dash-ai-sticky { position: sticky; top: 88px; }
  }

  @media (max-width: 359px) {
    .dash-kpi-grid { gap: 6px; }
    .dash-charts-row-1, .dash-charts-row-2 { gap: 8px; }
  }
`;

// ─── DASHBOARD PAGE ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t } = useTheme();
  const { loading, error, stats, products, orders } = useDashboardData();

  const monthlyRevenue = buildMonthlyRevenue(orders);
  const customerGrowth = buildCustomerGrowth(orders);
  const kpis = computeKpis(stats, orders);

  return (
    <>
      <style>{styles}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: 0, overflow: "hidden" }}>

        {/* Page Header */}
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(20px, 6vw, 28px)", fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em", transition: "color 0.25s ease", margin: 0 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: "12px", color: t.textMuted, marginTop: "4px", marginBottom: 0 }}>
            {error ? error : "Welcome back — here's your business at a glance"}
          </p>
        </div>

        {/* KPI Row */}
        <div className="dash-kpi-grid">
          <KpiCard
            label="Total Revenue"
            value={loading ? "…" : inr(kpis.totalRevenue)}
            trend={loading ? "…" : `${kpis.revenueTrendPct >= 0 ? "↑" : "↓"} ${Math.abs(kpis.revenueTrendPct)}%`}
            trendDir={kpis.revenueTrendPct >= 0 ? "up" : "down"}
            sub="vs last month"
          />
          <KpiCard
            label="Total Orders"
            value={loading ? "…" : kpis.totalOrders.toLocaleString("en-IN")}
            trend={loading ? "…" : `${kpis.ordersTrendPct >= 0 ? "↑" : "↓"} ${Math.abs(kpis.ordersTrendPct)}%`}
            trendDir={kpis.ordersTrendPct >= 0 ? "up" : "down"}
            sub="this month"
          />
          <KpiCard
            label="Customers"
            value={loading ? "…" : kpis.uniqueCustomers.toLocaleString("en-IN")}
            trend={loading ? "…" : `+${kpis.newCustomersThisMonth} new`}
            trendDir="neu"
            sub="this month"
          />
          <KpiCard
            label="Pending Invoices"
            value={loading ? "…" : inr(kpis.pendingAmount)}
            trend={loading ? "…" : `${kpis.overdueCount} overdue`}
            trendDir={kpis.overdueCount > 0 ? "down" : "up"}
            sub="needs attention"
          />
        </div>

        {/* Main layout: Charts + AI Chat */}
        <div className="dash-main-layout">
          <div className="dash-charts-col">

            <div className="dash-charts-row-1">
              <ChartCard title="Revenue Overview" sub="Monthly — last 6 months">
                <RevenueChart monthly={monthlyRevenue} loading={loading} />
              </ChartCard>
              <ChartCard title="Order Status" sub="Live breakdown">
                <OrderDonut orders={orders} loading={loading} />
              </ChartCard>
            </div>

            <div className="dash-charts-row-2">
              <ChartCard title="Stock Levels" sub="Top 5 products">
                <StockBar products={products} loading={loading} />
              </ChartCard>

              <ChartCard title="Customer Growth" sub="Last 5 months">
                <CustomerArea growth={customerGrowth} loading={loading} />
                <div style={{ marginTop: "12px", display: "flex", gap: "20px", flexWrap: "wrap" }}>
                  {[
                    ["Total", loading ? "…" : kpis.uniqueCustomers],
                    ["New", loading ? "…" : `+${kpis.newCustomersThisMonth}`],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p style={{ fontSize: "11px", color: t.textMuted, margin: 0 }}>{l}</p>
                      <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "18px", color: t.textPrimary, margin: 0 }}>{v}</p>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Recent Orders" sub="Latest 5 transactions">
                <InvoicesTable orders={orders} loading={loading} />
              </ChartCard>
            </div>

          </div>

          <div className="dash-ai-sticky">
            <AiChatWidget t={t} />
          </div>
        </div>
      </div>
    </>
  );
}