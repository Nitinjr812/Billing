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

// ─── ICONS — single stroke-set, used consistently across the page ────────
function Icon({ id, size = 14 }) {
  const paths = {
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20l-4.7-4.7" /></>,
    users: <><circle cx="8.5" cy="8.3" r="3" /><circle cx="16" cy="9.3" r="2.3" /><path d="M3 19.7c.8-3.1 2.9-4.9 5.5-4.9s4.7 1.8 5.5 4.9" /><path d="M14 15.2c1.9.4 3.4 2.1 3.9 4.5" /></>,
    pulse: <><path d="M3 12h4l2-7 4 14 2-7h6" /></>,
    star: <><path d="M12 3.5l2.6 5.5 6 .7-4.4 4.1 1.2 6-5.4-3-5.4 3 1.2-6-4.4-4.1 6-.7z" /></>,
    sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[id]}
    </svg>
  );
}

function StatCard({ label, value, trend, trendDir, sub, icon, loading }) {
  const { t } = useTheme();
  const colors = { up: t.green, down: t.red, neu: t.orange };
  const bgs    = { up: t.greenBg, down: t.redBg, neu: t.orangeBg };
  return (
    <div className="ui-card" style={{
      borderRadius: "16px", padding: "20px", display: "flex",
      flexDirection: "column", gap: "10px",
      background: t.bgCard, border: `1px solid ${t.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>{label}</p>
        <span style={{ color: `${t.accent}99`, display: "flex" }}><Icon id={icon} size={14} /></span>
      </div>
      {loading ? (
        <>
          <Skeleton width="50%" height={24} t={t} />
          <Skeleton width="65%" height={16} radius={99} t={t} />
        </>
      ) : (
        <>
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "26px", fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em", lineHeight: 1, margin: 0 }}>{value}</p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {trend && <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", color: colors[trendDir], background: bgs[trendDir] }}>{trend}</span>}
            {sub && <span style={{ fontSize: "11px", color: t.textMuted }}>{sub}</span>}
          </div>
        </>
      )}
    </div>
  );
}

// ─── SIGNATURE ELEMENT — the "official seal" mark, echoed across the
// product's identity: a dashed ring turning slowly around a customer's
// initials, like a stamp of standing on their account.
function SealAvatar({ name, t, size = 30 }) {
  const initials = (name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316"];
  const color = colors[(name || "?").charCodeAt(0) % colors.length];
  const ring = size + 10;
  return (
    <div style={{ position: "relative", width: ring, height: ring, flexShrink: 0 }}>
      <svg
        width={ring} height={ring} viewBox={`0 0 ${ring} ${ring}`}
        style={{ position: "absolute", inset: 0, animation: "sealSpin 18s linear infinite" }}
      >
        <circle
          cx={ring / 2} cy={ring / 2} r={ring / 2 - 1.2}
          fill="none" stroke={color} strokeOpacity="0.5"
          strokeWidth="1.2" strokeDasharray="2 3.6" strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: "absolute", top: 5, left: 5,
        width: size, height: size, borderRadius: "50%",
        background: `${color}22`, border: `1.5px solid ${color}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.34, fontWeight: 700, color, fontFamily: "'DM Sans', sans-serif",
      }}>{initials}</div>
    </div>
  );
}

// ─── SKELETON LOADER — shimmering placeholder shapes ──────────────────
function Skeleton({ width = "100%", height = 14, radius = 8, t, style = {} }) {
  return (
    <div
      className="ui-skeleton"
      style={{
        width, height, borderRadius: radius,
        background: `linear-gradient(90deg, ${t.border}55 25%, ${t.border}99 37%, ${t.border}55 63%)`,
        backgroundSize: "400% 100%",
        ...style,
      }}
    />
  );
}
function SkeletonCircle({ size = 30, t, style = {} }) {
  return <Skeleton width={size} height={size} radius="50%" t={t} style={style} />;
}

function SkeletonTableRow({ t, isLast }) {
  const cellPad = { padding: "10px 16px 10px 0" };
  return (
    <tr style={{ borderBottom: !isLast ? `1px solid ${t.borderLight ?? t.border}` : "none" }}>
      <td style={cellPad}><Skeleton width={60} height={10} t={t} /></td>
      <td style={cellPad}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SkeletonCircle size={30} t={t} />
          <Skeleton width={100} height={11} t={t} />
        </div>
      </td>
      <td style={cellPad}><Skeleton width={120} height={10} t={t} /></td>
      <td style={cellPad}><Skeleton width={90} height={10} t={t} /></td>
      <td style={cellPad}><Skeleton width={64} height={16} radius={99} t={t} /></td>
      <td style={cellPad}><Skeleton width={24} height={11} t={t} /></td>
      <td style={cellPad}><Skeleton width={70} height={11} t={t} /></td>
      <td style={cellPad}><Skeleton width={54} height={16} radius={99} t={t} /></td>
      <td style={{ padding: "10px 0" }}><Skeleton width={80} height={10} t={t} /></td>
    </tr>
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
    fontFamily: "'DM Sans', sans-serif", outline: "none",
    "--focus-ring": `${t.accent}33`,
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
        .cus-table th { cursor: pointer; user-select: none; transition: opacity 0.15s; }
        .cus-table th:hover { opacity: 0.8; }
        @media (max-width: 640px) { .cus-stat-grid { grid-template-columns: repeat(2,1fr); } }

        .ui-card { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.25s ease; }
        .ui-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.08); }

        .ui-input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .ui-input:focus { box-shadow: 0 0 0 3px var(--focus-ring, rgba(0,0,0,0.08)); border-color: ${t.accent}; }

        .ui-skeleton { animation: shimmer 1.4s ease-in-out infinite; }
        @keyframes shimmer {
          0% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes sealSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ui-card, .ui-input, .ui-skeleton { animation: none !important; transition: none !important; }
          .ui-card:hover { transform: none; }
          .cus-table tbody tr { animation: none !important; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "28px", fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em", transition: "color 0.25s ease" }}>Customers</h1>
          <p style={{ fontSize: "13px", color: t.textMuted, marginTop: "4px" }}>
            {error ? error : "View and manage your customer base"}
          </p>
        </div>

        <div className="cus-stat-grid">
          <StatCard label="Total Customers" icon="users"   value={total}    sub="registered"       loading={loading} />
          <StatCard label="Active"          icon="pulse"   value={active}  trend={`${active} active`}   trendDir="up"  sub="last 60 days"    loading={loading} />
          <StatCard label="Premium"         icon="star"    value={premium} trend={`${premium} members`} trendDir="neu" sub="top spenders"    loading={loading} />
          <StatCard label="New This Month"  icon="sparkle" value={newCusts} trend={`+${newCusts} new`}  trendDir="up"  sub="joined recently" loading={loading} />
        </div>

        <div className="ui-card" style={{
          borderRadius: "16px", padding: "20px", background: t.bgCard,
          border: `1px solid ${t.border}`,
          display: "flex", flexDirection: "column", gap: "16px",
        }}>
          <div className="cus-filters">
            <div style={{ position: "relative", flex: "1 1 200px", minWidth: "160px" }}>
              <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: t.textMuted, display: "flex", pointerEvents: "none" }}>
                <Icon id="search" size={13} />
              </span>
              <input
                className="ui-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, phone…"
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box", padding: "8px 14px 8px 32px" }}
              />
            </div>
            <select className="ui-input" value={segment} onChange={(e) => setSegment(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {SEGMENTS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select className="ui-input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
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
                  Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonTableRow key={i} t={t} isLast={i === 5} />
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "40px 0" }}>
                      <div style={{ display: "flex", justifyContent: "center", color: t.textMuted, marginBottom: 8 }}>
                        <Icon id="search" size={26} />
                      </div>
                      <p style={{ color: t.textMuted, fontSize: "13px", margin: 0 }}>No customers match your filters.</p>
                    </td>
                  </tr>
                ) : filtered.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${t.borderLight ?? t.border}` : "none", animation: "rowIn 0.2s ease" }}>
                    <td style={{ padding: "10px 16px 10px 0", fontFamily: "monospace", fontSize: "11px", color: t.textMuted }}>{c.id}</td>
                    <td style={{ padding: "10px 16px 10px 0", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <SealAvatar name={c.name} t={t} />
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