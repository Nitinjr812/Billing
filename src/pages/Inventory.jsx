import { useState } from "react";
import { useTheme } from "../components/ThemeContext";

// ─── DUMMY DATA ───────────────────────────────────────────────────────────────
const INVENTORY = [
  { id: "SKU-001", name: "Prod-Alpha",  category: "Electronics", qty: 420, price: "₹1,200", cost: "₹850",  status: "In Stock",    lastUpdated: "12 May" },
  { id: "SKU-002", name: "Prod-Beta",   category: "Apparel",     qty: 280, price: "₹650",   cost: "₹390",  status: "In Stock",    lastUpdated: "11 May" },
  { id: "SKU-003", name: "Prod-Gamma",  category: "Electronics", qty: 610, price: "₹3,400", cost: "₹2,100",status: "In Stock",    lastUpdated: "10 May" },
  { id: "SKU-004", name: "Prod-Delta",  category: "Home Goods",  qty: 190, price: "₹980",   cost: "₹540",  status: "Low Stock",   lastUpdated: "09 May" },
  { id: "SKU-005", name: "Prod-Sigma",  category: "Apparel",     qty: 380, price: "₹1,750", cost: "₹1,050",status: "In Stock",    lastUpdated: "08 May" },
  { id: "SKU-006", name: "Prod-Zeta",   category: "Home Goods",  qty: 42,  price: "₹2,300", cost: "₹1,400",status: "Low Stock",   lastUpdated: "07 May" },
  { id: "SKU-007", name: "Prod-Omega",  category: "Electronics", qty: 0,   price: "₹5,600", cost: "₹3,800",status: "Out of Stock", lastUpdated: "05 May" },
  { id: "SKU-008", name: "Prod-Lambda", category: "Apparel",     qty: 815, price: "₹420",   cost: "₹210",  status: "In Stock",    lastUpdated: "04 May" },
  { id: "SKU-009", name: "Prod-Theta",  category: "Home Goods",  qty: 28,  price: "₹1,100", cost: "₹620",  status: "Low Stock",   lastUpdated: "03 May" },
  { id: "SKU-010", name: "Prod-Kappa",  category: "Electronics", qty: 0,   price: "₹8,900", cost: "₹6,200",status: "Out of Stock", lastUpdated: "01 May" },
  { id: "SKU-011", name: "Prod-Phi",    category: "Apparel",     qty: 330, price: "₹550",   cost: "₹280",  status: "In Stock",    lastUpdated: "30 Apr" },
  { id: "SKU-012", name: "Prod-Psi",    category: "Home Goods",  qty: 177, price: "₹780",   cost: "₹430",  status: "In Stock",    lastUpdated: "29 Apr" },
];

const CATEGORIES = ["All", "Electronics", "Apparel", "Home Goods"];
const STATUSES   = ["All", "In Stock", "Low Stock", "Out of Stock"];

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, trend, trendDir, sub }) {
  const { t } = useTheme();
  const colors = { up: t.green, down: t.red, neu: t.orange };
  const bgs    = { up: t.greenBg, down: t.redBg, neu: t.orangeBg };

  return (
    <div style={{
      borderRadius: "16px", padding: "20px", display: "flex",
      flexDirection: "column", gap: "10px",
      background: t.bgCard, border: `1px solid ${t.border}`,
      transition: "background 0.25s ease, border-color 0.25s ease",
    }}>
      <p style={{
        fontSize: "10px", fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.1em", color: t.textMuted, fontFamily: "'DM Sans', sans-serif",
      }}>{label}</p>
      <p style={{
        fontFamily: "'Syne', sans-serif", fontSize: "26px", fontWeight: 900,
        color: t.textPrimary, letterSpacing: "-0.03em", lineHeight: 1,
      }}>{value}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {trend && (
          <span style={{
            fontSize: "11px", fontWeight: 600, padding: "3px 10px",
            borderRadius: "99px", color: colors[trendDir], background: bgs[trendDir],
          }}>{trend}</span>
        )}
        {sub && <span style={{ fontSize: "11px", color: t.textMuted }}>{sub}</span>}
      </div>
    </div>
  );
}

// ─── INVENTORY PAGE ───────────────────────────────────────────────────────────
export default function Inventory() {
  const { t } = useTheme();
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus]     = useState("All");
  const [sortKey, setSortKey]   = useState("name");
  const [sortDir, setSortDir]   = useState("asc");

  // Stats
  const totalSKUs    = INVENTORY.length;
  const totalQty     = INVENTORY.reduce((s, i) => s + i.qty, 0);
  const lowStock     = INVENTORY.filter((i) => i.status === "Low Stock").length;
  const outOfStock   = INVENTORY.filter((i) => i.status === "Out of Stock").length;

  // Filter + Sort
  const filtered = INVENTORY
    .filter((item) => {
      const matchSearch   = item.name.toLowerCase().includes(search.toLowerCase()) ||
                            item.id.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === "All" || item.category === category;
      const matchStatus   = status   === "All" || item.status   === status;
      return matchSearch && matchCategory && matchStatus;
    })
    .sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === "qty") { va = Number(va); vb = Number(vb); }
      else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ?  1 : -1;
      return 0;
    });

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const statusStyle = {
    "In Stock":    { color: t.green,  bg: t.greenBg  },
    "Low Stock":   { color: t.orange, bg: t.orangeBg },
    "Out of Stock":{ color: t.red,    bg: t.redBg    },
  };

  const inputStyle = {
    background: t.bgCard,
    border: `1px solid ${t.border}`,
    color: t.textPrimary,
    borderRadius: "10px",
    padding: "8px 14px",
    fontSize: "12px",
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    transition: "border-color 0.2s",
  };

  const SortArrow = ({ col }) => {
    if (sortKey !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4, color: t.accent }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <>
      <style>{`
        .inv-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap: 12px; }
        .inv-filters   { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
        .inv-table-wrap { overflow-x: auto; }
        .inv-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .inv-table th { cursor: pointer; user-select: none; }
        .inv-table th:hover { opacity: 0.8; }
        @media (max-width: 640px) {
          .inv-stat-grid { grid-template-columns: repeat(2,1fr); }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Header */}
        <div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontSize: "28px", fontWeight: 900,
            color: t.textPrimary, letterSpacing: "-0.03em",
            transition: "color 0.25s ease",
          }}>Inventory</h1>
          <p style={{ fontSize: "13px", color: t.textMuted, marginTop: "4px" }}>
            Manage your product stock, SKUs, and availability
          </p>
        </div>

        {/* Stat Cards */}
        <div className="inv-stat-grid">
          <StatCard label="Total SKUs"     value={totalSKUs}              sub="products tracked"      />
          <StatCard label="Total Qty"      value={totalQty.toLocaleString("en-IN")} sub="units in store" />
          <StatCard label="Low Stock"      value={lowStock}  trend={`${lowStock} items`}  trendDir="neu" sub="need reorder" />
          <StatCard label="Out of Stock"   value={outOfStock} trend={`${outOfStock} items`} trendDir="down" sub="unavailable" />
        </div>

        {/* Table Card */}
        <div style={{
          borderRadius: "16px", padding: "20px",
          background: t.bgCard, border: `1px solid ${t.border}`,
          transition: "background 0.25s ease, border-color 0.25s ease",
          display: "flex", flexDirection: "column", gap: "16px",
        }}>

          {/* Filters */}
          <div className="inv-filters">
            {/* Search */}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or SKU…"
              style={{ ...inputStyle, flex: "1 1 200px", minWidth: "160px" }}
            />

            {/* Category */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>

            {/* Status */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>

            <span style={{ fontSize: "11px", color: t.textMuted, marginLeft: "auto" }}>
              {filtered.length} of {INVENTORY.length} items
            </span>
          </div>

          {/* Table */}
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                  {[
                    { key: "id",          label: "SKU"      },
                    { key: "name",        label: "Product"  },
                    { key: "category",    label: "Category" },
                    { key: "qty",         label: "Qty"      },
                    { key: "price",       label: "Price"    },
                    { key: "cost",        label: "Cost"     },
                    { key: "status",      label: "Status"   },
                    { key: "lastUpdated", label: "Updated"  },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      style={{
                        textAlign: "left", paddingBottom: "10px",
                        fontSize: "10px", fontWeight: 600,
                        textTransform: "uppercase", letterSpacing: "0.08em",
                        color: t.textMuted, fontFamily: "'DM Sans', sans-serif",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}<SortArrow col={key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{
                      textAlign: "center", padding: "40px 0",
                      color: t.textMuted, fontSize: "13px",
                    }}>No items match your filters.</td>
                  </tr>
                ) : filtered.map((item, i) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: i < filtered.length - 1
                        ? `1px solid ${t.borderLight ?? t.border}` : "none",
                    }}
                  >
                    <td style={{ padding: "10px 0 10px 0", fontFamily: "monospace", fontSize: "11px", color: t.textMuted, paddingRight: "16px" }}>
                      {item.id}
                    </td>
                    <td style={{ padding: "10px 16px 10px 0", fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
                      {item.name}
                    </td>
                    <td style={{ padding: "10px 16px 10px 0", fontSize: "11px", color: t.textMuted }}>
                      {item.category}
                    </td>
                    <td style={{ padding: "10px 16px 10px 0", fontWeight: 700, color: item.qty === 0 ? t.red : item.qty < 50 ? t.orange : t.textPrimary, fontFamily: "'Syne', sans-serif" }}>
                      {item.qty.toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "10px 16px 10px 0", fontWeight: 600, color: t.textPrimary }}>
                      {item.price}
                    </td>
                    <td style={{ padding: "10px 16px 10px 0", fontSize: "11px", color: t.textMuted }}>
                      {item.cost}
                    </td>
                    <td style={{ padding: "10px 16px 10px 0" }}>
                      <span style={{
                        fontSize: "10px", fontWeight: 600,
                        padding: "3px 9px", borderRadius: "99px",
                        color: statusStyle[item.status].color,
                        background: statusStyle[item.status].bg,
                        whiteSpace: "nowrap",
                      }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px 0", fontSize: "11px", color: t.textMuted }}>
                      {item.lastUpdated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </>
  );
}