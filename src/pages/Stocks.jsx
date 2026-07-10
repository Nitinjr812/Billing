import { useState, useEffect } from "react";
import { useTheme } from "../components/ThemeContext";

const BACKEND = "https://billing-backend-tawny.vercel.app";
const CATEGORIES = ["All", "Electronics", "Apparel", "Home Goods"];
const LOW_STOCK_THRESHOLD = 50; // matches /api/products/alerts

// ─── helpers ────────────────────────────────────────────────────────────
function getStockStatus(inStock) {
  if (inStock === 0) return "Out of Stock";
  if (inStock <= LOW_STOCK_THRESHOLD) return "Low Stock";
  return "In Stock";
}

function formatDate(raw) {
  const d = raw ? new Date(raw) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";
}

function inr(n) {
  return "₹" + (Number(n) || 0).toLocaleString("en-IN");
}

// Build a "total sold" map keyed by lowercase product name from real orders
function buildSoldMap(orders) {
  const map = new Map();
  orders.forEach((o) => {
    if (o.status === "Cancelled") return;
    const key = (o.product || "").toLowerCase();
    const qty = Number(o.qty) || 1;
    map.set(key, (map.get(key) || 0) + qty);
  });
  return map;
}

// ─── live stocks hook (real products + orders, no seed/dummy data) ────────
function useStocksData(pollMs = 60000) {
  const [state, setState] = useState({ loading: true, error: null, stocks: [] });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [productsRes, ordersRes] = await Promise.all([
          fetch(`${BACKEND}/api/products`),
          fetch(`${BACKEND}/api/orders`),
        ]);
        if (!productsRes.ok || !ordersRes.ok) throw new Error("Request failed");

        const [products, orders] = await Promise.all([productsRes.json(), ordersRes.json()]);
        const soldMap = buildSoldMap(Array.isArray(orders) ? orders : []);

        const stocks = (Array.isArray(products) ? products : []).map((p) => ({
          id: p.productId,
          _mongoId: p._id,
          name: p.name,
          category: p.category,
          inStock: p.stock,
          sold: soldMap.get((p.name || "").toLowerCase()) || 0,
          price: p.price,
          growthPercent: p.growthPercent,
          lastUpdated: p.updatedAt,
        }));

        if (!cancelled) setState({ loading: false, error: null, stocks });
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, error: "Live stock data unavailable right now." }));
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

function StockBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ width: "100%", height: 6, borderRadius: 99, background: `${color}20`, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: color, transition: "width 0.4s ease" }} />
    </div>
  );
}

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

// ─── STOCKS PAGE ──────────────────────────────────────────────────────────────
export default function Stocks() {
  const { t } = useTheme();
  const { loading, error, stocks } = useStocksData();

  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState("All");
  const [onlyLow, setOnlyLow]     = useState(false);
  const [sortKey, setSortKey]     = useState("name");
  const [sortDir, setSortDir]     = useState("asc");

  const totalSKUs   = stocks.length;
  const totalUnits  = stocks.reduce((s, i) => s + (i.inStock || 0), 0);
  const needReorder = stocks.filter((i) => i.inStock <= LOW_STOCK_THRESHOLD).length;
  const outOfStock  = stocks.filter((i) => i.inStock === 0).length;

  const filtered = stocks
    .filter((s) => {
      const q = search.toLowerCase();
      const matchSearch   = (s.name || "").toLowerCase().includes(q) || (s.id || "").toLowerCase().includes(q);
      const matchCategory = category === "All" || s.category === category;
      const matchLow      = !onlyLow || s.inStock <= LOW_STOCK_THRESHOLD;
      return matchSearch && matchCategory && matchLow;
    })
    .sort((a, b) => {
      if (["inStock", "sold", "price"].includes(sortKey)) {
        const va = Number(a[sortKey]) || 0;
        const vb = Number(b[sortKey]) || 0;
        return sortDir === "asc" ? va - vb : vb - va;
      }
      if (sortKey === "lastUpdated") {
        const va = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
        const vb = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
        return sortDir === "asc" ? va - vb : vb - va;
      }
      const va = String(a[sortKey] || "").toLowerCase();
      const vb = String(b[sortKey] || "").toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ?  1 : -1;
      return 0;
    });

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const stockStatusStyle = {
    "In Stock":     { color: t.green,  bg: t.greenBg  },
    "Low Stock":    { color: t.orange, bg: t.orangeBg },
    "Out of Stock": { color: t.red,    bg: t.redBg    },
  };

  const inputStyle = {
    background: t.bgCard, border: `1px solid ${t.border}`, color: t.textPrimary,
    borderRadius: "10px", padding: "8px 14px", fontSize: "12px",
    fontFamily: "'DM Sans', sans-serif", outline: "none", transition: "border-color 0.2s",
  };

  const SortArrow = ({ col }) => {
    if (sortKey !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4, color: t.accent }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const maxStock = stocks.length ? Math.max(...stocks.map((s) => s.inStock || 0), 1) : 1;

  return (
    <>
      <style>{`
        .stk-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap: 12px; }
        .stk-filters   { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
        .stk-table-wrap { overflow-x: auto; }
        .stk-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .stk-table th { cursor: pointer; user-select: none; }
        .stk-table th:hover { opacity: 0.8; }
        @media (max-width: 640px) { .stk-stat-grid { grid-template-columns: repeat(2,1fr); } }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "28px", fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em", transition: "color 0.25s ease" }}>Stocks</h1>
          <p style={{ fontSize: "13px", color: t.textMuted, marginTop: "4px" }}>
            {error ? error : "Monitor stock levels and reorder points"}
          </p>
        </div>

        <div className="stk-stat-grid">
          <StatCard label="Total SKUs"    value={loading ? "…" : totalSKUs}                      sub="being tracked" />
          <StatCard label="Total Units"   value={loading ? "…" : totalUnits.toLocaleString("en-IN")} sub="in warehouse" />
          <StatCard label="Need Reorder"  value={loading ? "…" : needReorder} trend={loading ? undefined : `${needReorder} SKUs`} trendDir="neu" sub={`≤ ${LOW_STOCK_THRESHOLD} units`} />
          <StatCard label="Out of Stock"  value={loading ? "…" : outOfStock}  trend={loading ? undefined : `${outOfStock} SKUs`}  trendDir="down" sub="zero inventory" />
        </div>

        <div style={{
          borderRadius: "16px", padding: "20px", background: t.bgCard,
          border: `1px solid ${t.border}`, transition: "background 0.25s ease, border-color 0.25s ease",
          display: "flex", flexDirection: "column", gap: "16px",
        }}>
          {/* Filters */}
          <div className="stk-filters">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product or SKU…" style={{ ...inputStyle, flex: "1 1 200px", minWidth: "160px" }} />
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>

            {/* Low stock toggle */}
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", color: t.textMuted, fontFamily: "'DM Sans', sans-serif", userSelect: "none" }}>
              <div
                onClick={() => setOnlyLow((v) => !v)}
                style={{
                  width: 34, height: 18, borderRadius: 99, position: "relative", cursor: "pointer",
                  background: onlyLow ? t.orange : t.border, transition: "background 0.2s",
                }}
              >
                <div style={{
                  position: "absolute", top: 2, left: onlyLow ? 16 : 2,
                  width: 14, height: 14, borderRadius: "50%", background: "#fff",
                  transition: "left 0.2s", boxShadow: "0 1px 3px #0003",
                }} />
              </div>
              Low stock only
            </label>

            <span style={{ fontSize: "11px", color: t.textMuted, marginLeft: "auto" }}>
              {loading ? "Loading…" : `${filtered.length} of ${stocks.length} SKUs`}
            </span>
          </div>

          {/* Table */}
          <div className="stk-table-wrap">
            <table className="stk-table">
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                  {[
                    { key: "id",          label: "SKU"          },
                    { key: "name",        label: "Product"      },
                    { key: "category",    label: "Category"     },
                    { key: "inStock",     label: "In Stock"     },
                    { key: "sold",        label: "Total Sold"   },
                    { key: "price",       label: "Price"        },
                    { key: "lastUpdated", label: "Last Updated" },
                    { key: "_status",     label: "Status"       },
                  ].map(({ key, label }) => (
                    <th key={key} onClick={() => key !== "_status" && handleSort(key)} style={{
                      textAlign: "left", paddingBottom: "10px", fontSize: "10px", fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMuted,
                      fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", paddingRight: "16px",
                      cursor: key === "_status" ? "default" : "pointer",
                    }}>
                      {label}{key !== "_status" && <SortArrow col={key} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: t.textMuted, fontSize: "13px" }}>Loading stock data…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: t.textMuted, fontSize: "13px" }}>No stocks match your filters.</td></tr>
                ) : filtered.map((s, i) => {
                  const stockStatus = getStockStatus(s.inStock);
                  const barColor = s.inStock === 0 ? t.red : s.inStock <= LOW_STOCK_THRESHOLD ? t.orange : t.green;
                  return (
                    <tr key={s.id || s._mongoId} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${t.borderLight ?? t.border}` : "none" }}>
                      <td style={{ padding: "10px 16px 10px 0", fontFamily: "monospace", fontSize: "11px", color: t.textMuted }}>{s.id}</td>
                      <td style={{ padding: "10px 16px 10px 0", fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>{s.name}</td>
                      <td style={{ padding: "10px 16px 10px 0", fontSize: "11px", color: t.textMuted }}>{s.category}</td>
                      <td style={{ padding: "10px 16px 10px 0", minWidth: 90 }}>
                        <div style={{ fontWeight: 700, color: barColor, fontFamily: "'Syne', sans-serif", marginBottom: 4 }}>{(s.inStock || 0).toLocaleString("en-IN")}</div>
                        <StockBar value={s.inStock || 0} max={maxStock} color={barColor} />
                      </td>
                      <td style={{ padding: "10px 16px 10px 0", fontWeight: 600, color: t.textPrimary, fontFamily: "'Syne', sans-serif" }}>{(s.sold || 0).toLocaleString("en-IN")}</td>
                      <td style={{ padding: "10px 16px 10px 0", fontWeight: 600, color: t.textPrimary, whiteSpace: "nowrap" }}>{inr(s.price)}</td>
                      <td style={{ padding: "10px 16px 10px 0", fontSize: "11px", color: t.textMuted, whiteSpace: "nowrap" }}>{formatDate(s.lastUpdated)}</td>
                      <td style={{ padding: "10px 0" }}>
                        <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 9px", borderRadius: "99px", color: stockStatusStyle[stockStatus].color, background: stockStatusStyle[stockStatus].bg, whiteSpace: "nowrap" }}>
                          {stockStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}