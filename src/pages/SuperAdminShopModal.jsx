import { useState, useEffect } from "react";
import { useSuperAdminAuth } from "../context/SuperAdminAuthContext";
import { useSuperAdminUI } from "../context/SuperAdminUIContext";

const PLAN_AMOUNTS = { free: 0, pro: 999, premium: 2499 };

export default function SuperAdminShopModal({ shopId, onClose, onChanged }) {
  const { api } = useSuperAdminAuth();
  const { toast, promptInput } = useSuperAdminUI();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    api(`/shops/${shopId}`).then(setData).catch((e) => toast.error(e.message));
  };

  useEffect(() => { load(); }, [shopId]);

  const updateSubscription = async (patch) => {
    setBusy(true);
    try {
      await api(`/shops/${shopId}/subscription`, { method: "PATCH", body: JSON.stringify(patch) });
      toast.success("Subscription updated.");
      load();
      onChanged?.();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const setDiscount = async () => {
    const sub = data.shop.subscription;
    const result = await promptInput({
      title: "Set Loyalty Discount",
      description: "Yeh discount shop ke agle renewal pe apply hoga.",
      confirmLabel: "Save Discount",
      fields: [{ key: "discountPercent", label: "Discount %", type: "number", defaultValue: sub.discountPercent || 0 }],
    });
    if (result === null) return;
    const dp = Number(result.discountPercent);
    if (isNaN(dp) || dp < 0 || dp > 100) return toast.error("Discount 0–100 ke beech hona chahiye.");
    updateSubscription({ discountPercent: dp });
  };

  const recordPayment = async () => {
    const sub = data.shop.subscription;
    const defaultAmt = Math.round((sub.monthlyAmount || 0) * (1 - (sub.discountPercent || 0) / 100));
    const result = await promptInput({
      title: "Record Payment",
      description: "Yeh renewal history mein jud jayega aur loyalty tracking ke liye count hoga.",
      confirmLabel: "Record Payment",
      fields: [{ key: "amount", label: "Amount Received (₹)", type: "number", defaultValue: defaultAmt }],
    });
    if (result === null) return;
    const amt = Number(result.amount);
    if (isNaN(amt) || amt < 0) return toast.error("Invalid amount.");

    setBusy(true);
    try {
      await api(`/shops/${shopId}/record-payment`, { method: "POST", body: JSON.stringify({ amount: amt }) });
      toast.success(`₹${amt} payment recorded.`);
      load();
      onChanged?.();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const sendOffer = async () => {
    const result = await promptInput({
      title: "Send Offer / Message",
      description: "Yeh shop owner ko notify hoga.",
      confirmLabel: "Send",
      fields: [
        { key: "title", label: "Title", placeholder: "e.g. 20% off renewal!", required: true },
        { key: "message", label: "Message", type: "textarea", placeholder: "Write your offer/message here...", required: true },
      ],
    });
    if (result === null) return;

    setBusy(true);
    try {
      await api(`/shops/${shopId}/notify`, { method: "POST", body: JSON.stringify({ ...result, type: "offer" }) });
      toast.success("Message sent.");
      load();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  if (!data) {
    return (
      <ModalShell onClose={onClose}>
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#8b5cf6",
            animation: "sa-spin 0.7s linear infinite",
          }} />
        </div>
      </ModalShell>
    );
  }

  const { shop, users, messages } = data;
  const sub = shop.subscription || {};
  const history = sub.renewalHistory || [];
  const isLoyal = history.length >= 3;

  return (
    <ModalShell onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 20, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {shop.shopName}
            {isLoyal && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                color: "#fbbf24", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)",
              }}>⭐ LOYAL</span>
            )}
          </h2>
          <p style={{ fontSize: 12, color: "#7a7a90", marginTop: 3 }}>{shop.shopId}</p>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#7a7a90", fontSize: 16, cursor: "pointer" }}>✕</button>
      </div>

      {/* Subscription */}
      <Section title="Subscription">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {["free", "pro", "premium"].map((p) => (
            <button
              key={p}
              disabled={busy}
              onClick={() => updateSubscription({ plan: p })}
              className="sa-btn"
              style={{
                padding: "7px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                border: `1.5px solid ${sub.plan === p ? "#8b5cf6" : "rgba(255,255,255,0.1)"}`,
                background: sub.plan === p ? "rgba(139,92,246,0.15)" : "transparent",
                color: sub.plan === p ? "#c4b5fd" : "#8888a0",
                cursor: busy ? "not-allowed" : "pointer", textTransform: "capitalize",
              }}
            >{p} · ₹{PLAN_AMOUNTS[p]}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#8888a0", marginBottom: 14, flexWrap: "wrap" }}>
          <Stat label="Monthly" value={`₹${sub.monthlyAmount || 0}`} />
          <Stat label="Discount" value={`${sub.discountPercent || 0}%`} />
          <Stat label="Renewals" value={history.length} />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ActionBtn color="#4ade80" onClick={setDiscount} disabled={busy}>Set Loyalty Discount</ActionBtn>
          <ActionBtn color="#8b5cf6" onClick={recordPayment} disabled={busy}>Record Payment</ActionBtn>
        </div>

        {history.length > 0 && (
          <div className="sa-scan" style={{ marginTop: 16, maxHeight: 130, overflowY: "auto" }}>
            <p style={{ fontSize: 10.5, color: "#7a7a90", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Payment History</p>
            {[...history].reverse().map((r, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", fontSize: 12,
                padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "#c0c0d0",
              }}>
                <span>{new Date(r.date).toLocaleDateString("en-IN")} · <span style={{ textTransform: "capitalize" }}>{r.plan}</span></span>
                <span style={{ fontWeight: 700, color: "#4ade80" }}>₹{r.amount}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Team */}
      <Section title={`Team (${users.length})`}>
        {users.map((u) => (
          <div key={u._id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12,
            padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}>
            <span style={{ color: "#fff", fontWeight: 600 }}>
              {u.name} <span style={{ color: "#7a7a90", fontWeight: 400, textTransform: "capitalize" }}>· {u.role}</span>
            </span>
            <span style={{ color: "#7a7a90" }}>{u.email}</span>
          </div>
        ))}
      </Section>

      {/* Messages */}
      <Section title="Messages & Offers">
        <ActionBtn color="#fbbf24" onClick={sendOffer} disabled={busy}>+ Send Offer / Message</ActionBtn>
        <div style={{ marginTop: 12 }}>
          {messages.length === 0 && <p style={{ fontSize: 12, color: "#5a5a6e" }}>Koi message nahi bheja abhi tak.</p>}
          {messages.map((m) => (
            <div key={m._id} style={{ padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                {m.title}
                {!m.read && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24", flexShrink: 0 }} />}
              </p>
              <p style={{ fontSize: 11.5, color: "#8888a0", marginTop: 3 }}>{m.message}</p>
            </div>
          ))}
        </div>
      </Section>
    </ModalShell>
  );
}

function ModalShell({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(5,5,10,0.75)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="sa-scan"
        style={{
          width: 560, maxHeight: "85vh", overflowY: "auto",
          background: "linear-gradient(180deg, #17171f 0%, #131319 100%)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22,
          padding: 26, color: "#fff", fontFamily: "'DM Sans', sans-serif",
          boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
        }}
      >
        {children}
      </div>
      <style>{`@keyframes sa-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#7a7a90", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>{title}</p>
      {children}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <span>{label}: <b style={{ color: "#fff" }}>{value}</b></span>
  );
}

function ActionBtn({ children, color, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className="sa-btn" style={{
      padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
      border: `1.5px solid ${color}55`, color, background: `${color}12`,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
    }}>{children}</button>
  );
}