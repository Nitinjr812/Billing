import { useState } from "react";
import { useTheme } from "../components/ThemeContext";
import { useNotifications } from "../components/NotificationContext";

const TYPE_LABELS = {
    all: "All",
    outOfStock: "Out of Stock",
    lowStock: "Low Stock",
    slowMoving: "Slow Moving",
};

const TYPE_ICONS = {
    outOfStock: "🚨",
    lowStock: "⚠️",
    slowMoving: "💸",
};

const TYPE_TITLES = {
    outOfStock: "Out of Stock",
    lowStock: "Low Stock",
    slowMoving: "Slow Moving Product",
};

const TYPE_COLORS = {
    outOfStock: { color: "#dc2626", bg: "#fee2e2" },
    lowStock: { color: "#d97706", bg: "#fef3c7" },
    slowMoving: { color: "#7c3aed", bg: "#ede9fe" },
};

function timeAgo(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const secs = Math.floor((Date.now() - d.getTime()) / 1000);
    if (secs < 60) return "just now";
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

// ─── STAT PILL ──────────────────────────────────────────────────────────────
function StatPill({ label, value, color, bg, icon }) {
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 18px", borderRadius: 16,
            background: bg, flex: "1 1 150px", minWidth: 130,
            border: `1px solid ${color}22`,
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
        }}>
            <div style={{
                width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                background: `${color}20`, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 15,
            }}>{icon}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 21, color, lineHeight: 1.1 }}>{value}</span>
                <span style={{ fontSize: 10.5, fontWeight: 600, color, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{label}</span>
            </div>
        </div>
    );
}

// ─── SKELETON PRIMITIVES ────────────────────────────────────────────────────
// A moving shimmer sweep (not just a flat pulse) — reads as an intentional
// loading state rather than a placeholder that forgot to load.
function Shimmer({ style }) {
    return <div className="skeleton-shimmer" style={style} />;
}

function SkeletonPill() {
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 18px", borderRadius: 16,
            flex: "1 1 150px", minWidth: 130,
            border: "1px solid var(--skeleton-border)",
            background: "var(--skeleton-base)",
        }}>
            <Shimmer style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <Shimmer style={{ width: "50%", height: 16, borderRadius: 5 }} />
                <Shimmer style={{ width: "70%", height: 9, borderRadius: 5 }} />
            </div>
        </div>
    );
}

function SkeletonCard({ delay }) {
    return (
        <div style={{
            borderRadius: 14, border: "1px solid var(--skeleton-border)",
            background: "var(--skeleton-base)", overflow: "hidden",
            animation: `fade-in 0.4s ease both`, animationDelay: `${delay}ms`,
        }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 20px" }}>
                <Shimmer style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 9 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                        <Shimmer style={{ width: 90, height: 12, borderRadius: 5 }} />
                        <Shimmer style={{ width: 50, height: 12, borderRadius: 99 }} />
                    </div>
                    <Shimmer style={{ width: "88%", height: 11, borderRadius: 5 }} />
                    <Shimmer style={{ width: "55%", height: 11, borderRadius: 5 }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, flexShrink: 0 }}>
                    <Shimmer style={{ width: 36, height: 9, borderRadius: 5 }} />
                    <Shimmer style={{ width: 8, height: 8, borderRadius: "50%" }} />
                </div>
            </div>
        </div>
    );
}

// ─── STYLES (injected once) ─────────────────────────────────────────────────
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

  .notif-card { animation: fade-in 0.35s ease both; }
  .notif-card:hover { transform: translateY(-1px); box-shadow: 0 6px 18px -8px rgba(0,0,0,0.18); }
  .notif-filter-sidebar { scrollbar-width: none; }
  .notif-filter-sidebar::-webkit-scrollbar { display: none; }
  .notif-filter-btn { position: relative; }
  .notif-filter-btn .count-badge { transition: transform 0.15s ease, background 0.15s ease; }
  .notif-filter-btn:hover .count-badge { transform: scale(1.08); }

  .rescan-btn:active svg, .rescan-btn.spinning span.spin-icon { animation: spin 0.6s linear; }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse-dot {
    0%, 100% { box-shadow: 0 0 0 0 var(--accent-fade); }
    50%      { box-shadow: 0 0 0 4px transparent; }
  }
  @keyframes shimmer-sweep {
    0%   { background-position: -300px 0; }
    100% { background-position: 300px 0; }
  }
  .skeleton-shimmer {
    background: linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-shine) 50%, var(--skeleton-base) 75%);
    background-size: 300px 100%;
    animation: shimmer-sweep 1.3s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .skeleton-shimmer, .notif-card, .fade-in-item { animation: none !important; }
  }
`;

export default function Notifications() {
    const { t } = useTheme();
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead, clearAll, scanStock } = useNotifications();
    const [filter, setFilter] = useState("all");
    const [hoveredId, setHoveredId] = useState(null);
    const [rescanning, setRescanning] = useState(false);

    const safeNotifications = Array.isArray(notifications) ? notifications : [];

    const filtered = filter === "all"
        ? safeNotifications
        : safeNotifications.filter((n) => n.type === filter);

    const readCount = safeNotifications.length - unreadCount;
    const tabs = Object.keys(TYPE_LABELS);

    const countFor = (type) =>
        type === "all"
            ? safeNotifications.length
            : safeNotifications.filter((n) => n.type === type).length;

    const handleRescan = async () => {
        setRescanning(true);
        try {
            await scanStock();
        } finally {
            setRescanning(false);
        }
    };

    // CSS custom properties derived from the theme, used inside the injected
    // <style> block above (media queries / keyframes can't read inline styles).
    const cssVars = {
        "--accent": t.accent,
        "--accent-fade": `${t.accent}40`,
        "--skeleton-base": t.border ? `${t.border}55` : "#e5e7eb",
        "--skeleton-shine": t.border ? `${t.border}99` : "#f3f4f6",
        "--skeleton-border": t.border,
        display: "flex", flexDirection: "column", gap: 20, width: "100%",
    };

    return (
        <>
            <style>{responsiveStyles}</style>

            <div style={cssVars}>

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
                            {loading
                                ? "Checking your stock…"
                                : unreadCount > 0
                                    ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                                    : "You're all caught up — no unread notifications 🎉"}
                        </p>
                    </div>

                    <div className="notif-header-actions" style={{ display: "flex", gap: 8 }}>
                        <button
                            className="rescan-btn"
                            onClick={handleRescan}
                            disabled={loading || rescanning}
                            style={{
                                display: "flex", alignItems: "center", gap: 7,
                                fontSize: 12, fontWeight: 600, padding: "9px 16px", borderRadius: 10,
                                border: `1.5px solid ${t.border}`, color: t.textMuted,
                                background: "transparent", cursor: (loading || rescanning) ? "default" : "pointer",
                                opacity: (loading || rescanning) ? 0.6 : 1,
                                fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                            }}
                        >
                            <span style={{
                                display: "inline-block",
                                animation: rescanning ? "spin 0.7s linear infinite" : "none",
                            }}>🔄</span>
                            {rescanning ? "Scanning…" : "Rescan Stock"}
                        </button>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} style={{
                                fontSize: 12, fontWeight: 600, padding: "9px 16px", borderRadius: 10,
                                border: `1.5px solid ${t.accent}`, color: t.accent,
                                background: `${t.accent}10`, cursor: "pointer",
                                fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                            }}>✓ Mark all read</button>
                        )}
                        {safeNotifications.length > 0 && (
                            <button onClick={clearAll} style={{
                                fontSize: 12, fontWeight: 600, padding: "9px 16px", borderRadius: 10,
                                border: `1.5px solid ${t.border}`, color: t.textMuted,
                                background: "transparent", cursor: "pointer",
                                fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                            }}>Clear all</button>
                        )}
                    </div>
                </div>

                {/* ── STATS ROW ── */}
                <div className="notif-stats-row" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {loading ? (
                        <>
                            <SkeletonPill /><SkeletonPill /><SkeletonPill /><SkeletonPill />
                        </>
                    ) : (
                        <>
                            <StatPill label="Total" value={safeNotifications.length} color={t.accent} bg={`${t.accent}12`} icon="🔔" />
                            <StatPill label="Unread" value={unreadCount} color="#d97706" bg="#fef3c7" icon="✉️" />
                            <StatPill label="Read" value={readCount} color="#16a34a" bg="#dcfce7" icon="✅" />
                            <StatPill label="Out of Stock" value={countFor("outOfStock")} color="#dc2626" bg="#fee2e2" icon="🚨" />
                        </>
                    )}
                </div>

                {/* ── MAIN GRID ── */}
                <div className="notif-grid" style={{
                    display: "grid", gridTemplateColumns: "200px 1fr", gap: 16, alignItems: "start",
                }}>

                    {/* LEFT — Filter sidebar */}
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
                            const count = countFor(tab);
                            if (!loading && count === 0 && tab !== "all") return null;
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
                                    }}
                                >
                                    <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                        {tab !== "all" && <span style={{ fontSize: 12 }}>{TYPE_ICONS[tab]}</span>}
                                        {TYPE_LABELS[tab]}
                                    </span>
                                    <span className="count-badge" style={{
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

                        {loading ? (
                            <>
                                <SkeletonCard delay={0} />
                                <SkeletonCard delay={60} />
                                <SkeletonCard delay={120} />
                                <SkeletonCard delay={180} />
                            </>
                        ) : filtered.length === 0 ? (
                            <div style={{
                                background: t.bgCard, border: `1px solid ${t.border}`,
                                borderRadius: 16, padding: "60px 24px", textAlign: "center",
                                animation: "fade-in 0.3s ease both",
                            }}>
                                <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
                                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: t.textPrimary, margin: 0 }}>Nothing here</p>
                                <p style={{ fontSize: 13, color: t.textMuted, marginTop: 6 }}>No notifications in this category.</p>
                            </div>
                        ) : (
                            filtered.map((n, i) => {
                                const typeStyle = TYPE_COLORS[n.type] || { color: t.accent, bg: `${t.accent}18` };
                                const isHovered = hoveredId === n._id;
                                return (
                                    <div
                                        key={n._id}
                                        className="notif-card"
                                        onClick={() => !n.read && markAsRead(n._id)}
                                        onMouseEnter={() => setHoveredId(n._id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                        style={{
                                            borderRadius: 14,
                                            border: `1px solid ${!n.read ? t.accent + "40" : t.border}`,
                                            background: isHovered
                                                ? `${t.accent}08`
                                                : n.read ? t.bgCard : `${t.accent}05`,
                                            cursor: n.read ? "default" : "pointer",
                                            transition: "background 0.15s, transform 0.15s, box-shadow 0.15s, border-color 0.15s",
                                            position: "relative",
                                            overflow: "hidden",
                                            animationDelay: `${Math.min(i, 8) * 35}ms`,
                                        }}
                                    >
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
                                            <div className="notif-icon" style={{
                                                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                                                background: typeStyle.bg,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: 19,
                                            }}>{TYPE_ICONS[n.type] || "🔔"}</div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexWrap: "wrap" }}>
                                                    <span className="notif-title" style={{
                                                        fontFamily: "'DM Sans', sans-serif",
                                                        fontSize: 14, fontWeight: n.read ? 500 : 700,
                                                        color: t.textPrimary,
                                                    }}>{TYPE_TITLES[n.type] || n.productName || "Notification"}</span>
                                                    <span style={{
                                                        fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                                                        color: typeStyle.color, background: typeStyle.bg,
                                                        textTransform: "uppercase", letterSpacing: "0.07em",
                                                        flexShrink: 0,
                                                    }}>{TYPE_LABELS[n.type] || n.type}</span>
                                                </div>
                                                <p className="notif-message" style={{
                                                    fontSize: 13, color: t.textMuted, lineHeight: 1.55,
                                                    fontFamily: "'DM Sans', sans-serif", margin: 0,
                                                }}>{n.message}</p>
                                            </div>

                                            <div className="notif-meta" style={{
                                                display: "flex", flexDirection: "column",
                                                alignItems: "flex-end", gap: 8, flexShrink: 0,
                                            }}>
                                                <span style={{ fontSize: 11, color: t.textMuted, whiteSpace: "nowrap" }}>{timeAgo(n.createdAt)}</span>
                                                <div style={{
                                                    width: 9, height: 9, borderRadius: "50%",
                                                    background: n.read ? "transparent" : t.accent,
                                                    border: n.read ? `1.5px solid ${t.border}` : "none",
                                                    animation: n.read ? "none" : "pulse-dot 1.8s ease-in-out infinite",
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