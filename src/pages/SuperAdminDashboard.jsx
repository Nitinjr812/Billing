import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperAdminAuth } from "../context/SuperAdminAuthContext";
import { useSuperAdminUI } from "../context/SuperAdminUIContext";
import SuperAdminShopModal from "./SuperAdminShopModal";

const ICONS = {
  shop: <path d="M4 10.5V20h16v-9.5M2 10.5l1.5-6h17l1.5 6M2 10.5a2.5 2.5 0 0 0 5 0M7 10.5a2.5 2.5 0 0 0 5 0M12 10.5a2.5 2.5 0 0 0 5 0M17 10.5a2.5 2.5 0 0 0 5 0" />,
  revenue: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  trend: <path d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6" />,
  crown: <path d="M2 20h20M3 8l4 4 5-8 5 8 4-4-2 12H5L3 8z" />,
  search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></>,
};

function Icon({ name, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

export default function SuperAdminDashboard() {
  const { api, admin, logout } = useSuperAdminAuth();
  const { toast, confirmAction, promptInput } = useSuperAdminUI();
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
        description: "Yeh shop ke owner aur staff ko access se rok dega.",
        confirmLabel: "Suspend Shop",
        fields: [{ key: "reason", label: "Reason (optional)", placeholder: "e.g. payment overdue" }],
      });
      if (result === null) return;
      reason = result.reason;
    } else {
      const ok = await confirmAction({
        title: `Activate "${shop.shopName}"?`,
        message: "Shop wapas se accessible ho jayegi owner/staff ke liye.",
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
      message: `Yeh permanent hai — shop ke saath ${shop.totalUsers} users bhi delete ho jayenge. Wapas nahi aayega.`,
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

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(1200px 600px at 10% -10%, rgba(99,102,241,0.12), transparent), radial-gradient(1000px 500px at 100% 0%, rgba(139,92,246,0.10), transparent), #08080c",
      fontFamily: "'DM Sans', sans-serif", color: "#fff", padding: "32px 32px 60px",
    }}>
      <style>{`
        @keyframes sa-fade-up { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        .sa-card { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
        .sa-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.16); box-shadow: 0 12px 32px rgba(0,0,0,0.35); }
        .sa-row:hover { background: rgba(255,255,255,0.025) !important; }
        .sa-btn { transition: all 0.15s ease; }
        .sa-btn:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); }
        .sa-scan::-webkit-scrollbar { height: 4px; width: 4px; }
        .sa-scan::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, animation: "sa-fade-up 0.4s ease" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 20px rgba(99,102,241,0.4)",
            }}>
              <Icon name="crown" size={17} color="#fff" />
            </div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 26, letterSpacing: "-0.02em" }}>
              Super Admin
            </h1>
          </div>
          <p style={{ fontSize: 12.5, color: "#7a7a90", marginLeft: 44 }}>Logged in as {admin?.email}</p>
        </div>
        <button onClick={handleLogout} className="sa-btn" style={{
          padding: "9px 20px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.03)", color: "#9999ad", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
        }}>Logout</button>
      </div>

      {error && (
        <div style={{
          padding: "10px 16px", borderRadius: 12, background: "rgba(248,113,113,0.08)",
          border: "1px solid rgba(248,113,113,0.25)", color: "#f87171", fontSize: 13, marginBottom: 20,
        }}>{error}</div>
      )}

      {/* Stat Cards */}
      {analytics && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 20,
          animation: "sa-fade-up 0.45s ease",
        }}>
          <StatCard icon="shop" label="Total Shops" value={analytics.totalShops}
            sub={`${analytics.activeCount} active · ${analytics.suspendedCount} suspended`} />
          <StatCard icon="revenue" label="Total Revenue Collected" value={`₹${analytics.totalRevenue.toLocaleString("en-IN")}`}
            sub="All-time, from recorded payments" gradient="linear-gradient(135deg,#059669,#4ade80)" />
          <StatCard icon="trend" label="Monthly Recurring Revenue" value={`₹${analytics.mrr.toLocaleString("en-IN")}`}
            sub="Sum of active shops' plans" gradient="linear-gradient(135deg,#0891b2,#22d3ee)" />
          <StatCard icon="trend" label="Estimated Profit / mo" value={`₹${profit.toLocaleString("en-IN")}`}
            sub="MRR − your monthly cost" gradient={profit >= 0 ? "linear-gradient(135deg,#4f46e5,#8b5cf6)" : "linear-gradient(135deg,#b91c1c,#f87171)"} />
        </div>
      )}

      {/* Monthly cost + plan distribution row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap", animation: "sa-fade-up 0.5s ease" }}>
        <div style={{
          flex: "1 1 260px", padding: "14px 18px", borderRadius: 16,
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 12, color: "#8888a0", flexShrink: 0 }}>Monthly operating cost</span>
          <input
            type="number"
            value={monthlyCost}
            onChange={(e) => updateCost(Number(e.target.value))}
            style={{
              flex: 1, minWidth: 80, padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 12.5, outline: "none",
            }}
          />
        </div>

        {analytics && Object.entries(analytics.planCounts).map(([plan, count]) => (
          <div key={plan} style={{
            flex: "1 1 100px", padding: "14px 16px", borderRadius: 16,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <p style={{ fontSize: 10.5, color: "#7a7a90", textTransform: "capitalize", letterSpacing: "0.04em" }}>{plan} plan</p>
            <p style={{ fontSize: 20, fontWeight: 900, fontFamily: "'Syne', sans-serif", marginTop: 2 }}>{count}</p>
          </div>
        ))}
      </div>

      {/* Loyal shops */}
      {analytics && analytics.loyalShops.length > 0 && (
        <div style={{
          marginBottom: 20, padding: 18, borderRadius: 18,
          background: "linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.02))",
          border: "1px solid rgba(251,191,36,0.2)", animation: "sa-fade-up 0.55s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Icon name="crown" size={15} color="#fbbf24" />
            <p style={{ fontSize: 12.5, fontWeight: 700, color: "#fbbf24" }}>
              Loyal Shops <span style={{ color: "#a8935a", fontWeight: 500 }}>· 3+ renewals, consider a discount</span>
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {analytics.loyalShops.map((s) => (
              <button
                key={s.shopId}
                onClick={() => setOpenShopId(s.shopId)}
                className="sa-btn"
                style={{
                  padding: "7px 14px", borderRadius: 10, fontSize: 11.5, fontWeight: 600,
                  background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)",
                  color: "#fbbf24", cursor: "pointer",
                }}
              >{s.shopName} · {s.renewalCount}× renewed{s.discountPercent > 0 ? ` · ${s.discountPercent}% off` : ""}</button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16, animation: "sa-fade-up 0.6s ease" }}>
        <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#666680" }}>
          <Icon name="search" size={15} />
        </div>
        <input
          type="text"
          placeholder="Search by shop name, owner email, or shop ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box", padding: "11px 14px 11px 40px", borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)",
            color: "#fff", fontSize: 13, outline: "none",
          }}
        />
      </div>

      {/* Shops list */}
      {shops === null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1,2,3].map((i) => (
            <div key={i} style={{ height: 68, borderRadius: 16, background: "rgba(255,255,255,0.02)" }} />
          ))}
        </div>
      ) : filteredShops.length === 0 ? (
        <p style={{ color: "#7a7a90", fontSize: 13, textAlign: "center", padding: "40px 0" }}>Koi shop nahi mili.</p>
      ) : (
        <div style={{
          border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, overflow: "hidden",
          background: "rgba(255,255,255,0.015)", animation: "sa-fade-up 0.65s ease",
        }}>
          {filteredShops.map((shop, i) => (
            <div
              key={shop._id}
              className="sa-row"
              style={{
                display: "flex", alignItems: "center", gap: 16, padding: "16px 20px",
                borderBottom: i < filteredShops.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                transition: "background 0.15s ease",
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                background: `linear-gradient(135deg, ${shop.status === "active" ? "#6366f1" : "#4b4b5a"}, ${shop.status === "active" ? "#8b5cf6" : "#2a2a35"})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, color: "#fff",
              }}>{shop.shopName.slice(0, 2).toUpperCase()}</div>

              <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setOpenShopId(shop.shopId)}>
                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14.5, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {shop.shopName}
                  <Pill color={shop.status === "active" ? "#4ade80" : "#f87171"} bg={shop.status === "active" ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)"}>
                    {shop.status.toUpperCase()}
                  </Pill>
                  <Pill color="#a5b4fc" bg="rgba(99,102,241,0.15)">{shop.plan}</Pill>
                  {shop.renewalCount >= 3 && <span style={{ fontSize: 12 }}>⭐</span>}
                </p>
                <p style={{ fontSize: 11.5, color: "#7a7a90", marginTop: 5 }}>
                  {shop.shopId} · {shop.ownerName} ({shop.ownerEmail}) · {shop.totalUsers} users · ₹{shop.totalRevenue.toLocaleString("en-IN")} revenue
                </p>
                {shop.status === "suspended" && shop.suspendedReason && (
                  <p style={{ fontSize: 11, color: "#f87171", marginTop: 3 }}>Reason: {shop.suspendedReason}</p>
                )}
              </div>

              <button
                onClick={() => handleSuspend(shop)}
                disabled={actionId === shop.shopId}
                className="sa-btn"
                style={{
                  padding: "7px 16px", borderRadius: 10, fontSize: 11.5, fontWeight: 700,
                  border: `1px solid ${shop.status === "active" ? "rgba(248,113,113,0.4)" : "rgba(74,222,128,0.4)"}`,
                  color: shop.status === "active" ? "#f87171" : "#4ade80",
                  background: shop.status === "active" ? "rgba(248,113,113,0.06)" : "rgba(74,222,128,0.06)",
                  cursor: "pointer", opacity: actionId === shop.shopId ? 0.5 : 1, flexShrink: 0,
                }}
              >{shop.status === "active" ? "Suspend" : "Activate"}</button>

              <button
                onClick={() => handleDelete(shop)}
                disabled={actionId === shop.shopId}
                className="sa-btn"
                style={{
                  padding: "7px 16px", borderRadius: 10, fontSize: 11.5, fontWeight: 700,
                  border: "1px solid rgba(255,255,255,0.1)", color: "#8888a0", background: "transparent",
                  cursor: "pointer", opacity: actionId === shop.shopId ? 0.5 : 1, flexShrink: 0,
                }}
              >Delete</button>
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

function StatCard({ icon, label, value, sub, gradient = "linear-gradient(135deg,#6366f1,#8b5cf6)" }) {
  return (
    <div className="sa-card" style={{
      padding: 18, borderRadius: 18, background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.07)", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, background: gradient,
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
      }}>
        <Icon name={icon} size={16} color="#fff" />
      </div>
      <p style={{ fontSize: 11, color: "#8888a0", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: "#6b6b80", marginTop: 5 }}>{sub}</p>}
    </div>
  );
}