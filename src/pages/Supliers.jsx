import { useState, useEffect, useRef } from "react";
import { useTheme } from "../components/ThemeContext";
import { useApi } from "../hooks/useApi";

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

// Merge in khata (purchase ledger) aggregates onto each supplier
function enrichWithKhata(suppliers, purchaseSummaryPerSupplier) {
  const bySupplierId = {};
  purchaseSummaryPerSupplier.forEach((row) => {
    bySupplierId[row._id] = row;
  });
  return suppliers.map((s) => {
    const row = bySupplierId[s._id];
    return {
      ...s,
      totalPurchased: row?.totalPurchased || 0,
      totalPaid: row?.totalPaid || 0,
      totalPending: row?.totalPending || 0,
      purchaseCount: row?.purchaseCount || 0,
    };
  });
}

// ─── live suppliers hook (now also pulls purchase/khata summary) ───────
function useSuppliersData(pollMs = 60000) {
  const api = useApi();
  const apiRef = useRef(api);
  apiRef.current = api;

  const [state, setState] = useState({ loading: true, error: null, suppliers: [], products: [] });
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [suppliers, products] = await Promise.all([
          apiRef.current("/suppliers"),
          apiRef.current("/products"),
        ]);

        let purchaseSummary = { perSupplier: [], overall: { totalPurchased: 0, totalPaid: 0, totalPending: 0 } };
        try {
          purchaseSummary = await apiRef.current("/supplier-purchases/summary");
        } catch { /* ignore */ }

        if (!cancelled) {
          const rawProducts = Array.isArray(products) ? products : [];
          const merged = enrichSuppliers(Array.isArray(suppliers) ? suppliers : [], rawProducts);
          const withKhata = enrichWithKhata(merged, purchaseSummary.perSupplier || []);
          setState({
            loading: false,
            error: null,
            suppliers: withKhata,
            products: rawProducts,          // 👈 naya
            overallKhata: purchaseSummary.overall || { totalPurchased: 0, totalPaid: 0, totalPending: 0 },
          });
        }
      } catch (err) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: err.message }));
      }
    }

    load();
    const interval = setInterval(load, pollMs);
    return () => { cancelled = true; clearInterval(interval); };
  }, [pollMs, refreshTick]);

  return { ...state, refresh: () => setRefreshTick((n) => n + 1) };
}

// ─── purchases-for-one-supplier hook (used inside the drawer) ─────────
function useSupplierPurchases(supplierId) {
  const api = useApi();
  const apiRef = useRef(api);
  apiRef.current = api;

  const [state, setState] = useState({ loading: true, error: null, purchases: [] });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!supplierId) return;
    let cancelled = false;

    async function load() {
      setState((s) => ({ ...s, loading: true }));
      try {
        const data = await apiRef.current(`/supplier-purchases?supplier=${supplierId}`);
        if (!cancelled) setState({ loading: false, error: null, purchases: Array.isArray(data) ? data : [] });
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: err.message, purchases: [] });
      }
    }

    load();
    return () => { cancelled = true; };
  }, [supplierId, tick]);

  return { ...state, refresh: () => setTick((n) => n + 1) };
}

// ─── restock orders hook — the WhatsApp restock requests, tracked so they
// can be marked "Complete" and pushed into inventory as real stock. Pulls
// ALL orders (any supplier, incl. ad-hoc ones with no saved supplier) so
// they can be shown in one "Pending Restocks" list on the main page.
function useRestockOrders(pollMs = 30000) {
  const api = useApi();
  const apiRef = useRef(api);
  apiRef.current = api;

  const [state, setState] = useState({ loading: true, error: null, orders: [] });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await apiRef.current("/restock-orders");
        if (!cancelled) setState({ loading: false, error: null, orders: Array.isArray(data) ? data : [] });
      } catch (err) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: err.message }));
      }
    }

    load();
    const interval = setInterval(load, pollMs);
    return () => { cancelled = true; clearInterval(interval); };
  }, [pollMs, tick]);

  return { ...state, refresh: () => setTick((n) => n + 1) };
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
    rupee: <><path d="M6 4h12M6 4c4 0 7 1.6 7 4.5S10 13 6 13h9M6 13l7 7" /></>,
    receipt: <><path d="M6 3h12v18l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.6z" /><path d="M9 8h6M9 12h6" /></>,
    whatsapp: <><path d="M6.5 17.5L5 21l3.6-1.4a8 8 0 1 0-2.6-2.5z" /><path d="M9 10.3c0 3.2 2.8 6 6 6 .6 0 .9-.6.6-1.1l-1-1.6a.8.8 0 0 0-1-.3l-1 .4a5 5 0 0 1-2.3-2.3l.4-1a.8.8 0 0 0-.3-1l-1.6-1c-.5-.3-1.1 0-1.1.6" /></>,
    box: <><path d="M3.5 7.5L12 3l8.5 4.5L12 12 3.5 7.5z" /><path d="M3.5 7.5V16l8.5 4.5m0-8.5V21m0-8.5l8.5-4.5V16L12 20.5" /></>,
    check: <><path d="M20 6L9 17l-5-5" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 8v5l3 2" /></>,
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
  const text = message.replace(/^✅\s*|^❌\s*|^⚠️\s*/, "");

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

// Purchase (khata) status badge — Paid / Partially Paid / Pending
function PurchaseStatusBadge({ status, t }) {
  const map = {
    Paid: { color: t.green, bg: t.greenBg },
    "Partially Paid": { color: t.orange, bg: t.orangeBg },
    Pending: { color: t.red, bg: t.redBg },
  };
  const s = map[status] || map["Pending"];
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

// Restock order status badge — Pending / Completed
function RestockStatusBadge({ status, t }) {
  const map = {
    Pending: { color: t.orange, bg: t.orangeBg },
    Completed: { color: t.green, bg: t.greenBg },
  };
  const s = map[status] || map["Pending"];
  return (
    <span
      style={{
        fontSize: "10px", fontWeight: 600, padding: "3px 9px", borderRadius: "99px",
        color: s.color, background: s.bg, whiteSpace: "nowrap", display: "inline-block",
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

// ─── WHATSAPP RESTOCK HELPERS ──────────────────────────────────────────
// Turns whatever the shopkeeper typed (with spaces, dashes, +91, a
// leading 0, etc.) into the plain digit string wa.me needs.
// Assumes India (91) when a bare 10-digit number is given.
function toWhatsAppDigits(raw) {
  let digits = (raw || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) digits = "91" + digits;
  else if (digits.length === 11 && digits.startsWith("0")) digits = "91" + digits.slice(1);
  else if (digits.length === 12 && digits.startsWith("91")) {/* already fine */ }
  return digits.length >= 11 ? digits : null;
}

function buildRestockMessage(supplierLabel, items) {
  const lines = items
    .filter((it) => it.name.trim())
    .map((it, i) => `${i + 1}. ${it.name.trim()}${it.qty ? ` – ${it.qty}` : ""}`);
  return [
    `Namaste${supplierLabel ? " " + supplierLabel : ""},`,
    ``,
    `Kripya niche diye gaye items ka restock bhej dijiye:`,
    ``,
    ...lines,
    ``,
    `Dhanyavaad!`,
  ].join("\n");
}

// ─── RESTOCK HISTORY — past WhatsApp restock orders for this supplier,
// with a one-click "Reorder" that copies the old item list straight into
// the form above so the shopkeeper doesn't have to retype everything.
function RestockHistory({ historyOrders, onReorder, t }) {
  const [open, setOpen] = useState(false);
  if (!historyOrders.length) return null;

  return (
    <div style={{ border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 12px", background: `${t.accent}08`, border: "none", cursor: "pointer",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: t.textPrimary }}>
          <Icon id="history" size={13} /> Previous Restocks ({historyOrders.length})
        </span>
        <span style={{ color: t.textMuted, fontSize: 11 }}>{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, maxHeight: 220, overflowY: "auto" }}>
          {historyOrders.map((order) => (
            <div key={order._id} style={{
              border: `1px solid ${t.border}`, borderRadius: 10, padding: "8px 10px",
              display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: t.textMuted }}>{formatDate(order.createdAt)}</span>
                  <RestockStatusBadge status={order.status || "Pending"} t={t} />
                </div>
                <p style={{ fontSize: 11, color: t.textPrimary, margin: "4px 0 0" }}>
                  {(order.items || []).map((it) => `${it.name}${it.qty ? ` (${it.qty})` : ""}`).join(", ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onReorder(order)}
                style={{
                  flexShrink: 0, fontSize: 10, fontWeight: 700, color: t.accent,
                  background: `${t.accent}12`, border: `1px solid ${t.accent}30`,
                  borderRadius: 7, padding: "6px 10px", cursor: "pointer", whiteSpace: "nowrap",
                }}
              >Reorder this</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── RESTOCK ALERT MODAL — builds a WhatsApp message and hands off to
// wa.me, AND saves a restock order on the backend (status "Pending") so
// it shows up in the "Pending Restocks" list and can be marked Complete
// later — that's what actually pushes the items into inventory as stock.
// No API, no cost for the WhatsApp part: it just opens WhatsApp with the
// text already typed in, and the shopkeeper taps Send themselves.
function RestockAlertModal({ supplier, suppliers = [], products = [], allOrders = [], onClose, onToast, onOrderSaved, t }) {
  const api = useApi();
  const [pickedSupplierId, setPickedSupplierId] = useState("");
  const [supplierQuery, setSupplierQuery] = useState("");
  const [name, setName] = useState(supplier?.name || "");
  const [phone, setPhone] = useState(supplier?.phone || "");
  const [items, setItems] = useState([{ id: "0", name: "", qty: "" }]);
  const [message, setMessage] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);

  // ad-hoc mode mein jo supplier dropdown se pick hua
  const pickedSupplier = suppliers.find((s) => s._id === pickedSupplierId) || null;
  // saving ke liye effective supplier — drawer se aaya ho ya dropdown se pick kiya ho
  const effectiveSupplier = supplier || pickedSupplier;

  const handlePickSupplier = (sup) => {
    setPickedSupplierId(sup._id);
    setSupplierQuery(sup.name);
    setName(sup.name);
    setPhone(sup.phone || "");
  };

  // matching suppliers as the shopkeeper types — real autocomplete instead
  // of scrolling one long dropdown
  const matchingSuppliers = !supplier && supplierQuery.trim() && !pickedSupplier
    ? suppliers.filter((s) => s.name.toLowerCase().includes(supplierQuery.trim().toLowerCase())).slice(0, 6)
    : [];

  // is supplier ke products ke naam — item input mein suggest karne ke liye.
  // Ad-hoc / no supplier chuna ho toh saare products suggest karo.
  const supplierProductNames = [...new Set(
    products
      .filter((p) => !effectiveSupplier || (p.supplier || "").toLowerCase() === effectiveSupplier.name.toLowerCase())
      .map((p) => p.name)
      .filter(Boolean)
  )];

  // is supplier ke purane restock orders — reorder ke liye
  const historyOrders = effectiveSupplier
    ? allOrders
        .filter((o) => (o.supplier === effectiveSupplier._id) || ((o.supplierName || "").toLowerCase() === effectiveSupplier.name.toLowerCase()))
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    : [];

  const handleReorder = (order) => {
    const cloned = (order.items || []).map((it, i) => ({ id: `${Date.now()}-${i}`, name: it.name || "", qty: it.qty || "" }));
    setItems(cloned.length ? [...cloned, { id: `${Date.now()}-new`, name: "", qty: "" }] : [{ id: "0", name: "", qty: "" }]);
    setMessage("");
    onToast?.("✅ Purana order load ho gaya — check karke bhej dijiye");
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", background: `${t.accent}08`,
    border: `1px solid ${t.border}`, borderRadius: 10, padding: "9px 12px",
    fontSize: 13, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", outline: "none",
    "--focus-ring": `${t.accent}33`,
  };
  const labelStyle = { fontSize: 11, color: t.textMuted, display: "block", marginBottom: 4 };

  // Updating an item's name auto-appends a fresh empty row once the LAST
  // row starts getting filled in — so the shopkeeper doesn't have to keep
  // tapping "Add Item" for every single product.
  const updateItem = (id, field, value) => {
    setItems((rows) => {
      const updated = rows.map((r) => (r.id === id ? { ...r, [field]: value } : r));
      const idx = updated.findIndex((r) => r.id === id);
      const isLastRow = idx === updated.length - 1;
      if (field === "name" && isLastRow && value.trim() !== "") {
        updated.push({ id: `${Date.now()}`, name: "", qty: "" });
      }
      return updated;
    });
  };
  const addItem = () => {
    setItems((rows) => [...rows, { id: String(Date.now()), name: "", qty: "" }]);
  };
  const removeItem = (id) => {
    setItems((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));
  };

  const handleGenerate = () => {
    setErr("");
    if (!items.some((it) => it.name.trim())) return setErr("Kam se kam ek item ka naam daaliye");
    setMessage(buildRestockMessage(name, items));
  };

  const handleSend = async () => {
    setErr("");
    const digits = toWhatsAppDigits(phone);
    if (!digits) return setErr("Valid WhatsApp number daaliye (10 digit ya +91 ke saath)");
    const finalMessage = message || buildRestockMessage(name, items);
    if (!finalMessage.trim()) return setErr("Message khaali hai — items daal ke pehle Generate kariye");

    const cleanItems = items
      .filter((it) => it.name.trim())
      .map((it) => ({ name: it.name.trim(), qty: it.qty }));

    setSending(true);
    try {
      await api("/restock-orders", {
        method: "POST",
        body: JSON.stringify({
          supplier: effectiveSupplier?._id || null,
          supplierName: name || effectiveSupplier?.name || "",
          phone,
          items: cleanItems,
        }),
      });
      onOrderSaved?.();
    } catch (e) {
      onToast?.("⚠️ WhatsApp bhej rahe hain, par restock order save nahi hua — Pending Restocks mein manually check kar lena.");
    }
    setSending(false);

    const url = `https://wa.me/${digits}?text=${encodeURIComponent(finalMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onToast?.("✅ WhatsApp khul gaya — bas Send dabaiye!");
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1150, padding: 16,
      overflowY: "auto",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16,
        padding: 24, width: "100%", maxWidth: 460, display: "flex", flexDirection: "column",
        gap: 14, maxHeight: "90vh", overflowY: "auto",
        animation: "modalIn 0.2s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: t.green, display: "flex" }}><Icon id="whatsapp" size={18} /></span>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 19, color: t.textPrimary, margin: 0 }}>
              Send Restock Alert
            </h3>
          </div>
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

        {/* 👇 sirf ad-hoc mode mein (jab drawer se supplier fixed nahi hai) —
            ab yeh ek search box hai, type karte hi matching suppliers dikhte hain */}
        {!supplier && suppliers.length > 0 && (
          <div style={{ position: "relative" }}>
            <label style={labelStyle}>Search Existing Supplier (optional)</label>
            <input
              className="ui-input"
              style={inputStyle}
              value={pickedSupplier ? pickedSupplier.name : supplierQuery}
              onChange={(e) => { setSupplierQuery(e.target.value); setPickedSupplierId(""); }}
              placeholder="Naam type karke suggestions dekhein…"
            />
            {pickedSupplier && (
              <button
                type="button"
                onClick={() => { setPickedSupplierId(""); setSupplierQuery(""); setName(""); setPhone(""); }}
                style={{
                  position: "absolute", right: 8, top: 28, background: "none", border: "none",
                  color: t.textMuted, cursor: "pointer", fontSize: 11,
                }}
              >clear</button>
            )}
            {matchingSuppliers.length > 0 && (
              <div style={{
                position: "absolute", zIndex: 10, top: "100%", left: 0, right: 0, marginTop: 4,
                background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10,
                boxShadow: "0 8px 20px rgba(0,0,0,0.12)", overflow: "hidden",
              }}>
                {matchingSuppliers.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => handlePickSupplier(s)}
                    style={{
                      display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                      background: "transparent", border: "none", cursor: "pointer",
                      fontSize: 12, color: t.textPrimary,
                    }}
                  >
                    {s.name}{s.phone ? ` · ${s.phone}` : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Supplier Name</label>
            <input
              className="ui-input" style={inputStyle} value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. TechSource India"
              disabled={!!supplier || !!pickedSupplier}
            />
          </div>
          <div>
            <label style={labelStyle}>WhatsApp Number *</label>
            <input
              className="ui-input" style={inputStyle} value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit or +91…"
              disabled={!!pickedSupplier && !!pickedSupplier.phone}
            />
          </div>
        </div>
        {!supplier && !pickedSupplier && (
          <p style={{ fontSize: 11, color: t.textMuted, margin: 0 }}>
            Upar search se supplier chunn, ya neeche manually naya number daal.
          </p>
        )}

        {/* Previous restocks for this supplier — reorder in one click */}
        <RestockHistory historyOrders={historyOrders} onReorder={handleReorder} t={t} />

        {/* Items list */}
        <div>
          <label style={labelStyle}>Restock Items</label>
          {supplierProductNames.length > 0 && (
            <p style={{ fontSize: 10, color: t.textMuted, margin: "0 0 6px" }}>
              Suggestions: {supplierProductNames.slice(0, 6).join(", ")}{supplierProductNames.length > 6 ? "…" : ""}
            </p>
          )}
          <datalist id="restock-item-suggestions">
            {supplierProductNames.map((n) => <option key={n} value={n} />)}
          </datalist>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((it) => (
              <div key={it.id} style={{ display: "flex", gap: 6 }}>
                <input
                  className="ui-input" style={{ ...inputStyle, flex: 3 }}
                  value={it.name} onChange={(e) => updateItem(it.id, "name", e.target.value)}
                  placeholder="Product name"
                  list="restock-item-suggestions"
                />
                <input
                  className="ui-input" style={{ ...inputStyle, flex: 1 }}
                  value={it.qty} onChange={(e) => updateItem(it.id, "qty", e.target.value)}
                  placeholder="Qty"
                />
                <button
                  onClick={() => removeItem(it.id)}
                  aria-label="Remove item"
                  style={{
                    width: 34, height: 34, flexShrink: 0, borderRadius: 8,
                    background: `${t.red}12`, border: `1px solid ${t.red}30`,
                    color: t.red, cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center",
                  }}
                ><Icon id="close" size={12} /></button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            style={{
              marginTop: 8, display: "flex", alignItems: "center", gap: 4,
              fontSize: "11px", fontWeight: 700, color: t.accent,
              background: `${t.accent}12`, border: `1px solid ${t.accent}30`,
              borderRadius: 8, padding: "6px 10px", cursor: "pointer",
            }}
          ><Icon id="plus" size={11} /> Add Item</button>
        </div>

        <p style={{ fontSize: 11, color: t.textMuted, margin: 0 }}>
          Ye items "Pending Restocks" list mein bhi dikhenge — jab supplier maal de de, "Mark Complete" dabana, stock apne aap Inventory mein add ho jaayega. Agar 2 din mein maal nahi aaya, hum yaad dilaenge.
        </p>

        <button
          type="button"
          onClick={handleGenerate}
          style={{
            fontSize: 12, fontWeight: 700, color: t.textPrimary,
            background: `${t.accent}10`, border: `1px solid ${t.border}`,
            borderRadius: 10, padding: "9px 12px", cursor: "pointer",
          }}
        >Generate Message</button>

        <div>
          <label style={labelStyle}>Message Preview (editable)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Generate Message dabaiye, ya seedha yahin type kariye…"
            rows={7}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
          <button onClick={onClose} style={{
            background: "transparent", color: t.textMuted, border: `1px solid ${t.border}`,
            borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleSend} disabled={sending} style={{
            background: t.green, color: "#fff", border: "none", borderRadius: 10,
            padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer",
            opacity: sending ? 0.7 : 1,
            display: "flex", alignItems: "center", gap: 6,
          }}><Icon id="whatsapp" size={14} /> {sending ? "Saving..." : "Open WhatsApp & Send"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── PENDING RESTOCKS — global list of restock orders sent via WhatsApp
// (supplier-linked or ad-hoc). "Mark Complete" is the actual trigger that
// adds the ordered quantities into Inventory as real stock, matching by
// product name (case-insensitive) or creating a new product if no match.
function PendingRestocksCard({ orders, loading, error, onComplete, t }) {
  const [completingId, setCompletingId] = useState(null);
  const pending = orders.filter((o) => o.status !== "Completed");

  const handleComplete = async (order) => {
    setCompletingId(order._id);
    await onComplete(order);
    setCompletingId(null);
  };

  if (!loading && pending.length === 0) return null;

  return (
    <div className="ui-card" style={{
      borderRadius: "16px", background: t.bgCard, border: `1px solid ${t.border}`, padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: t.orange, display: "flex" }}><Icon id="box" size={16} /></span>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, color: t.textPrimary, margin: 0 }}>
          Pending Restocks
        </h3>
        {!loading && <span style={{ fontSize: 11, color: t.textMuted }}>({pending.length})</span>}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} height={54} radius={10} t={t} />)}
        </div>
      ) : error ? (
        <p style={{ fontSize: 12, color: t.textMuted, margin: 0 }}>{error}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pending.map((order) => (
            <div key={order._id} style={{
              border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 12px",
              display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap",
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, margin: 0 }}>
                    {order.supplierName || "Ad-hoc supplier"}
                  </p>
                  <RestockStatusBadge status={order.status || "Pending"} t={t} />
                </div>
                <p style={{ fontSize: 11, color: t.textMuted, margin: "4px 0 0" }}>
                  {(order.items || []).map((it) => `${it.name}${it.qty ? ` (${it.qty})` : ""}`).join(", ")}
                </p>
                <p style={{ fontSize: 10, color: t.textMuted, margin: "2px 0 0" }}>
                  {formatDate(order.createdAt)}
                  {order.expectedDate ? ` · Expected ${formatDate(order.expectedDate)}` : ""}
                </p>
              </div>
              <button
                onClick={() => handleComplete(order)}
                disabled={completingId === order._id}
                style={{
                  display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                  fontSize: 11, fontWeight: 700, color: "#fff",
                  background: t.green, border: "none", borderRadius: 8,
                  padding: "7px 12px", cursor: completingId === order._id ? "not-allowed" : "pointer",
                  opacity: completingId === order._id ? 0.6 : 1,
                }}
              ><Icon id="check" size={12} /> {completingId === order._id ? "Adding..." : "Mark Complete"}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── RESTOCK CHECK-IN POPUP — asks "maal aaya kya?" for orders that have
// been Pending for 2+ days. Yes -> marks Complete (pushes stock into
// Inventory, same as the button in PendingRestocksCard). No -> asks for a
// new expected date and saves it so the order shows up with that ETA and
// gets asked again after that date passes.
function useDueCheckins(orders) {
  const STORAGE_KEY = "restock_checkin_lastAsked_v1";
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    let lastAsked = {};
    try { lastAsked = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { /* ignore */ }

    const now = Date.now();
    const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;

    const due = orders.filter((o) => {
      if (!o._id || o.status === "Completed") return false;
      const anchor = o.expectedDate ? new Date(o.expectedDate).getTime() : (o.createdAt ? new Date(o.createdAt).getTime() : null);
      if (!anchor) return false;
      if (now - anchor < 0) return false; // expected date is still in the future
      if (!o.expectedDate && now - anchor < TWO_DAYS) return false; // no ETA given yet — wait 2 days from order date
      const last = lastAsked[o._id] || 0;
      if (now - last < TWO_DAYS) return false; // already asked recently, don't nag
      return true;
    });

    setQueue(due.map((o) => o._id));
  }, [orders]);

  const markAsked = (id) => {
    let lastAsked = {};
    try { lastAsked = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { /* ignore */ }
    lastAsked[id] = Date.now();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lastAsked)); } catch { /* ignore */ }
    setQueue((q) => q.filter((qid) => qid !== id));
  };

  return { queue, markAsked };
}

function RestockCheckinModal({ order, onYes, onNo, onDismiss, t }) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expectedDate, setExpectedDate] = useState("");
  const [saving, setSaving] = useState(false);

  const itemsText = (order.items || []).map((it) => `${it.name}${it.qty ? ` (${it.qty})` : ""}`).join(", ");

  const handleNoSubmit = async () => {
    setSaving(true);
    await onNo(order, expectedDate || null);
    setSaving(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1300, padding: 16,
    }}>
      <div style={{
        background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16,
        padding: 22, width: "100%", maxWidth: 380, display: "flex", flexDirection: "column",
        gap: 12, animation: "modalIn 0.2s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: t.orange, display: "flex" }}><Icon id="box" size={18} /></span>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 17, color: t.textPrimary, margin: 0 }}>
            Restock Check-in
          </h3>
        </div>
        <p style={{ fontSize: 13, color: t.textPrimary, margin: 0 }}>
          <strong>{order.supplierName || "Supplier"}</strong> se bheja gaya restock —
        </p>
        <p style={{ fontSize: 12, color: t.textMuted, margin: 0 }}>{itemsText}</p>
        <p style={{ fontSize: 13, color: t.textPrimary, margin: "4px 0 0", fontWeight: 600 }}>Kya maal aa gaya?</p>

        {!showDatePicker ? (
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button
              onClick={() => setShowDatePicker(true)}
              style={{
                flex: 1, background: "transparent", color: t.textMuted, border: `1px solid ${t.border}`,
                borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >Nahi, abhi tak nahi</button>
            <button
              onClick={() => onYes(order)}
              style={{
                flex: 1, background: t.green, color: "#fff", border: "none",
                borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >✓ Haan, aagya</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: t.textMuted, display: "block", marginBottom: 4 }}>
                Kab tak aane ki umeed hai?
              </label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box", background: `${t.accent}08`,
                  border: `1px solid ${t.border}`, borderRadius: 10, padding: "9px 12px",
                  fontSize: 13, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", outline: "none",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowDatePicker(false)}
                style={{
                  flex: 1, background: "transparent", color: t.textMuted, border: `1px solid ${t.border}`,
                  borderRadius: 10, padding: "9px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >Back</button>
              <button
                onClick={handleNoSubmit}
                disabled={saving}
                style={{
                  flex: 1, background: t.accent, color: "#fff", border: "none",
                  borderRadius: 10, padding: "9px 12px", fontSize: 13, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
                }}
              >{saving ? "Saving..." : "Save & remind later"}</button>
            </div>
          </div>
        )}

        <button
          onClick={() => onDismiss(order)}
          style={{
            background: "none", border: "none", color: t.textMuted, fontSize: 11,
            cursor: "pointer", textAlign: "center", marginTop: 4, textDecoration: "underline",
          }}
        >Baad mein poochna</button>
      </div>
    </div>
  );
}

// ─── ADD / EDIT SUPPLIER MODAL ─────────────────────────────────────────────
function SupplierFormModal({ initial, onClose, onSaved, onToast, existingCategories, t }) {
  const isEdit = !!initial;
  const api = useApi();
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
      await api(isEdit ? `/suppliers/${initial._id}` : "/suppliers", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      onSaved?.();
      onToast?.(isEdit ? "✅ Supplier updated!" : "✅ Supplier added!");
      onClose();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
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
            <select className="ui-input" style={{ ...inputStyle, cursor: "pointer", colorScheme: "light dark" }} value={status} onChange={(e) => setStatus(e.target.value)}>
              {FORM_STATUSES.map((s) => (
                <option key={s} value={s} style={{ background: t.bgCard, color: t.textPrimary }}>{s}</option>
              ))}
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
            <select className="ui-input" style={{ ...inputStyle, cursor: "pointer", colorScheme: "light dark" }} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
              {PAYMENT_TERMS_OPTIONS.map((p) => (
                <option key={p} value={p} style={{ background: t.bgCard, color: t.textPrimary }}>{p}</option>
              ))}
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

{/* // ─── ADD PURCHASE MODAL — record a new purchase from this supplier ─────── */ }
function AddPurchaseModal({ supplier, onClose, onSaved, onToast, t }) {
  const api = useApi();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const inputStyle = {
    width: "100%", boxSizing: "border-box", background: `${t.accent}08`,
    border: `1px solid ${t.border}`, borderRadius: 10, padding: "9px 12px",
    fontSize: 13, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", outline: "none",
    "--focus-ring": `${t.accent}33`,
  };
  const labelStyle = { fontSize: 11, color: t.textMuted, display: "block", marginBottom: 4 };
  const pendingNow = Math.max(0, Number(amount || 0) - Number(paidAmount || 0));

  // Quick action: mark the whole purchase as paid on the same day
  const markFullyPaid = () => {
    setPaidAmount(amount || "0");
    setDueDate("");
  };

  const handleSave = async () => {
    setErr("");
    const amt = Number(amount);
    const paid = Number(paidAmount) || 0;
    if (!amt || amt <= 0) return setErr("Purchase amount is required");
    if (paid > amt) return setErr("Paid amount can't be more than the total purchase amount");

    setSaving(true);
    try {
      await api("/supplier-purchases", {
        method: "POST",
        body: JSON.stringify({
          supplier: supplier._id, description, amount: amt, paidAmount: paid, date,
          dueDate: paid < amt ? (dueDate || null) : null,
        }),
      });
      onSaved?.();
      onToast?.("✅ Purchase entry added to the ledger!");
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
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 16,
      overflowY: "auto",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16,
        padding: 24, width: "100%", maxWidth: 420, display: "flex", flexDirection: "column",
        gap: 14, maxHeight: "90vh", overflowY: "auto",
        animation: "modalIn 0.2s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 19, color: t.textPrimary, margin: 0 }}>
              Add Purchase
            </h3>
            <p style={{ fontSize: 12, color: t.textMuted, margin: "2px 0 0" }}>from {supplier.name}</p>
          </div>
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
          <label style={labelStyle}>What did you buy?</label>
          <input className="ui-input" style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. 24 gold chains, 5g each" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Total Amount (₹) *</label>
            <input type="number" min="0" className="ui-input" style={inputStyle} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" />
          </div>
          <div>
            <label style={labelStyle}>Paid Now (₹)</label>
            <input type="number" min="0" className="ui-input" style={inputStyle} value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="0" />
          </div>
        </div>

        <button
          type="button"
          onClick={markFullyPaid}
          disabled={!amount}
          style={{
            alignSelf: "flex-start", fontSize: 11, fontWeight: 700, color: t.green,
            background: t.greenBg, border: `1px solid ${t.green}40`, borderRadius: 8,
            padding: "6px 10px", cursor: amount ? "pointer" : "not-allowed", opacity: amount ? 1 : 0.5,
          }}
        >✓ Paid in full, same day</button>

        <div>
          <label style={labelStyle}>Date</label>
          <input type="date" className="ui-input" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {pendingNow > 0 && (
          <div>
            <label style={labelStyle}>Expected payoff date (optional)</label>
            <input type="date" className="ui-input" style={inputStyle} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        )}

        {amount && (
          <p style={{ fontSize: 12, color: t.textMuted, margin: 0 }}>
            Pending after this entry: <strong style={{ color: pendingNow > 0 ? t.red : t.green }}>{inr(pendingNow)}</strong>
          </p>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
          <button onClick={onClose} style={{
            background: "transparent", color: t.textMuted, border: `1px solid ${t.border}`,
            borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            background: t.accent, color: "#fff", border: "none", borderRadius: 10,
            padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}>{saving ? "Saving..." : "Add to Ledger"}</button>
        </div>
      </div>
    </div>
  );
}

{/* // ─── EDIT PURCHASE MODAL — correct a previously logged entry ───────────── */ }
function EditPurchaseModal({ purchase, onClose, onSaved, onToast, t }) {
  const api = useApi();
  const [description, setDescription] = useState(purchase.description || "");
  const [amount, setAmount] = useState(purchase.amount);
  const [paidAmount, setPaidAmount] = useState(purchase.paidAmount);
  const [dueDate, setDueDate] = useState(purchase.dueDate ? String(purchase.dueDate).slice(0, 10) : "");
  const [date, setDate] = useState(purchase.date ? String(purchase.date).slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const inputStyle = {
    width: "100%", boxSizing: "border-box", background: `${t.accent}08`,
    border: `1px solid ${t.border}`, borderRadius: 10, padding: "9px 12px",
    fontSize: 13, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", outline: "none",
  };
  const labelStyle = { fontSize: 11, color: t.textMuted, display: "block", marginBottom: 4 };
  const pendingNow = Math.max(0, Number(amount || 0) - Number(paidAmount || 0));

  const handleSave = async () => {
    setErr("");
    const amt = Number(amount);
    const paid = Number(paidAmount) || 0;
    if (!amt || amt <= 0) return setErr("Amount is required");
    if (paid > amt) return setErr("Paid amount can't exceed the total amount");

    setSaving(true);
    try {
      await api(`/supplier-purchases/${purchase._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          amount: amt,
          paidAmount: paid,
          date,
          dueDate: paid < amt ? (dueDate || null) : null,
        }),
      });
      onSaved?.();
      onToast?.("✅ Entry updated!");
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
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1150, padding: 16,
      overflowY: "auto",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16,
        padding: 24, width: "100%", maxWidth: 420, display: "flex", flexDirection: "column",
        gap: 14, maxHeight: "90vh", overflowY: "auto",
        animation: "modalIn 0.2s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 19, color: t.textPrimary, margin: 0 }}>
            Edit Purchase
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
          <label style={labelStyle}>Description</label>
          <input className="ui-input" style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Total Amount (₹)</label>
            <input type="number" min="0" className="ui-input" style={inputStyle} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Paid (₹)</label>
            <input type="number" min="0" className="ui-input" style={inputStyle} value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Date</label>
          <input type="date" className="ui-input" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {pendingNow > 0 && (
          <div>
            <label style={labelStyle}>Expected payoff date</label>
            <input type="date" className="ui-input" style={inputStyle} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        )}

        <p style={{ fontSize: 12, color: t.textMuted, margin: 0 }}>
          Pending after save: <strong style={{ color: pendingNow > 0 ? t.red : t.green }}>{inr(pendingNow)}</strong>
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
          }}>{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

{/* // ─── RECORD PAYMENT MODAL — pay down a pending balance ──────────────────── */ }
function RecordPaymentModal({ purchase, onClose, onSaved, onToast, t }) {
  const api = useApi();
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const inputStyle = {
    width: "100%", boxSizing: "border-box", background: `${t.accent}08`,
    border: `1px solid ${t.border}`, borderRadius: 10, padding: "9px 12px",
    fontSize: 13, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", outline: "none",
  };

  const handleSave = async () => {
    setErr("");
    const amt = Number(amount);
    if (!amt || amt <= 0) return setErr("Enter a valid payment amount");
    if (amt > purchase.pendingAmount) return setErr(`Can't pay more than the pending amount (${inr(purchase.pendingAmount)})`);

    setSaving(true);
    try {
      await api(`/supplier-purchases/${purchase._id}/pay`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt }),
      });
      onSaved?.();
      onToast?.("✅ Payment recorded!");
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
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 16,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16,
        padding: 24, width: "100%", maxWidth: 380, display: "flex", flexDirection: "column",
        gap: 14, animation: "modalIn 0.2s ease",
      }}>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 18, color: t.textPrimary, margin: 0 }}>
          Record Payment
        </h3>
        <p style={{ fontSize: 12, color: t.textMuted, margin: 0 }}>
          Pending on this entry: <strong style={{ color: t.red }}>{inr(purchase.pendingAmount)}</strong>
        </p>

        {err && <p style={{ fontSize: 12, color: t.red, margin: 0 }}>{err}</p>}

        <input
          type="number" min="0" max={purchase.pendingAmount}
          className="ui-input" style={inputStyle}
          value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder={`Up to ${purchase.pendingAmount}`}
          autoFocus
        />

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: "transparent", color: t.textMuted, border: `1px solid ${t.border}`,
            borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            background: t.accent, color: "#fff", border: "none", borderRadius: 10,
            padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}>{saving ? "Saving..." : "Record Payment"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── KHATA SECTION — the purchase ledger, lives inside the Supplier Drawer
function KhataSection({ supplier, onToast, t }) {
  const { loading, error, purchases, refresh } = useSupplierPurchases(supplier._id);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const totalPurchased = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaid = purchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalPending = purchases.reduce((sum, p) => sum + (p.pendingAmount || 0), 0);

  return (
    <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
      {showAddPurchase && (
        <AddPurchaseModal
          supplier={supplier}
          onClose={() => setShowAddPurchase(false)}
          onSaved={refresh}
          onToast={onToast}
          t={t}
        />
      )}
      {editTarget && (
        <EditPurchaseModal
          purchase={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={refresh}
          onToast={onToast}
          t={t}
        />
      )}
      {payTarget && (
        <RecordPaymentModal
          purchase={payTarget}
          onClose={() => setPayTarget(null)}
          onSaved={refresh}
          onToast={onToast}
          t={t}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{
          fontSize: "11px", fontWeight: 600, color: t.textMuted,
          textTransform: "uppercase", letterSpacing: "0.08em",
          margin: 0, fontFamily: "'DM Sans', sans-serif",
        }}>Purchase Ledger</p>
        <button
          onClick={() => setShowAddPurchase(true)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: "11px", fontWeight: 700, color: t.accent,
            background: `${t.accent}12`, border: `1px solid ${t.accent}30`,
            borderRadius: 8, padding: "6px 10px", cursor: "pointer",
          }}
        ><Icon id="plus" size={11} /> Add Purchase</button>
      </div>

      {/* Ledger KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        <div style={{ background: `${t.accent}08`, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 12px" }}>
          <p style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: t.textMuted, margin: 0 }}>Purchased</p>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, color: t.textPrimary, margin: "3px 0 0" }}>{inr(totalPurchased)}</p>
        </div>
        <div style={{ background: t.greenBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 12px" }}>
          <p style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: t.textMuted, margin: 0 }}>Paid</p>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, color: t.green, margin: "3px 0 0" }}>{inr(totalPaid)}</p>
        </div>
        <div style={{ background: totalPending > 0 ? t.redBg : t.greenBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 12px" }}>
          <p style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: t.textMuted, margin: 0 }}>Pending</p>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, color: totalPending > 0 ? t.red : t.green, margin: "3px 0 0" }}>{inr(totalPending)}</p>
        </div>
      </div>

      {/* Purchase history list */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} height={52} radius={10} t={t} />)}
        </div>
      ) : error ? (
        <p style={{ fontSize: 12, color: t.textMuted, margin: 0 }}>{error}</p>
      ) : purchases.length === 0 ? (
        <p style={{ fontSize: 12, color: t.textMuted, margin: 0, textAlign: "center", padding: "12px 0" }}>
          No purchases recorded yet. Add the first one above.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
          {purchases.map((p) => (
            <div key={p._id} style={{
              border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 12px",
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary, margin: 0, wordBreak: "break-word" }}>
                    {p.description || "Purchase entry"}
                  </p>
                  <p style={{ fontSize: 10, color: t.textMuted, margin: "2px 0 0" }}>{formatDate(p.date)} · {p.purchaseId}</p>
                </div>
                <PurchaseStatusBadge status={p.status} t={t} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: t.textMuted }}>
                    <span>Total: <strong style={{ color: t.textPrimary }}>{inr(p.amount)}</strong></span>
                    <span>Paid: <strong style={{ color: t.green }}>{inr(p.paidAmount)}</strong></span>
                    {p.pendingAmount > 0 && <span>Due: <strong style={{ color: t.red }}>{inr(p.pendingAmount)}</strong></span>}
                  </div>
                  {p.pendingAmount > 0 && p.dueDate && (
                    <span style={{ fontSize: 10, color: t.orange }}>Due by {formatDate(p.dueDate)}</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => setEditTarget(p)}
                    style={{
                      fontSize: 10, fontWeight: 700, color: t.textMuted, background: `${t.accent}12`,
                      border: `1px solid ${t.border}`, borderRadius: 7, padding: "5px 10px", cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >Edit</button>
                  {p.pendingAmount > 0 && (
                    <button
                      onClick={() => setPayTarget(p)}
                      style={{
                        fontSize: 10, fontWeight: 700, color: "#fff", background: t.accent,
                        border: "none", borderRadius: 7, padding: "5px 10px", cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >Pay</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

{/* // ─── SUPPLIER DETAIL DRAWER ─────────────────────────────────────────────────── */ }
function SupplierDrawer({ supplier, products = [], allOrders = [], onClose, onEdit, onDeleted, onToast, onRestockOrderSaved, t }) {
    const api = useApi();
    const [deleting, setDeleting] = useState(false);
    const [showRestock, setShowRestock] = useState(false);
    if (!supplier) return null;

    const handleDelete = async () => {
      if (!window.confirm(`Delete ${supplier.name}? This cannot be undone.`)) return;
      setDeleting(true);
      try {
        await api(`/suppliers/${supplier._id}`, { method: "DELETE" });
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
                {showRestock && (
                  <RestockAlertModal
                    supplier={supplier}
                    products={products}
                    allOrders={allOrders}
                    onClose={() => setShowRestock(false)}
                    onToast={onToast}
                    onOrderSaved={onRestockOrderSaved}
                    t={t}
                  />
                )}

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

                {/* Restock action — pinned near the top since it's the most
                    frequent thing an owner will do from this drawer */}
                <button
                    onClick={() => setShowRestock(true)}
                    disabled={!supplier.phone}
                    title={!supplier.phone ? "Is supplier ka phone number nahi hai — Edit se add karein" : undefined}
                    style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        padding: "12px 10px", borderRadius: "10px",
                        background: supplier.phone ? t.green : `${t.border}`,
                        color: supplier.phone ? "#fff" : t.textMuted,
                        border: "none",
                        fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "13px",
                        cursor: supplier.phone ? "pointer" : "not-allowed",
                        touchAction: "manipulation",
                    }}>
                    <Icon id="whatsapp" size={15} /> Send Restock Alert on WhatsApp
                </button>

                {/* Stats row — investment + pending now lead here, ahead of raw stock value */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {[
                        ["Total Invested", inr(supplier.totalPurchased)],
                        ["Pending", inr(supplier.totalPending)],
                        ["Linked Products", supplier.linkedProductCount],
                        ["Last Product Update", formatDate(supplier.lastOrder)],
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

                {/* Purchase ledger */}
                <KhataSection supplier={supplier} onToast={onToast} t={t} />

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
        {supplier.totalPending > 0 && (
          <span style={{
            display: "flex", alignItems: "center", gap: 3, fontSize: "10px", fontWeight: 700,
            color: t.red, background: t.redBg, borderRadius: 99, padding: "3px 8px",
          }}>
            Due {inr(supplier.totalPending)}
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
            {inr(supplier.totalPurchased)}
          </p>
          <p style={{ fontSize: "10px", color: t.textMuted, margin: "2px 0 0" }}>
            invested · {supplier.linkedProductCount} products
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
          {inr(supplier.totalPurchased)}
        </p>
        <p style={{ fontSize: "10px", color: t.textMuted, margin: "1px 0 0" }}>
          invested
        </p>
      </td>
      <td style={{ padding: "14px 8px" }}>
        {supplier.totalPending > 0 ? (
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px", color: t.red, margin: 0 }}>
            {inr(supplier.totalPending)}
          </p>
        ) : (
          <p style={{ fontSize: "11px", color: t.textMuted, margin: 0 }}>—</p>
        )}
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
      <td style={{ padding: "14px 8px" }}><Skeleton width={70} height={13} t={t} /></td>
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

{/* // ─── MAIN PAGE ──────────────────────────────────────────────────────────────── */}
export default function Suppliers() {
  const api = useApi(); 
  const { t } = useTheme();
 const { loading, error, suppliers, products, overallKhata, refresh } = useSuppliersData();
  const { loading: restockLoading, error: restockError, orders: restockOrders, refresh: refreshRestockOrders } = useRestockOrders();

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [toast, setToast] = useState("");
  const [showAdHocRestock, setShowAdHocRestock] = useState(false);

  const { queue: checkinQueue, markAsked } = useDueCheckins(restockOrders);
  const checkinOrder = checkinQueue.length ? restockOrders.find((o) => o._id === checkinQueue[0]) : null;

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
  const ratedSuppliers = suppliers.filter((s) => s.rating > 0);
  const avgRating = ratedSuppliers.length
    ? (ratedSuppliers.reduce((sum, s) => sum + s.rating, 0) / ratedSuppliers.length).toFixed(1)
    : "0.0";
  const totalInvested = overallKhata?.totalPurchased || 0;
  const totalPending = overallKhata?.totalPending || 0;

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

  // Marking a restock order "Complete" is what actually pushes the ordered
  // items into Inventory — the backend matches each item to an existing
  // product (by name) and bumps its stock, or creates a new product if
  // there's no match. After that we refresh both the restock list AND the
  // suppliers/products data so stats (linked products, stock, etc.) reflect
  // the new inventory immediately.
  const handleCompleteRestock = async (order) => {
  try {
    await api(`/restock-orders/${order._id}/complete`, { method: "PUT" });
    setToast("✅ Stock added to Inventory!");
    refreshRestockOrders();
    refresh();
  } catch (e) {
    setToast("❌ " + e.message);
  }
};

  // Check-in popup handlers
  const handleCheckinYes = async (order) => {
    markAsked(order._id);
    await handleCompleteRestock(order);
  };
  const handleCheckinNo = async (order, expectedDate) => {
    try {
      if (expectedDate) {
        await api(`/restock-orders/${order._id}`, {
          method: "PUT",
          body: JSON.stringify({ expectedDate }),
        });
        refreshRestockOrders();
        setToast("✅ Naya expected date save ho gaya, hum baad mein phir poochenge");
      } else {
        setToast("Theek hai, thodi der baad phir poochenge");
      }
    } catch (e) {
      setToast("⚠️ Date save nahi hua, par reminder chalta rahega");
    }
    markAsked(order._id);
  };
  const handleCheckinDismiss = (order) => {
    markAsked(order._id);
  };

 return (
    <>
        <style>{styles}</style>
        {checkinOrder && (
          <RestockCheckinModal
            order={checkinOrder}
            onYes={handleCheckinYes}
            onNo={handleCheckinNo}
            onDismiss={handleCheckinDismiss}
            t={t}
          />
        )}
        <SupplierDrawer
          supplier={selected}
          products={products}
          allOrders={restockOrders}
          onClose={() => setSelected(null)}
          onEdit={openEdit}
          onDeleted={refresh}
          onToast={setToast}
          onRestockOrderSaved={refreshRestockOrders}
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
        {showAdHocRestock && (
          <RestockAlertModal
            supplier={null}
            suppliers={suppliers}
            products={products}
            allOrders={restockOrders}
            onClose={() => setShowAdHocRestock(false)}
            onToast={setToast}
            onOrderSaved={refreshRestockOrders}
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
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => setShowAdHocRestock(true)}
              style={{
                padding: "10px 18px", borderRadius: "10px",
                background: t.green, color: "#fff", border: "none",
                fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "13px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                touchAction: "manipulation", whiteSpace: "nowrap",
              }}>
              <Icon id="whatsapp" size={14} /> Restock Alert
            </button>
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
        </div>

        {/* KPI Row */}
        <div className="sup-kpi-grid">
          <SummaryKpi label="Total Suppliers" value={suppliers.length} sub={`${activeCount} active`} trendDir="up" loading={loading} t={t} />
          <SummaryKpi label="Total Invested" value={inr(totalInvested)} sub="goods purchased so far" trendDir="up" loading={loading} t={t} />
          <SummaryKpi label="Pending Payments" value={inr(totalPending)} sub={totalPending > 0 ? "still owed to suppliers" : "all clear"} trendDir={totalPending > 0 ? "down" : "up"} loading={loading} t={t} />
          <SummaryKpi label="Avg. Rating" value={`${avgRating} ★`} sub="across rated suppliers" trendDir="neu" loading={loading} t={t} />
        </div>

        {/* Pending Restocks — the missing link: click Mark Complete here
                    and those exact items land in Inventory as stock */}
        <PendingRestocksCard
          orders={restockOrders}
          loading={restockLoading}
          error={restockError}
          onComplete={handleCompleteRestock}
          t={t}
        />

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
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "620px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                {["Supplier", "Category", "Contact", "Invested", "Pending", "Rating", "Status", ""].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: "left", paddingBottom: "12px",
                      fontSize: "10px", fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: "0.08em",
                      color: t.textMuted, fontFamily: "'DM Sans', sans-serif",
                      paddingRight: i < 7 ? "8px" : "0",
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
                  <td colSpan={8} style={{ padding: "48px 0", textAlign: "center" }}>
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