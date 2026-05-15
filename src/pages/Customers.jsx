import { useState } from "react";
import { useTheme } from "../components/ThemeContext";

// ─── DUMMY DATA ───────────────────────────────────────────────────────────────
const CUSTOMERS = [
  { id: "CUS-001", name: "Arjun Sharma",   email: "arjun@email.com",   phone: "+91 98201 11234", city: "Mumbai",    segment: "Premium",  orders: 12, spent: "₹48,200",  status: "Active",   joined: "12 Jan 2024" },
  { id: "CUS-002", name: "Priya Verma",    email: "priya@email.com",   phone: "+91 97302 22345", city: "Delhi",     segment: "Regular",  orders: 5,  spent: "₹12,750",  status: "Active",   joined: "03 Feb 2024" },
  { id: "CUS-003", name: "Ravi Patel",     email: "ravi@email.com",    phone: "+91 96403 33456", city: "Ahmedabad", segment: "Premium",  orders: 19, spent: "₹91,400",  status: "Active",   joined: "18 Nov 2023" },
  { id: "CUS-004", name: "Sneha Mehta",    email: "sneha@email.com",   phone: "+91 95504 44567", city: "Pune",      segment: "Regular",  orders: 3,  spent: "₹8,300",   status: "Inactive", joined: "25 Mar 2024" },
  { id: "CUS-005", name: "Vikram Das",     email: "vikram@email.com",  phone: "+91 94605 55678", city: "Kolkata",   segment: "New",      orders: 1,  spent: "₹9,800",   status: "Active",   joined: "08 May 2024" },
  { id: "CUS-006", name: "Ananya Rao",     email: "ananya@email.com",  phone: "+91 93706 66789", city: "Hyderabad", segment: "Premium",  orders: 22, spent: "₹1,24,600",status: "Active",   joined: "01 Sep 2023" },
  { id: "CUS-007", name: "Karan Joshi",    email: "karan@email.com",   phone: "+91 92807 77890", city: "Jaipur",    segment: "Regular",  orders: 7,  spent: "₹19,300",  status: "Inactive", joined: "14 Dec 2023" },
  { id: "CUS-008", name: "Meera Nair",     email: "meera@email.com",   phone: "+91 91908 88901", city: "Kochi",     segment: "Regular",  orders: 9,  spent: "₹27,800",  status: "Active",   joined: "22 Oct 2023" },
  { id: "CUS-009", name: "Rohit Gupta",    email: "rohit@email.com",   phone: "+91 90009 99012", city: "Lucknow",   segment: "New",      orders: 2,  spent: "₹5,600",   status: "Active",   joined: "30 Apr 2024" },
  { id: "CUS-010", name: "Divya Singh",    email: "divya@email.com",   phone: "+91 89110 10123", city: "Chennai",   segment: "Premium",  orders: 16, spent: "₹73,200",  status: "Active",   joined: "07 Jul 2023" },
  { id: "CUS-011", name: "Aditya Kumar",   email: "aditya@email.com",  phone: "+91 88211 21234", city: "Bengaluru", segment: "Regular",  orders: 6,  spent: "₹16,500",  status: "Active",   joined: "19 Feb 2024" },
  { id: "CUS-012", name: "Pooja Iyer",     email: "pooja@email.com",   phone: "+91 87312 32345", city: "Coimbatore",segment: "New",      orders: 1,  spent: "₹2,340",   status: "Inactive", joined: "02 May 2024" },
  { id: "CUS-013", name: "Siddharth Roy",  email: "sid@email.com",     phone: "+91 86413 43456", city: "Bhopal",    segment: "Regular",  orders: 4,  spent: "₹11,200",  status: "Active",   joined: "11 Aug 2023" },
  { id: "CUS-014", name: "Kavya Reddy",    email: "kavya@email.com",   phone: "+91 85514 54567", city: "Vijayawada",segment: "Premium",  orders: 14, spent: "₹58,900",  status: "Active",   joined: "29 Jun 2023" },
  { id: "CUS-015", name: "Nikhil Bansal",  email: "nikhil@email.com",  phone: "+91 84615 65678", city: "Chandigarh",segment: "New",      orders: 2,  spent: "₹13,600",  status: "Active",   joined: "14 May 2024" },
];

const SEGMENTS = ["All", "Premium", "Regular", "New"];
const STATUSES = ["All", "Active", "Inactive"];

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
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316"];
  const color = colors[name.charCodeAt(0) % colors.length];
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
  const [search, setSearch]     = useState("");
  const [segment, setSegment]   = useState("All");
  const [status, setStatus]     = useState("All");
  const [sortKey, setSortKey]   = useState("id");
  const [sortDir, setSortDir]   = useState("asc");

  const total    = CUSTOMERS.length;
  const active   = CUSTOMERS.filter((c) => c.status === "Active").length;
  const premium  = CUSTOMERS.filter((c) => c.segment === "Premium").length;
  const newCusts = CUSTOMERS.filter((c) => c.segment === "New").length;

  const filtered = CUSTOMERS
    .filter((c) => {
      const q = search.toLowerCase();
      const matchSearch  = c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.city.toLowerCase().includes(q);
      const matchSegment = segment === "All" || c.segment === segment;
      const matchStatus  = status  === "All" || c.status  === status;
      return matchSearch && matchSegment && matchStatus;
    })
    .sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === "orders") { va = Number(va); vb = Number(vb); }
      else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
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
          <p style={{ fontSize: "13px", color: t.textMuted, marginTop: "4px" }}>View and manage your customer base</p>
        </div>

        <div className="cus-stat-grid">
          <StatCard label="Total Customers" value={total}   sub="registered"       />
          <StatCard label="Active"          value={active}  trend={`${active} active`}   trendDir="up"  sub="this month" />
          <StatCard label="Premium"         value={premium} trend={`${premium} members`} trendDir="neu" sub="top spenders" />
          <StatCard label="New This Month"  value={newCusts} trend={`+${newCusts} new`}  trendDir="up"  sub="joined recently" />
        </div>

        <div style={{
          borderRadius: "16px", padding: "20px", background: t.bgCard,
          border: `1px solid ${t.border}`, transition: "background 0.25s ease, border-color 0.25s ease",
          display: "flex", flexDirection: "column", gap: "16px",
        }}>
          <div className="cus-filters">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, city…" style={{ ...inputStyle, flex: "1 1 200px", minWidth: "160px" }} />
            <select value={segment} onChange={(e) => setSegment(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {SEGMENTS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <span style={{ fontSize: "11px", color: t.textMuted, marginLeft: "auto" }}>{filtered.length} of {CUSTOMERS.length} customers</span>
          </div>

          <div className="cus-table-wrap">
            <table className="cus-table">
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                  {[
                    { key: "id",      label: "ID"       },
                    { key: "name",    label: "Customer" },
                    { key: "email",   label: "Email"    },
                    { key: "city",    label: "City"     },
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
                {filtered.length === 0 ? (
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
                    <td style={{ padding: "10px 16px 10px 0", fontSize: "11px", color: t.textMuted }}>{c.email}</td>
                    <td style={{ padding: "10px 16px 10px 0", fontSize: "11px", color: t.textMuted }}>{c.city}</td>
                    <td style={{ padding: "10px 16px 10px 0" }}>
                      <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 9px", borderRadius: "99px", color: segmentStyle[c.segment].color, background: segmentStyle[c.segment].bg, whiteSpace: "nowrap" }}>{c.segment}</span>
                    </td>
                    <td style={{ padding: "10px 16px 10px 0", fontWeight: 700, color: t.textPrimary, fontFamily: "'Syne', sans-serif" }}>{c.orders}</td>
                    <td style={{ padding: "10px 16px 10px 0", fontWeight: 700, color: t.textPrimary, fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap" }}>{c.spent}</td>
                    <td style={{ padding: "10px 16px 10px 0" }}>
                      <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 9px", borderRadius: "99px", color: statusStyle[c.status].color, background: statusStyle[c.status].bg }}>{c.status}</span>
                    </td>
                    <td style={{ padding: "10px 0", fontSize: "11px", color: t.textMuted, whiteSpace: "nowrap" }}>{c.joined}</td>
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