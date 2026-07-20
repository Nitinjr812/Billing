import { useState, useEffect } from "react";
import { useTheme } from "../components/ThemeContext";

const BACKEND = "https://billing-backend-tawny.vercel.app";

const STATUSES = ["All", "Active", "On Hold", "Inactive"];
const FORM_STATUSES = ["Active", "On Hold", "Inactive"];
const PAYMENT_TERMS_OPTIONS = ["Net 15", "Net 20", "Net 30", "Net 45", "Net 60"];

// ─── helpers ────────────────────────────────────────────────────────────
function inr(n) {
  return "₹" + (Number(n) || 0).toLocaleString("en-IN");
}

function formatDate(raw) {
  const d = raw ? new Date(raw) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

// Merge supplier master data with linked-product aggregates (real, derived)
function enrichSuppliers(suppliers, products) {
  return suppliers.map((s) => {
    const linked = products.filter((p) => (p.supplier || "").toLowerCase() === s.name.toLowerCase());
    const totalValue = linked.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.stock) || 0), 0);
    const lastOrder = linked.reduce((latest, p) => {
      const d = p.updatedAt ? new Date(p.updatedAt) : null;
      if (!d) return latest;
      return !latest || d > latest ? d : latest;
    }, null);
    return {
      ...s,
      id: s.supplierId,
      linkedProductCount: linked.length,
      totalValue,
      lastOrder,
    };
  });
}

// ─── live suppliers hook ────────────────────────────────────────────────
function useSuppliersData(pollMs = 60000) {
  const [state, setState] = useState({ loading: true, error: null, suppliers: [] });
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [supRes, prodRes] = await Promise.all([
          fetch(`${BACKEND}/api/suppliers`),
          fetch(`${BACKEND}/api/products`),
        ]);
        if (!supRes.ok || !prodRes.ok) throw new Error("Request failed");
        const [suppliers, products] = await Promise.all([supRes.json(), prodRes.json()]);
        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            suppliers: enrichSuppliers(
              Array.isArray(suppliers) ? suppliers : [],
              Array.isArray(products) ? products : []
            ),
          });
        }
      } catch (err) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: "Live supplier data unavailable right now." }));
      }
    }

    load();
    const interval = setInterval(load, pollMs);
    return () => { cancelled = true; clearInterval(interval); };
  }, [pollMs, refreshTick]);

  return { ...state, refresh: () => setRefreshTick((n) => n + 1) };
}

// ─── ICONS — single stroke-set, used everywhere instead of emoji ──────────
function Icon({ id, size = 14 }) {
  const paths = {
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20l-4.7-4.7" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    close: <><path d="M6 6l12 12M18 6L6 18" /></>,
    chevronRight: <><path d="M9 6l6 6-6 6" /></>,
    person: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19.5c.9-3.3 3.5-5.2 6.5-5.2s5.6 1.9 6.5 5.2" /></>,
    mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="M4 7l8 6 8-6" /></>,
    phone: <><path d="M6 3.5l2.7 1.2c.6.3.8 1 .5 1.6l-1 2c-.3.6 0 1.2.4 1.7 1 1.1 2.2 2.2 3.3 3.2.5.4 1.1.7 1.7.4l2-1c.6-.3 1.3-.1 1.6.5L18.5 16c.4.8.2 1.8-.5 2.3-1 .8-2.3 1.1-3.6.7-3.5-1-6.7-4.2-7.7-7.7-.4-1.3-.1-2.6.7-3.6.5-.7 1.5-.9 2.3-.5z" /></>,
    pin: <><path d="M12 21s-6.5-5.9-6.5-11a6.5 6.5 0 0 1 13 0c0 5.1-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.2" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[id]}
    </svg>
  );
}

// ─── SIGNATURE ELEMENT — the "official seal" mark, echoed from the rest
// of the product's identity: a dashed ring turning slowly around a
// supplier's initials, like a stamp of approval on a vendor record.
function SealAvatar({ initials, size = 36, t }) {
  const ring = size + 12;
  return (
    <div style={{ position: "relative", width: ring, height: ring, flexShrink: 0 }}>
      <svg
        width={ring} height={ring} viewBox={`0 0 ${ring} ${ring}`}
        style={{ position: "absolute", inset: 0, animation: "sealSpin 18s linear infinite" }}
      >
        <circle
          cx={ring / 2} cy={ring / 2} r={ring / 2 - 1.3}
          fill="none" stroke={t.accent} strokeOpacity="0.45"
          strokeWidth="1.3" strokeDasharray="2.2 4" strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: "absolute", top: 6, left: 6,
        width: size, height: size, borderRadius: "50%",
        background: `${t.accent}1f`, border: `1.5px solid ${t.accent}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Syne', sans-serif", fontWeight: 900,
        fontSize: size * 0.36, color: t.accent,
      }}>{initials}</div>
    </div>
  );
}

function getInitials(name = "") {
  return name.trim().split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
}

// ─── FLOATING TOAST — replaces alert() for delete / save feedback ─────────
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
      position: "fixed", bottom: 24, right: 24, zIndex: 1200,
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
function Skeleton({ width = "100%", height = 14, radius = 8, t, style = {} }) {
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
function SkeletonCircle({ size = 36, t, style = {} }) {
  return <Skeleton width={size} height={size} radius="50%" t={t} style={style} />;
}

// ─── HELPERS (badges) ──────────────────────────────────────────────────────────
function StarRating({ rating, t }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {[1, 2, 3, 4, 5].map((s) => (
                <span
                    key={s}
                    style={{
                        fontSize: "11px",
                        color: s <= Math.round(rating) ? "#f59e0b" : t.border,
                    }}
                >
                    ★
                </span>
            ))}
            <span style={{ fontSize: "11px", color: t.textMuted, marginLeft: "2px" }}>
                {rating || 0}
            </span>
        </div>
    );
}

function StatusBadge({ status, t }) {
    const map = {
        Active: { color: t.green, bg: t.greenBg },
        "On Hold": { color: t.orange, bg: t.orangeBg },
        Inactive: { color: t.red, bg: t.redBg },
    };
    const s = map[status] || map["Active"];
    return (
        <span
            style={{
                fontSize: "10px",
                fontWeight: 600,
                padding: "3px 9px",
                borderRadius: "99px",
                color: s.color,
                background: s.bg,
                whiteSpace: "nowrap",
                display: "inline-block",
            }}
        >
            {status}
        </span>
    );
}

function CategoryBadge({ category, t }) {
    const map = {
        Electronics: { color: t.blue, bg: `${t.blue}18` },
        Apparel: { color: "#a855f7", bg: "#a855f718" },
        "Home Goods": { color: t.orange, bg: t.orangeBg },
    };
    const s = map[category] || { color: t.accent, bg: `${t.accent}15` };
    return (
        <span
            style={{
                fontSize: "10px",
                fontWeight: 600,
                padding: "3px 9px",
                borderRadius: "99px",
                color: s.color,
                background: s.bg,
                whiteSpace: "nowrap",
                display: "inline-block",
            }}
        >
            {category}
        </span>
    );
}

// ─── ADD / EDIT SUPPLIER MODAL ─────────────────────────────────────────────
function SupplierFormModal({ initial, onClose, onSaved, onToast, existingCategories, t }) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [contact, setContact] = useState(initial?.contact || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [status, setStatus] = useState(initial?.status || "Active");
  const [paymentTerms, setPaymentTerms] = useState(initial?.paymentTerms || "Net 30");
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const inputStyle = {
    width: "100%", boxSizing: "border-box", background: `${t.accent}08`,
    border: `1px solid ${t.border}`, borderRadius: 10, padding: "9px 12px",
    fontSize: 13, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", outline: "none",
    "--focus-ring": `${t.accent}33`,
  };
  const labelStyle = { fontSize: 11, color: t.textMuted, display: "block", marginBottom: 4 };

  const handleSave = async () => {
    setErr("");
    if (!name.trim()) return setErr("Supplier name is required");
    if (!category.trim()) return setErr("Category is required");
    if (!contact.trim()) return setErr("Contact person is required");

    setSaving(true);
    try {
      const payload = { name, category, contact, email, phone, location, status, paymentTerms, rating: Number(rating) };
      const url = isEdit ? `${BACKEND}/api/suppliers/${initial._id}` : `${BACKEND}/api/suppliers`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save supplier");
      onSaved?.();
      onToast?.(isEdit ? "✅ Supplier updated!" : "✅ Supplier added!");
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
      overflowY: "auto",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16,
        padding: 24, width: "100%", maxWidth: 480, display: "flex", flexDirection: "column",
        gap: 14, maxHeight: "90vh", overflowY: "auto",
        animation: "modalIn 0.2s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 20, color: t.textPrimary, margin: 0 }}>
            {isEdit ? "Edit Supplier" : "Add Supplier"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30, height: 30, borderRadius: 8, background: `${t.accent}12`,
              border: `1px solid ${t.border}`, color: t.textMuted, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          ><Icon id="close" size={13} /></button>
        </div>

        {err && <p style={{ fontSize: 12, color: t.red, margin: 0 }}>{err}</p>}

        <div>
          <label style={labelStyle}>Supplier Name *</label>
          <input className="ui-input" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="TechSource India" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Category</label>
            <input
              className="ui-input"
              style={inputStyle}
              list="supplier-category-options"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Type or pick a category…"
            />
            <datalist id="supplier-category-options">
              {existingCategories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select className="ui-input" style={{ ...inputStyle, cursor: "pointer" }} value={status} onChange={(e) => setStatus(e.target.value)}>
              {FORM_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Contact Person *</label>
          <input className="ui-input" style={inputStyle} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Ankit Joshi" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input className="ui-input" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ankit@techsource.in" />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input className="ui-input" style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98200 11234" />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Location</label>
          <input className="ui-input" style={inputStyle} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Mumbai, MH" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Payment Terms</label>
            <select className="ui-input" style={{ ...inputStyle, cursor: "pointer" }} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
              {PAYMENT_TERMS_OPTIONS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Rating (0–5)</label>
            <input type="number" min="0" max="5" step="0.1" className="ui-input" style={inputStyle} value={rating} onChange={(e) => setRating(e.target.value)} />
          </div>
        </div>

        <p style={{ fontSize: 11, color: t.textMuted, margin: "4px 0 0" }}>
          Tip: tag your products with this exact supplier name in the Stocks page to see real Total Orders / Total Value here.
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
          <button onClick={onClose} style={{
            background: "transparent", color: t.textMuted, border: `1px solid ${t.border}`,
            borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            background: t.accent, color: "#fff", border: "none", borderRadius: 10,
            padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}>{saving ? "Saving..." : isEdit ? "Save Changes" : "Add Supplier"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── SUPPLIER DETAIL DRAWER ───────────────────────────────────────────────────
function SupplierDrawer({ supplier, onClose, onEdit, onDeleted, onToast, t }) {
    const [deleting, setDeleting] = useState(false);
    if (!supplier) return null;

    const handleDelete = async () => {
      if (!window.confirm(`Delete ${supplier.name}? This cannot be undone.`)) return;
      setDeleting(true);
      try {
        const res = await fetch(`${BACKEND}/api/suppliers/${supplier._id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Could not delete supplier");
        onToast?.("✅ Supplier deleted");
        onDeleted?.();
        onClose();
      } catch (e) {
        onToast?.("❌ " + e.message);
      } finally {
        setDeleting(false);
      }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.45)",
                    zIndex: 50,
                    backdropFilter: "blur(2px)",
                    WebkitBackdropFilter: "blur(2px)",
                }}
            />
            {/* Drawer */}
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: "min(440px, 100vw)",
                    background: t.bgCard,
                    borderLeft: `1px solid ${t.border}`,
                    zIndex: 51,
                    overflowY: "auto",
                    overflowX: "hidden",
                    padding: "24px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                    boxSizing: "border-box",
                    animation: "drawerIn 0.22s ease",
                }}
            >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                    <div style={{ display: "flex", gap: 14, minWidth: 0 }}>
                        <SealAvatar initials={getInitials(supplier.name)} size={44} t={t} />
                        <div style={{ minWidth: 0 }}>
                            <p style={{
                                fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                                letterSpacing: "0.1em", color: t.textMuted, margin: 0,
                                fontFamily: "'DM Sans', sans-serif",
                            }}>
                                {supplier.id}
                            </p>
                            <h2 style={{
                                fontFamily: "'Syne', sans-serif", fontSize: "clamp(18px, 5vw, 22px)",
                                fontWeight: 900, color: t.textPrimary, margin: "4px 0 0",
                                letterSpacing: "-0.02em", wordBreak: "break-word",
                            }}>
                                {supplier.name}
                            </h2>
                            <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                                <StatusBadge status={supplier.status} t={t} />
                                <CategoryBadge category={supplier.category} t={t} />
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            width: 36, height: 36, minWidth: 36, borderRadius: "10px",
                            background: `${t.accent}12`, border: `1px solid ${t.border}`,
                            color: t.textMuted, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        <Icon id="close" size={15} />
                    </button>
                </div>

                {/* Stats row — real, derived from linked products */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {[
                        ["Linked Products", supplier.linkedProductCount],
                        ["Total Value", inr(supplier.totalValue)],
                        ["Last Product Update", formatDate(supplier.lastOrder)],
                        ["Payment Terms", supplier.paymentTerms],
                    ].map(([label, val]) => (
                        <div key={label} className="ui-card" style={{
                            background: `${t.accent}08`, border: `1px solid ${t.border}`,
                            borderRadius: "12px", padding: "12px 14px",
                        }}>
                            <p style={{
                                fontSize: "9px", fontWeight: 600, textTransform: "uppercase",
                                letterSpacing: "0.08em", color: t.textMuted, margin: 0,
                                fontFamily: "'DM Sans', sans-serif",
                            }}>{label}</p>
                            <p style={{
                                fontFamily: "'Syne', sans-serif", fontSize: "clamp(14px, 4vw, 18px)",
                                fontWeight: 900, color: t.textPrimary, margin: "4px 0 0",
                                wordBreak: "break-word",
                            }}>{val}</p>
                        </div>
                    ))}
                </div>

                {/* Rating */}
                <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: "16px" }}>
                    <p style={{
                        fontSize: "11px", fontWeight: 600, color: t.textMuted,
                        textTransform: "uppercase", letterSpacing: "0.08em",
                        margin: "0 0 8px", fontFamily: "'DM Sans', sans-serif",
                    }}>Supplier Rating</p>
                    <StarRating rating={supplier.rating} t={t} />
                </div>

                {/* Contact Info */}
                <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <p style={{
                        fontSize: "11px", fontWeight: 600, color: t.textMuted,
                        textTransform: "uppercase", letterSpacing: "0.08em",
                        margin: 0, fontFamily: "'DM Sans', sans-serif",
                    }}>Contact Details</p>
                    {[
                        ["person", "Contact", supplier.contact],
                        ["mail", "Email", supplier.email || "—"],
                        ["phone", "Phone", supplier.phone || "—"],
                        ["pin", "Location", supplier.location || "—"],
                    ].map(([icon, label, val]) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                            <span style={{
                                display: "flex", alignItems: "center", gap: 6,
                                fontSize: "12px", color: t.textMuted,
                                fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
                            }}><Icon id={icon} size={13} />{label}</span>
                            <span style={{
                                fontSize: "12px", color: t.textPrimary,
                                fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                                textAlign: "right", wordBreak: "break-word", minWidth: 0,
                            }}>{val}</span>
                        </div>
                    ))}
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "10px", marginTop: "auto", paddingTop: "8px" }}>
                    <button
                        onClick={() => onEdit(supplier)}
                        style={{
                            flex: 1, padding: "12px 10px", borderRadius: "10px",
                            background: t.accent, color: "#fff", border: "none",
                            fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "13px",
                            cursor: "pointer", touchAction: "manipulation",
                        }}>
                        Edit Supplier
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        style={{
                            flex: 1, padding: "12px 10px", borderRadius: "10px",
                            background: `${t.red}12`, color: t.red, border: `1px solid ${t.red}40`,
                            fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "13px",
                            cursor: deleting ? "not-allowed" : "pointer", touchAction: "manipulation",
                            opacity: deleting ? 0.6 : 1,
                        }}>
                        {deleting ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── MOBILE CARD VIEW ─────────────────────────────────────────────────────────
function SupplierCard({ supplier, onClick, t }) {
    return (
        <div
            className="ui-card"
            onClick={() => onClick(supplier)}
            style={{
                padding: "16px",
                borderRadius: "14px",
                border: `1px solid ${t.border}`,
                background: t.bgCard,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
            }}
        >
            {/* Top row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
                    <SealAvatar initials={getInitials(supplier.name)} size={32} t={t} />
                    <div style={{ minWidth: 0 }}>
                        <p style={{
                            fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "14px",
                            color: t.textPrimary, margin: 0, whiteSpace: "nowrap",
                            overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                            {supplier.name}
                        </p>
                        <p style={{ fontSize: "10px", color: t.textMuted, margin: "2px 0 0", fontFamily: "monospace" }}>
                            {supplier.id}
                        </p>
                    </div>
                </div>
                <StatusBadge status={supplier.status} t={t} />
            </div>

            {/* Badges */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                <CategoryBadge category={supplier.category} t={t} />
                {supplier.location && (
                  <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "11px", color: t.textMuted, fontFamily: "'DM Sans', sans-serif" }}>
                      <Icon id="pin" size={11} /> {supplier.location}
                  </span>
                )}
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <p style={{
                        fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "15px",
                        color: t.textPrimary, margin: 0,
                    }}>
                        {inr(supplier.totalValue)}
                    </p>
                    <p style={{ fontSize: "10px", color: t.textMuted, margin: "2px 0 0" }}>
                        {supplier.linkedProductCount} products
                    </p>
                </div>
                <StarRating rating={supplier.rating} t={t} />
                <span style={{ color: t.textMuted, display: "flex" }}><Icon id="chevronRight" size={16} /></span>
            </div>
        </div>
    );
}

// ─── DESKTOP TABLE ROW ────────────────────────────────────────────────────────
function SupplierRow({ supplier, onClick, t, isLast }) {
    return (
        <tr
            onClick={() => onClick(supplier)}
            style={{
                borderBottom: !isLast ? `1px solid ${t.borderLight || t.border}` : "none",
                cursor: "pointer",
                transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = `${t.accent}06`)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
            <td style={{ padding: "14px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <SealAvatar initials={getInitials(supplier.name)} size={28} t={t} />
                    <div>
                        <p style={{
                            fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "13px",
                            color: t.textPrimary, margin: 0,
                        }}>
                            {supplier.name}
                        </p>
                        <p style={{ fontSize: "10px", color: t.textMuted, margin: "2px 0 0", fontFamily: "monospace" }}>
                            {supplier.id}
                        </p>
                    </div>
                </div>
            </td>
            <td style={{ padding: "14px 8px" }}>
                <CategoryBadge category={supplier.category} t={t} />
            </td>
            <td style={{ padding: "14px 8px" }}>
                <div>
                    <p style={{
                        fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
                        color: t.textPrimary, margin: 0, fontWeight: 500,
                    }}>
                        {supplier.contact}
                    </p>
                    <p style={{ fontSize: "11px", color: t.textMuted, margin: "1px 0 0" }}>
                        {supplier.location || "—"}
                    </p>
                </div>
            </td>
            <td style={{ padding: "14px 8px" }}>
                <p style={{
                    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px",
                    color: t.textPrimary, margin: 0,
                }}>
                    {inr(supplier.totalValue)}
                </p>
                <p style={{ fontSize: "10px", color: t.textMuted, margin: "1px 0 0" }}>
                    {supplier.linkedProductCount} products
                </p>
            </td>
            <td style={{ padding: "14px 8px" }}>
                <StarRating rating={supplier.rating} t={t} />
            </td>
            <td style={{ padding: "14px 8px" }}>
                <StatusBadge status={supplier.status} t={t} />
            </td>
            <td style={{ padding: "14px 0", textAlign: "right" }}>
                <span style={{ color: t.textMuted, display: "inline-flex" }}><Icon id="chevronRight" size={15} /></span>
            </td>
        </tr>
    );
}

// ─── SUMMARY KPI ──────────────────────────────────────────────────────────────
function SummaryKpi({ label, value, sub, trendDir, loading, t }) {
    const colors = { up: t.green, down: t.red, neu: t.orange };
    const bgs = { up: t.greenBg, down: t.redBg, neu: t.orangeBg };
    return (
        <div className="ui-card" style={{
            borderRadius: "16px", padding: "18px 16px",
            background: t.bgCard, border: `1px solid ${t.border}`,
            minWidth: 0,
        }}>
            <p style={{
                fontSize: "9px", fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "0.1em", color: t.textMuted, margin: 0,
                fontFamily: "'DM Sans', sans-serif",
            }}>
                {label}
            </p>
            {loading ? (
                <>
                    <Skeleton width="60%" height={22} t={t} style={{ margin: "8px 0 8px" }} />
                    <Skeleton width="45%" height={16} radius={99} t={t} />
                </>
            ) : (
                <>
                    <p style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: "clamp(20px, 5vw, 26px)",
                        fontWeight: 900, color: t.textPrimary,
                        letterSpacing: "-0.03em", margin: "6px 0 6px", lineHeight: 1,
                        wordBreak: "break-word",
                    }}>
                        {value}
                    </p>
                    {sub && (
                        <span style={{
                            fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px",
                            color: colors[trendDir], background: bgs[trendDir],
                            display: "inline-block",
                        }}>
                            {sub}
                        </span>
                    )}
                </>
            )}
        </div>
    );
}

// ─── SKELETON ROWS / CARDS for loading states ─────────────────────────────────
function SkeletonRow({ t, isLast }) {
    return (
        <tr style={{ borderBottom: !isLast ? `1px solid ${t.borderLight || t.border}` : "none" }}>
            <td style={{ padding: "14px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <SkeletonCircle size={28} t={t} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <Skeleton width={110} height={11} t={t} />
                        <Skeleton width={70} height={9} t={t} />
                    </div>
                </div>
            </td>
            <td style={{ padding: "14px 8px" }}><Skeleton width={70} height={18} radius={99} t={t} /></td>
            <td style={{ padding: "14px 8px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <Skeleton width={90} height={11} t={t} />
                    <Skeleton width={60} height={9} t={t} />
                </div>
            </td>
            <td style={{ padding: "14px 8px" }}><Skeleton width={80} height={13} t={t} /></td>
            <td style={{ padding: "14px 8px" }}><Skeleton width={60} height={11} t={t} /></td>
            <td style={{ padding: "14px 8px" }}><Skeleton width={54} height={18} radius={99} t={t} /></td>
            <td style={{ padding: "14px 0" }} />
        </tr>
    );
}

function SkeletonCard({ t }) {
    return (
        <div className="ui-card" style={{
            padding: "16px", borderRadius: "14px", border: `1px solid ${t.border}`,
            background: t.bgCard, display: "flex", flexDirection: "column", gap: "12px",
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", gap: 10 }}>
                    <SkeletonCircle size={32} t={t} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, justifyContent: "center" }}>
                        <Skeleton width={100} height={12} t={t} />
                        <Skeleton width={60} height={9} t={t} />
                    </div>
                </div>
                <Skeleton width={54} height={18} radius={99} t={t} />
            </div>
            <Skeleton width={80} height={16} radius={99} t={t} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <Skeleton width={70} height={14} t={t} />
                    <Skeleton width={54} height={9} t={t} />
                </div>
                <Skeleton width={60} height={11} t={t} />
            </div>
        </div>
    );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = `
  * { box-sizing: border-box; }

  .sup-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .sup-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .sup-cards { display: none; }

  .sup-pill-row {
    display: flex;
    gap: 6px;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding-bottom: 2px;
  }
  .sup-pill-row::-webkit-scrollbar { display: none; }

  .ui-card { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.25s ease; }
  .ui-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.08); }

  .ui-input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
  .ui-input:focus { box-shadow: 0 0 0 3px var(--focus-ring, rgba(0,0,0,0.08)); }

  .ui-skeleton { animation: shimmer 1.4s ease-in-out infinite; }
  @keyframes shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes sealSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes toastIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes modalIn {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes drawerIn {
    from { transform: translateX(24px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .ui-card, .ui-input, .ui-skeleton { animation: none !important; transition: none !important; }
    .ui-card:hover { transform: none; }
  }

  @media (max-width: 900px) {
    .sup-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 640px) {
    .sup-kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .sup-table-wrap { display: none; }
    .sup-cards { display: flex; flex-direction: column; gap: 10px; }

    .sup-filter-box {
      flex-direction: column !important;
      align-items: stretch !important;
    }
    .sup-filter-count { margin-left: 0 !important; text-align: right; }

    .sup-filter-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
    }
    .sup-filter-group-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
  }
`;

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Suppliers() {
    const { t } = useTheme();
    const { loading, error, suppliers, refresh } = useSuppliersData();

    const [search, setSearch] = useState("");
    const [catFilter, setCatFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [selected, setSelected] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [toast, setToast] = useState("");

    const filtered = suppliers.filter((s) => {
        const matchSearch =
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.id.toLowerCase().includes(search.toLowerCase()) ||
            s.contact.toLowerCase().includes(search.toLowerCase());
        const matchCat = catFilter === "All" || s.category === catFilter;
        const matchStatus = statusFilter === "All" || s.status === statusFilter;
        return matchSearch && matchCat && matchStatus;
    });

    const activeCount = suppliers.filter((s) => s.status === "Active").length;
    const totalValue = suppliers.reduce((sum, s) => sum + (s.totalValue || 0), 0);
    const ratedSuppliers = suppliers.filter((s) => s.rating > 0);
    const avgRating = ratedSuppliers.length
      ? (ratedSuppliers.reduce((sum, s) => sum + s.rating, 0) / ratedSuppliers.length).toFixed(1)
      : "0.0";

    // Real categories, derived from suppliers actually saved — grows as
    // the shop owner types new ones in the Add/Edit Supplier form.
    const knownCategories = [...new Set(suppliers.map((s) => s.category).filter(Boolean))].sort();
    const categoryFilterOptions = ["All", ...knownCategories];

    const openEdit = (supplier) => {
        setSelected(null);
        setEditTarget(supplier);
        setShowForm(true);
    };

    const handleSaved = () => {
        refresh();
    };

    return (
        <>
            <style>{styles}</style>
            <SupplierDrawer
              supplier={selected}
              onClose={() => setSelected(null)}
              onEdit={openEdit}
              onDeleted={refresh}
              onToast={setToast}
              t={t}
            />
            {showForm && (
              <SupplierFormModal
                initial={editTarget}
                onClose={() => { setShowForm(false); setEditTarget(null); }}
                onSaved={handleSaved}
                onToast={setToast}
                existingCategories={knownCategories}
                t={t}
              />
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                {/* Header */}
                <div style={{
                    display: "flex", alignItems: "flex-end", justifyContent: "space-between",
                    flexWrap: "wrap", gap: "12px",
                }}>
                    <div>
                        <h1 style={{
                            fontFamily: "'Syne', sans-serif",
                            fontSize: "clamp(22px, 6vw, 28px)",
                            fontWeight: 900, color: t.textPrimary,
                            letterSpacing: "-0.03em", margin: 0,
                            transition: "color 0.25s ease",
                        }}>
                            Suppliers
                        </h1>
                        <p style={{ fontSize: "13px", color: t.textMuted, marginTop: "4px", marginBottom: 0 }}>
                            {error ? error : "Manage your vendor relationships"}
                        </p>
                    </div>
                    <button
                        onClick={() => { setEditTarget(null); setShowForm(true); }}
                        style={{
                          padding: "10px 18px", borderRadius: "10px",
                          background: t.accent, color: "#fff", border: "none",
                          fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "13px",
                          cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                          touchAction: "manipulation", whiteSpace: "nowrap",
                        }}>
                        <Icon id="plus" size={14} /> Add Supplier
                    </button>
                </div>

                {/* KPI Row */}
                <div className="sup-kpi-grid">
                    <SummaryKpi label="Total Suppliers" value={suppliers.length} sub={`${activeCount} active`} trendDir="up" loading={loading} t={t} />
                    <SummaryKpi label="Total Value"     value={inr(totalValue)}   sub="from linked products" trendDir="up" loading={loading} t={t} />
                    <SummaryKpi label="Avg. Rating"     value={`${avgRating} ★`}  sub="across rated suppliers" trendDir="neu" loading={loading} t={t} />
                    <SummaryKpi label="On Hold"         value={suppliers.filter((s) => s.status === "On Hold").length} sub="needs review" trendDir="down" loading={loading} t={t} />
                </div>

                {/* Filters */}
                <div
                    className="sup-filter-box ui-card"
                    style={{
                        borderRadius: "16px",
                        background: t.bgCard,
                        border: `1px solid ${t.border}`,
                        padding: "14px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "10px",
                        alignItems: "center",
                    }}
                >
                    <div style={{ position: "relative", flex: "1 1 80px", minWidth: 0 }}>
                        <span style={{
                            position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
                            color: t.textMuted, display: "flex", pointerEvents: "none",
                        }}><Icon id="search" size={14} /></span>
                        <input
                            className="ui-input"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search suppliers…"
                            style={{
                                width: "100%",
                                padding: "9px 12px 9px 32px",
                                borderRadius: "10px",
                                background: `${t.accent}08`,
                                border: `1px solid ${t.border}`,
                                color: t.textPrimary,
                                fontFamily: "'DM Sans', sans-serif",
                                outline: "none",
                                boxSizing: "border-box",
                                fontSize: "16px",
                                "--focus-ring": `${t.accent}33`,
                            }}
                        />
                    </div>

                    <div className="sup-filter-group">
                        <span className="sup-filter-group-label" style={{ color: t.textMuted, fontFamily: "'DM Sans', sans-serif", display: "none" }}>
                            Category
                        </span>
                        <div className="sup-pill-row">
                            {categoryFilterOptions.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setCatFilter(c)}
                                    style={{
                                        fontSize: "11px", fontWeight: 600,
                                        padding: "7px 12px", borderRadius: "99px",
                                        background: catFilter === c ? t.accent : `${t.accent}12`,
                                        color: catFilter === c ? "#fff" : t.accent,
                                        border: catFilter === c ? "none" : `1px solid ${t.accent}28`,
                                        cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                                        transition: "all 0.15s", touchAction: "manipulation",
                                        minHeight: "32px", whiteSpace: "nowrap", flexShrink: 0,
                                    }}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="sup-filter-group">
                        <span className="sup-filter-group-label" style={{ color: t.textMuted, fontFamily: "'DM Sans', sans-serif", display: "none" }}>
                            Status
                        </span>
                        <div className="sup-pill-row">
                            {STATUSES.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    style={{
                                        fontSize: "11px", fontWeight: 600,
                                        padding: "7px 12px", borderRadius: "99px",
                                        background: statusFilter === s ? `${t.border}` : "transparent",
                                        color: statusFilter === s ? t.textPrimary : t.textMuted,
                                        border: `1px solid ${t.border}`,
                                        cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                                        transition: "all 0.15s", touchAction: "manipulation",
                                        minHeight: "32px", whiteSpace: "nowrap", flexShrink: 0,
                                    }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <span
                        className="sup-filter-count"
                        style={{
                            fontSize: "11px", color: t.textMuted,
                            marginLeft: "auto", whiteSpace: "nowrap",
                            fontFamily: "'DM Sans', sans-serif",
                        }}
                    >
                        {loading ? "Loading…" : `${filtered.length} of ${suppliers.length} suppliers`}
                    </span>
                </div>

                {/* ── Desktop Table ── */}
                <div
                    className="sup-table-wrap ui-card"
                    style={{
                        borderRadius: "16px",
                        background: t.bgCard,
                        border: `1px solid ${t.border}`,
                        padding: "20px",
                    }}
                >
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "560px" }}>
                        <thead>
                            <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                                {["Supplier", "Category", "Contact", "Total Value", "Rating", "Status", ""].map((h, i) => (
                                    <th
                                        key={i}
                                        style={{
                                            textAlign: "left", paddingBottom: "12px",
                                            fontSize: "10px", fontWeight: 600,
                                            textTransform: "uppercase", letterSpacing: "0.08em",
                                            color: t.textMuted, fontFamily: "'DM Sans', sans-serif",
                                            paddingRight: i < 6 ? "8px" : "0",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <SkeletonRow key={i} t={t} isLast={i === 4} />
                                ))
                            ) : filtered.length > 0 ? (
                                filtered.map((s, i) => (
                                    <SupplierRow
                                        key={s._id || s.id}
                                        supplier={s}
                                        onClick={setSelected}
                                        t={t}
                                        isLast={i === filtered.length - 1}
                                    />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} style={{ padding: "48px 0", textAlign: "center" }}>
                                        <div style={{ display: "flex", justifyContent: "center", color: t.textMuted, marginBottom: 8 }}>
                                            <Icon id="search" size={30} />
                                        </div>
                                        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "16px", color: t.textPrimary, margin: 0 }}>No suppliers found</p>
                                        <p style={{ fontSize: "12px", color: t.textMuted, margin: "4px 0 0" }}>Try adjusting your search or filters, or add your first supplier</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Mobile Cards ── */}
                <div className="sup-cards">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} t={t} />)
                    ) : filtered.length > 0 ? (
                        filtered.map((s) => (
                            <SupplierCard key={s._id || s.id} supplier={s} onClick={setSelected} t={t} />
                        ))
                    ) : (
                        <div style={{
                            padding: "48px 20px", textAlign: "center",
                            borderRadius: "16px", background: t.bgCard, border: `1px solid ${t.border}`,
                        }}>
                            <div style={{ display: "flex", justifyContent: "center", color: t.textMuted, marginBottom: 8 }}>
                                <Icon id="search" size={30} />
                            </div>
                            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "16px", color: t.textPrimary, margin: 0 }}>No suppliers found</p>
                            <p style={{ fontSize: "12px", color: t.textMuted, margin: "4px 0 0" }}>Try adjusting your search or filters, or add your first supplier</p>
                        </div>
                    )}
                </div>

            </div>

            <Toast message={toast} onDismiss={() => setToast("")} t={t} />
        </>
    );
}