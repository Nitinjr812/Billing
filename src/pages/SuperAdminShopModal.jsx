import { useState, useEffect } from "react";
import { useSuperAdminAuth } from "../context/SuperAdminAuthContext";
import { useSuperAdminUI } from "../context/SuperAdminUIContext";
import { useTheme } from "../components/ThemeContext";

const PLAN_DEFAULT_AMOUNTS = { free: 0, pro: 999, premium: 2499 };
const PLANS = ["free", "pro", "premium"];
const MSG_TYPES = ["offer", "announcement", "warning"];

const ICONS = {
  close: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" /></>,
};

function Icon({ name, size = 15, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

const styles = `
  .sam-overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: flex-end; justify-content: center; padding: 0; }
  .sam-panel { width: 100%; max-height: 92vh; border-radius: 20px 20px 0 0; overflow-y: auto; }
  @media (min-width: 640px) {
    .sam-overlay { align-items: center; padding: 20px; }
    .sam-panel { max-width: 560px; border-radius: 20px; max-height: 88vh; }
  }
  .sam-field { display: flex; flex-direction: column; gap: 6px; }
  .sam-grid-2 { display: grid; grid-template-columns: 1fr; gap: 12px; }
  @media (min-width: 480px) { .sam-grid-2 { grid-template-columns: 1fr 1fr; } }
  .sam-grid-3 { display: grid; grid-template-columns: 1fr; gap: 12px; }
  @media (min-width: 480px) { .sam-grid-3 { grid-template-columns: 1fr 1fr 1fr; } }
  .sam-btn { transition: all 0.15s ease; }
  .sam-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
  @keyframes sam-fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  .sam-fade-in { animation: sam-fade-up 0.25s ease both; }
`;

export default function SuperAdminShopModal({ shopId, onClose, onChanged }) {
  const { api } = useSuperAdminAuth();
  const { toast } = useSuperAdminUI();
  const { t } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null); // { shop, users, messages }

  const [plan, setPlan] = useState("free");
  const [monthlyAmount, setMonthlyAmount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [savingSub, setSavingSub] = useState(false);

  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [msgType, setMsgType] = useState("offer");
  const [sending, setSending] = useState(false);

  const load = () => {
    setLoading(true);
    api(`/shops/${shopId}`)
      .then((data) => {
        setDetail(data);
        const sub = data.shop?.subscription || {};
        setPlan(sub.plan || "free");
        setMonthlyAmount(sub.monthlyAmount ?? PLAN_DEFAULT_AMOUNTS[sub.plan || "free"]);
        setDiscountPercent(sub.discountPercent || 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [shopId]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handlePlanChange = (newPlan) => {
    setPlan(newPlan);
    setMonthlyAmount(PLAN_DEFAULT_AMOUNTS[newPlan]);
  };

  const saveSubscription = async () => {
    setSavingSub(true);
    try {
      await api(`/shops/${shopId}/subscription`, {
        method: "PATCH",
        body: JSON.stringify({ plan, monthlyAmount: Number(monthlyAmount), discountPercent: Number(discountPercent) }),
      });
      toast.success("Subscription updated.");
      onChanged?.();
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSavingSub(false);
    }
  };

  const sendMessage = async () => {
    if (!msgTitle.trim() || !msgBody.trim()) {
      toast.error("Title and message are required.");
      return;
    }
    setSending(true);
    try {
      await api(`/shops/${shopId}/notify`, {
        method: "POST",
        body: JSON.stringify({ title: msgTitle.trim(), message: msgBody.trim(), type: msgType }),
      });
      toast.success("Message sent to shop.");
      setMsgTitle("");
      setMsgBody("");
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const shop = detail?.shop;
  const users = detail?.users || [];
  const messages = detail?.messages || [];

  return (
    <div
      className="sam-overlay"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="sam-panel sam-fade-in" style={{ background: t.bgPage, border: `1px solid ${t.border}`, color: t.textPrimary }}>
        {/* Header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px", borderBottom: `1px solid ${t.border}`, background: t.bgPage,
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 17, margin: 0, color: t.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {shop?.shopName || "Loading…"}
            </h2>
            {shop && <p style={{ fontSize: 11.5, color: t.textMuted, margin: "3px 0 0" }}>{shop.shopId}</p>}
          </div>
          <button onClick={onClose} className="sam-btn" style={{
            width: 32, height: 32, borderRadius: 9, border: `1px solid ${t.border}`, background: t.bgCard,
            color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Icon name="close" size={15} />
          </button>
        </div>

        <div style={{ padding: "18px 20px 28px", display: "flex", flexDirection: "column", gap: 22 }}>
          {loading && <p style={{ fontSize: 13, color: t.textMuted }}>Loading shop details…</p>}
          {error && <p style={{ fontSize: 13, color: t.red }}>{error}</p>}

          {!loading && shop && (
            <>
              {/* Overview */}
              <div className="sam-grid-3">
                <InfoBox t={t} label="Status" value={shop.status === "active" ? "Active" : "Suspended"} accent={shop.status === "active" ? t.green : t.red} />
                <InfoBox t={t} label="Owner" value={detail?.users?.find((u) => String(u._id) === String(shop.ownerId))?.name || "—"} />
                <InfoBox t={t} label="Team size" value={users.length} />
              </div>
              {shop.status === "suspended" && shop.suspendedReason && (
                <p style={{ margin: "-10px 0 0", fontSize: 12, color: t.red }}>Reason: {shop.suspendedReason}</p>
              )}

              {/* Subscription */}
              <Section t={t} title="Subscription">
                <div className="sam-grid-3">
                  <div className="sam-field">
                    <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>Plan</label>
                    <select
                      value={plan}
                      onChange={(e) => handlePlanChange(e.target.value)}
                      style={selectStyle(t)}
                    >
                      {PLANS.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="sam-field">
                    <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>Monthly amount (₹)</label>
                    <input type="number" value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)} style={inputStyle(t)} />
                  </div>
                  <div className="sam-field">
                    <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>Discount (%)</label>
                    <input type="number" min="0" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} style={inputStyle(t)} />
                  </div>
                </div>
                <button onClick={saveSubscription} disabled={savingSub} className="sam-btn" style={{
                  marginTop: 12, padding: "9px 18px", borderRadius: 10, border: "none",
                  background: t.accent, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  opacity: savingSub ? 0.6 : 1,
                }}>
                  {savingSub ? "Saving…" : "Save subscription"}
                </button>
                {shop.subscription?.renewalHistory?.length > 0 && (
                  <p style={{ fontSize: 11, color: t.textMuted, marginTop: 10 }}>
                    {shop.subscription.renewalHistory.length} renewal(s) recorded so far.
                  </p>
                )}
              </Section>

              {/* Send message */}
              <Section t={t} title="Send a message to this shop">
                <div className="sam-grid-2">
                  <div className="sam-field">
                    <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>Title</label>
                    <input value={msgTitle} onChange={(e) => setMsgTitle(e.target.value)} placeholder="e.g. Festive discount" style={inputStyle(t)} />
                  </div>
                  <div className="sam-field">
                    <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>Type</label>
                    <select value={msgType} onChange={(e) => setMsgType(e.target.value)} style={selectStyle(t)}>
                      {MSG_TYPES.map((mt) => <option key={mt} value={mt}>{mt[0].toUpperCase() + mt.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="sam-field" style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>Message</label>
                  <textarea
                    value={msgBody}
                    onChange={(e) => setMsgBody(e.target.value)}
                    rows={3}
                    placeholder="Write what you want the shop owner to see…"
                    style={{ ...inputStyle(t), resize: "vertical", fontFamily: "'DM Sans', sans-serif" }}
                  />
                </div>
                <button onClick={sendMessage} disabled={sending} className="sam-btn" style={{
                  marginTop: 12, padding: "9px 18px", borderRadius: 10, border: "none",
                  background: t.accent, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  opacity: sending ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                  <Icon name="send" size={13} color="#fff" /> {sending ? "Sending…" : "Send message"}
                </button>
              </Section>

              {/* Message history */}
              <Section t={t} title={`Message history (${messages.length})`} icon="mail">
                {messages.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: t.textMuted, margin: 0 }}>No messages sent to this shop yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {messages.map((m) => (
                      <div key={m._id} style={{
                        padding: "10px 12px", borderRadius: 10, background: t.bgCard, border: `1px solid ${t.border}`,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                          <span style={{ fontWeight: 700, fontSize: 12.5, color: t.textPrimary }}>{m.title}</span>
                          <span style={{
                            fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 99, textTransform: "capitalize",
                            color: m.type === "warning" ? t.red : t.accent,
                            background: m.type === "warning" ? t.redBg : `${t.accent}18`,
                          }}>{m.type}</span>
                        </div>
                        <p style={{ fontSize: 12, color: t.textMuted, margin: "4px 0 0" }}>{m.message}</p>
                        <p style={{ fontSize: 10, color: t.textMuted, margin: "6px 0 0", opacity: 0.7 }}>
                          {new Date(m.createdAt).toLocaleString("en-IN")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Team */}
              <Section t={t} title={`Team (${users.length})`} icon="users">
                {users.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: t.textMuted, margin: 0 }}>No users found for this shop.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {users.map((u) => (
                      <div key={u._id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5 }}>
                        <span style={{ color: t.textPrimary, fontWeight: 500 }}>{u.name}{String(u._id) === String(shop.ownerId) ? " (Owner)" : ""}</span>
                        <span style={{ color: t.textMuted }}>{u.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </>
          )}
        </div>
      </div>
      <style>{styles}</style>
    </div>
  );
}

function Section({ t, title, icon, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {icon && <Icon name={icon} size={14} color={t.textMuted} />}
        <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: t.textMuted, margin: 0 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoBox({ t, label, value, accent }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 12, background: t.bgCard, border: `1px solid ${t.border}` }}>
      <p style={{ fontSize: 10, color: t.textMuted, margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, margin: "4px 0 0", color: accent || t.textPrimary, fontFamily: "'Syne', sans-serif" }}>{value}</p>
    </div>
  );
}

function inputStyle(t) {
  return {
    padding: "9px 12px", borderRadius: 9, border: `1px solid ${t.border}`,
    background: t.bgCard, color: t.textPrimary, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box",
  };
}

function selectStyle(t) {
  return { ...inputStyle(t), cursor: "pointer" };
}