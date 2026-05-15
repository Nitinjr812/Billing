import { useState } from "react";
import { useTheme } from "../components/ThemeContext";

// ─── DUMMY DATA ───────────────────────────────────────────────────────────────
const PROFILE = {
  name: "Arjun Mehta",
  email: "arjun.mehta@shopkart.in",
  phone: "+91 98765 43210",
  role: "Admin",
  company: "ShopKart Pvt. Ltd.",
  timezone: "Asia/Kolkata (IST +5:30)",
  language: "English",
  avatar: "AM",
};

const NOTIFICATION_SETTINGS = [
  { id: "rev_alert",  label: "Revenue Alerts",        desc: "Notify when daily revenue crosses threshold",  enabled: true  },
  { id: "ord_alert",  label: "New Orders",             desc: "Real-time alerts for incoming orders",          enabled: true  },
  { id: "inv_alert",  label: "Low Inventory Warnings", desc: "Alert when stock falls below minimum level",    enabled: true  },
  { id: "can_alert",  label: "Cancellation Spikes",    desc: "Notify when cancellation rate exceeds 8%",     enabled: false },
  { id: "cust_alert", label: "New Customer Sign-ups",  desc: "Daily digest of new customer registrations",   enabled: false },
  { id: "rep_alert",  label: "Weekly Reports",         desc: "Auto-email full report every Monday 9 AM",     enabled: true  },
];

const INTEGRATIONS = [
  { name: "Razorpay",     desc: "Payment gateway",           status: "connected", icon: "💳", color: "#2563eb" },
  { name: "Shiprocket",   desc: "Logistics & shipping",      status: "connected", icon: "🚚", color: "#f97316" },
  { name: "GST Portal",   desc: "Tax & invoice filing",      status: "connected", icon: "🏛️", color: "#16a34a" },
  { name: "Mailchimp",    desc: "Email marketing",           status: "pending",   icon: "📧", color: "#f59e0b" },
  { name: "Google Ads",   desc: "Ad campaign management",    status: "disconnected", icon: "📣", color: "#ef4444" },
  { name: "Tally Prime",  desc: "Accounting software",       status: "disconnected", icon: "📒", color: "#8b5cf6" },
];

const TEAM_MEMBERS = [
  { name: "Arjun Mehta",   email: "arjun.mehta@shopkart.in",  role: "Admin",   avatar: "AM", active: true  },
  { name: "Priya Sharma",  email: "priya.sharma@shopkart.in", role: "Manager", avatar: "PS", active: true  },
  { name: "Rohan Gupta",   email: "rohan.g@shopkart.in",      role: "Analyst", avatar: "RG", active: true  },
  { name: "Sneha Verma",   email: "sneha.v@shopkart.in",      role: "Support", avatar: "SV", active: false },
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

// ─── REUSABLE ATOMS ───────────────────────────────────────────────────────────
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

function Input({ value, onChange, placeholder, type = "text" }) {
  const { t } = useTheme();
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: "100%", boxSizing: "border-box",
        background: `${t.accent}08`, border: `1px solid ${t.border}`,
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
      onClick={() => onChange(!on)}
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

function PrimaryBtn({ children, onClick, danger, small }) {
  const { t } = useTheme();
  return (
    <button
      onClick={onClick}
      style={{
        background: danger ? t.red : t.accent,
        color: "#fff", border: "none", borderRadius: 10,
        padding: small ? "6px 14px" : "9px 18px",
        fontSize: small ? 11 : 13, fontWeight: 600,
        fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
        transition: "opacity 0.15s",
      }}
      onMouseEnter={e => e.target.style.opacity = 0.85}
      onMouseLeave={e => e.target.style.opacity = 1}
    >{children}</button>
  );
}

function GhostBtn({ children, onClick, small }) {
  const { t } = useTheme();
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent", color: t.textMuted,
        border: `1px solid ${t.border}`, borderRadius: 10,
        padding: small ? "6px 14px" : "9px 18px",
        fontSize: small ? 11 : 13, fontWeight: 600,
        fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
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

function Divider() {
  const { t } = useTheme();
  return <div style={{ height: 1, background: t.border, margin: "20px 0" }} />;
}

// ─── SECTION: PROFILE ─────────────────────────────────────────────────────────
function ProfileSection() {
  const [form, setForm] = useState({ ...PROFILE });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle sub="Manage your personal information and preferences">Profile</SectionTitle>

      {/* Avatar row */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <AvatarCircle initials={PROFILE.avatar} size={64} />
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "#000" /* t.textPrimary */ }} />
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16 }}>{form.name}</p>
            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{form.role} · {form.company}</p>
          </div>
          <GhostBtn small>Change Photo</GhostBtn>
        </div>
      </Card>

      {/* Fields */}
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>
          {[
            ["Full Name",   "name",     form.name,     "Your full name"],
            ["Email",       "email",    form.email,    "your@email.com"],
            ["Phone",       "phone",    form.phone,    "+91 XXXXX XXXXX"],
            ["Role",        "role",     form.role,     "e.g. Admin"],
            ["Company",     "company",  form.company,  "Company name"],
            ["Timezone",    "timezone", form.timezone, "Timezone"],
          ].map(([label, key, val, placeholder]) => (
            <div key={key}>
              <Label>{label}</Label>
              <Input value={val} onChange={set(key)} placeholder={placeholder} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <GhostBtn>Discard</GhostBtn>
          <PrimaryBtn>Save Changes</PrimaryBtn>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card>
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: "#ef4444", marginBottom: 4 }}>Danger Zone</p>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>Permanently delete your account and all associated data. This action cannot be undone.</p>
        <PrimaryBtn danger small>Delete Account</PrimaryBtn>
      </Card>
    </div>
  );
}

// ─── SECTION: NOTIFICATIONS ───────────────────────────────────────────────────
function NotificationsSection() {
  const { t } = useTheme();
  const [settings, setSettings] = useState(NOTIFICATION_SETTINGS);
  const toggle = (id) => setSettings((s) => s.map((n) => n.id === id ? { ...n, enabled: !n.enabled } : n));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle sub="Choose what alerts and updates you receive">Notifications</SectionTitle>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {settings.map((n, i) => (
          <div key={n.id} style={{
            display: "flex", alignItems: "center", gap: 16,
            padding: "16px 24px",
            borderBottom: i < settings.length - 1 ? `1px solid ${t.border}` : "none",
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>{n.label}</p>
              <p style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{n.desc}</p>
            </div>
            <Toggle on={n.enabled} onChange={() => toggle(n.id)} />
          </div>
        ))}
      </Card>

      <Card>
        <Label>Alert Email</Label>
        <Input value={PROFILE.email} />
        <p style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>All notification emails will be sent to this address.</p>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <PrimaryBtn>Save Preferences</PrimaryBtn>
        </div>
      </Card>
    </div>
  );
}
 

// ─── SECTION: INTEGRATIONS ────────────────────────────────────────────────────
function IntegrationsSection() {
  const { t } = useTheme();
  const [list, setList] = useState(INTEGRATIONS);
  const toggle = (name) =>
    setList((l) =>
      l.map((i) =>
        i.name === name
          ? { ...i, status: i.status === "connected" ? "disconnected" : "connected" }
          : i
      )
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle sub="Connect third-party services to your dashboard">Integrations</SectionTitle>
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

// ─── SECTION: TEAM ────────────────────────────────────────────────────────────
function TeamSection() {
  const { t } = useTheme();
  const roleColors = { Admin: t.accent, Manager: t.blue, Analyst: t.green, Support: t.orange };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle sub="Manage team members and their access levels">Team & Access</SectionTitle>

      {/* Invite */}
      <Card>
        <Label>Invite Team Member</Label>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <div style={{ flex: 1 }}><Input placeholder="teammate@shopkart.in" /></div>
          <PrimaryBtn>Send Invite</PrimaryBtn>
        </div>
      </Card>

      {/* Member list */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {TEAM_MEMBERS.map((m, i) => (
          <div key={m.email} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 24px",
            borderBottom: i < TEAM_MEMBERS.length - 1 ? `1px solid ${t.border}` : "none",
            opacity: m.active ? 1 : 0.5,
          }}>
            <AvatarCircle initials={m.avatar} size={36} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>{m.name}</p>
              <p style={{ fontSize: 11, color: t.textMuted }}>{m.email}</p>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
              color: roleColors[m.role] || t.accent,
              background: `${roleColors[m.role] || t.accent}18`,
            }}>{m.role}</span>
            <span style={{ fontSize: 10, color: m.active ? t.green : t.textMuted, fontWeight: 600 }}>
              {m.active ? "● Active" : "○ Inactive"}
            </span>
            <GhostBtn small>Manage</GhostBtn>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── SECTION: BILLING ─────────────────────────────────────────────────────────
function BillingSection() {
  const { t } = useTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle sub="Manage your subscription and usage">Billing</SectionTitle>

      {/* Plan card */}
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

      {/* Usage bars */}
      <Card>
        <Label>Current Usage</Label>
        {[
          ["API Calls",     BILLING.usage.api,     t.accent ],
          ["Storage",       BILLING.usage.storage,  t.blue   ],
          ["Team Seats",    BILLING.usage.seats,    t.green  ],
        ].map(([label, pct, color]) => (
          <div key={label} style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary }}>{pct}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: `${color}20` }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: color, transition: "width 0.5s" }} />
            </div>
          </div>
        ))}
      </Card>

      {/* Invoices stub */}
      <Card>
        <Label>Recent Invoices</Label>
        {[
          ["Jan 2025", "₹14,999", "Paid"],
          ["Jan 2024", "₹12,999", "Paid"],
          ["Jan 2023", "₹9,999",  "Paid"],
        ].map(([date, amt, status]) => (
          <div key={date} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 0", borderBottom: `1px solid ${t.border}`,
          }}>
            <span style={{ fontSize: 13, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>{date}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, fontFamily: "'Syne', sans-serif" }}>{amt}</span>
            <Badge status="connected" />
            <GhostBtn small>Download</GhostBtn>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── SECTION: SECURITY ────────────────────────────────────────────────────────
function SecuritySection() {
  const { t } = useTheme();
  const [twofa, setTwofa] = useState(true);
  const [sessions] = useState([
    { device: "Chrome on Mac",    location: "Jaipur, IN",   last: "Now",          current: true  },
    { device: "Safari on iPhone", location: "Jaipur, IN",   last: "2 hours ago",  current: false },
    { device: "Chrome on Windows",location: "Delhi, IN",    last: "3 days ago",   current: false },
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle sub="Keep your account safe and secure">Security</SectionTitle>

      {/* Change password */}
      <Card>
        <Label>Change Password</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          <Input type="password" placeholder="Current password" />
          <Input type="password" placeholder="New password" />
          <Input type="password" placeholder="Confirm new password" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <PrimaryBtn>Update Password</PrimaryBtn>
        </div>
      </Card>

      {/* 2FA */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: t.textPrimary }}>Two-Factor Authentication</p>
            <p style={{ fontSize: 12, color: t.textMuted, marginTop: 3 }}>Add an extra layer of security with OTP on login</p>
          </div>
          <Toggle on={twofa} onChange={setTwofa} />
        </div>
      </Card>

      {/* Active sessions */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${t.border}` }}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: t.textPrimary }}>Active Sessions</p>
        </div>
        {sessions.map((s, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 24px",
            borderBottom: i < sessions.length - 1 ? `1px solid ${t.border}` : "none",
          }}>
            <div style={{ fontSize: 22 }}>{s.device.includes("iPhone") ? "📱" : "💻"}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>
                {s.device} {s.current && <span style={{ fontSize: 10, fontWeight: 600, color: t.green, background: `${t.green}18`, padding: "2px 8px", borderRadius: 99, marginLeft: 6 }}>Current</span>}
              </p>
              <p style={{ fontSize: 11, color: t.textMuted }}>{s.location} · {s.last}</p>
            </div>
            {!s.current && <GhostBtn small>Revoke</GhostBtn>}
          </div>
        ))}
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

        {/* Header */}
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em", transition: "color 0.25s ease" }}>Settings</h1>
          <p style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>Manage your account, preferences, and team</p>
        </div>

        {/* Mobile tab row */}
        <div className="settings-nav-mobile" style={{
          gap: 6, overflowX: "auto", paddingBottom: 4,
          scrollbarWidth: "none",
        }}>
          {NAV_ITEMS.map((n) => (
            <button
              key={n.id}
              onClick={() => setActive(n.id)}
              style={{
                flexShrink: 0, padding: "6px 14px", borderRadius: 99,
                border: `1.5px solid ${active === n.id ? t.accent : t.border}`,
                background: active === n.id ? `${t.accent}15` : "transparent",
                color: active === n.id ? t.accent : t.textMuted,
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
              }}
            >{n.label}</button>
          ))}
        </div>

        {/* Main layout */}
        <div className="settings-layout">

          {/* Sidebar nav */}
          <div className="settings-nav-desktop" style={{ position: "sticky", top: 88 }}>
            <Card style={{ padding: "8px 0" }}>
              {NAV_ITEMS.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setActive(n.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "10px 18px",
                    background: active === n.id ? `${t.accent}12` : "transparent",
                    border: "none",
                    borderLeft: `3px solid ${active === n.id ? t.accent : "transparent"}`,
                    borderRadius: 0,
                    color: active === n.id ? t.accent : t.textMuted,
                    fontSize: 13, fontWeight: active === n.id ? 700 : 500,
                    fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
                    textAlign: "left", transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 15 }}>{n.icon}</span>
                  {n.label}
                </button>
              ))}
            </Card>
          </div>

          {/* Content area */}
          <div>
            {sectionMap[active]}
          </div>

        </div>
      </div>
    </>
  );
}