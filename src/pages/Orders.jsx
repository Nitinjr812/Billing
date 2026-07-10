import { useState, useRef, useEffect } from "react";
import { useTheme } from "../components/ThemeContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BACKEND = "https://billing-backend-tawny.vercel.app";

const STATUSES = ["All", "Delivered", "Processing", "Pending", "Cancelled"];

// ─── Brand config — swap logo path here when you have the image ───────
const BRAND = {
  name: "Draftbill",
  tagline: "Invoicing, made simple",
  accentRGB: [37, 99, 235],   // blue accent — change to match your brand
  darkRGB: [17, 24, 39],
  grayRGB: [107, 114, 128],
  lightBgRGB: [245, 247, 250],
  logoDataUrl: null, // <-- put a base64 image string here later, e.g. "data:image/png;base64,...."
};

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

  // 1) Direct link, if backend stores it on the order
  if (order.invoiceId) {
    const direct = invoices.find(
      (inv) => inv.invoiceId === order.invoiceId || inv._id === order.invoiceId
    );
    if (direct) return direct;
  }

  // 2) Fallback: same customer + product appears in invoice items
  const orderDate = getOrderDate(order);
  const candidates = invoices.filter(
    (inv) =>
      (inv.customerName || "").toLowerCase() === (order.customer || "").toLowerCase() &&
      inv.items?.some((it) => (it.name || "").toLowerCase() === (order.product || "").toLowerCase())
  );
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0];

  // pick the invoice closest in date to the order
  return candidates.reduce((best, cur) => {
    const bd = Math.abs(new Date(best.createdAt).getTime() - (orderDate?.getTime() || 0));
    const cd = Math.abs(new Date(cur.createdAt).getTime() - (orderDate?.getTime() || 0));
    return cd < bd ? cur : best;
  });
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
function downloadInvoicePDF(invoice) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const date = new Date(invoice.createdAt || Date.now()).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

  // ── Header band ──
  doc.setFillColor(...BRAND.darkRGB);
  doc.rect(0, 0, pageWidth, 38, "F");

  if (BRAND.logoDataUrl) {
    // Logo image — adjust width/height to match your actual logo's aspect ratio
    doc.addImage(BRAND.logoDataUrl, "PNG", margin, 9, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(BRAND.name, margin + 26, 18);
  } else {
    // Placeholder logo box until image is provided
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

  // ── Meta row: date + bill-to ──
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

  // ── Totals box ──
  const finalY = doc.lastAutoTable.finalY + 8;
  const boxW = 70;
  const boxX = pageWidth - margin - boxW;

  doc.setFillColor(...BRAND.lightBgRGB);
  doc.roundedRect(boxX, finalY, boxW, 18, 2, 2, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.grayRGB);
  doc.text("Total Amount", boxX + 6, finalY + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BRAND.accentRGB);
  doc.text(`Rs. ${Number(invoice.total).toLocaleString("en-IN")}`, boxX + boxW - 6, finalY + 13, { align: "right" });

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
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: `1px solid ${t.border}`, paddingTop: 10 }}>
          {invoice.items.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: t.textPrimary }}>
              <span>{it.name} × {it.qty}</span>
              <span>{inr(it.qty * it.price)}</span>
            </div>
          ))}
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
  const [products, setProducts] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState([{ name: "", qty: 1, price: 0 }]);

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);

  useEffect(() => {
    fetch(`${BACKEND}/api/products`)
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));
  }, []);

  // Cleanup mic if the modal closes/unmounts while still listening
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  // ── Voice recognition (Chrome/Edge only) — keeps listening until user stops it ──
  const startListening = () => {
    setErr("");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErr("Voice recognition only works in Chrome or Edge browser");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);

    recognition.onerror = (e) => {
      // "no-speech" fires often during pauses — ignore it, auto-restart handles it
      if (e.error !== "no-speech" && e.error !== "aborted") {
        setErr("Error capturing voice, please try again");
      }
    };

    recognition.onend = () => {
      // Browser sometimes stops on its own after silence — restart unless user pressed Stop
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
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
      }
    };

    recognitionRef.current = recognition;
    shouldListenRef.current = true;
    recognition.start();
  };

  const stopListening = () => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
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
        // Try to match parsed item names to real products for accurate pricing
        const matched = data.items.map((it) => {
          const found = products.find((p) => p.name.toLowerCase() === it.name.toLowerCase());
          return found ? { name: found.name, qty: it.qty, price: found.price } : it;
        });
        setItems(matched);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setParsing(false);
    }
  };

  // ── Manual item editing ──
  const updateItem = (idx, key, value) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [key]: value };
      // Auto-fill price when a known product name is selected
      if (key === "name") {
        const found = products.find((p) => p.name.toLowerCase() === value.toLowerCase());
        if (found) updated.price = found.price;
      }
      return updated;
    }));
  };
  const addItemRow = () => setItems((prev) => [...prev, { name: "", qty: 1, price: 0 }]);
  const removeItemRow = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const total = items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

  // ── Save invoice to backend (decrements stock + creates real orders) then generate PDF ──
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
          subtotal: total,
          total,
        }),
      });
      const savedInvoice = await res.json();
      if (!res.ok) throw new Error(savedInvoice.error || "Could not save invoice");

      downloadInvoicePDF(savedInvoice);
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

        {/* Voice / Text Input Section */}
        <div style={{
          background: `${t.accent}08`, border: `1px solid ${t.accent}30`,
          borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
            Speak or type the full bill
          </p>
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
          {listening && <p style={{ fontSize: 11, color: t.accent, margin: 0 }}>🔴 Listening... speak now</p>}
        </div>

        {err && <p style={{ fontSize: 12, color: t.red, margin: 0 }}>{err}</p>}

        {/* Customer Details */}
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

        {/* Items */}
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
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px 28px", gap: 6, alignItems: "center" }}>
                <input
                  style={inputStyle}
                  list="product-options"
                  value={it.name}
                  onChange={(e) => updateItem(idx, "name", e.target.value)}
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
            ))}
          </div>
        </div>

        {/* Total (no tax) */}
        <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <p style={{ fontSize: 16, fontWeight: 900, color: t.textPrimary, margin: 0, fontFamily: "'Syne', sans-serif" }}>
            Total: ₹{total.toLocaleString("en-IN")}
          </p>
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
  const delivered = orders.filter((o) => o.status === "Delivered").length;
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
    "Delivered": { color: t.green, bg: t.greenBg },
    "Processing": { color: t.blue, bg: `${t.blue}18` },
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

        {/* Header */}
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

        {/* Stat Cards */}
        <div className="ord-stat-grid">
          <StatCard label="Total Orders" value={loading ? "…" : totalOrders} sub="all time" />
          <StatCard label="Total Revenue" value={loading ? "…" : inr(totalRevenue)} sub="from orders" />
          <StatCard label="Delivered" value={loading ? "…" : delivered} trend={loading ? undefined : `${delivered} orders`} trendDir="up" sub="completed" />
          <StatCard label="Cancelled" value={loading ? "…" : cancelled} trend={loading ? undefined : `${cancelled} orders`} trendDir="down" sub="lost" />
        </div>

        {/* Table Card */}
        <div style={{
          borderRadius: "16px", padding: "20px",
          background: t.bgCard, border: `1px solid ${t.border}`,
          transition: "background 0.25s ease, border-color 0.25s ease",
          display: "flex", flexDirection: "column", gap: "16px",
        }}>

          {/* Filters */}
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

          {/* Table */}
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