import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperAdminAuth } from "../context/SuperAdminAuthContext";
import { useSuperAdminUI } from "../context/SuperAdminUIContext";
import { useTheme } from "../components/ThemeContext";
import SuperAdminShopModal from "./SuperAdminShopModal";

const ICONS = {
  shop: <path d="M4 10.5V20h16v-9.5M2 10.5l1.5-6h17l1.5 6M2 10.5a2.5 2.5 0 0 0 5 0M7 10.5a2.5 2.5 0 0 0 5 0M12 10.5a2.5 2.5 0 0 0 5 0M17 10.5a2.5 2.5 0 0 0 5 0" />,
  revenue: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  crown: <path d="M2 20h20M3 8l4 4 5-8 5 8 4-4-2 12H5L3 8z" />,
  search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></>,
  power: <><path d="M12 2v10" /><path d="M18.4 6.6a9 9 0 1 1-12.8 0" /></>,
  trash: <><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
};

function Icon({ name, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

// ─── RESPONSIVE STYLES (structure only — colors stay inline via theme tokens) ──
const styles = `
  .sa-page { padding: 20px 16px 40px; min-height: 100vh; }
  .sa-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
  .sa-hero-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; margin-bottom: 14px; }
  .sa-plans-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
  .sa-loyal-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; padding: 10px 12px; }
  .sa-shop-row { display: flex; align-items: center; gap: 16px; padding: 14px 16px; flex-wrap: wrap; }
  .sa-shop-main { flex: 1 1 220px; min-width: 0; cursor: pointer; }
  .sa-shop-actions { display: flex; gap: 8px; flex-shrink: 0; width: 100%; }
  .sa-shop-actions button { flex: 1; }

  @media (min-width: 640px) {
    .sa-page { padding: 28px 28px 50px; }
    .sa-shop-actions { width: auto; }
    .sa-shop-actions button { flex: none; }
  }

  @media (min-width: 800px) {
    .sa-hero-grid { grid-template-columns: 1.3fr 1fr; }
    .sa-shop-row { flex-wrap: nowrap; }
  }

  @media (min-width: 1024px) {
    .sa-page { padding: 32px 32px 60px; }
  }

  .sa-card { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
  .sa-card:hover { transform: translateY(-2px); }
  .sa-row:hover { filter: brightness(1.06); }
  .sa-btn { transition: all 0.15s ease; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
  .sa-btn:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); }
  .sa-loyal-chip { transition: transform 0.15s ease, filter 0.15s ease; }
  .sa-loyal-chip:hover { transform: translateX(3px); filter: brightness(1.08); }

  @keyframes sa-fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .sa-fade-in { animation: sa-fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both; }

  @keyframes sa-pulse { 0% { box-shadow: 0 0 0 0 currentColor; opacity: 1; } 70% { box-shadow: 0 0 0 6px transparent; opacity: 0.7; } 100% { box-shadow: 0 0 0 0 transparent; opacity: 1; } }
  .sa-pulse-dot { animation: sa-pulse 1.8s ease infinite; }

  @media (prefers-reduced-motion: reduce) {
    .sa-fade-in, .sa-card:hover, .sa-pulse-dot { animation: none !important; transform: none !important; }
  }
`;

export default function SuperAdminDashboard() {
  const { api, admin, logout } = useSuperAdminAuth();
  const { toast, confirmAction, promptInput } = useSuperAdminUI();
  const { t } = useTheme();
  const navigate = useNavigate();
  const [shops, setShops] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState(null);
  const [search, setSearch] = useState("");
  const [openShopId, setOpenShopId] = useState(null);
  const [monthlyCost, setMonthlyCost] = useState(() => Number(localStorage.getItem("sa_monthly_cost")) || 0);

  const loadShops = () => api("/shops").then(setShops).catch((e) => setError(e.message));
  const loadAnalytics = () => api("/analytics").then(setAnalytics).catch((e) => setError(e.message));

  useEffect(() => { loadShops(); loadAnalytics(); }, []);

  const refreshAll = () => { loadShops(); loadAnalytics(); };

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
    localStorage.setItem("sa_monthly_cost", String(val));
  };

  const filteredShops = (shops || []).filter((s) =>
    s.shopName.toLowerCase().includes(search.toLowerCase()) ||
    s.ownerEmail.toLowerCase().includes(search.toLowerCase()) ||
    s.shopId.toLowerCase().includes(search.toLowerCase())
  );

  const profit = analytics ? analytics.mrr - monthlyCost : 0;
  const isProfit = profit >= 0;
  const gradient = `linear-gradient(135deg, ${t.accent}, ${t.accentLight})`;

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

      {/* Header */}
      <div className="sa-header sa-fade-in">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 8px 20px ${t.accent}45`,
              flexShrink: 0,
            }}>
              <Icon name="crown" size={18} color="#fff" />
            </div>
            <div>
              <h1 style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "clamp(20px, 5vw, 27px)",
                letterSpacing: "-0.02em", margin: 0,
                backgroundImage: gradient, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                Command Center
              </h1>
              <p style={{ fontSize: 12, color: t.textMuted, margin: "2px 0 0" }}>Signed in as {admin?.email}</p>
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="sa-btn" style={{
          padding: "10px 18px", borderRadius: 12, border: `1px solid ${t.border}`,
          background: t.bgCard, color: t.textMuted, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
        }}>
          <Icon name="logout" size={14} /> Log out
        </button>
      </div>

      {error && (
        <div style={{
          padding: "10px 16px", borderRadius: 12, background: t.redBg,
          border: `1px solid ${t.red}40`, color: t.red, fontSize: 13, marginBottom: 20,
        }}>{error}</div>
      )}

      {/* ── Hero: profit is the number that matters most, everything else supports it ── */}
      {analytics && (
        <div className="sa-hero-grid sa-fade-in">
          {/* Profit hero card */}
          <div className="sa-card" style={{
            borderRadius: 22, padding: "28px 30px",
            background: isProfit ? `linear-gradient(155deg, ${t.accent}16, ${t.bgCard} 65%)` : `linear-gradient(155deg, ${t.red}18, ${t.bgCard} 65%)`,
            border: `1px solid ${isProfit ? `${t.accent}35` : `${t.red}35`}`,
            boxShadow: `0 12px 32px -18px ${isProfit ? t.accent : t.red}70`,
            display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 18,
          }}>
            <div>
              <p style={{ fontSize: 12.5, color: t.textMuted, margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Estimated profit this month</p>
              <p style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "clamp(32px, 6vw, 46px)",
                letterSpacing: "-0.03em", margin: "8px 0 0",
                color: isProfit ? t.textPrimary : t.red,
              }}>
                ₹{profit.toLocaleString("en-IN")}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12.5, color: t.textMuted }}>
              <span style={{ fontWeight: 600, color: t.textPrimary }}>₹{analytics.mrr.toLocaleString("en-IN")}</span>
              <span>MRR</span>
              <span style={{ opacity: 0.5 }}>−</span>
              <span>running cost</span>
              <input
                type="number"
                value={monthlyCost}
                onChange={(e) => updateCost(Number(e.target.value))}
                style={{
                  width: 92, padding: "7px 10px", borderRadius: 9, border: `1px solid ${t.border}`,
                  background: t.bgPage, color: t.textPrimary, fontSize: 12.5, outline: "none",
                  transition: "border-color 0.15s ease",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = t.accent; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = t.border; }}
              />
              <span style={{ opacity: 0.5 }}>/mo</span>
            </div>
          </div>

          {/* Secondary stats — same rail, varied from the hero treatment */}
          <div className="sa-card" style={{
            borderRadius: 22, border: `1px solid ${t.border}`, background: t.bgCard,
            display: "flex", flexDirection: "column", boxShadow: `0 10px 28px -20px ${t.textPrimary}30`,
          }}>
            <SecondaryStat icon="shop" label="Total shops" value={analytics.totalShops}
              sub={`${analytics.activeCount} active, ${analytics.suspendedCount} suspended`} t={t} gradient={gradient} />
            <div style={{ height: 1, background: t.borderLight }} />
            <SecondaryStat icon="revenue" label="Total revenue collected" value={`₹${analytics.totalRevenue.toLocaleString("en-IN")}`}
              sub="All-time, from recorded payments" t={t} gradient={gradient} />
          </div>
        </div>
      )}

      {/* Plan distribution — inline chips instead of a third row of boxed cards */}
      {analytics && (
        <div className="sa-plans-row sa-fade-in">
          <span style={{ fontSize: 11.5, color: t.textMuted, fontWeight: 600 }}>Plans</span>
          {Object.entries(analytics.planCounts).map(([plan, count]) => (
            <span key={plan} style={{
              fontSize: 12, padding: "6px 14px", borderRadius: 99,
              background: t.bgCard, border: `1px solid ${t.border}`,
              color: t.textPrimary, textTransform: "capitalize", fontWeight: 500,
            }}>
              {plan} <strong style={{ color: t.accent, fontWeight: 800 }}>{count}</strong>
            </span>
          ))}
        </div>
      )}

      {/* Loyal shops */}
      {analytics && analytics.loyalShops.length > 0 && (
        <div className="sa-fade-in" style={{
          marginBottom: 20, padding: "18px 20px", borderRadius: 18,
          background: t.orangeBg, border: `1px solid ${t.orange}40`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 8, background: `${t.orange}20`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Icon name="crown" size={13} color={t.orange} />
            </div>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: t.orange, margin: 0 }}>
              Loyal shops <span style={{ color: t.textMuted, fontWeight: 500 }}>— 3+ renewals, worth a discount</span>
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {analytics.loyalShops.map((s) => (
              <button
                key={s.shopId}
                onClick={() => setOpenShopId(s.shopId)}
                className="sa-loyal-chip sa-loyal-row"
                style={{
                  borderRadius: 10, textAlign: "left",
                  background: t.bgCard, borderLeft: `3px solid ${t.orange}`,
                  border: "none", borderLeftWidth: 3, borderLeftColor: t.orange,
                  color: t.textPrimary, cursor: "pointer", fontSize: 12.5, fontWeight: 500,
                }}
              >
                <span>{s.shopName}</span>
                <span style={{ color: t.textMuted, fontWeight: 500 }}>
                  {s.renewalCount}× renewed{s.discountPercent > 0 ? ` · ${s.discountPercent}% off applied` : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="sa-fade-in" style={{ position: "relative", marginBottom: 16 }}>
        <div style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: t.textMuted }}>
          <Icon name="search" size={15} />
        </div>
        <input
          type="text"
          placeholder="Search by shop name, owner email, or shop ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box", padding: "12px 14px 12px 42px", borderRadius: 14,
            border: `1px solid ${t.border}`, background: t.bgCard,
            color: t.textPrimary, fontSize: 13, outline: "none", transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            boxShadow: `0 6px 20px -16px ${t.textPrimary}40`,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = t.accent; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = t.border; }}
        />
      </div>

      {/* Shops list */}
      {shops === null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 68, borderRadius: 16, background: t.bgCard, border: `1px solid ${t.border}` }} />
          ))}
        </div>
      ) : filteredShops.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <p style={{ color: t.textPrimary, fontSize: 14, fontWeight: 600, margin: 0 }}>
            {shops.length === 0 ? "No shops yet" : "No shops match your search"}
          </p>
          <p style={{ color: t.textMuted, fontSize: 12.5, marginTop: 6 }}>
            {shops.length === 0 ? "New signups will show up here." : "Try a different name, email, or shop ID."}
          </p>
        </div>
      ) : (
        <div className="sa-fade-in" style={{
          border: `1px solid ${t.border}`, borderRadius: 18, overflow: "hidden", background: t.bgCard,
          boxShadow: `0 10px 28px -20px ${t.textPrimary}30`,
        }}>
          {filteredShops.map((shop, i) => (
            <div
              key={shop._id}
              className="sa-row sa-shop-row"
              style={{
                borderBottom: i < filteredShops.length - 1 ? `1px solid ${t.borderLight}` : "none",
                transition: "filter 0.15s ease",
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: shop.status === "active" ? gradient : t.border,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15,
                color: shop.status === "active" ? "#fff" : t.textMuted,
                boxShadow: shop.status === "active" ? `0 6px 16px ${t.accent}40` : "none",
              }}>{shop.shopName.slice(0, 2).toUpperCase()}</div>

              <div className="sa-shop-main" onClick={() => setOpenShopId(shop.shopId)}>
                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14.5, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: 0, color: t.textPrimary }}>
                  {shop.shopName}
                  <StatusDot active={shop.status === "active"} t={t} />
                  <Pill color={t.accent} bg={`${t.accent}18`}>{shop.plan}</Pill>
                  {shop.renewalCount >= 3 && <span style={{ fontSize: 12 }}>⭐</span>}
                </p>
                <p style={{ fontSize: 11.5, color: t.textMuted, margin: "5px 0 0" }}>
                  {shop.shopId} · {shop.ownerName} ({shop.ownerEmail}) · {shop.totalUsers} users · ₹{shop.totalRevenue.toLocaleString("en-IN")} revenue
                </p>
                {shop.status === "suspended" && shop.suspendedReason && (
                  <p style={{ fontSize: 11, color: t.red, margin: "3px 0 0" }}>Reason: {shop.suspendedReason}</p>
                )}
              </div>

              <div className="sa-shop-actions">
                <button
                  onClick={() => handleSuspend(shop)}
                  disabled={actionId === shop.shopId}
                  className="sa-btn"
                  style={{
                    padding: "8px 16px", borderRadius: 10, fontSize: 11.5, fontWeight: 700,
                    border: `1px solid ${shop.status === "active" ? `${t.red}60` : `${t.green}60`}`,
                    color: shop.status === "active" ? t.red : t.green,
                    background: shop.status === "active" ? t.redBg : t.greenBg,
                    cursor: "pointer", opacity: actionId === shop.shopId ? 0.5 : 1,
                  }}
                >
                  <Icon name="power" size={13} /> {shop.status === "active" ? "Suspend" : "Activate"}
                </button>

                <button
                  onClick={() => handleDelete(shop)}
                  disabled={actionId === shop.shopId}
                  className="sa-btn"
                  style={{
                    padding: "8px 16px", borderRadius: 10, fontSize: 11.5, fontWeight: 700,
                    border: `1px solid ${t.border}`, color: t.textMuted, background: t.bgPage,
                    cursor: "pointer", opacity: actionId === shop.shopId ? 0.5 : 1,
                  }}
                >
                  <Icon name="trash" size={13} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {openShopId && (
        <SuperAdminShopModal shopId={openShopId} onClose={() => setOpenShopId(null)} onChanged={refreshAll} />
      )}
    </div>
  );
}

function Pill({ children, color, bg }) {
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 700, padding: "2px 9px", borderRadius: 99,
      color, background: bg, textTransform: "capitalize", letterSpacing: "0.02em",
    }}>{children}</span>
  );
}

function StatusDot({ active, t }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 600, color: active ? t.green : t.red }}>
      <span
        className={active ? "sa-pulse-dot" : ""}
        style={{
          width: 6, height: 6, borderRadius: "50%",
          background: active ? t.green : t.red,
          boxShadow: active ? `0 0 6px ${t.green}90` : `0 0 6px ${t.red}80`,
          color: active ? t.green : t.red,
        }}
      />
      {active ? "Active" : "Suspended"}
    </span>
  );
}

function SecondaryStat({ icon, label, value, sub, t, gradient }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 22px", flex: 1 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11, flexShrink: 0,
        background: gradient, opacity: 0.9,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 6px 16px ${t.accent}35`,
      }}>
        <Icon name={icon} size={16} color="#fff" />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 11, color: t.textMuted, margin: 0, fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: 19, fontWeight: 800, fontFamily: "'Syne', sans-serif", margin: "2px 0 0", letterSpacing: "-0.01em", color: t.textPrimary }}>{value}</p>
        {sub && <p style={{ fontSize: 10, color: t.textMuted, margin: "2px 0 0" }}>{sub}</p>}
      </div>
    </div>
  );
}