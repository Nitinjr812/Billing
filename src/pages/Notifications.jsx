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

// ─── STAT PILL ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, color, bg }) {
    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "14px 28px", borderRadius: 14,
            background: bg, gap: 2, minWidth: 90,
        }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 24, color, lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color, opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        </div>
    );
}

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
            <style>{`
        .notif-card:hover { background: var(--notif-hover) !important; }
      `}</style>

            <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>

                {/* ── TOP HEADER ── */}
                <div style={{
                    display: "flex", alignItems: "flex-end",
                    justifyContent: "space-between", flexWrap: "wrap", gap: 16,
                }}>
                    <div>
                        <h1 style={{
                            fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 900,
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
                    <div style={{ display: "flex", gap: 8 }}>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} style={{
                                fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 10,
                                border: `1.5px solid ${t.accent}`, color: t.accent,
                                background: `${t.accent}10`, cursor: "pointer",
                                fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                            }}>✓ Mark all read</button>
                        )}
                        {notifications.length > 0 && (
                            <button onClick={clearAll} style={{
                                fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 10,
                                border: `1.5px solid ${t.border}`, color: t.textMuted,
                                background: "transparent", cursor: "pointer",
                                fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                            }}>Clear all</button>
                        )}
                    </div>
                </div>

                {/* ── STATS ROW ── */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <StatPill label="Total" value={notifications.length} color={t.accent} bg={`${t.accent}12`} />
                    <StatPill label="Unread" value={unreadCount} color="#d97706" bg="#fef3c7" />
                    <StatPill label="Read" value={readCount} color="#16a34a" bg="#dcfce7" />
                    <StatPill label="Alerts" value={notifications.filter(n => n.type === "inventory").length} color="#ef4444" bg="#fee2e2" />
                </div>

                {/* ── MAIN GRID: Filters LEFT · Feed CENTER-RIGHT ── */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "200px 1fr",
                    gap: 20,
                    alignItems: "start",
                }}>

                    {/* LEFT — Filter sidebar */}
                    <div style={{
                        position: "sticky", top: 88,
                        background: t.bgCard, border: `1px solid ${t.border}`,
                        borderRadius: 16, padding: "8px 0",
                        transition: "background 0.25s ease, border-color 0.25s ease",
                    }}>
                        <p style={{
                            fontSize: 10, fontWeight: 700, color: t.textMuted,
                            textTransform: "uppercase", letterSpacing: "0.1em",
                            padding: "8px 18px 10px", fontFamily: "'DM Sans', sans-serif",
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
                                    onClick={() => setFilter(tab)}
                                    style={{
                                        width: "100%", display: "flex", alignItems: "center",
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
                                    }}
                                >
                                    <span>{TYPE_LABELS[tab]}</span>
                                    <span style={{
                                        fontSize: 10, fontWeight: 700, padding: "1px 7px",
                                        borderRadius: 99, minWidth: 20, textAlign: "center",
                                        background: isActive ? t.accent : `${t.accent}15`,
                                        color: isActive ? "#fff" : t.accent,
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
                                borderRadius: 16, padding: "80px 24px", textAlign: "center",
                            }}>
                                <div style={{ fontSize: 42, marginBottom: 14 }}>🔔</div>
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
                                        onClick={() => markAsRead(n.id)}
                                        onMouseEnter={() => setHoveredId(n.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                        style={{
                                            display: "flex", alignItems: "flex-start", gap: 16,
                                            padding: "18px 22px",
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

                                        {/* Icon */}
                                        <div style={{
                                            width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                                            background: typeStyle.bg,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 20,
                                        }}>{n.icon}</div>

                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                                                <span style={{
                                                    fontFamily: "'DM Sans', sans-serif",
                                                    fontSize: 14, fontWeight: n.read ? 500 : 700,
                                                    color: t.textPrimary,
                                                }}>{n.title}</span>
                                                <span style={{
                                                    fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                                                    color: typeStyle.color, background: typeStyle.bg,
                                                    textTransform: "uppercase", letterSpacing: "0.07em",
                                                }}>{n.type}</span>
                                            </div>
                                            <p style={{
                                                fontSize: 13, color: t.textMuted, lineHeight: 1.55,
                                                fontFamily: "'DM Sans', sans-serif", margin: 0,
                                            }}>{n.message}</p>
                                        </div>

                                        {/* Right meta */}
                                        <div style={{
                                            display: "flex", flexDirection: "column",
                                            alignItems: "flex-end", gap: 8, flexShrink: 0,
                                        }}>
                                            <span style={{ fontSize: 11, color: t.textMuted, whiteSpace: "nowrap" }}>{n.time}</span>
                                            <div style={{
                                                width: 9, height: 9, borderRadius: "50%",
                                                background: n.read ? "transparent" : t.accent,
                                                border: n.read ? `1.5px solid ${t.border}` : "none",
                                                transition: "all 0.2s",
                                            }} />
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