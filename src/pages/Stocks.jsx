import { useState } from "react";
import { useTheme } from "../components/ThemeContext";

// ─── DUMMY DATA ───────────────────────────────────────────────────────────────
const STOCKS = [
  { id: "SKU-001", name: "Prod-Alpha",  category: "Electronics", inStock: 420, reserved: 80,  sold: 1240, reorderAt: 100, reorderQty: 500, supplier: "TechCorp Ltd",    cost: "₹850",   lastRestock: "10 May" },
  { id: "SKU-002", name: "Prod-Beta",   category: "Apparel",     inStock: 280, reserved: 40,  sold: 860,  reorderAt: 80,  reorderQty: 300, supplier: "FabriX Pvt",      cost: "₹390",   lastRestock: "08 May" },
  { id: "SKU-003", name: "Prod-Gamma",  category: "Electronics", inStock: 610, reserved: 120, sold: 2100, reorderAt: 150, reorderQty: 600, supplier: "TechCorp Ltd",    cost: "₹2,100", lastRestock: "12 May" },
  { id: "SKU-004", name: "Prod-Delta",  category: "Home Goods",  inStock: 42,  reserved: 18,  sold: 490,  reorderAt: 60,  reorderQty: 200, supplier: "HomeBase Co",     cost: "₹540",   lastRestock: "01 May" },
  { id: "SKU-005", name: "Prod-Sigma",  category: "Apparel",     inStock: 380, reserved: 60,  sold: 730,  reorderAt: 100, reorderQty: 400, supplier: "FabriX Pvt",      cost: "₹1,050", lastRestock: "09 May" },
  { id: "SKU-006", name: "Prod-Zeta",   category: "Home Goods",  inStock: 28,  reserved: 10,  sold: 310,  reorderAt: 50,  reorderQty: 150, supplier: "HomeBase Co",     cost: "₹1,400", lastRestock: "29 Apr" },
  { id: "SKU-007", name: "Prod-Omega",  category: "Electronics", inStock: 0,   reserved: 0,   sold: 980,  reorderAt: 80,  reorderQty: 400, supplier: "TechCorp Ltd",    cost: "₹3,800", lastRestock: "20 Apr" },
  { id: "SKU-008", name: "Prod-Lambda", category: "Apparel",     inStock: 815, reserved: 95,  sold: 1680, reorderAt: 200, reorderQty: 800, supplier: "FabriX Pvt",      cost: "₹210",   lastRestock: "11 May" },
  { id: "SKU-009", name: "Prod-Theta",  category: "Home Goods",  inStock: 18,  reserved: 12,  sold: 420,  reorderAt: 40,  reorderQty: 180, supplier: "HomeBase Co",     cost: "₹620",   lastRestock: "25 Apr" },
  { id: "SKU-010", name: "Prod-Kappa",  category: "Electronics", inStock: 0,   reserved: 0,   sold: 560,  reorderAt: 60,  reorderQty: 300, supplier: "TechCorp Ltd",    cost: "₹6,200", lastRestock: "18 Apr" },
  { id: "SKU-011", name: "Prod-Phi",    category: "Apparel",     inStock: 330, reserved: 50,  sold: 920,  reorderAt: 100, reorderQty: 400, supplier: "StyleHouse",      cost: "₹280",   lastRestock: "07 May" },
  { id: "SKU-012", name: "Prod-Psi",    category: "Home Goods",  inStock: 177, reserved: 30,  sold: 640,  reorderAt: 80,  reorderQty: 250, supplier: "HomeBase Co",     cost: "₹430",   lastRestock: "05 May" },
];

const CATEGORIES = ["All", "Electronics", "Apparel", "Home Goods"];
const SUPPLIERS  = ["All", "TechCorp Ltd", "FabriX Pvt", "HomeBase Co", "StyleHouse"];

function getStockStatus(inStock, reorderAt) {
  if (inStock === 0)            return "Out of Stock";
  if (inStock <= reorderAt)     return "Low Stock";
  return "In Stock";
}

function StockBar({ value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
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
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState("All");
  const [supplier, setSupplier]   = useState("All");
  const [onlyLow, setOnlyLow]     = useState(false);
  const [sortKey, setSortKey]     = useState("id");
  const [sortDir, setSortDir]     = useState("asc");

  const totalSKUs   = STOCKS.length;
  const totalUnits  = STOCKS.reduce((s, i) => s + i.inStock, 0);
  const needReorder = STOCKS.filter((i) => i.inStock <= i.reorderAt).length;
  const outOfStock  = STOCKS.filter((i) => i.inStock === 0).length;

  const filtered = STOCKS
    .filter((s) => {
      const q = search.toLowerCase();
      const matchSearch   = s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.supplier.toLowerCase().includes(q);
      const matchCategory = category === "All" || s.category === category;
      const matchSupplier = supplier === "All" || s.supplier === supplier;
      const matchLow      = !onlyLow || s.inStock <= s.reorderAt;
      return matchSearch && matchCategory && matchSupplier && matchLow;
    })
    .sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (["inStock","reserved","sold","reorderAt","reorderQty"].includes(sortKey)) { va = Number(va); vb = Number(vb); }
      else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
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

  const maxStock = Math.max(...STOCKS.map((s) => s.inStock + s.reserved));

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
          <p style={{ fontSize: "13px", color: t.textMuted, marginTop: "4px" }}>Monitor stock levels, reorder points, and supplier info</p>
        </div>

        <div className="stk-stat-grid">
          <StatCard label="Total SKUs"    value={totalSKUs}                      sub="being tracked" />
          <StatCard label="Total Units"   value={totalUnits.toLocaleString("en-IN")} sub="in warehouse" />
          <StatCard label="Need Reorder"  value={needReorder} trend={`${needReorder} SKUs`} trendDir="neu" sub="at/below threshold" />
          <StatCard label="Out of Stock"  value={outOfStock}  trend={`${outOfStock} SKUs`}  trendDir="down" sub="zero inventory" />
        </div>

        <div style={{
          borderRadius: "16px", padding: "20px", background: t.bgCard,
          border: `1px solid ${t.border}`, transition: "background 0.25s ease, border-color 0.25s ease",
          display: "flex", flexDirection: "column", gap: "16px",
        }}>
          {/* Filters */}
          <div className="stk-filters">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SKU, product, supplier…" style={{ ...inputStyle, flex: "1 1 200px", minWidth: "160px" }} />
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select value={supplier} onChange={(e) => setSupplier(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {SUPPLIERS.map((s) => <option key={s}>{s}</option>)}
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

            <span style={{ fontSize: "11px", color: t.textMuted, marginLeft: "auto" }}>{filtered.length} of {STOCKS.length} SKUs</span>
          </div>

          {/* Table */}
          <div className="stk-table-wrap">
            <table className="stk-table">
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                  {[
                    { key: "id",         label: "SKU"        },
                    { key: "name",       label: "Product"    },
                    { key: "category",   label: "Category"   },
                    { key: "inStock",    label: "In Stock"   },
                    { key: "reserved",   label: "Reserved"   },
                    { key: "sold",       label: "Total Sold" },
                    { key: "reorderAt",  label: "Reorder At" },
                    { key: "supplier",   label: "Supplier"   },
                    { key: "cost",       label: "Unit Cost"  },
                    { key: "lastRestock",label: "Restocked"  },
                    { key: "_status",    label: "Status"     },
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
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} style={{ textAlign: "center", padding: "40px 0", color: t.textMuted, fontSize: "13px" }}>No stocks match your filters.</td></tr>
                ) : filtered.map((s, i) => {
                  const stockStatus = getStockStatus(s.inStock, s.reorderAt);
                  const barColor = s.inStock === 0 ? t.red : s.inStock <= s.reorderAt ? t.orange : t.green;
                  return (
                    <tr key={s.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${t.borderLight ?? t.border}` : "none" }}>
                      <td style={{ padding: "10px 16px 10px 0", fontFamily: "monospace", fontSize: "11px", color: t.textMuted }}>{s.id}</td>
                      <td style={{ padding: "10px 16px 10px 0", fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>{s.name}</td>
                      <td style={{ padding: "10px 16px 10px 0", fontSize: "11px", color: t.textMuted }}>{s.category}</td>
                      <td style={{ padding: "10px 16px 10px 0", minWidth: 90 }}>
                        <div style={{ fontWeight: 700, color: barColor, fontFamily: "'Syne', sans-serif", marginBottom: 4 }}>{s.inStock.toLocaleString("en-IN")}</div>
                        <StockBar value={s.inStock} max={maxStock} color={barColor} />
                      </td>
                      <td style={{ padding: "10px 16px 10px 0", fontSize: "11px", color: t.textMuted }}>{s.reserved}</td>
                      <td style={{ padding: "10px 16px 10px 0", fontWeight: 600, color: t.textPrimary, fontFamily: "'Syne', sans-serif" }}>{s.sold.toLocaleString("en-IN")}</td>
                      <td style={{ padding: "10px 16px 10px 0", fontSize: "11px", color: t.textMuted }}>{s.reorderAt}</td>
                      <td style={{ padding: "10px 16px 10px 0", fontSize: "11px", color: t.textMuted, whiteSpace: "nowrap" }}>{s.supplier}</td>
                      <td style={{ padding: "10px 16px 10px 0", fontWeight: 600, color: t.textPrimary }}>{s.cost}</td>
                      <td style={{ padding: "10px 16px 10px 0", fontSize: "11px", color: t.textMuted, whiteSpace: "nowrap" }}>{s.lastRestock}</td>
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