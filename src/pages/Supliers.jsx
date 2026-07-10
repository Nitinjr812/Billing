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

// ─── HELPERS ──────────────────────────────────────────────────────────────────
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
function SupplierFormModal({ initial, onClose, onSaved, existingCategories, t }) {
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
      }}>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 20, color: t.textPrimary, margin: 0 }}>
          {isEdit ? "Edit Supplier" : "Add Supplier"}
        </h3>

        {err && <p style={{ fontSize: 12, color: t.red, margin: 0 }}>{err}</p>}

        <div>
          <label style={labelStyle}>Supplier Name *</label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="TechSource India" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Category</label>
            <input
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
            <select style={{ ...inputStyle, cursor: "pointer" }} value={status} onChange={(e) => setStatus(e.target.value)}>
              {FORM_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Contact Person *</label>
          <input style={inputStyle} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Ankit Joshi" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ankit@techsource.in" />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98200 11234" />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Location</label>
          <input style={inputStyle} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Mumbai, MH" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Payment Terms</label>
            <select style={{ ...inputStyle, cursor: "pointer" }} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
              {PAYMENT_TERMS_OPTIONS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Rating (0–5)</label>
            <input type="number" min="0" max="5" step="0.1" style={inputStyle} value={rating} onChange={(e) => setRating(e.target.value)} />
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
function SupplierDrawer({ supplier, onClose, onEdit, onDeleted, t }) {
    const [deleting, setDeleting] = useState(false);
    if (!supplier) return null;

    const handleDelete = async () => {
      if (!window.confirm(`Delete ${supplier.name}? This cannot be undone.`)) return;
      setDeleting(true);
      try {
        const res = await fetch(`${BACKEND}/api/suppliers/${supplier._id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Could not delete supplier");
        onDeleted?.();
        onClose();
      } catch (e) {
        alert(e.message);
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
                }}
            >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
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
                    <button
                        onClick={onClose}
                        style={{
                            width: 36, height: 36, minWidth: 36, borderRadius: "10px",
                            background: `${t.accent}12`, border: `1px solid ${t.border}`,
                            color: t.textMuted, cursor: "pointer", fontSize: "16px",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        ✕
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
                        <div key={label} style={{
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
                        ["👤 Contact", supplier.contact],
                        ["✉️ Email", supplier.email || "—"],
                        ["📞 Phone", supplier.phone || "—"],
                        ["📍 Location", supplier.location || "—"],
                    ].map(([label, val]) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                            <span style={{
                                fontSize: "12px", color: t.textMuted,
                                fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
                            }}>{label}</span>
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
                transition: "background 0.15s",
            }}
        >
            {/* Top row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
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
                <StatusBadge status={supplier.status} t={t} />
            </div>

            {/* Badges */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                <CategoryBadge category={supplier.category} t={t} />
                {supplier.location && (
                  <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: "'DM Sans', sans-serif" }}>
                      📍 {supplier.location}
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
                <span style={{ fontSize: "18px", color: t.textMuted }}>›</span>
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
                <span style={{ fontSize: "16px", color: t.textMuted }}>›</span>
            </td>
        </tr>
    );
}

// ─── SUMMARY KPI ──────────────────────────────────────────────────────────────
function SummaryKpi({ label, value, sub, trendDir, t }) {
    const colors = { up: t.green, down: t.red, neu: t.orange };
    const bgs = { up: t.greenBg, down: t.redBg, neu: t.orangeBg };
    return (
        <div style={{
            borderRadius: "16px", padding: "18px 16px",
            background: t.bgCard, border: `1px solid ${t.border}`,
            transition: "background 0.25s ease, border-color 0.25s ease",
            minWidth: 0,
        }}>
            <p style={{
                fontSize: "9px", fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "0.1em", color: t.textMuted, margin: 0,
                fontFamily: "'DM Sans', sans-serif",
            }}>
                {label}
            </p>
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
              t={t}
            />
            {showForm && (
              <SupplierFormModal
                initial={editTarget}
                onClose={() => { setShowForm(false); setEditTarget(null); }}
                onSaved={handleSaved}
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
                        + Add Supplier
                    </button>
                </div>

                {/* KPI Row */}
                <div className="sup-kpi-grid">
                    <SummaryKpi label="Total Suppliers" value={loading ? "…" : suppliers.length} sub={loading ? undefined : `${activeCount} active`} trendDir="up" t={t} />
                    <SummaryKpi label="Total Value"     value={loading ? "…" : inr(totalValue)}   sub="from linked products" trendDir="up" t={t} />
                    <SummaryKpi label="Avg. Rating"     value={loading ? "…" : `${avgRating} ★`}  sub="across rated suppliers" trendDir="neu" t={t} />
                    <SummaryKpi label="On Hold"         value={loading ? "…" : suppliers.filter((s) => s.status === "On Hold").length} sub="needs review" trendDir="down" t={t} />
                </div>

                {/* Filters */}
                <div
                    className="sup-filter-box"
                    style={{
                        borderRadius: "16px",
                        background: t.bgCard,
                        border: `1px solid ${t.border}`,
                        padding: "14px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "10px",
                        alignItems: "center",
                        transition: "background 0.25s ease, border-color 0.25s ease",
                    }}
                >
                    <div style={{ position: "relative", flex: "1 1 80px", minWidth: 0 }}>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search suppliers…"
                            style={{
                                width: "100%",
                                padding: "9px 12px 9px 12px",
                                borderRadius: "10px",
                                background: `${t.accent}08`,
                                border: `1px solid ${t.border}`,
                                color: t.textPrimary,
                                fontFamily: "'DM Sans', sans-serif",
                                outline: "none",
                                boxSizing: "border-box",
                                fontSize: "16px",
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
                    className="sup-table-wrap"
                    style={{
                        borderRadius: "16px",
                        background: t.bgCard,
                        border: `1px solid ${t.border}`,
                        padding: "20px",
                        transition: "background 0.25s ease, border-color 0.25s ease",
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
                                <tr>
                                    <td colSpan={7} style={{ padding: "48px 0", textAlign: "center", color: t.textMuted, fontSize: "13px" }}>
                                        Loading suppliers…
                                    </td>
                                </tr>
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
                                        <p style={{ fontSize: "32px", margin: "0 0 8px" }}>🔍</p>
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
                        <p style={{ textAlign: "center", color: t.textMuted, fontSize: 13, padding: "24px 0" }}>Loading suppliers…</p>
                    ) : filtered.length > 0 ? (
                        filtered.map((s) => (
                            <SupplierCard key={s._id || s.id} supplier={s} onClick={setSelected} t={t} />
                        ))
                    ) : (
                        <div style={{
                            padding: "48px 20px", textAlign: "center",
                            borderRadius: "16px", background: t.bgCard, border: `1px solid ${t.border}`,
                        }}>
                            <p style={{ fontSize: "32px", margin: "0 0 8px" }}>🔍</p>
                            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "16px", color: t.textPrimary, margin: 0 }}>No suppliers found</p>
                            <p style={{ fontSize: "12px", color: t.textMuted, margin: "4px 0 0" }}>Try adjusting your search or filters, or add your first supplier</p>
                        </div>
                    )}
                </div>

            </div>
        </>
    );
}