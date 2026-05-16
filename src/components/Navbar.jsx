import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../components/ThemeContext";
import { useNotifications } from "../components/NotificationContext";

// ─── NAV ITEMS with routes ────────────────────────────────────────────────────
export const NAV_ITEMS = [
  { label: "Dashboard",     icon: "⬡", path: "/dashboard"     },
  { label: "Inventory",     icon: "◫", path: "/inventory"     },
  { label: "Orders",        icon: "◳", path: "/orders"        },
  { label: "Customers",     icon: "◉", path: "/customers"     },
  { label: "Suppliers",     icon: "🏭", path: "/suppliers"    },  
  { label: "Stocks",        icon: "◈", path: "/stocks"        },
  { label: "Notifications", icon: "◎", path: "/notifications" },
  { label: "Reports",       icon: "◪", path: "/reports"       },
  { label: "Subscription",  icon: "✦", path: "/subscription"  },
  { label: "Settings",      icon: "◐", path: "/settings"      },
];

// ─── HOOK: isDesktop ──────────────────────────────────────────────────────────
function useIsDesktop(breakpoint = 768) {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= breakpoint);
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isDesktop;
}

// ─── THEME TOGGLE ─────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { mode, toggle, t } = useTheme();
  const isDark = mode === "dark";
  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      style={{
        display: "flex", alignItems: "center", gap: "6px",
        padding: "5px 12px", borderRadius: "8px",
        border: `1px solid ${t.border}`, background: t.bgCard,
        color: t.textMuted, cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600,
        transition: "all 0.15s ease", userSelect: "none",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = t.textPrimary; e.currentTarget.style.background = t.bgHover; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = t.textMuted; e.currentTarget.style.background = t.bgCard; }}
    >
      {isDark ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
      {isDark ? "Light" : "Dark"}
    </button>
  );
}

// ─── LOGO ─────────────────────────────────────────────────────────────────────
export function Logo() {
  const { t } = useTheme();
  const navigate = useNavigate();
  return (
    <span
      onClick={() => navigate("/dashboard")}
      style={{
        fontFamily: "'Syne', sans-serif", fontWeight: 900,
        fontSize: "22px", letterSpacing: "-0.04em",
        userSelect: "none", cursor: "pointer",
      }}
    >
      <span style={{ color: t.textPrimary }}>BIL</span>
      <span style={{ color: t.accent }}>L</span>
      <span style={{ color: t.textPrimary }}>LING</span>
    </span>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
export function Navbar({ sidebarOpen, setSidebarOpen }) {
  const { t } = useTheme();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useIsDesktop();

  const centerLinks = NAV_ITEMS.filter(
    (n) => n.label !== "Notifications" && n.label !== "Settings" && n.label !== "Subscription"
  );

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", height: "64px",
      background: t.bg, borderBottom: `1px solid ${t.border}`,
      transition: "background 0.25s ease, border-color 0.25s ease",
    }}>
      {/* Left — Logo */}
      <Logo />

      {/* Center — Nav Links (desktop only) */}
      {isDesktop && (
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {centerLinks.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                style={{
                  padding: "6px 14px", borderRadius: "8px",
                  fontSize: "13px", fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: "pointer", border: "none",
                  transition: "all 0.15s ease",
                  color: isActive ? t.accent : t.textMuted,
                  background: isActive ? t.bgActive : "transparent",
                }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = t.textPrimary; e.currentTarget.style.background = t.bgHover; } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = t.textMuted; e.currentTarget.style.background = "transparent"; } }}
              >{item.label}</button>
            );
          })}
        </div>
      )}

      {/* Right — Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <ThemeToggle />

        {/* Notification Bell — desktop */}
        {isDesktop && (
          <button
            onClick={() => navigate("/notifications")}
            title="Notifications"
            style={{
              position: "relative", width: "36px", height: "36px",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: "8px", border: `1px solid ${t.border}`,
              background: "transparent", color: t.textMuted,
              cursor: "pointer", transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = t.textPrimary; e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = t.textMuted; e.currentTarget.style.background = "transparent"; }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: "5px", right: "5px",
                minWidth: unreadCount > 9 ? "16px" : "8px",
                height: unreadCount > 9 ? "16px" : "8px",
                borderRadius: "99px",
                background: t.accent,
                border: `2px solid ${t.bg}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "8px", fontWeight: 700, color: "#fff",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.2s ease",
                padding: unreadCount > 9 ? "0 3px" : 0,
              }}>
                {unreadCount > 9 ? "9+" : ""}
              </span>
            )}
          </button>
        )}

        {/* Settings — desktop */}
        {isDesktop && (
          <button
            onClick={() => navigate("/settings")}
            title="Settings"
            style={{
              width: "36px", height: "36px",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: "8px", border: `1px solid ${t.border}`,
              background: "transparent", color: t.textMuted,
              cursor: "pointer", transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = t.textPrimary; e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = t.textMuted; e.currentTarget.style.background = "transparent"; }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        )}

        {/* Avatar — desktop */}
        {isDesktop && (
          <div style={{
            width: "36px", height: "36px", borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", fontWeight: 700, color: "#fff", cursor: "pointer",
            background: `linear-gradient(135deg, ${t.accent}, ${t.accentLight})`,
            fontFamily: "'Syne', sans-serif",
          }}>NK</div>
        )}

        {/* Hamburger — mobile */}
        {!isDesktop && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ display: "flex", flexDirection: "column", gap: "5px", padding: "4px", cursor: "pointer", background: "transparent", border: "none" }}
            aria-label="Toggle menu"
          >
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                display: "block", width: "20px", height: "2px",
                background: t.textPrimary, borderRadius: "2px",
                transition: "all 0.2s ease",
                transform: sidebarOpen
                  ? i === 0 ? "rotate(45deg) translateY(7px)"
                  : i === 2 ? "rotate(-45deg) translateY(-7px)" : "none"
                  : "none",
                opacity: sidebarOpen && i === 1 ? 0 : 1,
              }} />
            ))}
          </button>
        )}
      </div>
    </nav>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
export function Sidebar({ open, onClose }) {
  const { t } = useTheme();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 40,
          background: "rgba(0,0,0,0.55)",
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.2s ease",
        }}
      />

      {/* Drawer */}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50, width: "256px",
        display: "flex", flexDirection: "column",
        background: t.bg, borderRight: `1px solid ${t.border}`,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease, background 0.25s ease",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px", height: "64px", borderBottom: `1px solid ${t.border}`,
        }}>
          <Logo />
          <button onClick={onClose} style={{ color: t.textMuted, background: "transparent", border: "none", cursor: "pointer" }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: "12px", overflowY: "auto" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const isNotif  = item.label === "Notifications";
            return (
              <button
                key={item.label}
                onClick={() => { navigate(item.path); onClose(); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "12px",
                  padding: "10px 12px", borderRadius: "8px",
                  fontSize: "13px", fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: "pointer", border: "none", textAlign: "left", marginBottom: "2px",
                  transition: "all 0.15s ease",
                  color: isActive ? t.accent : t.textMuted,
                  background: isActive ? t.bgActive : "transparent",
                }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = t.textPrimary; e.currentTarget.style.background = t.bgHover; } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = t.textMuted; e.currentTarget.style.background = "transparent"; } }}
              >
                <span style={{ fontSize: "15px", position: "relative" }}>
                  {item.icon}
                  {isNotif && unreadCount > 0 && (
                    <span style={{
                      position: "absolute", top: -3, right: -4,
                      width: 7, height: 7, borderRadius: "50%",
                      background: t.accent, border: `1.5px solid ${t.bg}`,
                    }} />
                  )}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {isNotif && unreadCount > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "1px 7px",
                    borderRadius: 99, background: t.accent, color: "#fff",
                    fontFamily: "'DM Sans', sans-serif",
                  }}>{unreadCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: "16px 20px", borderTop: `1px solid ${t.border}`,
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", fontWeight: 700, color: "#fff",
            background: `linear-gradient(135deg, ${t.accent}, ${t.accentLight})`,
            fontFamily: "'Syne', sans-serif", flexShrink: 0,
          }}>RJ</div>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: t.textPrimary, fontFamily: "'Syne', sans-serif", margin: 0 }}>Rajyadu Admin</p>
            <p style={{ fontSize: "11px", color: t.textMuted, margin: 0 }}>admin@rajyadu.in</p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Navbar;