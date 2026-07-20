import { useState, useRef, useEffect } from "react";
import { useTheme } from "../components/ThemeContext";
import { useAuth } from "../context/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import logoAsset from "../assets/draft-bill-logo.png";

const BACKEND = "https://billing-backend-tawny.vercel.app";

const STATUSES = ["All", "Completed", "Pending", "Cancelled"];
const GST_RATE_OPTIONS = [0, 5, 12, 18, 28];

// ─── Brand config ───────────────────────────────────────────────────────
const BRAND = {
  name: "Draftbill",
  tagline: "Invoicing, made simple",
  accentRGB: [37, 99, 235],   // blue accent — change to match your brand
  darkRGB: [17, 24, 39],
  grayRGB: [107, 114, 128],
  lightBgRGB: [245, 247, 250],
};

// jsPDF's addImage() needs a base64 data string or a loaded Image element — it
// CANNOT load a plain file path like "./src/assets/logo.png". So we fetch the
// imported asset once, convert it to base64, and cache it for reuse.
let cachedLogoBase64 = null;
async function getLogoBase64() {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const res = await fetch(logoAsset);
    const blob = await res.blob();
    cachedLogoBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return cachedLogoBase64;
  } catch (e) {
    console.error("Could not load logo image:", e);
    return null;
  }
}

// ─── Icons (no external deps needed) ───────────────────────────────────
function EyeIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function DownloadIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────
function getOrderDate(o) {
  const raw = o.date || o.createdAt;
  const d = raw ? new Date(raw) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}

function formatDate(d) {
  return d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";
}

function inr(n) {
  return "₹" + (Number(n) || 0).toLocaleString("en-IN");
}

// Match an order to the invoice that created it
function findInvoiceForOrder(order, invoices) {
  if (!invoices || !invoices.length) return null;

  if (order.invoiceId) {
    const direct = invoices.find(
      (inv) => inv.invoiceId === order.invoiceId || inv._id === order.invoiceId
    );
    if (direct) return direct;
  }

  const orderDate = getOrderDate(order);
  const candidates = invoices.filter(
    (inv) =>
      (inv.customerName || "").toLowerCase() === (order.customer || "").toLowerCase() &&
      inv.items?.some((it) => (it.name || "").toLowerCase() === (order.product || "").toLowerCase())
  );
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0];

  return candidates.reduce((best, cur) => {
    const bd = Math.abs(new Date(best.createdAt).getTime() - (orderDate?.getTime() || 0));
    const cd = Math.abs(new Date(cur.createdAt).getTime() - (orderDate?.getTime() || 0));
    return cd < bd ? cur : best;
  });
}

// ─── PRODUCT MATCHING (handles "butter milk" vs "Buttermilk", typos etc.) ──
// Strips spaces/punctuation/case before comparing, so spoken/typed variants
// like "butter milk", "Butter-Milk", "BUTTERMILK" all resolve to the same
// catalog entry "Buttermilk".
function normalizeStr(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Simple Levenshtein edit distance — used as a fallback for genuine typos
// (not just spacing differences, which normalizeStr already handles).
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

// Returns the matching product object, or null if nothing close enough is found.
function findBestProductMatch(rawName, products) {
  if (!rawName || !products?.length) return null;
  const target = normalizeStr(rawName);
  if (!target) return null;

  // 1) exact match once spaces/punctuation/case are stripped
  const exact = products.find((p) => normalizeStr(p.name) === target);
  if (exact) return exact;

  // 2) fuzzy match — allow a small edit distance relative to name length,
  //    to catch minor mis-hearings/typos beyond just spacing
  let best = null;
  let bestDist = Infinity;
  for (const p of products) {
    const pName = normalizeStr(p.name);
    const dist = levenshtein(target, pName);
    const threshold = Math.max(1, Math.floor(Math.max(target.length, pName.length) * 0.25));
    if (dist <= threshold && dist < bestDist) {
      best = p;
      bestDist = dist;
    }
  }
  return best;
}

// ─── pricing math helper — used by both the modal preview and (as a
// display-only mirror of) the server-side calculation ──────────────────
function calcInvoiceTotals({ items, discountType, discountValue, gstRate }) {
  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0),
    0
  );

  const dType = discountType === "percentage" ? "percentage" : "flat";
  const dValue = Math.max(0, Number(discountValue) || 0);

  let discountAmount = 0;
  if (dType === "percentage") {
    discountAmount = subtotal * (Math.min(100, dValue) / 100);
  } else {
    discountAmount = Math.min(subtotal, dValue);
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const rate = Math.min(100, Math.max(0, Number(gstRate) || 0));
  const gstAmount = taxableAmount * (rate / 100);
  const grandTotal = taxableAmount + gstAmount;

  return { subtotal, discountAmount, taxableAmount, gstAmount, grandTotal, rate };
}

// ─── live orders hook ───────────────────────────────────────────────────
function useOrdersData(pollMs = 30000) {
  const [state, setState] = useState({ loading: true, error: null, orders: [] });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${BACKEND}/api/orders`);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        if (!cancelled) {
          setState({ loading: false, error: null, orders: Array.isArray(data) ? data : [] });
        }
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, error: "Live orders unavailable right now." }));
        }
      }
    }

    load();
    const interval = setInterval(load, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMs]);

  return state;
}

// ─── live invoices hook ─────────────────────────────────────────────────
function useInvoicesData(pollMs = 30000) {
  const [state, setState] = useState({ loading: true, error: null, invoices: [] });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${BACKEND}/api/invoices`);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        if (!cancelled) {
          setState({ loading: false, error: null, invoices: Array.isArray(data) ? data : [] });
        }
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, error: "Invoices unavailable right now." }));
        }
      }
    }

    load();
    const interval = setInterval(load, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMs]);

  return state;
}

// ─── SHARED: build & download a professional PDF invoice ──────────────
async function downloadInvoicePDF(invoice) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const date = new Date(invoice.createdAt || Date.now()).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

  const logoBase64 = await getLogoBase64();

  // ── Header band ──
  doc.setFillColor(...BRAND.darkRGB);
  doc.rect(0, 0, pageWidth, 38, "F");

  if (logoBase64) {
    doc.addImage(logoBase64, margin, 9, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(BRAND.name, margin + 26, 18);
  } else {
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.6);
    doc.roundedRect(margin, 9, 20, 20, 3, 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("DB", margin + 10, 21, { align: "center" });

    doc.setFontSize(16);
    doc.text(BRAND.name, margin + 26, 18);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200, 205, 215);
  doc.text(BRAND.tagline, margin + 26, 25);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("INVOICE", pageWidth - margin, 20, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200, 205, 215);
  doc.text(`#${invoice.invoiceId}`, pageWidth - margin, 27, { align: "right" });

  // ── Meta row: date + bill-to + GSTIN ──
  let y = 52;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.grayRGB);
  doc.text("BILLED TO", margin, y);
  doc.text("INVOICE DATE", pageWidth - margin, y, { align: "right" });

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.darkRGB);
  doc.text(invoice.customerName, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(date, pageWidth - margin, y, { align: "right" });

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.grayRGB);
  if (invoice.customerEmail) { doc.text(invoice.customerEmail, margin, y); y += 5; }
  if (invoice.customerPhone) { doc.text(invoice.customerPhone, margin, y); y += 5; }
  if (invoice.sellerGstin) { doc.text(`GSTIN: ${invoice.sellerGstin}`, pageWidth - margin, 52 + 6, { align: "right" }); }

  // ── Divider ──
  y += 4;
  doc.setDrawColor(230, 230, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  // ── Items table ──
  const tableRows = invoice.items.map((it) => [
    it.name,
    String(it.qty),
    `Rs. ${Number(it.price).toLocaleString("en-IN")}`,
    `Rs. ${(Number(it.qty) * Number(it.price)).toLocaleString("en-IN")}`,
  ]);

  autoTable(doc, {
    startY: y + 8,
    head: [["Item", "Qty", "Price", "Amount"]],
    body: tableRows,
    theme: "plain",
    styles: {
      fontSize: 10,
      cellPadding: { top: 6, bottom: 6, left: 4, right: 4 },
      textColor: BRAND.darkRGB,
    },
    headStyles: {
      fillColor: BRAND.darkRGB,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: BRAND.lightBgRGB },
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  // ── Totals box (subtotal → discount → GST → grand total) ──
  const hasDiscount = Number(invoice.discountAmount) > 0;
  const hasGst = Number(invoice.gstAmount) > 0;

  const rows = [{ label: "Subtotal", value: invoice.subtotal ?? invoice.total }];
  if (hasDiscount) {
    const dLabel = invoice.discountType === "percentage"
      ? `Discount (${invoice.discountValue}%)`
      : "Discount";
    rows.push({ label: dLabel, value: -invoice.discountAmount });
  }
  if (hasGst) {
    rows.push({ label: `GST (${invoice.gstRate}%)`, value: invoice.gstAmount });
  }

  const finalY = doc.lastAutoTable.finalY + 8;
  const boxW = 78;
  const boxX = pageWidth - margin - boxW;
  const rowH = 7;
  const boxH = rows.length * rowH + 16;

  doc.setFillColor(...BRAND.lightBgRGB);
  doc.roundedRect(boxX, finalY, boxW, boxH, 2, 2, "F");

  let ry = finalY + 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  rows.forEach((r) => {
    doc.setTextColor(...BRAND.grayRGB);
    doc.text(r.label, boxX + 6, ry);
    doc.setTextColor(...BRAND.darkRGB);
    const sign = r.value < 0 ? "-" : "";
    doc.text(`${sign}Rs. ${Math.abs(r.value).toLocaleString("en-IN")}`, boxX + boxW - 6, ry, { align: "right" });
    ry += rowH;
  });

  doc.setDrawColor(220, 220, 228);
  doc.line(boxX + 6, ry - 3, boxX + boxW - 6, ry - 3);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.grayRGB);
  doc.text("Grand Total", boxX + 6, ry + 4);
  doc.setFontSize(13);
  doc.setTextColor(...BRAND.accentRGB);
  doc.text(`Rs. ${Number(invoice.total).toLocaleString("en-IN")}`, boxX + boxW - 6, ry + 5, { align: "right" });

  // ── Footer ──
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(230, 230, 235);
  doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.grayRGB);
  doc.text("Thank you for your business!", margin, pageHeight - 13);
  doc.text(`Generated by ${BRAND.name}`, pageWidth - margin, pageHeight - 13, { align: "right" });

  doc.save(`${invoice.invoiceId}.pdf`);
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, trend, trendDir, sub }) {
  const { t } = useTheme();
  const colors = { up: t.green, down: t.red, neu: t.orange };
  const bgs = { up: t.greenBg, down: t.redBg, neu: t.orangeBg };
  return (
    <div style={{
      borderRadius: "16px", padding: "20px", display: "flex",
      flexDirection: "column", gap: "10px",
      background: t.bgCard, border: `1px solid ${t.border}`,
      transition: "background 0.25s ease, border-color 0.25s ease",
    }}>
      <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, fontFamily: "'DM Sans', sans-serif" }}>{label}</p>
      <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "26px", fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {trend && <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", color: colors[trendDir], background: bgs[trendDir] }}>{trend}</span>}
        {sub && <span style={{ fontSize: "11px", color: t.textMuted }}>{sub}</span>}
      </div>
    </div>
  );
}

// ─── SINGLE INVOICE VIEW MODAL ──────────────────────────────────────────────
function InvoiceViewModal({ invoice, onClose, t }) {
  const hasDiscount = Number(invoice.discountAmount) > 0;
  const hasGst = Number(invoice.gstAmount) > 0;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16,
        padding: 24, width: "100%", maxWidth: 480, display: "flex", flexDirection: "column",
        gap: 14, maxHeight: "85vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 18, color: t.textPrimary, margin: 0 }}>
            {invoice.invoiceId}
          </h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: t.textMuted, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        <div>
          <p style={{ fontWeight: 700, fontSize: 13, color: t.textPrimary, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
            {invoice.customerName}
          </p>
          {invoice.customerEmail && <p style={{ fontSize: 12, color: t.textMuted, margin: "2px 0 0" }}>{invoice.customerEmail}</p>}
          {invoice.customerPhone && <p style={{ fontSize: 12, color: t.textMuted, margin: "2px 0 0" }}>{invoice.customerPhone}</p>}
          {invoice.sellerGstin && <p style={{ fontSize: 11, color: t.textMuted, margin: "2px 0 0" }}>GSTIN: {invoice.sellerGstin}</p>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: `1px solid ${t.border}`, paddingTop: 10 }}>
          {invoice.items.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: t.textPrimary }}>
              <span>{it.name} × {it.qty}</span>
              <span>{inr(it.qty * it.price)}</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: t.textMuted }}>
            <span>Subtotal</span>
            <span>{inr(invoice.subtotal ?? invoice.total)}</span>
          </div>
          {hasDiscount && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: t.textMuted }}>
              <span>Discount {invoice.discountType === "percentage" ? `(${invoice.discountValue}%)` : ""}</span>
              <span>-{inr(invoice.discountAmount)}</span>
            </div>
          )}
          {hasGst && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: t.textMuted }}>
              <span>GST ({invoice.gstRate}%)</span>
              <span>{inr(invoice.gstAmount)}</span>
            </div>
          )}
        </div>

        <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: t.textMuted }}>
            {new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
          <span style={{ fontWeight: 900, fontFamily: "'Syne', sans-serif", fontSize: 16, color: t.textPrimary }}>
            {inr(invoice.total)}
          </span>
        </div>

        <button
          onClick={() => downloadInvoicePDF(invoice)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: t.accent, color: "#fff", border: "none", borderRadius: 10,
            padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        ><DownloadIcon size={14} /> Download PDF</button>
      </div>
    </div>
  );
}

// ─── CREATE INVOICE MODAL ──────────────────────────────────────────────────
function CreateInvoiceModal({ onClose, onSaved, t }) {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState([{ name: "", qty: 1, price: 0 }]);
  const [orderStatus, setOrderStatus] = useState("Completed");

  // ── Discount + GST state ──────────────────────────────────────────────
  const [discountType, setDiscountType] = useState("flat"); // "flat" | "percentage"
  const [discountValue, setDiscountValue] = useState(0);
  const [gstRate, setGstRate] = useState(0);
  const [sellerGstin, setSellerGstin] = useState("");

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [autoParseEnabled, setAutoParseEnabled] = useState(true);
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const micStreamRef = useRef(null);
  const autoParseTimerRef = useRef(null);
  const handleParseRef = useRef(null);

  useEffect(() => {
    fetch(`${BACKEND}/api/products`)
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));
  }, []);

  // Prefill GST rate + GSTIN from shop's tax settings (owner-configured default).
  // Shopkeeper can still override the rate per-invoice below.
  useEffect(() => {
    if (!token) return;
    fetch(`${BACKEND}/api/settings/tax`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setGstRate(data.defaultGstRate ?? 0);
        setSellerGstin(data.gstin || "");
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
      clearTimeout(autoParseTimerRef.current);
      micStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  // Ask the browser/OS for noise suppression + echo cancellation + auto gain
  // BEFORE SpeechRecognition grabs the mic. Web Speech API manages its own
  // audio internally and doesn't accept a custom stream, but priming
  // getUserMedia with these constraints first nudges Chrome/Edge into
  // applying its noise-suppression pipeline for the session, which helps a
  // lot in a noisy shop with several customers talking.
  const primeMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micStreamRef.current = stream;
    } catch {
      // ignore — recognition will still ask for its own mic permission
    }
  };

  const releaseMicPrime = () => {
    micStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    micStreamRef.current = null;
  };

  const startListening = async () => {
    setErr("");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErr("Voice recognition only works in Chrome or Edge browser");
      return;
    }

    await primeMicrophone();

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);

    recognition.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        setErr("Error capturing voice, please try again");
      }
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
        releaseMicPrime();
      }
    };

    recognition.onresult = (event) => {
      let newText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          newText += event.results[i][0].transcript + " ";
        }
      }
      if (newText.trim()) {
        setTranscript((prev) => (prev ? prev + " " + newText.trim() : newText.trim()));

        // Auto re-parse a couple seconds after the customer's speech pauses,
        // so the bill fills itself in without needing a manual tap every time —
        // useful when it's noisy and the cashier's hands are full.
        if (autoParseEnabled) {
          clearTimeout(autoParseTimerRef.current);
          autoParseTimerRef.current = setTimeout(() => {
            handleParseRef.current?.();
          }, 2200);
        }
      }
    };

    recognitionRef.current = recognition;
    shouldListenRef.current = true;
    recognition.start();
  };

  const stopListening = () => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    clearTimeout(autoParseTimerRef.current);
    setListening(false);
    releaseMicPrime();
  };

  const handleParse = async () => {
    if (!transcript.trim()) return setErr("Please speak or type something first");
    setParsing(true);
    setErr("");
    try {
      const res = await fetch(`${BACKEND}/api/voice-invoice/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parsing failed");

      if (data.customerName) setCustomerName(data.customerName);
      if (data.customerEmail) setCustomerEmail(data.customerEmail);
      if (data.customerPhone) setCustomerPhone(data.customerPhone);
      if (data.items && data.items.length) {
        const matched = data.items.map((it) => {
          const found = findBestProductMatch(it.name, products);
          return found
            ? { name: found.name, qty: it.qty, price: found.price, _matched: true }
            : { ...it, _matched: false };
        });
        setItems(matched);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setParsing(false);
    }
  };

  // Keep a live ref to the latest handleParse closure so the auto-parse
  // timer (set inside recognition.onresult) always calls the version that
  // sees the current transcript/products state.
  useEffect(() => {
    handleParseRef.current = handleParse;
  });

  const updateItem = (idx, key, value) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [key]: value };
      if (key === "name") {
        // Don't overwrite what the user is typing on every keystroke — just
        // try to autofill the price if there's already an unambiguous match.
        const found = findBestProductMatch(value, products);
        if (found) {
          updated.price = found.price;
          updated._matched = true;
        } else {
          updated._matched = undefined;
        }
      }
      return updated;
    }));
  };

  // On leaving the name field, snap to the closest catalog product (fixes
  // casing/spacing/minor typos) so the printed invoice uses the official name.
  const handleItemNameBlur = (idx) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx || !it.name.trim()) return it;
      const found = findBestProductMatch(it.name, products);
      if (found) return { ...it, name: found.name, price: found.price, _matched: true };
      return { ...it, _matched: false };
    }));
  };

  const addItemRow = () => setItems((prev) => [...prev, { name: "", qty: 1, price: 0 }]);
  const removeItemRow = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  // ── Live pricing preview (subtotal → discount → GST → grand total) ─────
  const { subtotal, discountAmount, taxableAmount, gstAmount, grandTotal } = calcInvoiceTotals({
    items, discountType, discountValue, gstRate,
  });

  const handleGenerate = async () => {
    setErr("");
    if (!customerName.trim()) return setErr("Customer name is required");
    const validItems = items.filter((it) => it.name.trim());
    if (validItems.length === 0) return setErr("Add at least one item");

    setSaving(true);
    try {
      const res = await fetch(`${BACKEND}/api/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          items: validItems.map((it) => ({ name: it.name, qty: Number(it.qty), price: Number(it.price) })),
          discountType,
          discountValue: Number(discountValue) || 0,
          gstRate: Number(gstRate) || 0,
          sellerGstin,
          status: orderStatus,
        }),
      });
      const savedInvoice = await res.json();
      if (!res.ok) throw new Error(savedInvoice.error || "Could not save invoice");

      await downloadInvoicePDF(savedInvoice);
      onSaved?.();
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", background: `${t.accent}08`,
    border: `1px solid ${t.border}`, borderRadius: 10, padding: "9px 12px",
    fontSize: 13, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", outline: "none",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
      overflowY: "auto",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16,
        padding: 24, width: "100%", maxWidth: 560, display: "flex", flexDirection: "column",
        gap: 16, maxHeight: "90vh", overflowY: "auto",
      }}>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 20, color: t.textPrimary, margin: 0 }}>
          Create Invoice
        </h3>

        <div style={{
          background: `${t.accent}08`, border: `1px solid ${t.accent}30`,
          borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
              Speak or type the full bill
            </p>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: t.textMuted, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={autoParseEnabled}
                onChange={(e) => setAutoParseEnabled(e.target.checked)}
              />
              Auto-fill on pause
            </label>
          </div>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder='e.g. "Customer Rahul Sharma, email rahul@gmail.com, 2 Laptop Stand, 1 Wireless Mouse"'
            rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "'DM Sans', sans-serif" }}
          />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={listening ? stopListening : startListening}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: listening ? t.red : t.accent, color: "#fff", border: "none",
                borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              {listening ? "⏹ Stop Listening" : "🎤 Speak Bill"}
            </button>
            <button
              onClick={handleParse}
              disabled={parsing || !transcript.trim()}
              style={{
                background: "transparent", color: t.accent, border: `1.5px solid ${t.accent}`,
                borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 600,
                cursor: parsing || !transcript.trim() ? "not-allowed" : "pointer",
                opacity: parsing || !transcript.trim() ? 0.5 : 1,
              }}
            >
              {parsing ? "⏳ Parsing..." : "✨ Auto-fill from text"}
            </button>
          </div>
          {listening && <p style={{ fontSize: 11, color: t.accent, margin: 0 }}>🔴 Listening... speak now (noise suppression active)</p>}
        </div>

        {err && <p style={{ fontSize: 12, color: t.red, margin: 0 }}>{err}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 11, color: t.textMuted }}>Customer Name *</label>
            <input style={inputStyle} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Rahul Sharma" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: t.textMuted }}>Email</label>
            <input style={inputStyle} value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="rahul@gmail.com" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: t.textMuted }}>Phone</label>
            <input style={inputStyle} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>Items (select from your products — price fills automatically)</label>
            <button onClick={addItemRow} style={{
              background: "transparent", color: t.accent, border: "none",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>+ Add Item</button>
          </div>
          <datalist id="product-options">
            {products.map((p) => <option key={p._id} value={p.name} />)}
          </datalist>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((it, idx) => (
              <div key={idx}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px 28px", gap: 6, alignItems: "center" }}>
                  <input
                    style={{
                      ...inputStyle,
                      border: it._matched === false ? `1px solid ${t.orange}` : inputStyle.border,
                    }}
                    list="product-options"
                    value={it.name}
                    onChange={(e) => updateItem(idx, "name", e.target.value)}
                    onBlur={() => handleItemNameBlur(idx)}
                    placeholder="Select or type item name"
                  />
                  <input
                    type="number"
                    style={inputStyle}
                    value={it.qty}
                    onChange={(e) => updateItem(idx, "qty", e.target.value)}
                    placeholder="Qty"
                  />
                  <input
                    type="number"
                    style={inputStyle}
                    value={it.price}
                    onChange={(e) => updateItem(idx, "price", e.target.value)}
                    placeholder="Price"
                  />
                  <button
                    onClick={() => removeItemRow(idx)}
                    style={{ background: "transparent", border: "none", color: t.red, cursor: "pointer", fontSize: 16 }}
                  >×</button>
                </div>
                {it._matched === false && it.name.trim() && (
                  <p style={{ fontSize: 10, color: t.orange, margin: "2px 2px 0" }}>
                    Not found in your product list — check the price manually.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Discount + GST ─────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>Discount Type</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer", marginTop: 4 }}
            >
              <option value="flat">Flat (₹)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>
              Discount {discountType === "percentage" ? "(%)" : "(₹)"}
            </label>
            <input
              type="number"
              min="0"
              style={{ ...inputStyle, marginTop: 4 }}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>GST Rate</label>
            <select
              value={gstRate}
              onChange={(e) => setGstRate(Number(e.target.value))}
              style={{ ...inputStyle, cursor: "pointer", marginTop: 4 }}
            >
              {GST_RATE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}%</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>Order Status</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {["Completed", "Pending"].map((s) => (
              <button
                key={s}
                onClick={() => setOrderStatus(s)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: orderStatus === s ? `1.5px solid ${t.accent}` : `1px solid ${t.border}`,
                  background: orderStatus === s ? `${t.accent}12` : "transparent",
                  color: orderStatus === s ? t.accent : t.textMuted,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── Live totals breakdown ───────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: t.textMuted }}>
            <span>Subtotal</span>
            <span>₹{subtotal.toLocaleString("en-IN")}</span>
          </div>
          {discountAmount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: t.textMuted }}>
              <span>Discount</span>
              <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
            </div>
          )}
          {gstAmount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: t.textMuted }}>
              <span>GST ({gstRate}%)</span>
              <span>₹{gstAmount.toLocaleString("en-IN")}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <p style={{ fontSize: 16, fontWeight: 900, color: t.textPrimary, margin: 0, fontFamily: "'Syne', sans-serif" }}>
              Total: ₹{grandTotal.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: "transparent", color: t.textMuted, border: `1px solid ${t.border}`,
            borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleGenerate} disabled={saving} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: t.accent, color: "#fff", border: "none", borderRadius: 10,
            padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}>{saving ? "Saving..." : (<><DownloadIcon size={14} /> Generate & Download PDF</>)}</button>
        </div>
      </div>
    </div>
  );
}

// ─── ORDERS PAGE ──────────────────────────────────────────────────────────────
export default function Orders() {
  const { t } = useTheme();
  const { loading, error, orders } = useOrdersData();
  const { invoices } = useInvoicesData();
  const [refreshTick, setRefreshTick] = useState(0);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => (o.status !== "Cancelled" ? s + (Number(o.amount) || 0) : s), 0);
  const completed = orders.filter((o) => o.status === "Completed").length;
  const pending = orders.filter((o) => o.status === "Pending").length;
  const cancelled = orders.filter((o) => o.status === "Cancelled").length;

  const filtered = orders
    .filter((o) => {
      const matchSearch =
        (o.customer || "").toLowerCase().includes(search.toLowerCase()) ||
        (o.orderId || "").toLowerCase().includes(search.toLowerCase()) ||
        (o.product || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === "All" || o.status === status;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortKey === "date") {
        const va = getOrderDate(a)?.getTime() || 0;
        const vb = getOrderDate(b)?.getTime() || 0;
        return sortDir === "asc" ? va - vb : vb - va;
      }
      if (sortKey === "qty" || sortKey === "amount") {
        const va = Number(a[sortKey]) || 0;
        const vb = Number(b[sortKey]) || 0;
        return sortDir === "asc" ? va - vb : vb - va;
      }
      const va = String(a[sortKey] || "").toLowerCase();
      const vb = String(b[sortKey] || "").toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const statusStyle = {
    "Completed": { color: t.green, bg: t.greenBg },
    "Pending": { color: t.orange, bg: t.orangeBg },
    "Cancelled": { color: t.red, bg: t.redBg },
  };

  const inputStyle = {
    background: t.bgCard,
    border: `1px solid ${t.border}`,
    color: t.textPrimary,
    borderRadius: "10px",
    padding: "8px 14px",
    fontSize: "12px",
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    transition: "border-color 0.2s",
  };

  const iconBtnStyle = {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    padding: "4px 5px",
    lineHeight: 1,
    borderRadius: 6,
  };

  const SortArrow = ({ col }) => {
    if (sortKey !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4, color: t.accent }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <>
      <style>{`
        .ord-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap: 12px; }
        .ord-filters   { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
        .ord-table-wrap { overflow-x: auto; }
        .ord-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .ord-table th { cursor: pointer; user-select: none; }
        .ord-table th:hover { opacity: 0.8; }
        @media (max-width: 640px) {
          .ord-stat-grid { grid-template-columns: repeat(2,1fr); }
        }
      `}</style>

      {showInvoiceModal && (
        <CreateInvoiceModal t={t} onClose={() => setShowInvoiceModal(false)} onSaved={() => setRefreshTick((n) => n + 1)} />
      )}
      {viewInvoice && (
        <InvoiceViewModal t={t} invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{
              fontFamily: "'Syne', sans-serif", fontSize: "28px", fontWeight: 900,
              color: t.textPrimary, letterSpacing: "-0.03em",
              transition: "color 0.25s ease",
            }}>Billing</h1>
            <p style={{ fontSize: "13px", color: t.textMuted, marginTop: "4px" }}>
              {error ? error : "Track, filter, and manage all customer orders"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => setShowInvoiceModal(true)} style={{
              background: t.accent, color: "#fff", border: "none", borderRadius: 10,
              padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
            }}>+ Create Invoice</button>
          </div>
        </div>

        <div className="ord-stat-grid">
          <StatCard label="Total Orders" value={loading ? "…" : totalOrders} sub="all time" />
          <StatCard label="Total Revenue" value={loading ? "…" : inr(totalRevenue)} sub="from orders" />
          <StatCard label="Completed" value={loading ? "…" : completed} trend={loading ? undefined : `${completed} orders`} trendDir="up" sub="done" />
          <StatCard label="Pending" value={loading ? "…" : pending} trend={loading ? undefined : `${pending} orders`} trendDir="neu" sub="awaiting" />
          <StatCard label="Cancelled" value={loading ? "…" : cancelled} trend={loading ? undefined : `${cancelled} orders`} trendDir="down" sub="lost" />
        </div>

        <div style={{
          borderRadius: "16px", padding: "20px",
          background: t.bgCard, border: `1px solid ${t.border}`,
          transition: "background 0.25s ease, border-color 0.25s ease",
          display: "flex", flexDirection: "column", gap: "16px",
        }}>

          <div className="ord-filters">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order, customer, product…"
              style={{ ...inputStyle, flex: "1 1 200px", minWidth: "160px" }}
            />
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <span style={{ fontSize: "11px", color: t.textMuted, marginLeft: "auto" }}>
              {loading ? "Loading…" : `${filtered.length} of ${orders.length} orders`}
            </span>
          </div>

          <div className="ord-table-wrap">
            <table className="ord-table">
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                  {[
                    { key: "orderId", label: "Order ID" },
                    { key: "customer", label: "Customer" },
                    { key: "product", label: "Product" },
                    { key: "qty", label: "Qty" },
                    { key: "amount", label: "Amount" },
                    { key: "status", label: "Status" },
                    { key: "date", label: "Date" },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      style={{
                        textAlign: "left", paddingBottom: "10px",
                        fontSize: "10px", fontWeight: 600,
                        textTransform: "uppercase", letterSpacing: "0.08em",
                        color: t.textMuted, fontFamily: "'DM Sans', sans-serif",
                        whiteSpace: "nowrap", paddingRight: "16px",
                      }}
                    >
                      {label}<SortArrow col={key} />
                    </th>
                  ))}
                  <th style={{
                    textAlign: "left", paddingBottom: "10px",
                    fontSize: "10px", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    color: t.textMuted, fontFamily: "'DM Sans', sans-serif",
                    whiteSpace: "nowrap", cursor: "default",
                  }}>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: t.textMuted, fontSize: "13px" }}>
                      Loading orders…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{
                      textAlign: "center", padding: "40px 0",
                      color: t.textMuted, fontSize: "13px",
                    }}>No orders match your filters.</td>
                  </tr>
                ) : filtered.map((order, i) => {
                  const inv = findInvoiceForOrder(order, invoices);
                  return (
                    <tr
                      key={order.orderId || order._id || i}
                      style={{
                        borderBottom: i < filtered.length - 1
                          ? `1px solid ${t.borderLight ?? t.border}` : "none",
                      }}
                    >
                      <td style={{ padding: "10px 16px 10px 0", fontFamily: "monospace", fontSize: "11px", color: t.textMuted, whiteSpace: "nowrap" }}>
                        {order.orderId}
                      </td>
                      <td style={{ padding: "10px 16px 10px 0", fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
                        {order.customer}
                      </td>
                      <td style={{ padding: "10px 16px 10px 0", fontSize: "12px", color: t.textMuted, whiteSpace: "nowrap" }}>
                        {order.product}
                      </td>
                      <td style={{ padding: "10px 16px 10px 0", fontWeight: 700, color: t.textPrimary, fontFamily: "'Syne', sans-serif" }}>
                        {order.qty ?? 1}
                      </td>
                      <td style={{ padding: "10px 16px 10px 0", fontWeight: 700, color: t.textPrimary, fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap" }}>
                        {inr(order.amount)}
                      </td>
                      <td style={{ padding: "10px 16px 10px 0" }}>
                        <span style={{
                          fontSize: "10px", fontWeight: 600,
                          padding: "3px 9px", borderRadius: "99px",
                          color: (statusStyle[order.status] || statusStyle.Pending).color,
                          background: (statusStyle[order.status] || statusStyle.Pending).bg,
                          whiteSpace: "nowrap",
                        }}>
                          {order.status || "Pending"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px 10px 0", fontSize: "11px", color: t.textMuted, whiteSpace: "nowrap" }}>
                        {formatDate(getOrderDate(order))}
                      </td>
                      <td style={{ padding: "10px 0", whiteSpace: "nowrap" }}>
                        {inv ? (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              onClick={() => setViewInvoice(inv)}
                              title="View invoice"
                              style={{ ...iconBtnStyle, color: t.accent }}
                            ><EyeIcon /></button>
                            <button
                              onClick={() => downloadInvoicePDF(inv)}
                              title="Download invoice"
                              style={{ ...iconBtnStyle, color: t.accent }}
                            ><DownloadIcon /></button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "11px", color: t.textMuted }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </>
  );
}