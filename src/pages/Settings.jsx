import { useState, useEffect } from "react";
import { useTheme } from "../components/ThemeContext";
import { useAuth } from "../context/AuthContext";

const BACKEND = "https://billing-backend-tawny.vercel.app";

const INTEGRATIONS = [
  { name: "Razorpay",     desc: "Payment gateway",           status: "connected", icon: "💳", color: "#2563eb" },
  { name: "Shiprocket",   desc: "Logistics & shipping",      status: "connected", icon: "🚚", color: "#f97316" },
  { name: "GST Portal",   desc: "Tax & invoice filing",      status: "connected", icon: "🏛️", color: "#16a34a" },
  { name: "Mailchimp",    desc: "Email marketing",           status: "pending",   icon: "📧", color: "#f59e0b" },
  { name: "Google Ads",   desc: "Ad campaign management",    status: "disconnected", icon: "📣", color: "#ef4444" },
  { name: "Tally Prime",  desc: "Accounting software",       status: "disconnected", icon: "📒", color: "#8b5cf6" },
];

const BILLING = {
  plan: "Pro",
  billing: "Annual",
  nextBilling: "12 Jan 2025",
  amount: "₹14,999 / year",
  usage: { api: 68, storage: 42, seats: 75 },
};

const NAV_ITEMS = [
  { id: "profile",       label: "Profile",        icon: "◉" },
  { id: "notifications", label: "Notifications",  icon: "◎" },
  { id: "integrations",  label: "Integrations",   icon: "◫" },
  { id: "team",          label: "Team & Access",  icon: "◬" },
  { id: "billing",       label: "Billing",        icon: "◷" },
  { id: "security",      label: "Security",       icon: "◰" },
];

const NOTIF_LABELS = {
  revenueAlerts:      { label: "Revenue Alerts",        desc: "Notify when daily revenue crosses threshold" },
  newOrders:          { label: "New Orders",             desc: "Real-time alerts for incoming orders" },
  lowInventory:       { label: "Low Inventory Warnings", desc: "Alert when stock falls below minimum level" },
  cancellationSpikes: { label: "Cancellation Spikes",    desc: "Notify when cancellation rate exceeds 8%" },
  newCustomers:       { label: "New Customer Sign-ups",  desc: "Daily digest of new customer registrations" },
  weeklyReports:      { label: "Weekly Reports",         desc: "Auto-email full report every Monday 9 AM" },
};

// ── Small fetch helper with auth header ────────────────────────────────
function useApi() {
  const { token, logout } = useAuth();
  return async (path, options = {}) => {
    const res = await fetch(`${BACKEND}/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (res.status === 401) { logout(); throw new Error("Session expired, please login again"); }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };
}

// ─── REUSABLE ATOMS (unchanged) ───────────────────────────────────────────
function SectionTitle({ children, sub }) {
  const { t } = useTheme();
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.02em" }}>{children}</h2>
      {sub && <p style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function Card({ children, style = {} }) {
  const { t } = useTheme();
  return (
    <div style={{
      background: t.bgCard, border: `1px solid ${t.border}`,
      borderRadius: 16, padding: "20px 24px",
      transition: "background 0.25s ease, border-color 0.25s ease",
      ...style,
    }}>
      {children}
    </div>
  );
}

function Label({ children }) {
  const { t } = useTheme();
  return (
    <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
      {children}
    </p>
  );
}

function Input({ value, onChange, placeholder, type = "text", disabled }) {
  const { t } = useTheme();
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%", boxSizing: "border-box",
        background: disabled ? `${t.border}30` : `${t.accent}08`, border: `1px solid ${t.border}`,
        borderRadius: 10, padding: "9px 12px",
        fontSize: 13, color: t.textPrimary,
        fontFamily: "'DM Sans', sans-serif", outline: "none",
        transition: "border-color 0.2s",
      }}
    />
  );
}

function Toggle({ on, onChange }) {
  const { t } = useTheme();
  return (
    <div
      onClick={onChange}
      style={{
        width: 40, height: 22, borderRadius: 99,
        background: on ? t.accent : t.border,
        cursor: "pointer", position: "relative",
        transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 3,
        left: on ? 21 : 3,
        width: 16, height: 16, borderRadius: "50%",
        background: "#fff", transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </div>
  );
}

function Badge({ status }) {
  const map = {
    connected:    { color: "#16a34a", bg: "#dcfce7", label: "Connected"    },
    pending:      { color: "#d97706", bg: "#fef3c7", label: "Pending"      },
    disconnected: { color: "#6b7280", bg: "#f3f4f6", label: "Disconnected" },
  };
  const s = map[status] || map.disconnected;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "3px 10px",
      borderRadius: 99, color: s.color, background: s.bg,
      fontFamily: "'DM Sans', sans-serif",
    }}>{s.label}</span>
  );
}

function PrimaryBtn({ children, onClick, danger, small, disabled }) {
  const { t } = useTheme();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: danger ? t.red : t.accent,
        color: "#fff", border: "none", borderRadius: 10,
        padding: small ? "6px 14px" : "9px 18px",
        fontSize: small ? 11 : 13, fontWeight: 600,
        fontFamily: "'DM Sans', sans-serif", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "opacity 0.15s",
      }}
    >{children}</button>
  );
}

function GhostBtn({ children, onClick, small, disabled }) {
  const { t } = useTheme();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "transparent", color: t.textMuted,
        border: `1px solid ${t.border}`, borderRadius: 10,
        padding: small ? "6px 14px" : "9px 18px",
        fontSize: small ? 11 : 13, fontWeight: 600,
        fontFamily: "'DM Sans', sans-serif", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "border-color 0.15s",
      }}
    >{children}</button>
  );
}

function AvatarCircle({ initials, size = 40 }) {
  const { t } = useTheme();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `${t.accent}22`, border: `2px solid ${t.accent}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Syne', sans-serif", fontWeight: 900,
      fontSize: size * 0.32, color: t.accent, flexShrink: 0,
    }}>{initials}</div>
  );
}

function getInitials(name = "") {
  return name.trim().split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U";
}

// ─── SECTION: PROFILE (DYNAMIC) ───────────────────────────────────────────
function ProfileSection() {
  const { t } = useTheme();
  const api = useApi();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/settings/profile").then(setForm).catch((e) => setMsg(e.message));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      await api("/settings/profile", {
        method: "PUT",
        body: JSON.stringify({ name: form.name, phone: form.phone }),
      });
      setMsg("✅ Profile updated!");
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <p style={{ color: t.textMuted, fontSize: 13 }}>Loading profile...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle sub="Manage your personal information">Profile</SectionTitle>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <AvatarCircle initials={getInitials(form.name)} size={64} />
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: t.textPrimary }}>{form.name}</p>
            <p style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
              {form.role === "owner" ? "Owner" : "Staff"} · {form.company || "—"}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>
          <div>
            <Label>Full Name</Label>
            <Input value={form.name} onChange={set("name")} placeholder="Your full name" />
          </div>
          <div>
            <Label>Email (fixed)</Label>
            <Input value={form.email} disabled />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={set("phone")} placeholder="+91 XXXXX XXXXX" />
          </div>
          <div>
            <Label>Role (fixed)</Label>
            <Input value={form.role} disabled />
          </div>
          <div>
            <Label>Shop / Company</Label>
            <Input value={form.company} disabled />
          </div>
          <div>
            <Label>Shop ID</Label>
            <Input value={form.shopId} disabled />
          </div>
        </div>

        {msg && <p style={{ fontSize: 12, marginTop: 12, color: msg.startsWith("✅") ? t.green : t.red }}>{msg}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <PrimaryBtn onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</PrimaryBtn>
        </div>
      </Card>
    </div>
  );
}

// ─── SECTION: NOTIFICATIONS (DYNAMIC) ─────────────────────────────────────
function NotificationsSection() {
  const { t } = useTheme();
  const api = useApi();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/settings/notifications").then(setSettings).catch((e) => setMsg(e.message));
  }, []);

  const toggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }));

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      await api("/settings/notifications", { method: "PUT", body: JSON.stringify(settings) });
      setMsg("✅ Preferences saved!");
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <p style={{ color: t.textMuted, fontSize: 13 }}>Loading...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle sub="Choose what alerts and updates you receive">Notifications</SectionTitle>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {Object.entries(NOTIF_LABELS).map(([key, meta], i, arr) => (
          <div key={key} style={{
            display: "flex", alignItems: "center", gap: 16,
            padding: "16px 24px",
            borderBottom: i < arr.length - 1 ? `1px solid ${t.border}` : "none",
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>{meta.label}</p>
              <p style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{meta.desc}</p>
            </div>
            <Toggle on={settings[key]} onChange={() => toggle(key)} />
          </div>
        ))}
      </Card>

      {msg && <p style={{ fontSize: 12, color: msg.startsWith("✅") ? t.green : t.red }}>{msg}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <PrimaryBtn onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Preferences"}</PrimaryBtn>
      </div>
    </div>
  );
}

// ─── SECTION: INTEGRATIONS (STILL DEMO — future scope) ────────────────────
function IntegrationsSection() {
  const { t } = useTheme();
  const [list, setList] = useState(INTEGRATIONS);
  const toggle = (name) =>
    setList((l) => l.map((i) => i.name === name ? { ...i, status: i.status === "connected" ? "disconnected" : "connected" } : i));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle sub="Connect third-party services (demo — coming soon)">Integrations</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 12 }}>
        {list.map((intg) => (
          <Card key={intg.name} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: `${intg.color}18`, border: `1px solid ${intg.color}30`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            }}>{intg.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: t.textPrimary }}>{intg.name}</p>
              <p style={{ fontSize: 11, color: t.textMuted, marginTop: 1 }}>{intg.desc}</p>
              <div style={{ marginTop: 6 }}><Badge status={intg.status} /></div>
            </div>
            <button
              onClick={() => toggle(intg.name)}
              style={{
                fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 8,
                border: `1.5px solid ${intg.status === "connected" ? t.red : t.accent}`,
                color: intg.status === "connected" ? t.red : t.accent,
                background: "transparent", cursor: "pointer", flexShrink: 0,
                fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
              }}
            >{intg.status === "connected" ? "Disconnect" : "Connect"}</button>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── SECTION: TEAM (DYNAMIC) ──────────────────────────────────────────────
function TeamSection() {
  const { t } = useTheme();
  const { user } = useAuth();
  const api = useApi();
  const [members, setMembers] = useState(null);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const loadTeam = () => api("/settings/team").then(setMembers).catch((e) => setMsg(e.message));

  useEffect(() => { loadTeam(); }, []);

  const handleRemove = async (memberId, name) => {
    if (!window.confirm(`Remove ${name} from your shop?`)) return;
    try {
      await api(`/settings/team/${memberId}`, { method: "DELETE" });
      loadTeam();
    } catch (e) {
      alert("❌ " + e.message);
    }
  };

  const copyShopId = () => {
    navigator.clipboard.writeText(user.shopId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const roleColors = { owner: t.accent, staff: t.blue };

  if (!members) return <p style={{ color: t.textMuted, fontSize: 13 }}>Loading team...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle sub="Manage team members and their access">Team & Access</SectionTitle>

      {/* Invite via Shop ID */}
      {user.role === "owner" && (
        <Card>
          <Label>Invite Team Member</Label>
          <p style={{ fontSize: 12, color: t.textMuted, margin: "6px 0 10px" }}>
            Naye staff member ko ye Shop ID do — wo signup page pe "Join Shop (Staff)" se join kar sakte hain.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Input value={user.shopId} disabled /></div>
            <PrimaryBtn onClick={copyShopId}>{copied ? "Copied!" : "Copy"}</PrimaryBtn>
          </div>
        </Card>
      )}

      {msg && <p style={{ fontSize: 12, color: t.red }}>{msg}</p>}

      {/* Member list */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {members.map((m, i) => (
          <div key={m._id} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 24px",
            borderBottom: i < members.length - 1 ? `1px solid ${t.border}` : "none",
          }}>
            <AvatarCircle initials={getInitials(m.name)} size={36} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>{m.name}</p>
              <p style={{ fontSize: 11, color: t.textMuted }}>{m.email}</p>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
              color: roleColors[m.role] || t.accent,
              background: `${roleColors[m.role] || t.accent}18`,
              textTransform: "capitalize",
            }}>{m.role}</span>
            {user.role === "owner" && m.role !== "owner" && (
              <GhostBtn small onClick={() => handleRemove(m._id, m.name)}>Remove</GhostBtn>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── SECTION: BILLING (STILL DEMO) ─────────────────────────────────────────
function BillingSection() {
  const { t } = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle sub="Manage your subscription and usage (demo — coming soon)">Billing</SectionTitle>
      <Card style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{
          width: 50, height: 50, borderRadius: 14, flexShrink: 0,
          background: `${t.accent}18`, border: `1px solid ${t.accent}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 18, color: t.accent,
        }}>✦</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 18, color: t.textPrimary }}>{BILLING.plan} Plan</p>
          <p style={{ fontSize: 12, color: t.textMuted }}>{BILLING.billing} · Renews {BILLING.nextBilling}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 20, color: t.textPrimary }}>{BILLING.amount}</p>
          <GhostBtn small>Upgrade</GhostBtn>
        </div>
      </Card>
    </div>
  );
}

// ─── SECTION: SECURITY (DYNAMIC password, sessions still demo) ────────────
function SecuritySection() {
  const { t } = useTheme();
  const api = useApi();
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const handleChangePassword = async () => {
    setMsg("");
    if (pw.next !== pw.confirm) return setMsg("❌ New passwords don't match");
    setSaving(true);
    try {
      await api("/settings/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      });
      setMsg("✅ Password updated!");
      setPw({ current: "", next: "", confirm: "" });
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle sub="Keep your account safe and secure">Security</SectionTitle>

      <Card>
        <Label>Change Password</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          <Input type="password" placeholder="Current password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          <Input type="password" placeholder="New password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          <Input type="password" placeholder="Confirm new password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
        </div>
        {msg && <p style={{ fontSize: 12, marginTop: 10, color: msg.startsWith("✅") ? t.green : t.red }}>{msg}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <PrimaryBtn onClick={handleChangePassword} disabled={saving}>{saving ? "Updating..." : "Update Password"}</PrimaryBtn>
        </div>
      </Card>
    </div>
  );
}

// ─── MAIN SETTINGS PAGE ───────────────────────────────────────────────────────
export default function Settings() {
  const { t } = useTheme();
  const [active, setActive] = useState("profile");

  const sectionMap = {
    profile:       <ProfileSection />,
    notifications: <NotificationsSection />,
    integrations:  <IntegrationsSection />,
    team:          <TeamSection />,
    billing:       <BillingSection />,
    security:      <SecuritySection />,
  };

  return (
    <>
      <style>{`
        .settings-layout { display: grid; grid-template-columns: 200px 1fr; gap: 24px; align-items: start; }
        @media (max-width: 760px) { .settings-layout { grid-template-columns: 1fr; } }
        .settings-nav-mobile { display: none; }
        @media (max-width: 760px) { .settings-nav-desktop { display: none; } .settings-nav-mobile { display: flex; } }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em" }}>Settings</h1>
          <p style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>Manage your account, preferences, and team</p>
        </div>

        <div className="settings-nav-mobile" style={{ gap: 6, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
          {NAV_ITEMS.map((n) => (
            <button key={n.id} onClick={() => setActive(n.id)} style={{
              flexShrink: 0, padding: "6px 14px", borderRadius: 99,
              border: `1.5px solid ${active === n.id ? t.accent : t.border}`,
              background: active === n.id ? `${t.accent}15` : "transparent",
              color: active === n.id ? t.accent : t.textMuted,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
            }}>{n.label}</button>
          ))}
        </div>

        <div className="settings-layout">
          <div className="settings-nav-desktop" style={{ position: "sticky", top: 88 }}>
            <Card style={{ padding: "8px 0" }}>
              {NAV_ITEMS.map((n) => (
                <button key={n.id} onClick={() => setActive(n.id)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "10px 18px",
                  background: active === n.id ? `${t.accent}12` : "transparent",
                  border: "none",
                  borderLeft: `3px solid ${active === n.id ? t.accent : "transparent"}`,
                  color: active === n.id ? t.accent : t.textMuted,
                  fontSize: 13, fontWeight: active === n.id ? 700 : 500,
                  fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
                  textAlign: "left", transition: "all 0.15s",
                }}>
                  <span style={{ fontSize: 15 }}>{n.icon}</span>
                  {n.label}
                </button>
              ))}
            </Card>
          </div>
          <div>{sectionMap[active]}</div>
        </div>
      </div>
    </>
  );
}