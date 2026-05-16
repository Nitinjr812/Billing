import { useState } from "react";
import { useTheme } from "../components/ThemeContext";

// ─── DUMMY DATA ───────────────────────────────────────────────────────────────
const SUPPLIERS = [
  { id: "SUP-001", name: "TechSource India", category: "Electronics", contact: "Ankit Joshi", email: "ankit@techsource.in", phone: "+91 98200 11234", location: "Mumbai, MH", status: "Active", totalOrders: 142, totalValue: "₹18,42,000", lastOrder: "10 May 2024", rating: 4.8, paymentTerms: "Net 30", outstanding: "₹2,40,000" },
  { id: "SUP-002", name: "FabricHub Pvt Ltd", category: "Apparel", contact: "Meena Rao", email: "meena@fabrichub.in", phone: "+91 90000 56789", location: "Bengaluru, KA", status: "Active", totalOrders: 98, totalValue: "₹9,85,500", lastOrder: "08 May 2024", rating: 4.5, paymentTerms: "Net 15", outstanding: "₹1,05,000" },
  { id: "SUP-003", name: "HomeDecor Wholesale", category: "Home Goods", contact: "Ramesh Gupta", email: "ramesh@homedecor.in", phone: "+91 88001 22334", location: "Delhi, DL", status: "Active", totalOrders: 76, totalValue: "₹7,20,800", lastOrder: "05 May 2024", rating: 4.2, paymentTerms: "Net 45", outstanding: "₹84,000" },
  { id: "SUP-004", name: "GadgetWorld Supplies", category: "Electronics", contact: "Pooja Nair", email: "pooja@gadgetworld.in", phone: "+91 77200 99100", location: "Hyderabad, TS", status: "On Hold", totalOrders: 55, totalValue: "₹6,60,000", lastOrder: "28 Apr 2024", rating: 3.9, paymentTerms: "Net 30", outstanding: "₹3,30,000" },
  { id: "SUP-005", name: "StyleCraft Textiles", category: "Apparel", contact: "Aryan Kapoor", email: "aryan@stylecraft.in", phone: "+91 99300 44512", location: "Surat, GJ", status: "Active", totalOrders: 110, totalValue: "₹11,20,000", lastOrder: "09 May 2024", rating: 4.6, paymentTerms: "Net 20", outstanding: "₹60,000" },
  { id: "SUP-006", name: "UrbanFurnish Co.", category: "Home Goods", contact: "Sunita Sharma", email: "sunita@urbanfurnish.in", phone: "+91 85100 67823", location: "Pune, MH", status: "Inactive", totalOrders: 34, totalValue: "₹3,40,000", lastOrder: "14 Mar 2024", rating: 3.5, paymentTerms: "Net 60", outstanding: "₹0" },
  { id: "SUP-007", name: "Nexus Electronics", category: "Electronics", contact: "Karan Mehta", email: "karan@nexuselec.in", phone: "+91 91500 33210", location: "Chennai, TN", status: "Active", totalOrders: 89, totalValue: "₹14,30,000", lastOrder: "11 May 2024", rating: 4.7, paymentTerms: "Net 30", outstanding: "₹1,80,000" },
  { id: "SUP-008", name: "WeaveMaster Mills", category: "Apparel", contact: "Divya Pillai", email: "divya@weavemaster.in", phone: "+91 93600 12980", location: "Coimbatore, TN", status: "Active", totalOrders: 63, totalValue: "₹5,67,000", lastOrder: "07 May 2024", rating: 4.3, paymentTerms: "Net 15", outstanding: "₹45,000" },
];

const CATEGORIES = ["All", "Electronics", "Apparel", "Home Goods"];
const STATUSES = ["All", "Active", "On Hold", "Inactive"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function StarRating({ rating, t }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ fontSize: "11px", color: s <= Math.round(rating) ? "#f59e0b" : t.border }}>★</span>
      ))}
      <span style={{ fontSize: "11px", color: t.textMuted, marginLeft: "2px" }}>{rating}</span>
    </div>
  );
}

function StatusBadge({ status, t }) {
  const map = { Active: { color: t.green, bg: t.greenBg }, "On Hold": { color: t.orange, bg: t.orangeBg }, Inactive: { color: t.red, bg: t.redBg } };
  const s = map[status] || map["Active"];
  return <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 9px", borderRadius: "99px", color: s.color, background: s.bg, whiteSpace: "nowrap" }}>{status}</span>;
}

function CategoryBadge({ category, t }) {
  const map = { Electronics: { color: t.blue, bg: `${t.blue}18` }, Apparel: { color: "#a855f7", bg: "#a855f718" }, "Home Goods": { color: t.orange, bg: t.orangeBg } };
  const s = map[category] || { color: t.accent, bg: `${t.accent}15` };
  return <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 9px", borderRadius: "99px", color: s.color, background: s.bg, whiteSpace: "nowrap" }}>{category}</span>;
}

// ─── DRAWER ───────────────────────────────────────────────────────────────────
function SupplierDrawer({ supplier, onClose, t }) {
  if (!supplier) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(400px, 100vw)",
        background: t.bgCard, borderLeft: `1px solid ${t.border}`,
        zIndex: 51, overflowY: "auto",
        padding: "24px 20px",
        display: "flex", flexDirection: "column", gap: "18px",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{supplier.id}</p>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 900, color: t.textPrimary, margin: "4px 0 0", letterSpacing: "-0.02em", wordBreak: "break-word" }}>{supplier.name}</h2>
            <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
              <StatusBadge status={supplier.status} t={t} />
              <CategoryBadge category={supplier.category} t={t} />
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "10px", flexShrink: 0, background: `${t.accent}12`, border: `1px solid ${t.border}`, color: t.textMuted, cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[["Total Orders", supplier.totalOrders], ["Total Value", supplier.totalValue], ["Outstanding", supplier.outstanding], ["Payment Terms", supplier.paymentTerms]].map(([label, val]) => (
            <div key={label} style={{ background: `${t.accent}08`, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "12px 14px" }}>
              <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMuted, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{label}</p>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "16px", fontWeight: 900, color: t.textPrimary, margin: "4px 0 0", wordBreak: "break-word" }}>{val}</p>
            </div>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: "14px" }}>
          <p style={{ fontSize: "10px", fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px", fontFamily: "'DM Sans', sans-serif" }}>Supplier Rating</p>
          <StarRating rating={supplier.rating} t={t} />
        </div>

        <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <p style={{ fontSize: "10px", fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0, fontFamily: "'DM Sans', sans-serif" }}>Contact Details</p>
          {[["👤", "Contact", supplier.contact], ["✉️", "Email", supplier.email], ["📞", "Phone", supplier.phone], ["📍", "Location", supplier.location], ["🗓", "Last Order", supplier.lastOrder]].map(([icon, label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "12px", color: t.textMuted, fontFamily: "'DM Sans', sans-serif", flexShrink: 0, whiteSpace: "nowrap" }}>{icon} {label}</span>
              <span style={{ fontSize: "12px", color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, textAlign: "right", wordBreak: "break-all", minWidth: 0 }}>{val}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
          <button style={{ flex: 1, padding: "11px", borderRadius: "10px", background: t.accent, color: "#fff", border: "none", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>Create Order</button>
          <button style={{ flex: 1, padding: "11px", borderRadius: "10px", background: `${t.accent}12`, color: t.textPrimary, border: `1px solid ${t.border}`, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>Edit</button>
        </div>
      </div>
    </>
  );
}

// ─── MOBILE CARD ──────────────────────────────────────────────────────────────
function SupplierCard({ supplier, onClick, t }) {
  return (
    <div
      onClick={() => onClick(supplier)}
      style={{ padding: "16px", borderRadius: "14px", background: t.bgCard, border: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: "10px", cursor: "pointer", transition: "border-color 0.15s" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${t.accent}60`)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.border)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "14px", color: t.textPrimary, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{supplier.name}</p>
          <p style={{ fontSize: "10px", color: t.textMuted, margin: "2px 0 0", fontFamily: "monospace" }}>{supplier.id}</p>
        </div>
        <StatusBadge status={supplier.status} t={t} />
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <CategoryBadge category={supplier.category} t={t} />
        <span style={{ fontSize: "11px", color: t.textMuted }}>📍 {supplier.location}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${t.borderLight}`, paddingTop: "10px" }}>
        <div>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "15px", color: t.textPrimary, margin: 0 }}>{supplier.totalValue}</p>
          <p style={{ fontSize: "10px", color: t.textMuted, margin: "2px 0 0" }}>{supplier.totalOrders} orders</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <StarRating rating={supplier.rating} t={t} />
          <p style={{ fontSize: "10px", color: t.textMuted, margin: "3px 0 0" }}>{supplier.contact}</p>
        </div>
      </div>
    </div>
  );
}

// ─── DESKTOP TABLE ROW ────────────────────────────────────────────────────────
function SupplierRow({ supplier, onClick, t, isLast }) {
  return (
    <tr
      onClick={() => onClick(supplier)}
      style={{ borderBottom: !isLast ? `1px solid ${t.borderLight}` : "none", cursor: "pointer", transition: "background 0.15s" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = `${t.accent}06`)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <td style={{ padding: "14px 0" }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "13px", color: t.textPrimary, margin: 0 }}>{supplier.name}</p>
        <p style={{ fontSize: "10px", color: t.textMuted, margin: "2px 0 0", fontFamily: "monospace" }}>{supplier.id}</p>
      </td>
      <td style={{ padding: "14px 8px" }}><CategoryBadge category={supplier.category} t={t} /></td>
      <td style={{ padding: "14px 8px" }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: t.textPrimary, margin: 0, fontWeight: 500 }}>{supplier.contact}</p>
        <p style={{ fontSize: "11px", color: t.textMuted, margin: "1px 0 0" }}>{supplier.location}</p>
      </td>
      <td style={{ padding: "14px 8px" }}>
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px", color: t.textPrimary, margin: 0 }}>{supplier.totalValue}</p>
        <p style={{ fontSize: "10px", color: t.textMuted, margin: "1px 0 0" }}>{supplier.totalOrders} orders</p>
      </td>
      <td style={{ padding: "14px 8px" }}><StarRating rating={supplier.rating} t={t} /></td>
      <td style={{ padding: "14px 8px" }}><StatusBadge status={supplier.status} t={t} /></td>
      <td style={{ padding: "14px 0", textAlign: "right" }}><span style={{ fontSize: "16px", color: t.textMuted }}>›</span></td>
    </tr>
  );
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
function SummaryKpi({ label, value, sub, trendDir, t }) {
  const colors = { up: t.green, down: t.red, neu: t.orange };
  const bgs = { up: t.greenBg, down: t.redBg, neu: t.orangeBg };
  return (
    <div style={{ borderRadius: "16px", padding: "18px 20px", background: t.bgCard, border: `1px solid ${t.border}`, transition: "background 0.25s ease" }}>
      <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{label}</p>
      <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "24px", fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em", margin: "6px 0 6px", lineHeight: 1 }}>{value}</p>
      {sub && <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", color: colors[trendDir], background: bgs[trendDir] }}>{sub}</span>}
    </div>
  );
}

// ─── RESPONSIVE CSS ───────────────────────────────────────────────────────────
const styles = `
  .sup-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .sup-table-wrap { overflow-x: auto; }
  .sup-mobile-only { display: none; }
  .sup-desktop-only { display: block; }

  @media (max-width: 900px) {
    .sup-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .sup-kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .sup-mobile-only { display: flex; flex-direction: column; gap: 10px; }
    .sup-desktop-only { display: none; }
    .sup-filter-bar { flex-direction: column !important; align-items: stretch !important; }
    .sup-chips { overflow-x: auto; flex-wrap: nowrap !important; -webkit-overflow-scrolling: touch; padding-bottom: 2px; }
    .sup-chips::-webkit-scrollbar { display: none; }
    .sup-count { margin-left: 0 !important; }
  }
`;

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState({ t }) {
  return (
    <div style={{ padding: "48px 0", textAlign: "center" }}>
      <p style={{ fontSize: "32px", margin: "0 0 8px" }}>🔍</p>
      <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "16px", color: t.textPrimary, margin: 0 }}>No suppliers found</p>
      <p style={{ fontSize: "12px", color: t.textMuted, margin: "4px 0 0" }}>Try adjusting your search or filters</p>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Suppliers() {
  const { t } = useTheme();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selected, setSelected] = useState(null);

  const filtered = SUPPLIERS.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.contact.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "All" || s.category === catFilter;
    const matchStatus = statusFilter === "All" || s.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const activeCount = SUPPLIERS.filter((s) => s.status === "Active").length;

  return (
    <>
      <style>{styles}</style>
      <SupplierDrawer supplier={selected} onClose={() => setSelected(null)} t={t} />

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "28px", fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em", margin: 0, transition: "color 0.25s ease" }}>
              Suppliers
            </h1>
            <p style={{ fontSize: "13px", color: t.textMuted, marginTop: "4px", marginBottom: 0 }}>
              Manage your vendor relationships and purchase history
            </p>
          </div>
          <button style={{ padding: "10px 20px", borderRadius: "10px", background: t.accent, color: "#fff", border: "none", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap" }}>
            + Add Supplier
          </button>
        </div>

        {/* KPI Row */}
        <div className="sup-kpi-grid">
          <SummaryKpi label="Total Suppliers" value={SUPPLIERS.length} sub={`${activeCount} active`} trendDir="up" t={t} />
          <SummaryKpi label="Total Purchases" value="₹76,65,300" sub="All time" trendDir="up" t={t} />
          <SummaryKpi label="Outstanding" value="₹9,44,000" sub="3 overdue" trendDir="down" t={t} />
          <SummaryKpi label="Avg. Rating" value="4.4 ★" sub="across all" trendDir="neu" t={t} />
        </div>

        {/* Filters */}
        <div style={{ borderRadius: "16px", background: t.bgCard, border: `1px solid ${t.border}`, padding: "14px 16px", transition: "background 0.25s ease" }}>
          <div className="sup-filter-bar" style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>

            {/* Search */}
            <div style={{ position: "relative", flex: "1 1 180px", minWidth: 0 }}>
              <span style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: t.textMuted, pointerEvents: "none" }}>🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search suppliers…"
                style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: "10px", background: `${t.accent}08`, border: `1px solid ${t.border}`, color: t.textPrimary, fontSize: "12px", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Category chips */}
            <div className="sup-chips" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCatFilter(c)} style={{ fontSize: "11px", fontWeight: 600, padding: "6px 13px", borderRadius: "99px", background: catFilter === c ? t.accent : `${t.accent}12`, color: catFilter === c ? "#fff" : t.accent, border: catFilter === c ? "none" : `1px solid ${t.accent}28`, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0 }}>{c}</button>
              ))}
            </div>

            {/* Status chips */}
            <div className="sup-chips" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {STATUSES.map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)} style={{ fontSize: "11px", fontWeight: 600, padding: "6px 13px", borderRadius: "99px", background: statusFilter === s ? t.border : "transparent", color: statusFilter === s ? t.textPrimary : t.textMuted, border: `1px solid ${t.border}`, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0 }}>{s}</button>
              ))}
            </div>

            {/* Count */}
            <span className="sup-count" style={{ fontSize: "11px", color: t.textMuted, marginLeft: "auto", whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif" }}>
              {filtered.length} of {SUPPLIERS.length} suppliers
            </span>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="sup-desktop-only" style={{ borderRadius: "16px", background: t.bgCard, border: `1px solid ${t.border}`, padding: "20px", transition: "background 0.25s ease" }}>
          <div className="sup-table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                  {["Supplier", "Category", "Contact", "Total Value", "Rating", "Status", ""].map((h, i) => (
                    <th key={i} style={{ textAlign: "left", paddingBottom: "12px", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMuted, fontFamily: "'DM Sans', sans-serif", paddingRight: i < 6 ? "8px" : "0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0
                  ? filtered.map((s, i) => <SupplierRow key={s.id} supplier={s} onClick={setSelected} t={t} isLast={i === filtered.length - 1} />)
                  : <tr><td colSpan={7}><EmptyState t={t} /></td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="sup-mobile-only">
          {filtered.length > 0
            ? filtered.map((s) => <SupplierCard key={s.id} supplier={s} onClick={setSelected} t={t} />)
            : <EmptyState t={t} />
          }
        </div>

      </div>
    </>
  );
}