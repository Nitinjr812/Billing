import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperAdminAuth } from "../context/SuperAdminAuthContext";
import { useSuperAdminUI } from "../context/SuperAdminUIContext";
import { useTheme } from "../components/ThemeContext";
import SuperAdminShopModal from "./SuperAdminShopModal";
import SuperAdminApprovals from "./SuperAdminApprovals";

/* Endpoints (base: /api/sa-x7k9q2)
   GET /shops · /analytics · /analytics/monthly · /reports · /payments · /activity · /announcements
   GET /verifications?status=pending|approved|rejected · PATCH /verifications/:shopId {decision, reason}
   PATCH /reports/:id {status, reply}
   POST /announcements {title, message, audience, shopIds?, userEmails?}   audience: all | <plan> | specific
   PATCH /shops/:shopId/status · DELETE /shops/:shopId
   ── NEW (security) ──
   GET /security/db-status · /security/sessions · /security/alerts · /security/audit
   POST /security/sessions/:id/revoke · POST /security/sessions/revoke-others · PATCH /security/alerts/:id  */

const POLL_MS = 60000;

const ICONS = {
  shop: <path d="M4 10.5V20h16v-9.5M2 10.5l1.5-6h17l1.5 6M2 10.5a2.5 2.5 0 0 0 5 0M7 10.5a2.5 2.5 0 0 0 5 0M12 10.5a2.5 2.5 0 0 0 5 0M17 10.5a2.5 2.5 0 0 0 5 0" />,
  revenue: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  crown: <path d="M2 20h20M3 8l4 4 5-8 5 8 4-4-2 12H5L3 8z" />,
  search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></>,
  power: <><path d="M12 2v10" /><path d="M18.4 6.6a9 9 0 1 1-12.8 0" /></>,
  trash: <><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
  flag: <><path d="M4 22V4" /><path d="M4 4h13l-2 4 2 4H4" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  pulse: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  alert: <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></>,
  check: <path d="M20 6L9 17l-5-5" />,
  db: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  shield: <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z" />,
  list: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
};

function Icon({ name, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const timeAgo = (d) => {
  const m = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 60000));
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.floor(m / 60)} hr ago`;
  return `${Math.floor(m / 1440)} din pehle`;
};
const fmtDateTime = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const fmtBytes = (b) => {
  if (b == null) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1073741824).toFixed(2)} GB`;
};
const fmtUptime = (s) => {
  if (s == null) return "—";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ${Math.floor((s % 3600) / 60)} min`;
  return `${Math.floor(s / 86400)} d`;
};

/* Generic loader: loading / error / retry / optional polling / refresh via dep */
function useData(api, path, { poll = 0, dep = 0 } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const apiRef = useRef(api);
  apiRef.current = api;

  const load = useCallback(async (silent = false) => {
    try {
      const res = await apiRef.current(path);
      setData(res);
      setError("");
    } catch (e) {
      if (!silent) setError(e.message || "Something went wrong");
    }
  }, [path, dep]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!poll) return;
    const id = setInterval(() => load(true), poll);
    return () => clearInterval(id);
  }, [poll, load]);

  return { data, setData, error, reload: () => { setError(""); return load(false); } };
}

const styles = `
  .sa-page { padding: 20px 16px 40px; min-height: 100vh; }
  .sa-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
  .sa-tabs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 22px; scrollbar-width: none; }
  .sa-tabs::-webkit-scrollbar { display: none; }
  .sa-hero-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; margin-bottom: 14px; }
  .sa-two { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; margin-bottom: 20px; }
  .sa-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
  .sa-plans-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
  .sa-loyal-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; padding: 10px 12px; }
  .sa-shop-row { display: flex; align-items: center; gap: 16px; padding: 14px 16px; flex-wrap: wrap; }
  .sa-shop-main { flex: 1 1 220px; min-width: 0; cursor: pointer; }
  .sa-shop-actions { display: flex; gap: 8px; flex-shrink: 0; width: 100%; }
  .sa-shop-actions button { flex: 1; }
  .sa-table-wrap { overflow-x: auto; }
  .sa-table { width: 100%; border-collapse: collapse; min-width: 520px; }
  .sa-table th { text-align: left; font-size: 11.5px; font-weight: 600; padding: 12px 16px; }
  .sa-table td { font-size: 12.5px; padding: 13px 16px; }
  .sa-drawer-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 60; display: flex; justify-content: flex-end; }
  .sa-drawer { width: min(480px, 100%); height: 100%; overflow-y: auto; padding: 24px 22px; box-sizing: border-box; animation: sa-slide 0.25s cubic-bezier(0.16,1,0.3,1) both; }

  @media (min-width: 640px) {
    .sa-page { padding: 28px 28px 50px; }
    .sa-shop-actions { width: auto; }
    .sa-shop-actions button { flex: none; }
    .sa-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  }
  @media (min-width: 800px) {
    .sa-hero-grid { grid-template-columns: 1.3fr 1fr; }
    .sa-two { grid-template-columns: 1.2fr 1fr; }
    .sa-shop-row { flex-wrap: nowrap; }
  }
  @media (min-width: 1024px) { .sa-page { padding: 32px 32px 60px; } }

  .sa-btn { transition: filter 0.15s ease, transform 0.15s ease; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
  .sa-btn:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); }
  .sa-btn:focus-visible, .sa-tab:focus-visible, .sa-row-btn:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
  .sa-row:hover { filter: brightness(1.06); }
  .sa-tab { transition: background 0.15s ease, color 0.15s ease; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px; }
  .sa-row-btn { cursor: pointer; }
  .sa-row-btn:hover { filter: brightness(1.08); }
  .sa-spin { animation: sa-rot 0.8s linear infinite; }

  @keyframes sa-rot { to { transform: rotate(360deg); } }
  @keyframes sa-slide { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes sa-fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .sa-fade-in { animation: sa-fade-up 0.35s cubic-bezier(0.16,1,0.3,1) both; }
  @keyframes sa-pulse { 0% { box-shadow: 0 0 0 0 currentColor; opacity: 1; } 70% { box-shadow: 0 0 0 6px transparent; opacity: 0.7; } 100% { box-shadow: 0 0 0 0 transparent; opacity: 1; } }
  .sa-pulse-dot { animation: sa-pulse 1.8s ease infinite; }
  @media (prefers-reduced-motion: reduce) {
    .sa-fade-in, .sa-drawer, .sa-pulse-dot, .sa-spin { animation: none !important; }
    .sa-btn:hover { transform: none !important; }
  }
`;

const TABS = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "shops", label: "Shops", icon: "shop" },
  { id: "approvals", label: "Approvals", icon: "check" },
  { id: "reports", label: "Customer reports", icon: "flag" },
  { id: "payments", label: "Payments", icon: "revenue" },
  { id: "activity", label: "Activity", icon: "pulse" },
  { id: "announce", label: "Announcements", icon: "bell" },
  { id: "system", label: "System", icon: "db" },
  { id: "security", label: "Sessions & security", icon: "shield" },
  { id: "audit", label: "Audit log", icon: "list" },
];

const readCost = () => {
  try { return Number(localStorage.getItem("sa_monthly_cost")) || 0; } catch { return 0; }
};

export default function SuperAdminDashboard() {
  const { api, admin, logout } = useSuperAdminAuth();
  const { toast, confirmAction, promptInput } = useSuperAdminUI();
  const { t } = useTheme();
  const navigate = useNavigate();

  const [tab, setTab] = useState("overview");
  const [version, setVersion] = useState(0);
  const [actionId, setActionId] = useState(null);
  const [openShopId, setOpenShopId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyCost, setMonthlyCost] = useState(readCost);

  const shopsQ = useData(api, "/shops", { dep: version });
  const analyticsQ = useData(api, "/analytics", { dep: version });
  const reportsQ = useData(api, "/reports", { poll: POLL_MS });
  const dbQ = useData(api, "/security/db-status", { poll: POLL_MS, dep: version });
  const alertsQ = useData(api, "/security/alerts", { poll: POLL_MS, dep: version });

  const refreshAll = async () => {
    setRefreshing(true);
    setVersion((v) => v + 1);
    await Promise.all([shopsQ.reload(), analyticsQ.reload(), reportsQ.reload(), dbQ.reload(), alertsQ.reload()]);
    setRefreshing(false);
  };

  const handleSuspend = async (shop) => {
    const nextStatus = shop.status === "active" ? "suspended" : "active";
    let reason = "";
    if (nextStatus === "suspended") {
      const result = await promptInput({
        title: `Suspend "${shop.shopName}"?`,
        description: "This will block the shop's owner and staff from accessing it.",
        confirmLabel: "Suspend Shop",
        fields: [{ key: "reason", label: "Reason (optional)", placeholder: "e.g. payment overdue" }],
      });
      if (result === null) return;
      reason = result.reason;
    } else {
      const ok = await confirmAction({
        title: `Activate "${shop.shopName}"?`,
        message: "The shop will become accessible again for its owner and staff.",
        confirmLabel: "Activate",
      });
      if (!ok) return;
    }
    setActionId(shop.shopId);
    try {
      await api(`/shops/${shop.shopId}/status`, { method: "PATCH", body: JSON.stringify({ status: nextStatus, reason }) });
      toast.success(`${shop.shopName} ${nextStatus === "active" ? "activated" : "suspended"}.`);
      refreshAll();
    } catch (e) { toast.error(e.message); } finally { setActionId(null); }
  };

  const handleDelete = async (shop) => {
    const ok = await confirmAction({
      title: `Delete "${shop.shopName}"?`,
      message: `This is permanent — along with the shop, ${shop.totalUsers} users will also be deleted. This cannot be undone.`,
      confirmLabel: "Delete Permanently",
      danger: true,
    });
    if (!ok) return;
    setActionId(shop.shopId);
    try {
      await api(`/shops/${shop.shopId}`, { method: "DELETE" });
      toast.success(`${shop.shopName} deleted.`);
      refreshAll();
    } catch (e) { toast.error(e.message); } finally { setActionId(null); }
  };

  const handleLogout = () => { logout(); navigate("/sa-x7k9q2-login"); };
  const updateCost = (val) => {
    setMonthlyCost(val);
    try { localStorage.setItem("sa_monthly_cost", String(val)); } catch { /* ignore */ }
  };

  const gradient = `linear-gradient(135deg, ${t.accent}, ${t.accentLight})`;
  const openReports = (reportsQ.data || []).filter((r) => r.status === "open").length;
  const securityAlerts = (alertsQ.data || []).length;
  const ctx = { t, gradient, api, toast, confirmAction, version, shopsQ, analyticsQ, reportsQ, dbQ, alertsQ, actionId, monthlyCost, updateCost, handleSuspend, handleDelete, setOpenShopId, setTab };

  /* header DB pill */
  const db = dbQ.data;
  const dbOk = db?.state === "connected" && !db?.error;
  const dbUnknown = !db;
  const dbColor = dbUnknown ? t.textMuted : dbOk ? t.green : t.red;
  const dbLabel = dbUnknown ? (dbQ.error ? "DB status n/a" : "DB checking…") : dbOk ? `DB live${db.latencyMs != null ? ` · ${db.latencyMs}ms` : ""}` : `DB ${db.state}`;

  return (
    <div
      className="sa-page"
      style={{
        background: `radial-gradient(1000px 480px at 15% -10%, ${t.accent}14, transparent), radial-gradient(800px 420px at 100% 0%, ${t.accentLight}0d, transparent), ${t.bgPage}`,
        fontFamily: "'DM Sans', sans-serif",
        color: t.textPrimary,
      }}
    >
      <style>{styles}</style>

      <div className="sa-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: gradient, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 20px ${t.accent}45`, flexShrink: 0 }}>
            <Icon name="crown" size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "clamp(20px, 5vw, 27px)", letterSpacing: "-0.02em", margin: 0, backgroundImage: gradient, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Command Center
            </h1>
            <p style={{ fontSize: 12, color: t.textMuted, margin: "2px 0 0" }}>Signed in as {admin?.email}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setTab("system")} aria-label="Database status" className="sa-btn" style={{ padding: "10px 14px", borderRadius: 12, border: `1px solid ${dbColor}50`, background: `${dbColor}14`, color: dbColor, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            <span className={dbOk ? "sa-pulse-dot" : ""} style={{ width: 7, height: 7, borderRadius: "50%", background: dbColor, color: dbColor, display: "inline-block" }} />
            {dbLabel}
          </button>
          <button onClick={refreshAll} disabled={refreshing} aria-label="Refresh data" className="sa-btn" style={{ padding: "10px 14px", borderRadius: 12, border: `1px solid ${t.border}`, background: t.bgCard, color: t.textMuted, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            <span className={refreshing ? "sa-spin" : ""} style={{ display: "inline-flex" }}><Icon name="refresh" size={14} /></span> Refresh
          </button>
          <button onClick={handleLogout} className="sa-btn" style={{ padding: "10px 18px", borderRadius: 12, border: `1px solid ${t.border}`, background: t.bgCard, color: t.textMuted, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            <Icon name="logout" size={14} /> Log out
          </button>
        </div>
      </div>

      <div className="sa-tabs" role="tablist">
        {TABS.map((x) => {
          const on = tab === x.id;
          return (
            <button key={x.id} role="tab" aria-selected={on} onClick={() => setTab(x.id)} className="sa-tab" style={{
              padding: "9px 16px", borderRadius: 11, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${on ? `${t.accent}60` : t.border}`,
              background: on ? `${t.accent}18` : t.bgCard, color: on ? t.accent : t.textMuted,
            }}>
              <Icon name={x.icon} size={14} /> {x.label}
              {x.id === "reports" && openReports > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 99, background: t.red, color: "#fff" }}>{openReports}</span>
              )}
              {x.id === "security" && securityAlerts > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 99, background: t.red, color: "#fff" }}>{securityAlerts}</span>
              )}
            </button>
          );
        })}
      </div>

      <div key={tab} className="sa-fade-in">
        {tab === "overview" && <OverviewTab {...ctx} />}
        {tab === "shops" && <ShopsTab {...ctx} />}
        {tab === "approvals" && <SuperAdminApprovals />}
        {tab === "reports" && <ReportsTab {...ctx} />}
        {tab === "payments" && <PaymentsTab {...ctx} />}
        {tab === "activity" && <ActivityTab {...ctx} />}
        {tab === "announce" && <AnnounceTab {...ctx} />}
        {tab === "system" && <SystemTab {...ctx} />}
        {tab === "security" && <SecurityTab {...ctx} />}
        {tab === "audit" && <AuditTab {...ctx} />}
      </div>

      {openShopId && <SuperAdminShopModal shopId={openShopId} onClose={() => setOpenShopId(null)} onChanged={refreshAll} />}
    </div>
  );
}

/* ═════════════════ OVERVIEW ═════════════════ */
function OverviewTab({ t, gradient, api, version, analyticsQ, shopsQ, reportsQ, monthlyCost, updateCost, setOpenShopId, setTab }) {
  const monthlyQ = useData(api, "/analytics/monthly", { dep: version });
  const analytics = analyticsQ.data;

  if (analyticsQ.error && !analytics) return <ErrorBox t={t} message={analyticsQ.error} onRetry={analyticsQ.reload} />;
  if (!analytics) return <Skeleton t={t} n={3} h={120} />;

  const profit = (analytics.mrr || 0) - monthlyCost;
  const isProfit = profit >= 0;
  const monthly = monthlyQ.data || [];
  const max = Math.max(1, ...monthly.map((m) => m.amount));
  const hasRevenue = monthly.some((m) => m.amount > 0);
  const planCounts = analytics.planCounts || {};
  const loyalShops = analytics.loyalShops || [];
  const openList = (reportsQ.data || []).filter((r) => r.status === "open").slice(0, 3);
  const expiring = (shopsQ.data || [])
    .filter((s) => s.expiresAt && s.status === "active" && new Date(s.expiresAt) - Date.now() < 7 * 86400000)
    .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
  const daysLeft = (d) => Math.ceil((new Date(d) - Date.now()) / 86400000);

  return (
    <>
      <div className="sa-hero-grid">
        <div style={{
          borderRadius: 22, padding: "28px 30px",
          background: isProfit ? `linear-gradient(155deg, ${t.accent}16, ${t.bgCard} 65%)` : `linear-gradient(155deg, ${t.red}18, ${t.bgCard} 65%)`,
          border: `1px solid ${isProfit ? `${t.accent}35` : `${t.red}35`}`,
          boxShadow: `0 12px 32px -18px ${isProfit ? t.accent : t.red}70`,
          display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 18,
        }}>
          <div>
            <p style={{ fontSize: 12.5, color: t.textMuted, margin: 0, fontWeight: 600 }}>Estimated profit this month</p>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "clamp(32px, 6vw, 46px)", letterSpacing: "-0.03em", margin: "8px 0 0", color: isProfit ? t.textPrimary : t.red }}>
              {inr(profit)}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12.5, color: t.textMuted }}>
            <span style={{ fontWeight: 600, color: t.textPrimary }}>{inr(analytics.mrr)}</span>
            <span>MRR</span>
            <span style={{ opacity: 0.5 }}>−</span>
            <label htmlFor="sa-cost">running cost</label>
            <input
              id="sa-cost" type="number" min="0" value={monthlyCost} onChange={(e) => updateCost(Math.max(0, Number(e.target.value) || 0))}
              style={{ width: 92, padding: "7px 10px", borderRadius: 9, border: `1px solid ${t.border}`, background: t.bgPage, color: t.textPrimary, fontSize: 12.5, outline: "none" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = t.accent; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = t.border; }}
            />
            <span style={{ opacity: 0.5 }}>/mo</span>
          </div>
        </div>

        <div style={{ borderRadius: 22, border: `1px solid ${t.border}`, background: t.bgCard, display: "flex", flexDirection: "column" }}>
          <SecondaryStat icon="shop" label="Total shops" value={analytics.totalShops} sub={`${analytics.activeCount} active, ${analytics.suspendedCount} suspended`} t={t} gradient={gradient} />
          <div style={{ height: 1, background: t.borderLight }} />
          <SecondaryStat icon="revenue" label="Total revenue collected" value={inr(analytics.totalRevenue)} sub="All-time, from recorded payments" t={t} gradient={gradient} />
        </div>
      </div>

      <div className="sa-plans-row">
        <span style={{ fontSize: 11.5, color: t.textMuted, fontWeight: 600 }}>Plans</span>
        {Object.entries(planCounts).map(([plan, count]) => (
          <span key={plan} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 99, background: t.bgCard, border: `1px solid ${t.border}`, color: t.textPrimary, textTransform: "capitalize", fontWeight: 500 }}>
            {plan} <strong style={{ color: t.accent, fontWeight: 800 }}>{count}</strong>
          </span>
        ))}
      </div>

      <div className="sa-two">
        <Panel t={t} title="Revenue, last 6 months">
          {monthlyQ.error && monthly.length === 0 ? (
            <ErrorBox t={t} message={monthlyQ.error} onRetry={monthlyQ.reload} compact />
          ) : monthlyQ.data === null ? (
            <Skeleton t={t} n={1} h={150} />
          ) : !hasRevenue ? (
            <p style={{ fontSize: 12.5, color: t.textMuted, margin: 0 }}>Pichle 6 mahine me koi payment record nahi hui.</p>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 150, padding: "8px 4px 0" }}>
              {monthly.map((m, i) => (
                <div key={`${m.month}-${i}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                  <span style={{ fontSize: 10.5, color: t.textMuted }}>{inr(m.amount)}</span>
                  <div style={{ width: "100%", maxWidth: 38, height: `${(m.amount / max) * 100}%`, minHeight: 4, borderRadius: "8px 8px 3px 3px", background: gradient }} />
                  <span style={{ fontSize: 11, color: t.textMuted }}>{m.month}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel t={t} title="Needs attention">
          {openList.length === 0 && expiring.length === 0 && <p style={{ fontSize: 12.5, color: t.textMuted, margin: 0 }}>Sab clear hai. Koi open report ya expiring plan nahi.</p>}
          {openList.map((r) => (
            <button key={r._id} onClick={() => setTab("reports")} className="sa-row-btn" style={rowBtn(t, t.red)}>
              <span style={{ fontWeight: 600 }}>{r.subject}</span>
              <span style={{ color: t.textMuted, fontSize: 11.5 }}>{r.shopName} · {timeAgo(r.createdAt)}</span>
            </button>
          ))}
          {expiring.slice(0, 3).map((s) => (
            <button key={s.shopId} onClick={() => setOpenShopId(s.shopId)} className="sa-row-btn" style={rowBtn(t, t.orange)}>
              <span style={{ fontWeight: 600 }}>{s.shopName} ka plan {daysLeft(s.expiresAt) <= 0 ? "expire ho chuka hai" : "expire hone wala hai"}</span>
              <span style={{ color: t.textMuted, fontSize: 11.5 }}>
                {new Date(s.expiresAt).toLocaleDateString("en-IN")}{daysLeft(s.expiresAt) > 0 ? ` · ${daysLeft(s.expiresAt)} din bache` : ""}
              </span>
            </button>
          ))}
        </Panel>
      </div>

      {loyalShops.length > 0 && (
        <div style={{ padding: "18px 20px", borderRadius: 18, background: t.orangeBg, border: `1px solid ${t.orange}40` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: `${t.orange}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="crown" size={13} color={t.orange} />
            </div>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: t.orange, margin: 0 }}>
              Loyal shops <span style={{ color: t.textMuted, fontWeight: 500 }}>(3+ renewals, worth a discount)</span>
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {loyalShops.map((s) => (
              <button key={s.shopId} onClick={() => setOpenShopId(s.shopId)} className="sa-loyal-row sa-row-btn" style={{ borderRadius: 10, textAlign: "left", background: t.bgCard, border: "none", borderLeft: `3px solid ${t.orange}`, color: t.textPrimary, fontSize: 12.5, fontWeight: 500 }}>
                <span>{s.shopName}</span>
                <span style={{ color: t.textMuted }}>{s.renewalCount}× renewed{s.discountPercent > 0 ? `, ${s.discountPercent}% off applied` : ""}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ═════════════════ SHOPS ═════════════════ */
function ShopsTab({ t, gradient, shopsQ, actionId, handleSuspend, handleDelete, setOpenShopId }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const shops = shopsQ.data;

  if (shopsQ.error && !shops) return <ErrorBox t={t} message={shopsQ.error} onRetry={shopsQ.reload} />;
  if (shops === null) return <Skeleton t={t} n={3} h={68} />;

  const plans = ["all", ...new Set(shops.map((s) => s.plan))];
  const q = search.toLowerCase();
  const list = shops.filter((s) =>
    (status === "all" || s.status === status) && (plan === "all" || s.plan === plan) &&
    ((s.shopName || "").toLowerCase().includes(q) || (s.ownerEmail || "").toLowerCase().includes(q) || (s.shopId || "").toLowerCase().includes(q))
  );

  return (
    <>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <div style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: t.textMuted }}><Icon name="search" size={15} /></div>
        <input
          type="text" aria-label="Search shops" placeholder="Search by shop name, owner email, or shop ID..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px 12px 42px", borderRadius: 14, border: `1px solid ${t.border}`, background: t.bgCard, color: t.textPrimary, fontSize: 13, outline: "none" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = t.accent; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = t.border; }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {["all", "active", "suspended"].map((s) => <Chip key={s} t={t} on={status === s} onClick={() => setStatus(s)}>{s}</Chip>)}
        <span style={{ width: 1, background: t.border, margin: "0 4px" }} />
        {plans.map((p) => <Chip key={p} t={t} on={plan === p} onClick={() => setPlan(p)}>{p}</Chip>)}
      </div>

      {list.length === 0 ? (
        <Empty t={t} title={shops.length === 0 ? "No shops yet" : "No shops match your filters"} sub={shops.length === 0 ? "New signups will show up here." : "Try a different name, email, ID, or filter."} />
      ) : (
        <div style={{ border: `1px solid ${t.border}`, borderRadius: 18, overflow: "hidden", background: t.bgCard }}>
          {list.map((shop, i) => {
            const active = shop.status === "active";
            return (
              <div key={shop._id} className="sa-row sa-shop-row" style={{ borderBottom: i < list.length - 1 ? `1px solid ${t.borderLight}` : "none" }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: active ? gradient : t.border, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, color: active ? "#fff" : t.textMuted }}>
                  {(shop.shopName || "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="sa-shop-main" onClick={() => setOpenShopId(shop.shopId)}>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14.5, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: 0 }}>
                    {shop.shopName}
                    <StatusDot active={active} t={t} />
                    <Pill color={t.accent} bg={`${t.accent}18`}>{shop.plan}</Pill>
                    {shop.renewalCount >= 3 && <span style={{ fontSize: 12 }}>⭐</span>}
                  </p>
                  <p style={{ fontSize: 11.5, color: t.textMuted, margin: "5px 0 0" }}>
                    {shop.shopId} · {shop.ownerName} ({shop.ownerEmail}) · {shop.totalUsers} users · {inr(shop.totalRevenue)} revenue
                  </p>
                  {!active && shop.suspendedReason && <p style={{ fontSize: 11, color: t.red, margin: "3px 0 0" }}>Reason: {shop.suspendedReason}</p>}
                </div>
                <div className="sa-shop-actions">
                  <button onClick={() => handleSuspend(shop)} disabled={actionId === shop.shopId} className="sa-btn" style={{
                    padding: "8px 16px", borderRadius: 10, fontSize: 11.5, fontWeight: 700,
                    border: `1px solid ${active ? `${t.red}60` : `${t.green}60`}`, color: active ? t.red : t.green,
                    background: active ? t.redBg : t.greenBg, cursor: "pointer", opacity: actionId === shop.shopId ? 0.5 : 1,
                  }}>
                    <Icon name="power" size={13} /> {active ? "Suspend" : "Activate"}
                  </button>
                  <button onClick={() => handleDelete(shop)} disabled={actionId === shop.shopId} className="sa-btn" style={{
                    padding: "8px 16px", borderRadius: 10, fontSize: 11.5, fontWeight: 700, border: `1px solid ${t.border}`,
                    color: t.textMuted, background: t.bgPage, cursor: "pointer", opacity: actionId === shop.shopId ? 0.5 : 1,
                  }}>
                    <Icon name="trash" size={13} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ═════════════════ CUSTOMER REPORTS ═════════════════ */
const STATUS_LABEL = { open: "Open", in_progress: "In progress", resolved: "Resolved" };

function ReportsTab({ t, api, toast, reportsQ, setOpenShopId }) {
  const [filter, setFilter] = useState("all");
  const [selId, setSelId] = useState(null);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);
  const reports = reportsQ.data;
  const setReports = reportsQ.setData;

  if (reportsQ.error && !reports) return <ErrorBox t={t} message={reportsQ.error} onRetry={reportsQ.reload} />;
  if (reports === null) return <Skeleton t={t} n={3} h={84} />;

  const prioColor = { high: t.red, medium: t.orange, low: t.green };
  const statusColor = { open: t.red, in_progress: t.orange, resolved: t.green };
  const count = (s) => reports.filter((r) => r.status === s).length;
  const list = reports.filter((r) => filter === "all" || r.status === filter);
  const sel = reports.find((r) => r._id === selId);

  const openReport = (r) => { setSelId(r._id); setReply(r.reply || ""); };

  const update = async (r, status, successMsg) => {
    const prev = reports;
    setSaving(true);
    setReports((p) => p.map((x) => (x._id === r._id ? { ...x, status, reply } : x)));
    try {
      const saved = await api(`/reports/${r._id}`, { method: "PATCH", body: JSON.stringify({ status, reply }) });
      setReports((p) => p.map((x) => (x._id === r._id ? { ...x, ...saved } : x)));
      toast.success(successMsg || `Report marked ${STATUS_LABEL[status].toLowerCase()}.`);
    } catch (e) {
      setReports(prev); // rollback
      toast.error(`Update failed: ${e.message}`);
    } finally { setSaving(false); }
  };

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <Chip t={t} on={filter === "all"} onClick={() => setFilter("all")}>All ({reports.length})</Chip>
        {Object.keys(STATUS_LABEL).map((s) => <Chip key={s} t={t} on={filter === s} onClick={() => setFilter(s)}>{STATUS_LABEL[s]} ({count(s)})</Chip>)}
      </div>

      {list.length === 0 ? (
        <Empty t={t} title="Koi report nahi mili" sub="Jab koi customer report bhejega, yahan dikhegi." />
      ) : (
        <div style={{ border: `1px solid ${t.border}`, borderRadius: 18, overflow: "hidden", background: t.bgCard }}>
          {list.map((r, i) => (
            <button key={r._id} onClick={() => openReport(r)} className="sa-row sa-row-btn" style={{
              display: "flex", alignItems: "flex-start", gap: 14, width: "100%", textAlign: "left", padding: "16px 18px",
              background: "transparent", border: "none", borderLeft: `3px solid ${prioColor[r.priority] || t.border}`,
              borderBottom: i < list.length - 1 ? `1px solid ${t.borderLight}` : "none", color: t.textPrimary,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {r.subject}
                  <Pill color={statusColor[r.status]} bg={`${statusColor[r.status]}1c`}>{STATUS_LABEL[r.status]}</Pill>
                </p>
                <p style={{ margin: "5px 0 0", fontSize: 12, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.message}</p>
                <p style={{ margin: "6px 0 0", fontSize: 11, color: t.textMuted }}>{r.shopName} · {r.category} · {r.priority} priority · {timeAgo(r.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {sel && (
        <div className="sa-drawer-bg" onClick={() => setSelId(null)}>
          <aside className="sa-drawer" role="dialog" aria-label="Report details" onClick={(e) => e.stopPropagation()} style={{ background: t.bgCard, borderLeft: `1px solid ${t.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, margin: 0, lineHeight: 1.3 }}>{sel.subject}</h2>
              <button onClick={() => setSelId(null)} aria-label="Close" className="sa-btn" style={{ background: t.bgPage, border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 9, padding: 7, cursor: "pointer" }}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <p style={{ fontSize: 12, color: t.textMuted, margin: "8px 0 18px" }}>
              {sel.shopName} ({sel.shopId}) · {sel.category} · {sel.priority} priority · {timeAgo(sel.createdAt)}
            </p>
            <div style={{ padding: 14, borderRadius: 12, background: t.bgPage, border: `1px solid ${t.borderLight}`, fontSize: 13, lineHeight: 1.6, marginBottom: 18, whiteSpace: "pre-wrap" }}>{sel.message}</div>

            <label htmlFor="sa-reply" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted }}>Aapka reply (shop ko bell me dikhega)</label>
            <textarea
              id="sa-reply" rows={5} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Customer ko kya bataya ya kya fix kiya..."
              style={{ width: "100%", boxSizing: "border-box", marginTop: 8, padding: 12, borderRadius: 12, border: `1px solid ${t.border}`, background: t.bgPage, color: t.textPrimary, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = t.accent; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = t.border; }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, opacity: saving ? 0.6 : 1, pointerEvents: saving ? "none" : "auto" }}>
              <DrawerBtn t={t} color={t.accent} onClick={() => update(sel, sel.status, "Reply save ho gaya.")}>Save reply</DrawerBtn>
              {sel.status !== "in_progress" && <DrawerBtn t={t} color={t.orange} onClick={() => update(sel, "in_progress")}>Start working</DrawerBtn>}
              {sel.status !== "resolved" && <DrawerBtn t={t} color={t.green} onClick={() => update(sel, "resolved")}>Mark resolved</DrawerBtn>}
              {sel.status === "resolved" && <DrawerBtn t={t} color={t.red} onClick={() => update(sel, "open")}>Reopen</DrawerBtn>}
              <DrawerBtn t={t} color={t.accent} onClick={() => { setSelId(null); setOpenShopId(sel.shopId); }}>Open shop</DrawerBtn>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

/* ═════════════════ PAYMENTS ═════════════════ */
function PaymentsTab({ t, api, version }) {
  const q = useData(api, "/payments", { dep: version });
  const [search, setSearch] = useState("");
  const payments = q.data;

  if (q.error && !payments) return <ErrorBox t={t} message={q.error} onRetry={q.reload} />;
  if (payments === null) return <Skeleton t={t} n={3} h={52} />;

  const s = search.toLowerCase();
  const list = payments.filter((p) => (p.shopName || "").toLowerCase().includes(s) || (p.shopId || "").toLowerCase().includes(s));
  const total = list.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <input
          type="text" aria-label="Search payments" placeholder="Search by shop name or ID..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 240px", maxWidth: 380, padding: "11px 14px", borderRadius: 12, border: `1px solid ${t.border}`, background: t.bgCard, color: t.textPrimary, fontSize: 13, outline: "none" }}
        />
        <p style={{ margin: 0, fontSize: 12.5, color: t.textMuted }}>{list.length} payments · <strong style={{ color: t.textPrimary }}>{inr(total)}</strong></p>
      </div>
      {list.length === 0 ? <Empty t={t} title="Koi payment nahi mili" sub={payments.length === 0 ? "Payments webhook se yahan aayengi." : "Search badal ke dekho."} /> : (
        <div className="sa-table-wrap" style={{ border: `1px solid ${t.border}`, borderRadius: 18, background: t.bgCard }}>
          <table className="sa-table">
            <thead>
              <tr style={{ color: t.textMuted, borderBottom: `1px solid ${t.borderLight}` }}>
                <th>Shop</th><th>Plan</th><th>Method</th><th>Date</th><th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p._id} style={{ borderBottom: `1px solid ${t.borderLight}` }}>
                  <td><strong>{p.shopName}</strong><br /><span style={{ fontSize: 11, color: t.textMuted }}>{p.shopId}</span></td>
                  <td><Pill color={t.accent} bg={`${t.accent}18`}>{p.plan || "—"}</Pill></td>
                  <td style={{ color: t.textMuted }}>{p.method || "—"}</td>
                  <td style={{ color: t.textMuted }}>{new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>{inr(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ═════════════════ ACTIVITY ═════════════════ */
function ActivityTab({ t, api, version }) {
  const q = useData(api, "/activity", { poll: POLL_MS, dep: version });
  const items = q.data;

  if (q.error && !items) return <ErrorBox t={t} message={q.error} onRetry={q.reload} />;
  if (items === null) return <Skeleton t={t} n={4} h={52} />;
  if (items.length === 0) return <Empty t={t} title="Abhi koi activity nahi" sub="Signups, payments aur admin actions yahan dikhenge." />;

  const color = { signup: t.green, payment: t.accent, report: t.orange, suspend: t.red };
  return (
    <div style={{ border: `1px solid ${t.border}`, borderRadius: 18, background: t.bgCard, padding: "8px 20px" }}>
      {items.map((a, i) => (
        <div key={a._id || i} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: i < items.length - 1 ? `1px solid ${t.borderLight}` : "none", alignItems: "center" }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: color[a.type] || t.textMuted, flexShrink: 0 }} />
          <p style={{ margin: 0, flex: 1, fontSize: 13 }}>{a.text}</p>
          <span style={{ fontSize: 11.5, color: t.textMuted, whiteSpace: "nowrap" }}>{timeAgo(a.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

/* ═════════════════ ANNOUNCEMENTS (all / plan / specific shops + people) ═════════════════ */
const EMPTY_FORM = { title: "", message: "", audience: "all", shopIds: [], emails: "" };

function AnnounceTab({ t, api, toast, version, analyticsQ, shopsQ }) {
  const q = useData(api, "/announcements", { dep: version });
  const [form, setForm] = useState(EMPTY_FORM);
  const [pick, setPick] = useState("");
  const [sending, setSending] = useState(false);
  const list = q.data;
  const shops = shopsQ.data || [];
  const planAudiences = Object.keys(analyticsQ.data?.planCounts || { free: 0, pro: 0, premium: 0 });
  const audiences = ["all", ...planAudiences, "specific"];
  const specific = form.audience === "specific";

  const pq = pick.trim().toLowerCase();
  const matches = pq
    ? shops.filter((s) => !form.shopIds.includes(s.shopId) && (
        (s.shopName || "").toLowerCase().includes(pq) || (s.shopId || "").toLowerCase().includes(pq) || (s.ownerEmail || "").toLowerCase().includes(pq)
      )).slice(0, 6)
    : [];
  const shopName = (id) => shops.find((s) => s.shopId === id)?.shopName || id;
  const emailList = form.emails.split(/[,\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);

  const send = async () => {
    if (!form.title.trim() || !form.message.trim()) return toast.error("Title aur message dono bharo.");
    if (specific && form.shopIds.length === 0 && emailList.length === 0) return toast.error("Kam se kam ek shop ya person select karo.");
    setSending(true);
    try {
      const body = { title: form.title, message: form.message, audience: form.audience };
      if (specific) { body.shopIds = form.shopIds; body.userEmails = emailList; }
      const res = await api("/announcements", { method: "POST", body: JSON.stringify(body) });
      q.setData((prev) => [res.announcement, ...(prev || [])]);
      toast.success(`Announcement ${res.announcement?.recipients ?? 0} shops ko bhej diya.`);
      setForm(EMPTY_FORM);
      setPick("");
    } catch (e) {
      toast.error(`Send failed: ${e.message}`);
    } finally { setSending(false); }
  };

  const field = { width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 11, border: `1px solid ${t.border}`, background: t.bgPage, color: t.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none" };
  const audLabel = (n) => n.audience === "all" ? "All shops" : n.audience === "specific" ? "Specific" : `${n.audience} plan`;

  return (
    <div className="sa-two">
      <Panel t={t} title="New announcement">
        <label htmlFor="an-title" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted }}>Title</label>
        <input id="an-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ ...field, margin: "6px 0 12px" }} placeholder="e.g. New feature: WhatsApp billing" />
        <label htmlFor="an-msg" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted }}>Message</label>
        <textarea id="an-msg" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} style={{ ...field, margin: "6px 0 12px", resize: "vertical" }} placeholder="Shop owners ko kya batana hai..." />
        <p style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, margin: "0 0 8px" }}>Kisko bhejna hai</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {audiences.map((a) => (
            <Chip key={a} t={t} on={form.audience === a} onClick={() => setForm({ ...form, audience: a })}>
              {a === "all" ? "All shops" : a === "specific" ? "Specific shop / person" : `${a} plan`}
            </Chip>
          ))}
        </div>

        {specific && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, padding: 14, borderRadius: 14, background: t.bgPage, border: `1px solid ${t.borderLight}` }}>
            <label htmlFor="an-pick" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted }}>Shops (name, ID ya owner email se search karo)</label>
            <input id="an-pick" value={pick} onChange={(e) => setPick(e.target.value)} placeholder="Search shop..." style={field} />
            {matches.length > 0 && (
              <div style={{ border: `1px solid ${t.border}`, borderRadius: 11, overflow: "hidden", background: t.bgCard }}>
                {matches.map((s, i) => (
                  <button key={s.shopId} onClick={() => { setForm({ ...form, shopIds: [...form.shopIds, s.shopId] }); setPick(""); }} className="sa-row sa-row-btn" style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%", textAlign: "left", padding: "9px 12px", background: "transparent", border: "none", borderBottom: i < matches.length - 1 ? `1px solid ${t.borderLight}` : "none", color: t.textPrimary, fontSize: 12.5 }}>
                    <span style={{ fontWeight: 600 }}>{s.shopName}</span>
                    <span style={{ fontSize: 11, color: t.textMuted }}>{s.shopId} · {s.ownerEmail}</span>
                  </button>
                ))}
              </div>
            )}
            {form.shopIds.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {form.shopIds.map((id) => (
                  <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, padding: "5px 6px 5px 11px", borderRadius: 99, background: `${t.accent}18`, border: `1px solid ${t.accent}50`, color: t.accent }}>
                    {shopName(id)}
                    <button onClick={() => setForm({ ...form, shopIds: form.shopIds.filter((x) => x !== id) })} aria-label={`Remove ${shopName(id)}`} style={{ display: "inline-flex", background: "transparent", border: "none", color: t.accent, cursor: "pointer", padding: 2 }}>
                      <Icon name="close" size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <label htmlFor="an-emails" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, marginTop: 4 }}>Specific person (user email, comma se alag karo — optional)</label>
            <input id="an-emails" value={form.emails} onChange={(e) => setForm({ ...form, emails: e.target.value })} placeholder="owner@shop.com, staff@shop.com" style={field} />
            <p style={{ margin: 0, fontSize: 11, color: t.textMuted }}>{form.shopIds.length} shop(s) · {emailList.length} person(s) selected</p>
          </div>
        )}

        <button onClick={send} disabled={sending} className="sa-btn" style={{ padding: "11px 20px", borderRadius: 11, border: "none", background: `linear-gradient(135deg, ${t.accent}, ${t.accentLight})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: sending ? 0.6 : 1 }}>
          <Icon name="bell" size={14} /> {sending ? "Sending..." : "Send announcement"}
        </button>
      </Panel>

      <Panel t={t} title="Sent announcements">
        {q.error && !list ? (
          <ErrorBox t={t} message={q.error} onRetry={q.reload} compact />
        ) : list === null ? (
          <Skeleton t={t} n={2} h={70} />
        ) : (
          <>
            {list.length === 0 && <p style={{ fontSize: 12.5, color: t.textMuted, margin: 0 }}>Abhi tak koi announcement nahi bheja.</p>}
            {list.map((n) => (
              <div key={n._id} style={{ padding: "12px 14px", borderRadius: 12, background: t.bgPage, border: `1px solid ${t.borderLight}` }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{n.title}</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>{n.message}</p>
                <p style={{ margin: "8px 0 0", fontSize: 11, color: t.textMuted }}>
                  {audLabel(n)}
                  {typeof n.recipients === "number" ? ` · ${n.recipients} shops` : ""} · {timeAgo(n.createdAt)}
                </p>
              </div>
            ))}
          </>
        )}
      </Panel>
    </div>
  );
}

/* ═════════════════ SYSTEM (database status) ═════════════════ */
function SystemTab({ t, gradient, dbQ }) {
  const db = dbQ.data;

  if (dbQ.error && !db) return <ErrorBox t={t} message={dbQ.error} onRetry={dbQ.reload} />;
  if (!db) return <Skeleton t={t} n={3} h={110} />;

  const ok = db.state === "connected" && !db.error;
  const lat = db.latencyMs;
  const latColor = lat == null ? t.textMuted : lat < 150 ? t.green : lat < 500 ? t.orange : t.red;
  const s = db.stats;
  const limitBytes = (db.storageLimitMb || 512) * 1048576;
  const used = s ? (s.storageSize || 0) + (s.indexSize || 0) : 0;
  const pct = Math.min(100, (used / limitBytes) * 100);
  const barColor = pct > 85 ? t.red : pct > 65 ? t.orange : t.green;
  const srv = db.server || {};

  return (
    <>
      <div style={{
        borderRadius: 22, padding: "24px 28px", marginBottom: 14,
        background: `linear-gradient(155deg, ${ok ? t.green : t.red}16, ${t.bgCard} 65%)`,
        border: `1px solid ${ok ? t.green : t.red}35`,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="db" size={21} color="#fff" />
          </div>
          <div>
            <p style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, textTransform: "capitalize", color: ok ? t.green : t.red }}>
              {ok ? "Connected" : db.state}
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: t.textMuted }}>
              {db.dbName ? `${db.dbName} · ` : ""}{db.host || "no host"} · checked {timeAgo(db.checkedAt)}
            </p>
          </div>
        </div>
        <button onClick={dbQ.reload} className="sa-btn" style={{ padding: "9px 16px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.bgCard, color: t.textMuted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          <Icon name="refresh" size={13} /> Check again
        </button>
      </div>

      {db.error && <div style={{ marginBottom: 14 }}><ErrorBox t={t} message={`Database error: ${db.error}`} compact /></div>}

      <div className="sa-stats">
        <MiniStat t={t} label="Ping latency" value={lat == null ? "—" : `${lat} ms`} color={latColor} />
        <MiniStat t={t} label="Collections" value={s ? s.collections : "—"} />
        <MiniStat t={t} label="Documents" value={s ? Number(s.objects).toLocaleString("en-IN") : "—"} />
        <MiniStat t={t} label="Indexes" value={s ? s.indexes : "—"} />
      </div>

      <div className="sa-two">
        <Panel t={t} title="Storage">
          {s ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: t.textMuted }}>
                <span><strong style={{ color: t.textPrimary }}>{fmtBytes(used)}</strong> used</span>
                <span>of {fmtBytes(limitBytes)} ({pct.toFixed(1)}%)</span>
              </div>
              <div style={{ height: 10, borderRadius: 99, background: t.bgPage, border: `1px solid ${t.borderLight}`, overflow: "hidden" }}>
                <div style={{ width: `${Math.max(pct, 1)}%`, height: "100%", borderRadius: 99, background: barColor }} />
              </div>
              <KV t={t} k="Data size" v={fmtBytes(s.dataSize)} />
              <KV t={t} k="Storage on disk" v={fmtBytes(s.storageSize)} />
              <KV t={t} k="Index size" v={fmtBytes(s.indexSize)} />
              {pct > 85 && <p style={{ margin: 0, fontSize: 12, color: t.red }}>Storage lagbhag full hai — plan upgrade ya purana data clean karo.</p>}
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 12.5, color: t.textMuted }}>Stats tabhi milenge jab database connected ho.</p>
          )}
        </Panel>

        <Panel t={t} title="Server">
          <KV t={t} k="Environment" v={srv.env || "—"} />
          <KV t={t} k="Hosting" v={srv.serverless ? `Vercel serverless${srv.region ? ` (${srv.region})` : ""}` : "Long-running server"} />
          <KV t={t} k="Instance uptime" v={fmtUptime(srv.uptimeSec)} />
          <KV t={t} k="Memory (RSS)" v={srv.memoryMb != null ? `${srv.memoryMb} MB` : "—"} />
          <KV t={t} k="Node" v={srv.node || "—"} />
          <KV t={t} k="Cashfree" v={srv.cashfreeEnv || "—"} />
        </Panel>
      </div>
    </>
  );
}

/* ═════════════════ SESSIONS & SECURITY ═════════════════ */
function SecurityTab({ t, api, toast, confirmAction, version, alertsQ }) {
  const sessQ = useData(api, "/security/sessions", { poll: 30000, dep: version });
  const [busy, setBusy] = useState(null);
  const sessions = sessQ.data;
  const alerts = alertsQ.data || [];

  if (sessQ.error && !sessions) return <ErrorBox t={t} message={sessQ.error} onRetry={sessQ.reload} />;
  if (sessions === null) return <Skeleton t={t} n={3} h={68} />;

  const reloadAll = () => Promise.all([sessQ.reload(), alertsQ.reload()]);

  const revoke = async (s) => {
    const ok = await confirmAction({
      title: "Force logout this session?",
      message: `${s.device || "Unknown device"} (${s.ip}) turant logout ho jayega — agle request pe login page aa jayega.`,
      confirmLabel: "Force logout",
      danger: true,
    });
    if (!ok) return;
    setBusy(s._id);
    try {
      await api(`/security/sessions/${s._id}/revoke`, { method: "POST" });
      toast.success("Session logout kar diya.");
      reloadAll();
    } catch (e) { toast.error(e.message); } finally { setBusy(null); }
  };

  const revokeOthers = async () => {
    const ok = await confirmAction({
      title: "Log out all other devices?",
      message: "Sirf ye current session bacha rahega. Baaki sab devices logout ho jayenge.",
      confirmLabel: "Log out all others",
      danger: true,
    });
    if (!ok) return;
    setBusy("others");
    try {
      const res = await api("/security/sessions/revoke-others", { method: "POST" });
      toast.success(`${res?.count ?? 0} session(s) logout kiye.`);
      reloadAll();
    } catch (e) { toast.error(e.message); } finally { setBusy(null); }
  };

  const dismiss = async (a) => {
    setBusy(a._id);
    try {
      await api(`/security/alerts/${a._id}`, { method: "PATCH", body: JSON.stringify({ dismissed: true }) });
      alertsQ.setData((p) => (p || []).filter((x) => x._id !== a._id));
    } catch (e) { toast.error(e.message); } finally { setBusy(null); }
  };

  const sevColor = { high: t.red, medium: t.orange };
  const others = sessions.filter((s) => !s.isCurrent).length;

  return (
    <>
      {alerts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: t.red, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="alert" size={14} /> Suspicious login alerts ({alerts.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.map((a) => {
              const live = sessions.some((s) => s._id === a.sessionId);
              const c = sevColor[a.severity] || t.orange;
              return (
                <div key={a._id} style={{ padding: "14px 16px", borderRadius: 14, background: t.bgCard, border: `1px solid ${c}40`, borderLeft: `3px solid ${c}`, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {a.ip}
                      <Pill color={c} bg={`${c}1c`}>{a.severity}</Pill>
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 11.5, color: t.textMuted }}>{a.device} · {a.adminEmail} · {timeAgo(a.createdAt)}</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {(a.reasons || []).map((r) => (
                        <span key={r} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: `${c}14`, color: c, fontWeight: 600 }}>{r}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, opacity: busy === a._id ? 0.5 : 1 }}>
                    {live && (
                      <DrawerBtn t={t} color={t.red} onClick={() => revoke(sessions.find((s) => s._id === a.sessionId))}>Force logout</DrawerBtn>
                    )}
                    <DrawerBtn t={t} color={t.textMuted} onClick={() => dismiss(a)}>Dismiss</DrawerBtn>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
          Active sessions <span style={{ color: t.textMuted, fontWeight: 500 }}>({sessions.length})</span>
        </p>
        <button onClick={revokeOthers} disabled={others === 0 || busy === "others"} className="sa-btn" style={{
          padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, border: `1px solid ${t.red}60`, background: t.redBg, color: t.red,
          cursor: others === 0 ? "not-allowed" : "pointer", opacity: others === 0 ? 0.45 : 1,
        }}>
          <Icon name="logout" size={13} /> Log out all other devices
        </button>
      </div>

      {sessions.length === 0 ? (
        <Empty t={t} title="Koi active session nahi" sub="Login karne par yahan IP aur device dikhega." />
      ) : (
        <div style={{ border: `1px solid ${t.border}`, borderRadius: 18, overflow: "hidden", background: t.bgCard }}>
          {sessions.map((s, i) => (
            <div key={s._id} className="sa-row sa-shop-row" style={{
              borderBottom: i < sessions.length - 1 ? `1px solid ${t.borderLight}` : "none",
              borderLeft: `3px solid ${s.suspicious ? t.red : "transparent"}`,
            }}>
              <div className="sa-shop-main" style={{ cursor: "default" }}>
                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: 0 }}>
                  {s.ip}
                  {s.isCurrent && <Pill color={t.green} bg={`${t.green}1c`}>This device</Pill>}
                  {s.suspicious && <Pill color={t.red} bg={`${t.red}1c`}>Suspicious</Pill>}
                </p>
                <p style={{ fontSize: 11.5, color: t.textMuted, margin: "5px 0 0" }}>
                  {s.device || "Unknown device"} · {s.adminEmail} · login {fmtDateTime(s.createdAt)} · last active {timeAgo(s.lastActiveAt)}
                </p>
                {s.suspicious && (s.reasons || []).length > 0 && (
                  <p style={{ fontSize: 11, color: t.red, margin: "4px 0 0" }}>{s.reasons.join(" · ")}</p>
                )}
              </div>
              {!s.isCurrent && (
                <div className="sa-shop-actions">
                  <button onClick={() => revoke(s)} disabled={busy === s._id} className="sa-btn" style={{
                    padding: "8px 16px", borderRadius: 10, fontSize: 11.5, fontWeight: 700, border: `1px solid ${t.red}60`,
                    color: t.red, background: t.redBg, cursor: "pointer", opacity: busy === s._id ? 0.5 : 1,
                  }}>
                    <Icon name="power" size={13} /> Force logout
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <p style={{ fontSize: 11.5, color: t.textMuted, margin: "12px 2px 0" }}>
        Force logout agle request par lagu hota hai (dashboard har 60 sec me data poll karta hai).
      </p>
    </>
  );
}

/* ═════════════════ AUDIT LOG ═════════════════ */
function AuditTab({ t, api, version }) {
  const q = useData(api, "/security/audit", { dep: version });
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const items = q.data;

  if (q.error && !items) return <ErrorBox t={t} message={q.error} onRetry={q.reload} />;
  if (items === null) return <Skeleton t={t} n={4} h={52} />;

  const actions = ["all", ...new Set(items.map((a) => a.action))];
  const s = search.toLowerCase();
  const list = items.filter((a) =>
    (action === "all" || a.action === action) &&
    (!s || [a.actor, a.action, a.targetName, a.targetId, a.ip].some((v) => (v || "").toLowerCase().includes(s)))
  );
  const warn = (a) => /delete|force_logout|revoke|suspend|reject/.test(a);

  return (
    <>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <div style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: t.textMuted }}><Icon name="search" size={15} /></div>
        <input
          type="text" aria-label="Search audit log" placeholder="Search by actor, action, target or IP..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px 12px 42px", borderRadius: 14, border: `1px solid ${t.border}`, background: t.bgCard, color: t.textPrimary, fontSize: 13, outline: "none" }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {actions.map((a) => <Chip key={a} t={t} on={action === a} onClick={() => setAction(a)}>{a.replace(/[._]/g, " ")}</Chip>)}
      </div>

      {list.length === 0 ? (
        <Empty t={t} title="Koi audit entry nahi" sub={items.length === 0 ? "Admin actions yahan record honge." : "Filter ya search badal ke dekho."} />
      ) : (
        <div className="sa-table-wrap" style={{ border: `1px solid ${t.border}`, borderRadius: 18, background: t.bgCard }}>
          <table className="sa-table" style={{ minWidth: 640 }}>
            <thead>
              <tr style={{ color: t.textMuted, borderBottom: `1px solid ${t.borderLight}` }}>
                <th>When</th><th>Who</th><th>Action</th><th>Target</th><th>IP</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a._id} style={{ borderBottom: `1px solid ${t.borderLight}` }}>
                  <td style={{ color: t.textMuted, whiteSpace: "nowrap" }}>{fmtDateTime(a.createdAt)}</td>
                  <td>{a.actor}</td>
                  <td><Pill color={warn(a.action) ? t.red : t.accent} bg={warn(a.action) ? `${t.red}1c` : `${t.accent}18`}>{a.action.replace(/[._]/g, " ")}</Pill></td>
                  <td>{a.targetName || a.targetId || "—"}</td>
                  <td style={{ color: t.textMuted }}>{a.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ═════════════════ SHARED PIECES ═════════════════ */
const rowBtn = (t, accent) => ({
  display: "flex", flexDirection: "column", gap: 3, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10,
  background: t.bgPage, border: "none", borderLeft: `3px solid ${accent}`, color: t.textPrimary, fontSize: 12.5,
});

function Panel({ t, title, children }) {
  return (
    <div style={{ borderRadius: 18, border: `1px solid ${t.border}`, background: t.bgCard, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 14.5, fontWeight: 700, margin: "0 0 4px" }}>{title}</h2>
      {children}
    </div>
  );
}

function Chip({ t, on, onClick, children }) {
  return (
    <button onClick={onClick} className="sa-tab" style={{
      padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
      border: `1px solid ${on ? `${t.accent}60` : t.border}`, background: on ? `${t.accent}18` : t.bgCard, color: on ? t.accent : t.textMuted,
    }}>{children}</button>
  );
}

function DrawerBtn({ t, color, onClick, children }) {
  return (
    <button onClick={onClick} className="sa-btn" style={{ padding: "9px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, border: `1px solid ${color}60`, background: `${color}18`, color, cursor: "pointer" }}>{children}</button>
  );
}

function Empty({ t, title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 0" }}>
      <p style={{ color: t.textPrimary, fontSize: 14, fontWeight: 600, margin: 0 }}>{title}</p>
      <p style={{ color: t.textMuted, fontSize: 12.5, marginTop: 6 }}>{sub}</p>
    </div>
  );
}

function ErrorBox({ t, message, onRetry, compact = false }) {
  return (
    <div role="alert" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: compact ? "10px 12px" : "16px 18px", borderRadius: 14, background: t.redBg, border: `1px solid ${t.red}40`, color: t.red, fontSize: 13 }}>
      <Icon name="alert" size={16} />
      <span style={{ flex: 1, minWidth: 160 }}>{message || "Data load nahi ho paya."}</span>
      {onRetry && (
        <button onClick={onRetry} className="sa-btn" style={{ padding: "7px 14px", borderRadius: 9, border: `1px solid ${t.red}60`, background: "transparent", color: t.red, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          <Icon name="refresh" size={12} /> Retry
        </button>
      )}
    </div>
  );
}

function Skeleton({ t, n, h }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: n }, (_, i) => <div key={i} style={{ height: h, borderRadius: 16, background: t.bgCard, border: `1px solid ${t.border}` }} />)}
    </div>
  );
}

function Pill({ children, color, bg }) {
  return <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 9px", borderRadius: 99, color, background: bg, textTransform: "capitalize", letterSpacing: "0.02em" }}>{children}</span>;
}

function StatusDot({ active, t }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 600, color: active ? t.green : t.red }}>
      <span className={active ? "sa-pulse-dot" : ""} style={{ width: 6, height: 6, borderRadius: "50%", background: active ? t.green : t.red, color: active ? t.green : t.red }} />
      {active ? "Active" : "Suspended"}
    </span>
  );
}

function SecondaryStat({ icon, label, value, sub, t, gradient }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 22px", flex: 1 }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: gradient, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={16} color="#fff" />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 11, color: t.textMuted, margin: 0, fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: 19, fontWeight: 800, fontFamily: "'Syne', sans-serif", margin: "2px 0 0", letterSpacing: "-0.01em" }}>{value}</p>
        {sub && <p style={{ fontSize: 10, color: t.textMuted, margin: "2px 0 0" }}>{sub}</p>}
      </div>
    </div>
  );
}

function MiniStat({ t, label, value, color }) {
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${t.border}`, background: t.bgCard, padding: "16px 18px" }}>
      <p style={{ margin: 0, fontSize: 11, color: t.textMuted, fontWeight: 500 }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 21, fontWeight: 800, fontFamily: "'Syne', sans-serif", color: color || t.textPrimary }}>{value}</p>
    </div>
  );
}

function KV({ t, k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12.5, padding: "6px 0", borderBottom: `1px solid ${t.borderLight}` }}>
      <span style={{ color: t.textMuted }}>{k}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{v}</span>
    </div>
  );
}