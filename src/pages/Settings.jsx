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
  { id: "profile",       label: "Profile" },
  { id: "tax",           label: "Tax & GST" },
  { id: "notifications", label: "Notifications" },
  { id: "integrations",  label: "Integrations" },
  { id: "team",          label: "Team & Access" },
  { id: "billing",       label: "Billing" },
  { id: "security",      label: "Security" },
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

// ─── ICONS — single stroke-set, used consistently across nav ─────────────
function NavIcon({ id, size = 17 }) {
  const paths = {
    profile: (
      <>
        <circle cx="12" cy="8.2" r="3.4" />
        <path d="M5 20c1.1-3.6 3.9-5.6 7-5.6s5.9 2 7 5.6" />
      </>
    ),
    tax: (
      <>
        <path d="M6.5 3h8l3 3v15h-11z" />
        <path d="M9 8.5h6M9 12h6M9 15.5h3.5" />
      </>
    ),
    notifications: (
      <>
        <path d="M12 4.2a4.8 4.8 0 0 0-4.8 4.8v3.3L5.5 15.8h13l-1.7-3.5V9a4.8 4.8 0 0 0-4.8-4.8z" />
        <path d="M10.2 18.6a1.8 1.8 0 0 0 3.6 0" />
      </>
    ),
    integrations: (
      <>
        <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
      </>
    ),
    team: (
      <>
        <circle cx="9" cy="8.3" r="3" />
        <circle cx="17" cy="9.3" r="2.3" />
        <path d="M3.6 19.8c.8-3.1 2.9-4.9 5.4-4.9s4.6 1.8 5.4 4.9" />
        <path d="M14.8 15.3c1.9.4 3.4 2.1 3.9 4.5" />
      </>
    ),
    billing: (
      <>
        <rect x="3" y="6" width="18" height="12.5" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </>
    ),
    security: (
      <>
        <path d="M12 3.2l6.8 2.7v5.6c0 4.3-2.9 7.3-6.8 8.6-3.9-1.3-6.8-4.3-6.8-8.6V5.9z" />
        <path d="M9.3 12l1.9 1.9 3.5-3.8" />
      </>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[id]}
    </svg>
  );
}

// ─── REUSABLE ATOMS ────────────────────────────────────────────────────
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
    <div
      className="ui-card"
      style={{
        background: t.bgCard, border: `1px solid ${t.border}`,
        borderRadius: 16, padding: "20px 24px",
        ...style,
      }}
    >
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
      className="ui-input"
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        "--focus-ring": `${t.accent}33`,
        width: "100%", boxSizing: "border-box",
        background: disabled ? `${t.border}30` : `${t.accent}08`, border: `1px solid ${t.border}`,
        borderRadius: 10, padding: "9px 12px",
        fontSize: 13, color: t.textPrimary,
        fontFamily: "'DM Sans', sans-serif", outline: "none",
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
        transition: "opacity 0.15s, transform 0.1s",
      }}
    >{children}</button>
  );
}

function GhostBtn({ children, onClick, small, disabled, danger }) {
  const { t } = useTheme();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "transparent", color: danger ? t.red : t.textMuted,
        border: `1px solid ${danger ? t.red : t.border}`, borderRadius: 10,
        padding: small ? "6px 14px" : "9px 18px",
        fontSize: small ? 11 : 13, fontWeight: 600,
        fontFamily: "'DM Sans', sans-serif", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "border-color 0.15s",
      }}
    >{children}</button>
  );
}

// ─── SIGNATURE ELEMENT: the "official seal" avatar ────────────────────
// A dashed ring rotates slowly around the initials, echoing an invoice
// stamp — the one motif this billing product is built to be remembered by.
function SealAvatar({ initials, size = 40 }) {
  const { t } = useTheme();
  const ring = size + 14;
  return (
    <div style={{ position: "relative", width: ring, height: ring, flexShrink: 0 }}>
      <svg
        width={ring} height={ring} viewBox={`0 0 ${ring} ${ring}`}
        style={{ position: "absolute", inset: 0, animation: "sealSpin 18s linear infinite" }}
      >
        <circle
          cx={ring / 2} cy={ring / 2} r={ring / 2 - 1.5}
          fill="none" stroke={t.accent} strokeOpacity="0.45"
          strokeWidth="1.4" strokeDasharray="2.5 4.5" strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: "absolute", top: 7, left: 7,
        width: size, height: size, borderRadius: "50%",
        background: `${t.accent}1f`, border: `1.5px solid ${t.accent}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Syne', sans-serif", fontWeight: 900,
        fontSize: size * 0.32, color: t.accent,
      }}>{initials}</div>
    </div>
  );
}

function getInitials(name = "") {
  return name.trim().split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U";
}

// ─── FLOATING TOAST — replaces inline "✅ / ❌" strings ─────────────────
function Toast({ message, onDismiss }) {
  const { t } = useTheme();

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
      border: `1px solid ${t.border}`,
      borderRadius: 12, padding: "12px 18px", minWidth: 240, maxWidth: 360,
      boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
      fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.textPrimary,
      animation: "toastIn 0.25s ease",
    }}>
      <span style={{ color: isError ? t.red : t.green, fontWeight: 700 }}>{isError ? "!" : "✓"}</span>
      <span style={{ flex: 1 }}>{text}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}
      >✕</button>
    </div>
  );
}

// ─── SKELETON LOADER — shimmering placeholder shapes ──────────────────
function Skeleton({ width = "100%", height = 14, radius = 8, style = {} }) {
  const { t } = useTheme();
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

function SkeletonCircle({ size = 40, style = {} }) {
  return <Skeleton width={size} height={size} radius="50%" style={style} />;
}

// ─── SECTION: PROFILE (DYNAMIC) ───────────────────────────────────────────
function ProfileSection() {
  const { t } = useTheme();
  const api = useApi();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/settings/profile").then(setForm).catch((e) => setMsg("❌ " + e.message));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
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

  if (!form) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SectionTitle sub="Manage your personal information">Profile</SectionTitle>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <SkeletonCircle size={64} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton width={140} height={16} />
              <Skeleton width={100} height={12} />
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton width={70} height={9} style={{ marginBottom: 8 }} />
                <Skeleton height={34} radius={10} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle sub="Manage your personal information">Profile</SectionTitle>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <SealAvatar initials={getInitials(form.name)} size={64} />
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

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <PrimaryBtn onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</PrimaryBtn>
        </div>
      </Card>

      <Toast message={msg} onDismiss={() => setMsg("")} />
    </div>
  );
}

// ─── SECTION: TAX & GST (DYNAMIC) ─────────────────────────────────────────
const GST_RATES = [0, 5, 12, 18, 28];

function TaxSection() {
  const { t } = useTheme();
  const { user } = useAuth();
  const api = useApi();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/settings/tax").then(setForm).catch((e) => setMsg("❌ " + e.message));
  }, []);

  const isOwner = user?.role === "owner";

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api("/settings/tax", {
        method: "PUT",
        body: JSON.stringify({
          gstin: form.gstin,
          defaultGstRate: form.defaultGstRate,
        }),
      });
      setForm({ gstin: res.gstin, defaultGstRate: res.defaultGstRate });
      setMsg("✅ Tax settings updated!");
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SectionTitle sub="Set your shop's GSTIN and default GST rate for invoices">Tax & GST</SectionTitle>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i}>
                <Skeleton width={90} height={9} style={{ marginBottom: 8 }} />
                <Skeleton height={34} radius={10} />
              </div>
            ))}
          </div>
          <Skeleton width="70%" height={11} style={{ marginTop: 16 }} />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle sub="Set your shop's GSTIN and default GST rate for invoices">Tax & GST</SectionTitle>

      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>
          <div>
            <Label>GSTIN</Label>
            <Input
              value={form.gstin}
              onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))}
              placeholder="e.g. 08ABCDE1234F1Z5"
              disabled={!isOwner}
            />
          </div>
          <div>
            <Label>Default GST Rate</Label>
            <select
              className="ui-input"
              value={form.defaultGstRate}
              onChange={(e) => setForm((f) => ({ ...f, defaultGstRate: Number(e.target.value) }))}
              disabled={!isOwner}
              style={{
                width: "100%", boxSizing: "border-box",
                background: !isOwner ? `${t.border}30` : `${t.accent}08`,
                border: `1px solid ${t.border}`,
                borderRadius: 10, padding: "9px 12px",
                fontSize: 13, color: t.textPrimary,
                fontFamily: "'DM Sans', sans-serif", outline: "none",
              }}
            >
              {GST_RATES.map((rate) => (
                <option key={rate} value={rate}>{rate}%</option>
              ))}
            </select>
          </div>
        </div>

        <p style={{ fontSize: 11, color: t.textMuted, marginTop: 12 }}>
          This default rate auto-applies to new invoices. You can still adjust it on any individual invoice.
        </p>

        {!isOwner && (
          <p style={{ fontSize: 11, color: t.textMuted, marginTop: 8 }}>
            Only the shop owner can edit tax settings.
          </p>
        )}

        {isOwner && (
          <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
            <PrimaryBtn onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</PrimaryBtn>
          </div>
        )}
      </Card>

      <Toast message={msg} onDismiss={() => setMsg("")} />
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
    api("/settings/notifications").then(setSettings).catch((e) => setMsg("❌ " + e.message));
  }, []);

  const toggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api("/settings/notifications", { method: "PUT", body: JSON.stringify(settings) });
      setMsg("✅ Preferences saved!");
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SectionTitle sub="Choose what alerts and updates you receive">Notifications</SectionTitle>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {Array.from({ length: 6 }).map((_, i, arr) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 16, padding: "16px 24px",
              borderBottom: i < arr.length - 1 ? `1px solid ${t.border}` : "none",
            }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <Skeleton width={`${45 + (i % 3) * 8}%`} height={12} />
                <Skeleton width={`${65 + (i % 2) * 10}%`} height={10} />
              </div>
              <Skeleton width={40} height={22} radius={99} />
            </div>
          ))}
        </Card>
      </div>
    );
  }

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

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <PrimaryBtn onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Preferences"}</PrimaryBtn>
      </div>

      <Toast message={msg} onDismiss={() => setMsg("")} />
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

  const loadTeam = () => api("/settings/team").then(setMembers).catch((e) => setMsg("❌ " + e.message));

  useEffect(() => { loadTeam(); }, []);

  const handleRemove = async (memberId, name) => {
    if (!window.confirm(`Remove ${name} from your shop?`)) return;
    try {
      await api(`/settings/team/${memberId}`, { method: "DELETE" });
      loadTeam();
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  };

  const copyShopId = () => {
    navigator.clipboard.writeText(user.shopId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const roleColors = { owner: t.accent, staff: t.blue };

  if (!members) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SectionTitle sub="Manage team members and their access">Team & Access</SectionTitle>
        <Card>
          <Skeleton width={140} height={9} style={{ marginBottom: 10 }} />
          <Skeleton width="90%" height={11} style={{ marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <Skeleton height={34} radius={10} style={{ flex: 1 }} />
            <Skeleton width={72} height={34} radius={10} />
          </div>
        </Card>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {Array.from({ length: 3 }).map((_, i, arr) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 24px",
              borderBottom: i < arr.length - 1 ? `1px solid ${t.border}` : "none",
            }}>
              <SkeletonCircle size={36} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <Skeleton width={120} height={12} />
                <Skeleton width={160} height={10} />
              </div>
              <Skeleton width={54} height={18} radius={99} />
            </div>
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle sub="Manage team members and their access">Team & Access</SectionTitle>

      {/* Invite via Shop ID */}
      {user.role === "owner" && (
        <Card>
          <Label>Invite Team Member</Label>
          <p style={{ fontSize: 12, color: t.textMuted, margin: "6px 0 10px" }}>
            Share this Shop ID with new staff — they can join from the signup page using "Join Shop (Staff)".
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Input value={user.shopId} disabled /></div>
            <PrimaryBtn onClick={copyShopId}>{copied ? "Copied!" : "Copy"}</PrimaryBtn>
          </div>
        </Card>
      )}

      {/* Member list */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {members.map((m, i) => (
          <div key={m._id} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 24px",
            borderBottom: i < members.length - 1 ? `1px solid ${t.border}` : "none",
          }}>
            <SealAvatar initials={getInitials(m.name)} size={36} />
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

      <Toast message={msg} onDismiss={() => setMsg("")} />
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
  const { logout } = useAuth();
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleChangePassword = async () => {
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

  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to log out?")) return;
    logout();
  };

  const handleDeleteAccount = async () => {
    const sure = window.confirm(
      "Are you sure you want to delete your account? This action is permanent and cannot be undone."
    );
    if (!sure) return;

    const confirmText = window.prompt('Type "DELETE" to confirm account deletion');
    if (confirmText !== "DELETE") {
      if (confirmText !== null) setMsg("❌ Confirmation text didn't match. Account not deleted.");
      return;
    }

    setDeleting(true);
    try {
      await api("/settings/account", { method: "DELETE" });
      logout();
    } catch (e) {
      setMsg("❌ " + e.message);
      setDeleting(false);
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
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <PrimaryBtn onClick={handleChangePassword} disabled={saving}>{saving ? "Updating..." : "Update Password"}</PrimaryBtn>
        </div>
      </Card>

      {/* Session */}
      <Card style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>Log out</p>
          <p style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>Sign out of your account on this device</p>
        </div>
        <GhostBtn onClick={handleLogout}>Logout</GhostBtn>
      </Card>

      {/* Danger Zone */}
      <Card style={{ border: `1px solid ${t.red}40` }}>
        <Label>Danger Zone</Label>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>Delete Account</p>
            <p style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
          </div>
          <PrimaryBtn danger onClick={handleDeleteAccount} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete Account"}
          </PrimaryBtn>
        </div>
      </Card>

      <Toast message={msg} onDismiss={() => setMsg("")} />
    </div>
  );
}

// ─── MAIN SETTINGS PAGE ───────────────────────────────────────────────────────
export default function Settings() {
  const { t } = useTheme();
  const [active, setActive] = useState("profile");

  const sectionMap = {
    profile:       <ProfileSection />,
    tax:           <TaxSection />,
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

        .ui-card { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.25s ease; }
        .ui-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.08); }

        .ui-input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .ui-input:focus { border-color: ${t.accent} !important; box-shadow: 0 0 0 3px var(--focus-ring, ${t.accent}33); }
        .ui-input:disabled { cursor: not-allowed; }

        .settings-section-active { animation: sectionFade 0.28s ease; }

        @keyframes sectionFade {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sealSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ui-skeleton { animation: shimmer 1.4s ease-in-out infinite; }
        @keyframes shimmer {
          0% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .ui-card, .ui-input, .settings-section-active, .ui-skeleton { animation: none !important; transition: none !important; }
          .ui-card:hover { transform: none; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em" }}>Settings</h1>
          <p style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>Manage your account, preferences, and team</p>
        </div>

        <div className="settings-nav-mobile" style={{ gap: 6, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
          {NAV_ITEMS.map((n) => (
            <button key={n.id} onClick={() => setActive(n.id)} style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 99,
              border: `1.5px solid ${active === n.id ? t.accent : t.border}`,
              background: active === n.id ? `${t.accent}15` : "transparent",
              color: active === n.id ? t.accent : t.textMuted,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
            }}>
              <NavIcon id={n.id} size={14} />
              {n.label}
            </button>
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
                  <NavIcon id={n.id} />
                  {n.label}
                </button>
              ))}
            </Card>
          </div>
          <div key={active} className="settings-section-active">{sectionMap[active]}</div>
        </div>
      </div>
    </>
  );
}