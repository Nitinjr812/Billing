import { useState, useEffect } from "react";
import { useTheme } from "../components/ThemeContext";
import { useAuth } from "../context/AuthContext";

const BACKEND = "https://billing-backend-tawny.vercel.app";

function useApi() {
  const { token, logout } = useAuth();
  return async (path, options = {}) => {
    const res = await fetch(`${BACKEND}/api${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
    if (res.status === 401) { logout(); throw new Error("Session expired, please login again"); }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };
}

// ─── ICONS — single stroke-set, kept minimal and purposeful ───────────────
function Icon({ id, size = 15 }) {
  const paths = {
    lock: <><rect x="5" y="10.5" width="14" height="9.5" rx="2.2" /><path d="M8 10.5V7.3a4 4 0 0 1 8 0v3.2" /></>,
    unlock: <><rect x="5" y="10.5" width="14" height="9.5" rx="2.2" /><path d="M8 10.5V7.3a4 4 0 0 1 7.4-2.1" /></>,
    users: <><path d="M16.5 20.5v-1.6a3.8 3.8 0 0 0-3.8-3.8H7.3a3.8 3.8 0 0 0-3.8 3.8v1.6" /><circle cx="9.6" cy="7.6" r="3.6" /><path d="M21.5 20.5v-1.6a3.8 3.8 0 0 0-2.7-3.65" /><path d="M15.3 3.75a3.6 3.6 0 0 1 0 7.3" /></>,
    percent: <><circle cx="7.5" cy="7.5" r="2.3" /><circle cx="16.5" cy="16.5" r="2.3" /><path d="M6.5 17.5 17.5 6.5" /></>,
    check: <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />,
    info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.2" /><circle cx="12" cy="8.1" r="0.15" fill="currentColor" stroke="none" /></>,
    shield: <><path d="M12 3.5 19 6.5v5.3c0 4.4-2.9 7.6-7 8.7-4.1-1.1-7-4.3-7-8.7V6.5L12 3.5Z" /><path d="M9 12l2 2 4-4.2" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[id]}
    </svg>
  );
}

// ─── TOAST ──────────────────────────────────────────────────────────────
function Toast({ message, onDismiss, t }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onDismiss?.(), 3200);
    return () => clearTimeout(timer);
  }, [message]);
  if (!message) return null;
  const isError = message.startsWith("❌");
  const text = message.replace(/^✅\s*|^❌\s*/, "");
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 1000,
      display: "flex", alignItems: "center", gap: 10,
      background: t.bgCard, borderLeft: `3px solid ${isError ? t.red : t.green}`,
      border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 18px",
      minWidth: 240, maxWidth: 360, boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
      fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.textPrimary,
      animation: "dpToastIn 0.25s ease",
    }}>
      <span style={{ color: isError ? t.red : t.green, fontWeight: 700 }}>{isError ? "!" : "✓"}</span>
      <span style={{ flex: 1 }}>{text}</span>
      <button onClick={onDismiss} aria-label="Dismiss" style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer", fontSize: 14 }}>✕</button>
    </div>
  );
}

// ─── SIGNATURE ELEMENT — the permission toggle reads as a tiny padlock
// that visibly locks/unlocks, instead of a generic on/off pill. It's the
// one piece of motion on the page, and it directly dramatizes what the
// control actually does: gate a staff member's ability to discount.
function PermissionLock({ on, onChange, t }) {
  return (
    <button
      onClick={onChange}
      aria-label={on ? "Revoke discount permission" : "Grant discount permission"}
      aria-pressed={on}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        background: on ? t.greenBg : `${t.border}55`,
        border: `1px solid ${on ? t.green + "55" : t.border}`,
        borderRadius: 99, padding: "5px 12px 5px 8px",
        cursor: "pointer", transition: "background 0.2s ease, border-color 0.2s ease",
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: on ? t.green : t.textMuted,
        color: "#fff", transition: "background 0.2s ease, transform 0.25s ease",
        transform: on ? "rotate(0deg)" : "rotate(-8deg)",
      }}>
        <Icon id={on ? "unlock" : "lock"} size={11} />
      </span>
      <span style={{
        fontSize: 11, fontWeight: 600,
        color: on ? t.green : t.textMuted,
        fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
      }}>
        {on ? "Can discount" : "Locked"}
      </span>
    </button>
  );
}

function getInitials(name = "") {
  return name.trim().split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "S";
}

const AVATAR_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316"];

function Avatar({ name, size = 36 }) {
  const color = AVATAR_COLORS[(name || "?").charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `${color}1f`, border: `1.5px solid ${color}55`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: size * 0.34, color,
    }}>{getInitials(name)}</div>
  );
}

// ─── small stat pill, echoes the summary cards used elsewhere in the app ──
function StatPill({ icon, label, value, t }) {
  return (
    <div style={{
      flex: "1 1 160px", display: "flex", alignItems: "center", gap: 12,
      background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14,
      padding: "14px 16px",
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: `${t.accent}14`, color: t.accent,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}><Icon id={icon} size={16} /></div>
      <div>
        <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 900, color: t.textPrimary, lineHeight: 1, margin: 0 }}>{value}</p>
        <p style={{ fontSize: 11, color: t.textMuted, margin: "3px 0 0" }}>{label}</p>
      </div>
    </div>
  );
}

function SkeletonRow({ t, isLast }) {
  const shimmer = { background: `linear-gradient(90deg, ${t.border}55 25%, ${t.border}99 37%, ${t.border}55 63%)`, backgroundSize: "400% 100%" };
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
      borderBottom: !isLast ? `1px solid ${t.border}` : "none",
    }}>
      <div className="dp-skeleton" style={{ width: 36, height: 36, borderRadius: "50%", ...shimmer }} />
      <div style={{ flex: "1 1 160px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="dp-skeleton" style={{ width: 120, height: 11, borderRadius: 6, ...shimmer }} />
        <div className="dp-skeleton" style={{ width: 160, height: 9, borderRadius: 6, ...shimmer }} />
      </div>
      <div className="dp-skeleton" style={{ width: 96, height: 26, borderRadius: 99, ...shimmer }} />
      <div className="dp-skeleton" style={{ width: 70, height: 26, borderRadius: 8, ...shimmer }} />
      <div className="dp-skeleton" style={{ width: 56, height: 26, borderRadius: 8, ...shimmer }} />
    </div>
  );
}

// ─── Reusable section — used both standalone AND inside Settings tab ──────
export function DiscountPermissionsSection({ embedded = false }) {
  const { t } = useTheme();
  const { user } = useAuth();
  const api = useApi();
  const [staff, setStaff] = useState(null);
  const [saving, setSaving] = useState({});
  const [justSaved, setJustSaved] = useState({});
  const [msg, setMsg] = useState("");

  const load = () => api("/discount-permissions/team").then(setStaff).catch((e) => setMsg("❌ " + e.message));
  useEffect(() => { load(); }, []);

  if (user?.role !== "owner") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        padding: "40px 20px", textAlign: "center", color: t.textMuted,
        background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16,
      }}>
        <Icon id="shield" size={22} />
        <p style={{ fontSize: 13, margin: 0 }}>Only the shop owner can manage discount permissions.</p>
      </div>
    );
  }

  const updateLocal = (id, key, value) =>
    setStaff((prev) => prev.map((s) => (s._id === id ? { ...s, [key]: value } : s)));

  const handleSave = async (member) => {
    setSaving((s) => ({ ...s, [member._id]: true }));
    try {
      await api(`/discount-permissions/${member._id}`, {
        method: "PUT",
        body: JSON.stringify({
          canGiveDiscount: member.canGiveDiscount,
          maxDiscountPercent: member.maxDiscountPercent,
        }),
      });
      setMsg(`✅ ${member.name}'s permissions have been updated`);
      setJustSaved((s) => ({ ...s, [member._id]: true }));
      setTimeout(() => setJustSaved((s) => ({ ...s, [member._id]: false })), 1800);
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setSaving((s) => ({ ...s, [member._id]: false }));
    }
  };

  const cardStyle = { background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16 };
  const inputStyle = {
    width: 62, boxSizing: "border-box", background: `${t.accent}08`,
    border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 8px",
    fontSize: 12, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", outline: "none",
    textAlign: "center",
  };

  const canDiscountCount = staff?.filter((s) => s.canGiveDiscount).length ?? 0;

  return (
    <>
      <style>{`
        .dp-skeleton { animation: dpShimmer 1.4s ease-in-out infinite; }
        @keyframes dpShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes dpToastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dpRowIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .dp-row { animation: dpRowIn 0.25s ease both; transition: background 0.15s ease; }
        .dp-row:hover { background: ${t.accent}06; }
        .dp-input:focus { border-color: ${t.accent} !important; box-shadow: 0 0 0 3px ${t.accent}22; }
        .dp-save-btn { transition: background 0.15s ease, opacity 0.15s ease, transform 0.1s ease; }
        .dp-save-btn:active:not(:disabled) { transform: scale(0.96); }
        @media (prefers-reduced-motion: reduce) {
          .dp-row, .dp-skeleton { animation: none !important; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {!embedded && (
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em" }}>
              Discount Permissions
            </h1>
            <p style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>
              Choose which staff can give discounts and up to how much — anything beyond that will require an owner OTP.
            </p>
          </div>
        )}

        {staff && staff.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <StatPill icon="users" label="Team members" value={staff.length} t={t} />
            <StatPill icon="percent" label="Can give discounts" value={canDiscountCount} t={t} />
          </div>
        )}

        {!staff ? (
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} t={t} isLast={i === 2} />)}
          </div>
        ) : staff.length === 0 ? (
          <div style={{
            ...cardStyle, padding: "40px 20px", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 8, color: t.textMuted, textAlign: "center",
          }}>
            <Icon id="users" size={22} />
            <p style={{ fontSize: 13, margin: 0 }}>No staff members have been added yet.</p>
          </div>
        ) : (
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            {staff.map((m, i) => (
              <div
                key={m._id}
                className="dp-row"
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", flexWrap: "wrap",
                  borderBottom: i < staff.length - 1 ? `1px solid ${t.border}` : "none",
                  animationDelay: `${i * 35}ms`,
                }}
              >
                <Avatar name={m.name} size={36} />

                <div style={{ flex: "1 1 160px", minWidth: 140 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>{m.name}</p>
                  <p style={{ fontSize: 11, color: t.textMuted, margin: "2px 0 0" }}>{m.email}</p>
                </div>

                <PermissionLock t={t} on={m.canGiveDiscount} onChange={() => updateLocal(m._id, "canGiveDiscount", !m.canGiveDiscount)} />

                <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: m.canGiveDiscount ? 1 : 0.4 }}>
                  <label style={{ fontSize: 11, color: t.textMuted }} htmlFor={`limit-${m._id}`}>Up to</label>
                  <input
                    id={`limit-${m._id}`}
                    className="dp-input"
                    type="number" min="0" max="100"
                    disabled={!m.canGiveDiscount}
                    value={m.maxDiscountPercent}
                    onChange={(e) => updateLocal(m._id, "maxDiscountPercent", Number(e.target.value))}
                    style={inputStyle}
                  />
                  <span style={{ fontSize: 11, color: t.textMuted }}>%</span>
                </div>

                <button
                  className="dp-save-btn"
                  onClick={() => handleSave(m)}
                  disabled={saving[m._id]}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: justSaved[m._id] ? t.greenBg : t.accent,
                    color: justSaved[m._id] ? t.green : "#fff",
                    border: "none", borderRadius: 8,
                    padding: "7px 14px", fontSize: 11, fontWeight: 700,
                    cursor: saving[m._id] ? "not-allowed" : "pointer", opacity: saving[m._id] ? 0.6 : 1,
                  }}
                >
                  {justSaved[m._id] && <Icon id="check" size={11} />}
                  {saving[m._id] ? "Saving…" : justSaved[m._id] ? "Saved" : "Save"}
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          background: `${t.accent}08`, border: `1px solid ${t.accent}25`,
          borderRadius: 12, padding: "12px 14px",
        }}>
          <span style={{ color: t.accent, flexShrink: 0, marginTop: 1 }}><Icon id="info" size={14} /></span>
          <p style={{ fontSize: 11.5, color: t.textMuted, margin: 0, lineHeight: 1.5 }}>
            To give a discount beyond their limit, staff will need to enter the OTP sent to the owner's email.
          </p>
        </div>

        <Toast message={msg} onDismiss={() => setMsg("")} t={t} />
      </div>
    </>
  );
}

// ─── Standalone page (used by /discount-permissions route) ───────────────
export default function DiscountPermissions() {
  return <DiscountPermissionsSection />;
}