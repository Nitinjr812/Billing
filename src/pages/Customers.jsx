import { useState, useEffect } from "react";
import { useTheme } from "../components/ThemeContext";

const BACKEND = "https://billing-backend-tawny.vercel.app";

const SEGMENTS = ["All", "Premium", "Regular", "New"];
const STATUSES = ["All", "Active", "Inactive"];

const ACTIVE_WINDOW_DAYS = 60;
const PREMIUM_SPEND_THRESHOLD = 50000;

// ─── helpers ────────────────────────────────────────────────────────────
function daysBetween(a, b) {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function formatDate(d) {
  return d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

function inr(n) {
  return "₹" + (Number(n) || 0).toLocaleString("en-IN");
}

// Group invoices into one row per customer (keyed by email, falling back to name)
function aggregateCustomers(invoices) {
  const groups = new Map();

  invoices.forEach((inv) => {
    const key = (inv.customerEmail || inv.customerName || "unknown").toLowerCase();
    const createdAt = inv.createdAt ? new Date(inv.createdAt) : null;

    if (!groups.has(key)) {
      groups.set(key, {
        name: inv.customerName || "Unknown",
        email: inv.customerEmail || "",
        phone: inv.customerPhone || "",
        orders: 0,
        spent: 0,
        joined: createdAt,
        lastOrder: createdAt,
      });
    }

    const g = groups.get(key);
    g.orders += 1;
    g.spent += Number(inv.total) || 0;
    if (createdAt && (!g.joined || createdAt < g.joined)) g.joined = createdAt;
    if (createdAt && (!g.lastOrder || createdAt > g.lastOrder)) g.lastOrder = createdAt;
    // keep the most recent name/email/phone in case of updates
    if (createdAt && g.lastOrder && createdAt.getTime() === g.lastOrder.getTime()) {
      g.name = inv.customerName || g.name;
      g.phone = inv.customerPhone || g.phone;
    }
  });

  const now = new Date();
  return [...groups.entries()].map(([key, g], idx) => {
    const status = g.lastOrder && daysBetween(now, g.lastOrder) <= ACTIVE_WINDOW_DAYS ? "Active" : "Inactive";
    const segment = g.orders <= 1 ? "New" : g.spent >= PREMIUM_SPEND_THRESHOLD ? "Premium" : "Regular";
    return {
      id: `CUS-${String(idx + 1).padStart(3, "0")}`,
      key,
      name: g.name,
      email: g.email,
      phone: g.phone,
      orders: g.orders,
      spent: g.spent,
      status,
      segment,
      joined: g.joined,
    };
  });
}

// ─── live customers hook (derived from real invoices) ─────────────────────
function useCustomersData(pollMs = 60000) {
  const [state, setState] = useState({ loading: true, error: null, customers: [] });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${BACKEND}/api/invoices`);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const invoices = await res.json();
        const customers = aggregateCustomers(Array.isArray(invoices) ? invoices : []);
        if (!cancelled) {
          setState({ loading: false, error: null, customers });
        }
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, error: "Live customer data unavailable right now." }));
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
      <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, fontFamily: "'DM Sans', sans-serif" }}>{label}</p>
      <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "26px", fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {trend && <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", color: colors[trendDir], background: bgs[trendDir] }}>{trend}</span>}
        {sub && <span style={{ fontSize: "11px", color: t.textMuted }}>{sub}</span>}
      </div>
    </div>
  );
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────
function Avatar({ name, t }) {
  const initials = (name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316"];
  const color = colors[(name || "?").charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: 30, height: 30, borderRadius: "50%",
      background: `${color}22`, border: `1.5px solid ${color}55`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "10px", fontWeight: 700, color, flexShrink: 0,
      fontFamily: "'DM Sans', sans-serif",
    }}>{initials}</div>
  );
}

// ─── CUSTOMERS PAGE ───────────────────────────────────────────────────────────
export default function Customers() {
  const { t } = useTheme();
  const { loading, error, customers } = useCustomersData();

  const [search, setSearch]     = useState("");
  const [segment, setSegment]   = useState("All");
  const [status, setStatus]     = useState("All");
  const [sortKey, setSortKey]   = useState("orders");
  const [sortDir, setSortDir]   = useState("desc");

  const now = new Date();
  const total    = customers.length;
  const active   = customers.filter((c) => c.status === "Active").length;
  const premium  = customers.filter((c) => c.segment === "Premium").length;
  const newCusts = customers.filter((c) => c.joined && c.joined.getMonth() === now.getMonth() && c.joined.getFullYear() === now.getFullYear()).length;

  const filtered = customers
    .filter((c) => {
      const q = search.toLowerCase();
      const matchSearch  = (c.name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || (c.phone || "").toLowerCase().includes(q);
      const matchSegment = segment === "All" || c.segment === segment;
      const matchStatus  = status  === "All" || c.status  === status;
      return matchSearch && matchSegment && matchStatus;
    })
    .sort((a, b) => {
      if (sortKey === "orders" || sortKey === "spent") {
        const va = Number(a[sortKey]) || 0;
        const vb = Number(b[sortKey]) || 0;
        return sortDir === "asc" ? va - vb : vb - va;
      }
      if (sortKey === "joined") {
        const va = a.joined?.getTime() || 0;
        const vb = b.joined?.getTime() || 0;
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

  const segmentStyle = {
    Premium: { color: "#a855f7", bg: "#a855f718" },
    Regular: { color: t.blue,   bg: `${t.blue}18` },
    New:     { color: t.green,  bg: t.greenBg },
  };
  const statusStyle = {
    Active:   { color: t.green,  bg: t.greenBg },
    Inactive: { color: t.red,    bg: t.redBg   },
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

  return (
    <>
      <style>{`
        .cus-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap: 12px; }
        .cus-filters   { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
        .cus-table-wrap { overflow-x: auto; }
        .cus-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .cus-table th { cursor: pointer; user-select: none; }
        .cus-table th:hover { opacity: 0.8; }
        @media (max-width: 640px) { .cus-stat-grid { grid-template-columns: repeat(2,1fr); } }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "28px", fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em", transition: "color 0.25s ease" }}>Customers</h1>
          <p style={{ fontSize: "13px", color: t.textMuted, marginTop: "4px" }}>
            {error ? error : "View and manage your customer base"}
          </p>
        </div>

        <div className="cus-stat-grid">
          <StatCard label="Total Customers" value={loading ? "…" : total}    sub="registered"       />
          <StatCard label="Active"          value={loading ? "…" : active}  trend={loading ? undefined : `${active} active`}   trendDir="up"  sub="last 60 days" />
          <StatCard label="Premium"         value={loading ? "…" : premium} trend={loading ? undefined : `${premium} members`} trendDir="neu" sub="top spenders" />
          <StatCard label="New This Month"  value={loading ? "…" : newCusts} trend={loading ? undefined : `+${newCusts} new`}  trendDir="up"  sub="joined recently" />
        </div>

        <div style={{
          borderRadius: "16px", padding: "20px", background: t.bgCard,
          border: `1px solid ${t.border}`, transition: "background 0.25s ease, border-color 0.25s ease",
          display: "flex", flexDirection: "column", gap: "16px",
        }}>
          <div className="cus-filters">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone…" style={{ ...inputStyle, flex: "1 1 200px", minWidth: "160px" }} />
            <select value={segment} onChange={(e) => setSegment(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {SEGMENTS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <span style={{ fontSize: "11px", color: t.textMuted, marginLeft: "auto" }}>
              {loading ? "Loading…" : `${filtered.length} of ${customers.length} customers`}
            </span>
          </div>

          <div className="cus-table-wrap">
            <table className="cus-table">
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                  {[
                    { key: "id",      label: "ID"       },
                    { key: "name",    label: "Customer" },
                    { key: "email",   label: "Email"    },
                    { key: "phone",   label: "Phone"    },
                    { key: "segment", label: "Segment"  },
                    { key: "orders",  label: "Orders"   },
                    { key: "spent",   label: "Spent"    },
                    { key: "status",  label: "Status"   },
                    { key: "joined",  label: "Joined"   },
                  ].map(({ key, label }) => (
                    <th key={key} onClick={() => handleSort(key)} style={{
                      textAlign: "left", paddingBottom: "10px", fontSize: "10px", fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMuted,
                      fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", paddingRight: "16px",
                    }}>
                      {label}<SortArrow col={key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px 0", color: t.textMuted, fontSize: "13px" }}>Loading customers…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px 0", color: t.textMuted, fontSize: "13px" }}>No customers match your filters.</td></tr>
                ) : filtered.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${t.borderLight ?? t.border}` : "none" }}>
                    <td style={{ padding: "10px 16px 10px 0", fontFamily: "monospace", fontSize: "11px", color: t.textMuted }}>{c.id}</td>
                    <td style={{ padding: "10px 16px 10px 0", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Avatar name={c.name} t={t} />
                        <span style={{ fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 16px 10px 0", fontSize: "11px", color: t.textMuted }}>{c.email || "—"}</td>
                    <td style={{ padding: "10px 16px 10px 0", fontSize: "11px", color: t.textMuted, whiteSpace: "nowrap" }}>{c.phone || "—"}</td>
                    <td style={{ padding: "10px 16px 10px 0" }}>
                      <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 9px", borderRadius: "99px", color: segmentStyle[c.segment].color, background: segmentStyle[c.segment].bg, whiteSpace: "nowrap" }}>{c.segment}</span>
                    </td>
                    <td style={{ padding: "10px 16px 10px 0", fontWeight: 700, color: t.textPrimary, fontFamily: "'Syne', sans-serif" }}>{c.orders}</td>
                    <td style={{ padding: "10px 16px 10px 0", fontWeight: 700, color: t.textPrimary, fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap" }}>{inr(c.spent)}</td>
                    <td style={{ padding: "10px 16px 10px 0" }}>
                      <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 9px", borderRadius: "99px", color: statusStyle[c.status].color, background: statusStyle[c.status].bg }}>{c.status}</span>
                    </td>
                    <td style={{ padding: "10px 0", fontSize: "11px", color: t.textMuted, whiteSpace: "nowrap" }}>{formatDate(c.joined)}</td>
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