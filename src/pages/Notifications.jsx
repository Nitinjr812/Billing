import { useState } from "react";
import { useTheme } from "../components/ThemeContext";
import { useNotifications } from "../components/NotificationContext";

const TYPE_LABELS = {
    all: "All",
    revenue: "Revenue",
    order: "Orders",
    inventory: "Inventory",
    customer: "Customers",
    report: "Reports",
};

const TYPE_COLORS = {
    revenue: { color: "#16a34a", bg: "#dcfce7" },
    order: { color: "#2563eb", bg: "#dbeafe" },
    inventory: { color: "#d97706", bg: "#fef3c7" },
    customer: { color: "#7c3aed", bg: "#ede9fe" },
    report: { color: "#0891b2", bg: "#cffafe" },
};

// ─── STAT PILL ──────────────────────────────────────────────────────────────
function StatPill({ label, value, color, bg }) {
    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "12px 20px", borderRadius: 14,
            background: bg, gap: 2, minWidth: 72, flex: "0 0 auto",
        }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 22, color, lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: 9, fontWeight: 600, color, opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{label}</span>
        </div>
    );
}

// ─── RESPONSIVE STYLES (injected once) ──────────────────────────────────────
const responsiveStyles = `
  @media (max-width: 640px) {
    .notif-grid { grid-template-columns: 1fr !important; }
    .notif-filter-sidebar { position: static !important; flex-direction: row !important; flex-wrap: nowrap !important; overflow-x: auto !important; padding: 0 !important; border-radius: 14px !important; }
    .notif-filter-sidebar .filter-label { display: none !important; }
    .notif-filter-btn { border-left: none !important; border-bottom: 3px solid transparent !important; padding: 10px 14px !important; white-space: nowrap !important; flex-shrink: 0; }
    .notif-filter-btn.active { border-bottom-color: var(--accent) !important; border-left: none !important; }
    .notif-stats-row { flex-wrap: nowrap !important; overflow-x: auto !important; padding-bottom: 4px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
    .notif-stats-row::-webkit-scrollbar { display: none; }
    .notif-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
    .notif-header-actions { width: 100%; display: flex; gap: 8px; }
    .notif-header-actions button { flex: 1; justify-content: center; }
    .notif-card-inner { gap: 12px !important; padding: 14px 16px !important; }
    .notif-icon { width: 40px !important; height: 40px !important; font-size: 17px !important; }
    .notif-meta { flex-direction: row !important; align-items: center !important; gap: 10px !important; }
    .notif-title { font-size: 13px !important; }
    .notif-message { font-size: 12px !important; }
  }
  @media (min-width: 641px) and (max-width: 900px) {
    .notif-grid { grid-template-columns: 160px 1fr !important; }
  }
  .notif-card:hover { background: var(--notif-hover) !important; }
  .notif-filter-sidebar { scrollbar-width: none; }
  .notif-filter-sidebar::-webkit-scrollbar { display: none; }
`;

export default function Notifications() {
    const { t } = useTheme();
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
    const [filter, setFilter] = useState("all");
    const [hoveredId, setHoveredId] = useState(null);

    const filtered = filter === "all" ? notifications : notifications.filter((n) => n.type === filter);
    const readCount = notifications.length - unreadCount;
    const tabs = Object.keys(TYPE_LABELS);

    return (
        <>
            <style>{responsiveStyles}</style>

            {/* CSS variable for accent (used in media query overrides) */}
            <div style={{ "--accent": t.accent, display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>

                {/* ── TOP HEADER ── */}
                <div className="notif-header" style={{
                    display: "flex", alignItems: "flex-end",
                    justifyContent: "space-between", flexWrap: "wrap", gap: 16,
                }}>
                    <div>
                        <h1 style={{
                            fontFamily: "'Syne', sans-serif", fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 900,
                            color: t.textPrimary, letterSpacing: "-0.03em",
                            transition: "color 0.25s ease", margin: 0,
                        }}>Notifications</h1>
                        <p style={{ fontSize: 13, color: t.textMuted, marginTop: 5 }}>
                            {unreadCount > 0
                                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                                : "You're all caught up — no unread notifications 🎉"}
                        </p>
                    </div>

                    {/* Action buttons */}
                    <div className="notif-header-actions" style={{ display: "flex", gap: 8 }}>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} style={{
                                fontSize: 12, fontWeight: 600, padding: "9px 16px", borderRadius: 10,
                                border: `1.5px solid ${t.accent}`, color: t.accent,
                                background: `${t.accent}10`, cursor: "pointer",
                                fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                            }}>✓ Mark all read</button>
                        )}
                        {notifications.length > 0 && (
                            <button onClick={clearAll} style={{
                                fontSize: 12, fontWeight: 600, padding: "9px 16px", borderRadius: 10,
                                border: `1.5px solid ${t.border}`, color: t.textMuted,
                                background: "transparent", cursor: "pointer",
                                fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                            }}>Clear all</button>
                        )}
                    </div>
                </div>

                {/* ── STATS ROW ── horizontally scrollable on mobile */}
                <div className="notif-stats-row" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <StatPill label="Total"  value={notifications.length} color={t.accent} bg={`${t.accent}12`} />
                    <StatPill label="Unread" value={unreadCount}          color="#d97706"  bg="#fef3c7" />
                    <StatPill label="Read"   value={readCount}            color="#16a34a"  bg="#dcfce7" />
                    <StatPill label="Alerts" value={notifications.filter(n => n.type === "inventory").length} color="#ef4444" bg="#fee2e2" />
                </div>

                {/* ── MAIN GRID: Filters LEFT · Feed CENTER-RIGHT ── */}
                <div className="notif-grid" style={{
                    display: "grid",
                    gridTemplateColumns: "200px 1fr",
                    gap: 16,
                    alignItems: "start",
                }}>

                    {/* LEFT — Filter sidebar (becomes horizontal tab strip on mobile) */}
                    <div className="notif-filter-sidebar" style={{
                        position: "sticky", top: 88,
                        background: t.bgCard, border: `1px solid ${t.border}`,
                        borderRadius: 16, padding: "8px 0",
                        display: "flex", flexDirection: "column",
                        transition: "background 0.25s ease, border-color 0.25s ease",
                    }}>
                        <p className="filter-label" style={{
                            fontSize: 10, fontWeight: 700, color: t.textMuted,
                            textTransform: "uppercase", letterSpacing: "0.1em",
                            padding: "8px 18px 10px", fontFamily: "'DM Sans', sans-serif",
                            margin: 0,
                        }}>Filter by</p>

                        {tabs.map((tab) => {
                            const count = tab === "all"
                                ? notifications.length
                                : notifications.filter((n) => n.type === tab).length;
                            if (count === 0 && tab !== "all") return null;
                            const isActive = filter === tab;
                            return (
                                <button
                                    key={tab}
                                    className={`notif-filter-btn${isActive ? " active" : ""}`}
                                    onClick={() => setFilter(tab)}
                                    style={{
                                        display: "flex", alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "9px 18px",
                                        border: "none",
                                        borderLeft: `3px solid ${isActive ? t.accent : "transparent"}`,
                                        background: isActive ? `${t.accent}10` : "transparent",
                                        color: isActive ? t.accent : t.textMuted,
                                        fontSize: 13, fontWeight: isActive ? 700 : 500,
                                        fontFamily: "'DM Sans', sans-serif",
                                        cursor: "pointer", textAlign: "left",
                                        transition: "all 0.15s",
                                        "--accent": t.accent,
                                    }}
                                >
                                    <span>{TYPE_LABELS[tab]}</span>
                                    <span style={{
                                        fontSize: 10, fontWeight: 700, padding: "1px 7px",
                                        borderRadius: 99, minWidth: 20, textAlign: "center",
                                        background: isActive ? t.accent : `${t.accent}15`,
                                        color: isActive ? "#fff" : t.accent,
                                        marginLeft: 8,
                                    }}>{count}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* RIGHT — Notification feed */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                        {filtered.length === 0 ? (
                            <div style={{
                                background: t.bgCard, border: `1px solid ${t.border}`,
                                borderRadius: 16, padding: "60px 24px", textAlign: "center",
                            }}>
                                <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
                                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: t.textPrimary }}>Nothing here</p>
                                <p style={{ fontSize: 13, color: t.textMuted, marginTop: 6 }}>No notifications in this category.</p>
                            </div>
                        ) : (
                            filtered.map((n) => {
                                const typeStyle = TYPE_COLORS[n.type] || { color: t.accent, bg: `${t.accent}18` };
                                const isHovered = hoveredId === n.id;
                                return (
                                    <div
                                        key={n.id}
                                        className="notif-card"
                                        onClick={() => markAsRead(n.id)}
                                        onMouseEnter={() => setHoveredId(n.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                        style={{
                                            borderRadius: 14,
                                            border: `1px solid ${!n.read ? t.accent + "40" : t.border}`,
                                            background: isHovered
                                                ? `${t.accent}08`
                                                : n.read ? t.bgCard : `${t.accent}05`,
                                            cursor: n.read ? "default" : "pointer",
                                            transition: "all 0.15s",
                                            position: "relative",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {/* Unread left bar */}
                                        {!n.read && (
                                            <div style={{
                                                position: "absolute", left: 0, top: 0, bottom: 0,
                                                width: 3, background: t.accent, borderRadius: "3px 0 0 3px",
                                            }} />
                                        )}

                                        <div className="notif-card-inner" style={{
                                            display: "flex", alignItems: "flex-start", gap: 14,
                                            padding: "16px 20px",
                                        }}>
                                            {/* Icon */}
                                            <div className="notif-icon" style={{
                                                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                                                background: typeStyle.bg,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: 19,
                                            }}>{n.icon}</div>

                                            {/* Content */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexWrap: "wrap" }}>
                                                    <span className="notif-title" style={{
                                                        fontFamily: "'DM Sans', sans-serif",
                                                        fontSize: 14, fontWeight: n.read ? 500 : 700,
                                                        color: t.textPrimary,
                                                    }}>{n.title}</span>
                                                    <span style={{
                                                        fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                                                        color: typeStyle.color, background: typeStyle.bg,
                                                        textTransform: "uppercase", letterSpacing: "0.07em",
                                                        flexShrink: 0,
                                                    }}>{n.type}</span>
                                                </div>
                                                <p className="notif-message" style={{
                                                    fontSize: 13, color: t.textMuted, lineHeight: 1.55,
                                                    fontFamily: "'DM Sans', sans-serif", margin: 0,
                                                }}>{n.message}</p>
                                            </div>

                                            {/* Right meta */}
                                            <div className="notif-meta" style={{
                                                display: "flex", flexDirection: "column",
                                                alignItems: "flex-end", gap: 8, flexShrink: 0,
                                            }}>
                                                <span style={{ fontSize: 11, color: t.textMuted, whiteSpace: "nowrap" }}>{n.time}</span>
                                                <div style={{
                                                    width: 9, height: 9, borderRadius: "50%",
                                                    background: n.read ? "transparent" : t.accent,
                                                    border: n.read ? `1.5px solid ${t.border}` : "none",
                                                    transition: "all 0.2s",
                                                    flexShrink: 0,
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}