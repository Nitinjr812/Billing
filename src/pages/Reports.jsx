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

const BACKEND = "https://billing-backend-tawny.vercel.app";

const QUICK_PROMPTS = [
  "Revenue trend",
  "Top products",
  "Stock alerts",
  "Cancellations",
  "Best offer idea?",
  "Month summary",
];

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, trend, trendDir, sub }) {
  const { t } = useTheme();
  const colors = { up: t.green, down: t.red, neu: t.orange };
  const bgs = { up: t.greenBg, down: t.redBg, neu: t.orangeBg };
  return (
    <div style={{
      borderRadius: "16px", padding: "14px", display: "flex", flexDirection: "column", gap: "6px",
      background: t.bgCard, border: `1px solid ${t.border}`,
      transition: "background 0.25s ease, border-color 0.25s ease",
      minWidth: 0, overflow: "hidden",
    }}>
      <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>{label}</p>
      <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(16px, 4vw, 26px)", fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em", lineHeight: 1, margin: 0, wordBreak: "break-word" }}>{value}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        {trend && <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", color: colors[trendDir], background: bgs[trendDir], whiteSpace: "nowrap" }}>{trend}</span>}
        {sub && <span style={{ fontSize: "10px", color: t.textMuted, whiteSpace: "nowrap" }}>{sub}</span>}
      </div>
    </div>
  );
}

// ─── CHART CARD ───────────────────────────────────────────────────────────────
function ChartCard({ title, sub, children, style = {} }) {
  const { t } = useTheme();
  return (
    <div style={{
      borderRadius: "16px", padding: "14px", display: "flex", flexDirection: "column",
      background: t.bgCard, border: `1px solid ${t.border}`,
      transition: "background 0.25s ease, border-color 0.25s ease",
      minWidth: 0, overflow: "hidden", ...style,
    }}>
      <div style={{ marginBottom: "12px" }}>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px", color: t.textPrimary, margin: 0 }}>{title}</h3>
        {sub && <p style={{ fontSize: "10px", color: t.textMuted, marginTop: "2px", marginBottom: 0 }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── AI CHAT ──────────────────────────────────────────────────────────────────
function AiChat({ t }) {
  const [messages, setMessages] = useState([{
    role: "assistant",
    text: "👋 Hi! I'm your Reports Analyst — powered by live data.\n\nAsk me about:\n📈 Revenue & trends\n📦 Stock & inventory\n🏆 Top products\n🚨 Cancellations & offers",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");
    if (!expanded) setExpanded(true);

    const newMessages = [...messages, { role: "user", text: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND}/api/report-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();
      const reply = data?.reply || "Something went wrong. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Network error. Please try again." }]);
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
      {/* Header */}
      <div onClick={() => setExpanded((v) => !v)} style={{
        padding: "12px 14px",
        borderBottom: expanded ? `1px solid ${t.border}` : "none",
        display: "flex", alignItems: "center", gap: "10px", flexShrink: 0,
        cursor: "pointer", userSelect: "none",
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: "9px",
          background: `${t.accent}22`, border: `1px solid ${t.accent}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "14px", flexShrink: 0,
        }}>✦</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px", color: t.textPrimary, lineHeight: 1.2, margin: 0 }}>Reports Analyst</p>
          <p style={{ fontSize: "10px", color: t.green, fontWeight: 600, margin: 0 }}>● Live Data</p>
        </div>
        <span style={{
          fontSize: 12, color: t.textMuted,
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s", display: "inline-block", flexShrink: 0,
        }}>▼</span>
      </div>

      {expanded && (
        <>
          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "12px",
            display: "flex", flexDirection: "column", gap: "10px", maxHeight: 300,
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "90%", padding: "9px 13px",
                  borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: msg.role === "user" ? t.accent : `${t.accent}12`,
                  color: msg.role === "user" ? "#fff" : t.textPrimary,
                  fontSize: "12px", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif",
                  border: msg.role === "assistant" ? `1px solid ${t.border}` : "none",
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
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
                  {[0, 1, 2].map((d) => (
                    <div key={d} style={{
                      width: 6, height: 6, borderRadius: "50%", background: t.accent,
                      animation: "bounce 1.2s infinite", animationDelay: `${d * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick Prompts */}
          <div style={{ padding: "0 10px 8px", display: "flex", gap: "6px", flexWrap: "wrap", flexShrink: 0 }}>
            {QUICK_PROMPTS.map((q) => (
              <button key={q} onClick={() => sendMessage(q)} disabled={loading} style={{
                fontSize: "10px", fontWeight: 600, padding: "4px 10px", borderRadius: "99px",
                background: `${t.accent}15`, border: `1px solid ${t.accent}30`,
                color: t.accent, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.5 : 1,
                transition: "all 0.15s", whiteSpace: "nowrap",
              }}>{q}</button>
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
              placeholder="Ask about your reports…"
              rows={1}
              disabled={loading}
              style={{
                flex: 1, resize: "none", background: `${t.accent}08`,
                border: `1px solid ${t.border}`, borderRadius: "10px",
                padding: "8px 12px", fontSize: "12px", color: t.textPrimary,
                fontFamily: "'DM Sans', sans-serif", outline: "none", lineHeight: 1.5,
                minWidth: 0,
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
      <style>{`@keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }`}</style>
    </div>
  );
}

// ─── EXPORT BUTTON ────────────────────────────────────────────────────────────
function ExportButton({ t }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${BACKEND}/api/export/csv`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "text/csv;charset=utf-8;" })
      );
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", `business-report-gst-${new Date().toISOString().slice(0, 10)}.csv`);
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };
  return (
    <button
      className="rpt-export-btn"
      onClick={handleExport}
      disabled={exporting}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "7px",
        padding: "9px 18px", borderRadius: "10px",
        background: exporting ? `${t.accent}60` : t.accent,
        color: "#fff", fontFamily: "'DM Sans', sans-serif",
        fontWeight: 700, fontSize: "13px",
        border: "none", cursor: exporting ? "not-allowed" : "pointer",
        transition: "opacity 0.2s", flexShrink: 0, whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => { if (!exporting) e.currentTarget.style.opacity = "0.85"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
    >
      {exporting ? "⏳ Exporting..." : "⬇ Export GST Report"}
    </button>
  );
}

// ─── REPORTS PAGE ─────────────────────────────────────────────────────────────
export default function Reports() {
  const { t } = useTheme();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND}/api/reports`)
      .then((r) => {
        if (!r.ok) throw new Error("Reports endpoint not found");
        return r.json();
      })
      .then((d) => { setReport(d); setLoading(false); })
      .catch(() => { setFetchError(true); setLoading(false); });
  }, []);

  // ── Chart data from live report (safe against missing keys) ──
  const months = report?.revenueByMonth ? Object.keys(report.revenueByMonth) : [];
  const revenueVals = report?.revenueByMonth ? Object.values(report.revenueByMonth) : [];
  const orderMonths = report?.ordersByMonth ? Object.keys(report.ordersByMonth) : [];
  const orderVals = report?.ordersByMonth ? Object.values(report.ordersByMonth) : [];
  const catLabels = report?.revenueByCategory ? Object.keys(report.revenueByCategory) : [];
  const catVals = report?.revenueByCategory ? Object.values(report.revenueByCategory) : [];

  const tooltipBase = {
    backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1,
    titleColor: t.tooltipTitle, bodyColor: t.tooltipBody,
  };

  return (
    <>
      <style>{`
        .rpt-page { min-width: 0; overflow: hidden; }

        .rpt-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
        }

        .rpt-stat-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .rpt-main-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 12px;
          align-items: start;
        }

        .rpt-charts-col { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
        .rpt-row-2 { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
        .rpt-ai-sticky { position: static; }

        .rpt-chart-h-lg { height: 160px; }
        .rpt-chart-h-md { height: 160px; }
        .rpt-chart-h-donut { height: 180px; }

        .rpt-export-btn { width: 100%; }

        .rpt-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }

        /* ── Tablet (700px+) ── */
        @media (min-width: 700px) {
          .rpt-stat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
          .rpt-row-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .rpt-chart-h-lg { height: 180px; }
          .rpt-chart-h-md { height: 180px; }
          .rpt-chart-h-donut { height: 200px; }
          .rpt-export-btn { width: auto; }
        }

        /* ── Desktop (1024px+) ── */
        @media (min-width: 1024px) {
          .rpt-main-layout { grid-template-columns: 1fr 300px; gap: 16px; }
          .rpt-ai-sticky { position: sticky; top: 88px; }
        }

        /* ── Tiny screens ── */
        @media (max-width: 359px) {
          .rpt-stat-grid { gap: 6px; }
          .rpt-row-2 { gap: 8px; }
          .rpt-chart-h-lg { height: 140px; }
          .rpt-chart-h-md { height: 140px; }
          .rpt-chart-h-donut { height: 160px; }
        }
      `}</style>

      <div className="rpt-page" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* ── Header ── */}
        <div className="rpt-header">
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "clamp(20px, 6vw, 28px)",
              fontWeight: 900, color: t.textPrimary,
              letterSpacing: "-0.03em",
              transition: "color 0.25s ease", margin: 0,
            }}>Reports</h1>
            <p style={{ fontSize: "12px", color: t.textMuted, marginTop: "4px", marginBottom: 0 }}>
              Live business performance — export GST report for your CA
            </p>
          </div>
          <ExportButton t={t} />
        </div>

        {/* ── Loading / Error states ── */}
        {loading && (
          <div style={{
            padding: "32px 16px", textAlign: "center",
            borderRadius: "16px", background: t.bgCard, border: `1px solid ${t.border}`,
          }}>
            <p style={{ color: t.textMuted, fontSize: "13px", margin: 0 }}>⏳ Loading report data...</p>
          </div>
        )}

        {!loading && fetchError && (
          <div style={{
            padding: "16px", borderRadius: "16px",
            background: t.redBg, border: `1px solid ${t.red}40`,
          }}>
            <p style={{ color: t.red, fontSize: "12px", margin: 0, fontWeight: 600 }}>
              ❌ Failed to load report. Please check your backend connection.
            </p>
          </div>
        )}

        {!loading && report && (
          <>
            {/* ── KPI Row ── */}
            <div className="rpt-stat-grid">
              <StatCard
                label="Total Revenue"
                value={`₹${report.summary.totalRevenue.toLocaleString("en-IN")}`}
                trend="Live"
                trendDir="up"
                sub="excl. cancelled"
              />
              <StatCard
                label="Total Orders"
                value={report.summary.total}
                trend={`${report.summary.delivered} delivered`}
                trendDir="up"
                sub="this period"
              />
              <StatCard
                label="Avg Order Value"
                value={`₹${report.summary.avgOrderValue.toLocaleString("en-IN")}`}
                trend="Live"
                trendDir="up"
                sub="per order"
              />
              <StatCard
                label="Cancelled"
                value={report.summary.cancelled}
                trend={`${report.summary.cancellationRate}%`}
                trendDir="down"
                sub="cancellation rate"
              />
            </div>

            {/* ── Main Layout ── */}
            <div className="rpt-main-layout">

              {/* Charts Column */}
              <div className="rpt-charts-col">

                {/* Revenue Line Chart */}
                <ChartCard title="Revenue Trend" sub="Monthly from live DB">
                  <div className="rpt-chart-h-lg">
                    <Line
                      data={{
                        labels: months,
                        datasets: [{
                          label: "Revenue", data: revenueVals,
                          borderColor: t.accent, borderWidth: 2.5,
                          backgroundColor: `${t.accent}18`,
                          pointRadius: 3, pointBackgroundColor: t.accent,
                          pointBorderColor: t.bgCard, pointBorderWidth: 2,
                          tension: 0.4, fill: true,
                        }],
                      }}
                      options={{
                        responsive: true, maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: { ...tooltipBase, callbacks: { label: (ctx) => " ₹" + ctx.raw.toLocaleString("en-IN") } },
                        },
                        scales: {
                          x: { grid: { display: false }, ticks: { color: t.textMuted, font: { size: 9 } } },
                          y: { grid: { color: t.gridColor }, ticks: { color: t.textMuted, font: { size: 9 }, callback: (v) => "₹" + v / 1000 + "k" } },
                        },
                      }}
                    />
                  </div>
                </ChartCard>

                {/* Orders Bar + Category Donut */}
                <div className="rpt-row-2">
                  <ChartCard title="Monthly Orders" sub="From live DB">
                    <div className="rpt-chart-h-md">
                      <Bar
                        data={{
                          labels: orderMonths,
                          datasets: [{
                            label: "Orders", data: orderVals,
                            backgroundColor: `${t.blue}22`, borderColor: t.blue,
                            borderWidth: 1.5, borderRadius: 6, borderSkipped: false,
                          }],
                        }}
                        options={{
                          responsive: true, maintainAspectRatio: false,
                          plugins: { legend: { display: false }, tooltip: tooltipBase },
                          scales: {
                            x: { grid: { display: false }, ticks: { color: t.textMuted, font: { size: 9 } } },
                            y: { grid: { color: t.gridColor }, ticks: { color: t.textMuted, font: { size: 9 } } },
                          },
                        }}
                      />
                    </div>
                  </ChartCard>

                  <ChartCard title="Revenue by Category" sub="From live DB">
                    <div className="rpt-chart-h-donut">
                      <Doughnut
                        data={{
                          labels: catLabels,
                          datasets: [{
                            data: catVals,
                            backgroundColor: [t.accent + "cc", t.blue + "cc", t.green + "cc"],
                            borderColor: t.bgCard, borderWidth: 3, hoverOffset: 8,
                          }],
                        }}
                        options={{
                          responsive: true, maintainAspectRatio: false, cutout: "68%",
                          plugins: {
                            legend: { position: "bottom", labels: { color: t.textMuted, font: { size: 10 }, padding: 10, boxWidth: 8 } },
                            tooltip: { ...tooltipBase, callbacks: { label: (ctx) => " ₹" + ctx.raw.toLocaleString("en-IN") } },
                          },
                        }}
                      />
                    </div>
                  </ChartCard>
                </div>

                {/* Stock Alerts */}
                {(report.stock.outOfStock.length > 0 || report.stock.lowStock.length > 0) && (
                  <ChartCard title="Stock Alerts" sub="From live DB">
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {report.stock.outOfStock.map((p) => (
                        <div key={p.name} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                          padding: "8px 12px", borderRadius: "10px",
                          background: t.redBg, border: `1px solid ${t.red}30`,
                        }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                          <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", color: t.red, background: `${t.red}20`, whiteSpace: "nowrap", flexShrink: 0 }}>Out of Stock</span>
                        </div>
                      ))}
                      {report.stock.lowStock.map((p) => (
                        <div key={p.name} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                          padding: "8px 12px", borderRadius: "10px",
                          background: t.orangeBg, border: `1px solid ${t.orange}30`,
                        }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                          <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", color: t.orange, background: `${t.orange}20`, whiteSpace: "nowrap", flexShrink: 0 }}>{p.stock} units left</span>
                        </div>
                      ))}
                    </div>
                  </ChartCard>
                )}

                {/* Top Products Table */}
                <ChartCard title="Top Products" sub="By revenue from live DB">
                  <div className="rpt-table-wrap">
                    <table style={{ width: "100%", minWidth: 320, borderCollapse: "collapse", fontSize: "11px" }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                          {["#", "Product", "Revenue", "Orders", "Growth", "Category"].map((h) => (
                            <th key={h} style={{
                              textAlign: "left", paddingBottom: "8px", fontSize: "9px", fontWeight: 600,
                              textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMuted,
                              fontFamily: "'DM Sans', sans-serif", paddingRight: "10px", whiteSpace: "nowrap",
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.topProducts.map((p, i) => (
                          <tr key={p.name} style={{ borderBottom: i < report.topProducts.length - 1 ? `1px solid ${t.border}` : "none" }}>
                            <td style={{ padding: "8px 10px 8px 0", fontSize: "10px", color: t.textMuted, fontWeight: 600 }}>{i + 1}</td>
                            <td style={{ padding: "8px 10px 8px 0", fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>{p.name}</td>
                            <td style={{ padding: "8px 10px 8px 0", fontWeight: 700, color: t.textPrimary, fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap" }}>₹{p.revenue.toLocaleString("en-IN")}</td>
                            <td style={{ padding: "8px 10px 8px 0", fontSize: "10px", color: t.textMuted }}>{p.orders}</td>
                            <td style={{ padding: "8px 10px 8px 0" }}>
                              <span style={{ fontSize: "9px", fontWeight: 600, padding: "2px 7px", borderRadius: "99px", color: t.green, background: t.greenBg, whiteSpace: "nowrap" }}>+{p.growth}%</span>
                            </td>
                            <td style={{ padding: "8px 0", fontSize: "10px", color: t.textMuted, whiteSpace: "nowrap" }}>{p.category}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>

                {/* Order Fulfillment Summary */}
                <ChartCard title="Order Fulfillment" sub="Status breakdown">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                    {[
                      { label: "Delivered", value: report.summary.delivered, color: t.green, bg: t.greenBg },
                      { label: "Pending", value: report.summary.pending, color: t.orange, bg: t.orangeBg },
                      { label: "Processing", value: report.summary.processing, color: t.blue, bg: `${t.blue}18` },
                      { label: "Cancelled", value: report.summary.cancelled, color: t.red, bg: t.redBg },
                    ].map(({ label, value, color, bg }) => (
                      <div key={label} style={{
                        padding: "10px", borderRadius: "12px",
                        background: bg, display: "flex", flexDirection: "column", gap: "3px",
                        minWidth: 0, overflow: "hidden",
                      }}>
                        <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{label}</p>
                        <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 900, color, margin: 0 }}>{value}</p>
                        <p style={{ fontSize: "9px", color, margin: 0, opacity: 0.8 }}>
                          {report.summary.total ? ((value / report.summary.total) * 100).toFixed(1) : 0}% of total
                        </p>
                      </div>
                    ))}
                  </div>
                </ChartCard>

              </div>

              {/* AI Chat */}
              <div className="rpt-ai-sticky">
                <AiChat t={t} />
              </div>

            </div>
          </>
        )}
      </div>
    </>
  );
}