import { useState, useRef, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { useTheme } from "../components/ThemeContext";
import { useAuth } from "../context/AuthContext";
import StockAlertPopup from "../components/StockAlertPopup";

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

function timeAgo(date) {
  if (!date) return "";
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

// Professional, time-aware first message for the AI Analyst widget.
function getGreeting(name) {
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const namePart = name ? `, ${name}` : "";

  return `${timeGreeting}${namePart}! I'm Alex, your AI business assistant. I'm connected to your live store data and ready to help — ask me about orders, stock levels, revenue, or anything else on your mind.`;
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

// ─── Investment vs Profit — the "khata" math for the whole business ──────
// Total Invested  = every rupee of goods bought from suppliers, whether
//                    already paid or still pending (the stock is yours
//                    either way, so it's a real cost).
// Realized Revenue = only orders actually marked Completed. Pending orders
//                    are money not in hand yet, so they don't count as
//                    revenue until they clear.
// Net Profit       = Realized Revenue − Total Invested.
// The two "pending" numbers are shown separately so nothing is silently
// hidden inside the profit figure — a pending payment to a supplier is a
// debt you'll have to settle, and a pending payment from a customer is
// money you're still owed.
function computeBusinessHealth(orders, purchaseSummary) {
  const realizedRevenue = orders
    .filter((o) => o.status === "Completed")
    .reduce((s, o) => s + (Number(o.amount) || 0), 0);

  const customerPending = orders
    .filter((o) => o.status === "Pending")
    .reduce((s, o) => s + (Number(o.amount) || 0), 0);

  const totalInvested = purchaseSummary?.totalPurchased || 0;
  const supplierPaid = purchaseSummary?.totalPaid || 0;
  const supplierPending = purchaseSummary?.totalPending || 0;

  const netProfit = realizedRevenue - totalInvested;

  return {
    totalInvested,
    supplierPaid,
    supplierPending,
    realizedRevenue,
    customerPending,
    netProfit,
  };
}

// ─── live data hook (single source of truth for the whole dashboard) ──────
function useDashboardData(pollMs = 60000) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    stats: null,
    products: [],
    orders: [],
    alerts: null,
    purchaseSummary: { totalPurchased: 0, totalPaid: 0, totalPending: 0 },
    lastUpdated: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [ordersRes, statsRes, productsRes, alertsRes, purchaseSummaryRes] = await Promise.all([
          fetch(`${BACKEND}/api/orders`),
          fetch(`${BACKEND}/api/orders/stats`),
          fetch(`${BACKEND}/api/products`),
          fetch(`${BACKEND}/api/products/alerts`),
          fetch(`${BACKEND}/api/supplier-purchases/summary`),
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

        // Purchase/khata summary is treated as optional — if this route
        // isn't deployed yet or fails, the rest of the dashboard still works.
        let purchaseSummary = { totalPurchased: 0, totalPaid: 0, totalPending: 0 };
        if (purchaseSummaryRes.ok) {
          const psData = await purchaseSummaryRes.json();
          purchaseSummary = psData?.overall || purchaseSummary;
        }

        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            stats,
            products: Array.isArray(products) ? products : [],
            orders: Array.isArray(orders) ? orders : [],
            alerts,
            purchaseSummary,
            lastUpdated: new Date(),
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

// ─── AI CHAT WIDGET CONTEXT (unchanged logic) ─────────────────────────────
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
  const { user } = useAuth();
  const [messages, setMessages] = useState(() => [
    { role: "assistant", text: getGreeting(user?.name) },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // AuthContext restores the user from localStorage asynchronously, so on
  // first render `user` may still be null. Once it resolves, refresh the
  // greeting with the real name — but only if the user hasn't started
  // chatting yet (don't clobber an in-progress conversation).
  useEffect(() => {
    if (!user?.name) return;
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant") {
        return [{ role: "assistant", text: getGreeting(user.name) }];
      }
      return prev;
    });
  }, [user?.name]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");

    const newMessages = [...messages, { role: "user", text: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Send recent history (excluding the just-added user message, which
      // goes separately as `message`) so the backend can resolve follow-ups
      // like "uska price kya hai".
      const history = newMessages.slice(0, -1).slice(-12);
      const res = await fetch(`${BACKEND}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, history }),
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
      className="dash-card dash-fade-in"
      style={{
        borderRadius: "18px",
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease",
      }}
    > 
      <div
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexShrink: 0,
          background: `linear-gradient(180deg, ${t.accent}0a, transparent)`,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "10px",
            background: `linear-gradient(135deg, ${t.accent}30, ${t.accent}10)`,
            border: `1px solid ${t.accent}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "15px",
            flexShrink: 0,
            boxShadow: `0 0 0 3px ${t.accent}0d`,
          }}
        >
          ✦
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px", color: t.textPrimary, margin: 0, lineHeight: 1.2 }}>
            Alex · AI Analyst
          </p>
          <p style={{ fontSize: "10px", color: t.green, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "4px" }}>
            <span className="dash-pulse-dot" style={{ background: t.green }} /> Online
          </p>
        </div>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: "99px",
            color: t.accent,
            background: `${t.accent}15`,
            border: `1px solid ${t.accent}25`,
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap",
            flexShrink: 0,
            letterSpacing: "0.03em",
          }}
        >
          LIVE
        </span>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
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
                padding: "8px 12px",
                borderRadius: msg.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                background: msg.role === "user" ? t.accent : `${t.accent}12`,
                color: msg.role === "user" ? "#fff" : t.textPrimary,
                fontSize: "12px",
                lineHeight: 1.6,
                fontFamily: "'DM Sans', sans-serif",
                border: msg.role === "assistant" ? `1px solid ${t.border}` : "none",
                boxShadow: msg.role === "user" ? `0 2px 8px ${t.accent}35` : "none",
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

      <div style={{ padding: "8px 12px 6px", display: "flex", gap: "5px", flexWrap: "wrap", flexShrink: 0, borderTop: `1px solid ${t.border}` }}>
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
              padding: "4px 10px",
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
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = `${t.accent}22`; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = `${t.accent}12`; }}
          >
            {q.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "10px 12px", borderTop: `1px solid ${t.border}`, display: "flex", gap: "8px", flexShrink: 0 }}>
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
            padding: "8px 11px",
            fontSize: "12px",
            color: t.textPrimary,
            fontFamily: "'DM Sans', sans-serif",
            outline: "none",
            lineHeight: 1.5,
            minWidth: 0,
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = `${t.accent}70`; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = t.border; }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{
            width: 34,
            height: 34,
            borderRadius: "10px",
            flexShrink: 0,
            background: loading || !input.trim() ? `${t.accent}30` : t.accent,
            border: "none",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            color: "#fff",
            transition: "background 0.2s, transform 0.15s",
            boxShadow: loading || !input.trim() ? "none" : `0 2px 10px ${t.accent}50`,
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.92)"; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
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
function KpiCard({ icon, label, value, trend, trendDir, sub, loading }) {
  const { t } = useTheme();
  const colors = { up: t.green, down: t.red, neu: t.orange };
  const bgs = { up: t.greenBg, down: t.redBg, neu: t.orangeBg };

  return (
    <div
      className="dash-card dash-fade-in"
      style={{
        borderRadius: "16px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        transition: "background 0.25s ease, border-color 0.25s ease, box-shadow 0.2s ease, transform 0.2s ease",
        minWidth: 0,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <p style={{ fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: t.textMuted, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
          {label}
        </p>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "8px",
            background: bgs[trendDir],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>

      {loading ? (
        <div className="dash-skeleton" style={{ height: 26, width: "70%", borderRadius: 6 }} />
      ) : (
        <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(17px, 4vw, 25px)", fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em", lineHeight: 1, margin: 0, wordBreak: "break-all" }}>
          {value}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        {loading ? (
          <div className="dash-skeleton" style={{ height: 18, width: 60, borderRadius: 99 }} />
        ) : (
          <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", color: colors[trendDir], background: bgs[trendDir], whiteSpace: "nowrap" }}>
            {trend}
          </span>
        )}
        {sub && !loading && <span style={{ fontSize: "10px", color: t.textMuted, whiteSpace: "nowrap" }}>{sub}</span>}
      </div>
    </div>
  );
}

// ─── BUSINESS HEALTH CARD — Investment vs Profit, khata-style ────────────
function BusinessHealthCard({ health, loading, t }) {
  const isProfit = health.netProfit >= 0;

  return (
    <div
      className="dash-card dash-fade-in"
      style={{
        borderRadius: "18px",
        padding: "20px",
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        transition: "background 0.25s ease, border-color 0.25s ease, box-shadow 0.2s ease, transform 0.2s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "14px", color: t.textPrimary, margin: 0 }}>
            Business Health
          </h3>
          <p style={{ fontSize: "11px", color: t.textMuted, margin: "2px 0 0" }}>Investment vs. Profit — live khata</p>
        </div>
        {!loading && (
          <span style={{
            fontSize: "11px", fontWeight: 700, padding: "4px 12px", borderRadius: "99px",
            color: isProfit ? t.green : t.red,
            background: isProfit ? t.greenBg : t.redBg,
          }}>
            {isProfit ? "In Profit" : "In Loss"}
          </span>
        )}
      </div>

      {/* Core 3: Invested → Revenue → Net Profit */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <div style={{ background: `${t.accent}08`, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 14px" }}>
          <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: t.textMuted, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>Total Invested</p>
          {loading ? (
            <div className="dash-skeleton" style={{ height: 22, width: "70%", borderRadius: 6, marginTop: 6 }} />
          ) : (
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "clamp(16px, 4vw, 20px)", color: t.textPrimary, margin: "6px 0 0" }}>
              {inr(health.totalInvested)}
            </p>
          )}
          <p style={{ fontSize: 10, color: t.textMuted, margin: "3px 0 0" }}>stock purchased from suppliers</p>
        </div>

        <div style={{ background: t.greenBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 14px" }}>
          <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: t.textMuted, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>Revenue (Completed)</p>
          {loading ? (
            <div className="dash-skeleton" style={{ height: 22, width: "70%", borderRadius: 6, marginTop: 6 }} />
          ) : (
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "clamp(16px, 4vw, 20px)", color: t.green, margin: "6px 0 0" }}>
              {inr(health.realizedRevenue)}
            </p>
          )}
          <p style={{ fontSize: 10, color: t.textMuted, margin: "3px 0 0" }}>stock already sold</p>
        </div>

        <div style={{ background: isProfit ? t.greenBg : t.redBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 14px" }}>
          <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: t.textMuted, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>Net Profit</p>
          {loading ? (
            <div className="dash-skeleton" style={{ height: 22, width: "70%", borderRadius: 6, marginTop: 6 }} />
          ) : (
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "clamp(16px, 4vw, 20px)", color: isProfit ? t.green : t.red, margin: "6px 0 0" }}>
              {isProfit ? "" : "-"}{inr(Math.abs(health.netProfit))}
            </p>
          )}
          <p style={{ fontSize: 10, color: t.textMuted, margin: "3px 0 0" }}>revenue − invested</p>
        </div>
      </div>

      {/* Pending flags — not folded into profit, shown as clear cash-flow alerts */}
      {!loading && (health.supplierPending > 0 || health.customerPending > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: `1px solid ${t.border}`, paddingTop: 12 }}>
          {health.supplierPending > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 12, color: t.textMuted, fontFamily: "'DM Sans', sans-serif" }}>Owed to suppliers (already counted in invested)</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.red, fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap" }}>{inr(health.supplierPending)}</span>
            </div>
          )}
          {health.customerPending > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 12, color: t.textMuted, fontFamily: "'DM Sans', sans-serif" }}>Owed by customers (not yet in revenue)</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.orange, fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap" }}>{inr(health.customerPending)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CHART CARD WRAPPER ───────────────────────────────────────────────────
function ChartCard({ title, sub, children, style = {}, accent }) {
  const { t } = useTheme();
  return (
    <div
      className="dash-card dash-fade-in"
      style={{
        borderRadius: "16px",
        padding: "18px",
        display: "flex",
        flexDirection: "column",
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        transition: "background 0.25s ease, border-color 0.25s ease, box-shadow 0.2s ease, transform 0.2s ease",
        minWidth: 0,
        overflow: "hidden",
        ...style,
      }}
    >
      <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: "9px" }}>
        {accent && (
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: accent, flexShrink: 0, boxShadow: `0 0 0 3px ${accent}22` }} />
        )}
        <div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "14px", color: t.textPrimary, margin: 0 }}>
            {title}
          </h3>
          {sub && <p style={{ fontSize: "11px", color: t.textMuted, marginTop: "2px", marginBottom: 0 }}>{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ChartSkeleton({ height = 220 }) {
  const { t } = useTheme();
  return (
    <div style={{ height, display: "flex", alignItems: "flex-end", gap: "8px", padding: "0 4px" }}>
      {[40, 65, 50, 80, 55, 70].map((h, i) => (
        <div
          key={i}
          className="dash-skeleton"
          style={{ flex: 1, height: `${h}%`, borderRadius: "6px 6px 0 0" }}
        />
      ))}
    </div>
  );
}

// ─── REVENUE CHART (dynamic — last 6 months from real orders) ─────────────
function RevenueChart({ monthly, loading }) {
  const { t } = useTheme();
  const tooltipDefaults = { backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1, titleColor: t.tooltipTitle, bodyColor: t.tooltipBody, padding: 10, cornerRadius: 8, displayColors: false };

  if (loading) return <ChartSkeleton height={220} />;

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

// ─── ORDER DONUT ────────────────────────────────────────────────────────
function OrderDonut({ orders, loading }) {
  const { t } = useTheme();
  const tooltipDefaults = { backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1, titleColor: t.tooltipTitle, bodyColor: t.tooltipBody, padding: 10, cornerRadius: 8 };

  if (loading) return <ChartSkeleton height={220} />;

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

// ─── STOCK BAR ─────────────────────────────────────────────────────────
function StockBar({ products, loading }) {
  const { t } = useTheme();
  const tooltipDefaults = { backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1, titleColor: t.tooltipTitle, bodyColor: t.tooltipBody, padding: 10, cornerRadius: 8 };
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
  if (loading) return <ChartSkeleton height={210} />;
  if (!top5.length) return <p style={{ color: t.textMuted, fontSize: 12, textAlign: "center", padding: "40px 0" }}>No products found.</p>;
  return <div style={{ height: 210 }}><Bar data={data} options={options} /></div>;
}

// ─── CUSTOMER GROWTH AREA ──────────────────────────────────────────────
function CustomerArea({ growth, loading }) {
  const { t } = useTheme();
  const tooltipDefaults = { backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1, titleColor: t.tooltipTitle, bodyColor: t.tooltipBody, padding: 10, cornerRadius: 8 };

  if (loading) return <ChartSkeleton height={150} />;

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

// ─── ORDERS / INVOICES TABLE ──────────────────────────────────────────
function InvoicesTable({ orders, loading }) {
  const { t } = useTheme();
  const statusStyle = {
    Completed: { color: t.green, bg: t.greenBg },
    Pending: { color: t.orange, bg: t.orangeBg },
    Cancelled: { color: t.red, bg: t.redBg },
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="dash-skeleton" style={{ height: 30, borderRadius: 6 }} />
        ))}
      </div>
    );
  }

  const latest = [...orders]
    .sort((a, b) => (getOrderDate(b)?.getTime() || 0) - (getOrderDate(a)?.getTime() || 0))
    .slice(0, 5);

  if (!latest.length) return <p style={{ color: t.textMuted, fontSize: 12, textAlign: "center", padding: "30px 0" }}>No orders yet.</p>;

  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: "320px" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${t.border}` }}>
            {["Order", "Customer", "Amount", "Status"].map((h) => (
              <th key={h} style={{ textAlign: h === "Amount" || h === "Status" ? "right" : "left", paddingBottom: "10px", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMuted, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {latest.map((o, i) => {
            const style = statusStyle[o.status] || { color: t.textMuted, bg: `${t.textMuted}18` };
            return (
              <tr
                key={o.orderId || o._id || i}
                style={{ borderBottom: i < latest.length - 1 ? `1px solid ${t.borderLight}` : "none", transition: "background 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${t.accent}08`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <td style={{ padding: "10px 0", fontFamily: "monospace", fontSize: "10px", color: t.textMuted, whiteSpace: "nowrap" }}>{o.orderId || o._id || "—"}</td>
                <td style={{ padding: "10px 8px 10px 0", fontWeight: 500, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", maxWidth: "90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.customer || "—"}</td>
                <td style={{ padding: "10px 8px 10px 0", fontWeight: 700, color: t.textPrimary, fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap", textAlign: "right" }}>{inr(o.amount)}</td>
                <td style={{ padding: "10px 0 10px 8px", textAlign: "right" }}>
                  <span style={{ fontSize: "9.5px", fontWeight: 700, padding: "3px 8px", borderRadius: "99px", color: style.color, background: style.bg, whiteSpace: "nowrap" }}>
                    {o.status || "—"}
                  </span>
                </td>
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
  .dash-kpi-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .dash-main-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; align-items: start; }
  .dash-charts-col { display: flex; flex-direction: column; gap: 12px; }
  .dash-charts-row-1 { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
  .dash-charts-row-2 { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
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

  .dash-card:hover {
    box-shadow: 0 8px 24px -12px rgba(0,0,0,0.18);
    transform: translateY(-2px);
  }

  .dash-fade-in {
    animation: dashFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes dashFadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .dash-skeleton {
    background: linear-gradient(90deg, rgba(128,128,128,0.12) 25%, rgba(128,128,128,0.22) 37%, rgba(128,128,128,0.12) 63%);
    background-size: 400% 100%;
    animation: dashShimmer 1.4s ease infinite;
  }

  @keyframes dashShimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .dash-pulse-dot {
    width: 6px; height: 6px; border-radius: 50%;
    display: inline-block;
    animation: dashPulse 1.8s ease infinite;
  }

  @keyframes dashPulse {
    0% { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
    70% { box-shadow: 0 0 0 5px transparent; opacity: 0.7; }
    100% { box-shadow: 0 0 0 0 transparent; opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .dash-fade-in, .dash-skeleton, .dash-pulse-dot { animation: none !important; }
    .dash-card:hover { transform: none !important; }
  }
`;

// ─── DASHBOARD PAGE ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t } = useTheme();
  const { loading, error, stats, products, orders, purchaseSummary, lastUpdated } = useDashboardData();
  const [, forceTick] = useState(0);

  // re-render every 30s so "X ago" stays fresh
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const monthlyRevenue = buildMonthlyRevenue(orders);
  const customerGrowth = buildCustomerGrowth(orders);
  const kpis = computeKpis(stats, orders);
  const businessHealth = computeBusinessHealth(orders, purchaseSummary);

  return (
    <>
    <StockAlertPopup />
      <style>{styles}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0, overflow: "hidden" }}>

        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(20px, 6vw, 28px)", fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em", transition: "color 0.25s ease", margin: 0 }}>
              Dashboard
            </h1>
            <p style={{ fontSize: "12px", color: error ? t.red : t.textMuted, marginTop: "4px", marginBottom: 0 }}>
              {error ? error : "Welcome back — here's your business at a glance"}
            </p>
          </div>

          {!error && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                fontSize: "10.5px", fontWeight: 600, color: t.textMuted,
                padding: "5px 10px", borderRadius: "99px",
                background: t.bgCard, border: `1px solid ${t.border}`,
                fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
              }}
            >
              <span className="dash-pulse-dot" style={{ background: loading ? t.orange : t.green }} />
              {loading ? "Syncing…" : `Updated ${timeAgo(lastUpdated)}`}
            </div>
          )}
        </div>
 
        <div className="dash-kpi-grid">
          <KpiCard
            icon="💰"
            label="Total Revenue"
            value={inr(kpis.totalRevenue)}
            trend={`${kpis.revenueTrendPct >= 0 ? "↑" : "↓"} ${Math.abs(kpis.revenueTrendPct)}%`}
            trendDir={kpis.revenueTrendPct >= 0 ? "up" : "down"}
            sub="vs last month"
            loading={loading}
          />
          <KpiCard
            icon="🧾"
            label="Total Orders"
            value={kpis.totalOrders.toLocaleString("en-IN")}
            trend={`${kpis.ordersTrendPct >= 0 ? "↑" : "↓"} ${Math.abs(kpis.ordersTrendPct)}%`}
            trendDir={kpis.ordersTrendPct >= 0 ? "up" : "down"}
            sub="this month"
            loading={loading}
          />
          <KpiCard
            icon="👥"
            label="Customers"
            value={kpis.uniqueCustomers.toLocaleString("en-IN")}
            trend={`+${kpis.newCustomersThisMonth} new`}
            trendDir="neu"
            sub="this month"
            loading={loading}
          />
          <KpiCard
            icon="⏳"
            label="Pending Invoices"
            value={inr(kpis.pendingAmount)}
            trend={`${kpis.overdueCount} overdue`}
            trendDir={kpis.overdueCount > 0 ? "down" : "up"}
            sub="needs attention"
            loading={loading}
          />
        </div>

        {/* Investment vs Profit — the "khata" view of the whole business */}
        <BusinessHealthCard health={businessHealth} loading={loading} t={t} />

        {/* Main layout: Charts + AI Chat */}
        <div className="dash-main-layout">
          <div className="dash-charts-col">

            <div className="dash-charts-row-1">
              <ChartCard title="Revenue Overview" sub="Monthly — last 6 months" accent={t.accent}>
                <RevenueChart monthly={monthlyRevenue} loading={loading} />
              </ChartCard>
              <ChartCard title="Order Status" sub="Live breakdown" accent={t.green}>
                <OrderDonut orders={orders} loading={loading} />
              </ChartCard>
            </div>

            <div className="dash-charts-row-2">
              <ChartCard title="Stock Levels" sub="Top 5 products" accent={t.orange}>
                <StockBar products={products} loading={loading} />
              </ChartCard>

              <ChartCard title="Customer Growth" sub="Last 5 months" accent={t.blue}>
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

              <ChartCard title="Recent Orders" sub="Latest 5 transactions" accent="#a855f7">
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