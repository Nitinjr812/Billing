import { useState, useRef } from "react";
import { useTheme } from "../components/ThemeContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BACKEND = "https://billing-backend-tawny.vercel.app";

// ─── DUMMY DATA ───────────────────────────────────────────────────────────────
const ORDERS = [
  { id: "#ORD-1091", customer: "Arjun Sharma",   product: "Prod-Alpha",  category: "Electronics", qty: 2,  amount: "₹2,400",  payment: "Paid",    status: "Delivered",  date: "12 May" },
  { id: "#ORD-1090", customer: "Priya Verma",    product: "Prod-Beta",   category: "Apparel",     qty: 5,  amount: "₹3,250",  payment: "Pending", status: "Processing", date: "11 May" },
  { id: "#ORD-1089", customer: "Ravi Patel",     product: "Prod-Gamma",  category: "Electronics", qty: 1,  amount: "₹3,400",  payment: "Paid",    status: "Delivered",  date: "11 May" },
  { id: "#ORD-1088", customer: "Sneha Mehta",    product: "Prod-Delta",  category: "Home Goods",  qty: 3,  amount: "₹2,940",  payment: "Paid",    status: "Shipped",    date: "10 May" },
  { id: "#ORD-1087", customer: "Vikram Das",     product: "Prod-Sigma",  category: "Apparel",     qty: 4,  amount: "₹7,000",  payment: "Pending", status: "Pending",    date: "10 May" },
  { id: "#ORD-1086", customer: "Ananya Rao",     product: "Prod-Zeta",   category: "Home Goods",  qty: 1,  amount: "₹2,300",  payment: "Paid",    status: "Delivered",  date: "09 May" },
  { id: "#ORD-1085", customer: "Karan Joshi",    product: "Prod-Omega",  category: "Electronics", qty: 2,  amount: "₹11,200", payment: "Failed",  status: "Cancelled",  date: "08 May" },
  { id: "#ORD-1084", customer: "Meera Nair",     product: "Prod-Lambda", category: "Apparel",     qty: 10, amount: "₹4,200",  payment: "Paid",    status: "Delivered",  date: "08 May" },
  { id: "#ORD-1083", customer: "Rohit Gupta",    product: "Prod-Theta",  category: "Home Goods",  qty: 2,  amount: "₹2,200",  payment: "Paid",    status: "Shipped",    date: "07 May" },
  { id: "#ORD-1082", customer: "Divya Singh",    product: "Prod-Kappa",  category: "Electronics", qty: 1,  amount: "₹8,900",  payment: "Pending", status: "Processing", date: "06 May" },
  { id: "#ORD-1081", customer: "Aditya Kumar",   product: "Prod-Phi",    category: "Apparel",     qty: 6,  amount: "₹3,300",  payment: "Paid",    status: "Delivered",  date: "05 May" },
  { id: "#ORD-1080", customer: "Pooja Iyer",     product: "Prod-Psi",    category: "Home Goods",  qty: 3,  amount: "₹2,340",  payment: "Failed",  status: "Cancelled",  date: "04 May" },
  { id: "#ORD-1079", customer: "Siddharth Roy",  product: "Prod-Alpha",  category: "Electronics", qty: 1,  amount: "₹1,200",  payment: "Paid",    status: "Delivered",  date: "03 May" },
  { id: "#ORD-1078", customer: "Kavya Reddy",    product: "Prod-Beta",   category: "Apparel",     qty: 3,  amount: "₹1,950",  payment: "Paid",    status: "Shipped",    date: "02 May" },
  { id: "#ORD-1077", customer: "Nikhil Bansal",  product: "Prod-Gamma",  category: "Electronics", qty: 2,  amount: "₹6,800",  payment: "Pending", status: "Pending",    date: "01 May" },
];

const CATEGORIES = ["All", "Electronics", "Apparel", "Home Goods"];
const STATUSES   = ["All", "Delivered", "Shipped", "Processing", "Pending", "Cancelled"];
const PAYMENTS   = ["All", "Paid", "Pending", "Failed"];

let invoiceCounter = 1000;

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, trend, trendDir, sub }) {
  const { t } = useTheme();
  const colors = { up: t.green, down: t.red, neu: t.orange };
  const bgs    = { up: t.greenBg, down: t.redBg, neu: t.orangeBg };

  return (
    <div style={{
      borderRadius: "16px", padding: "20px", display: "flex",
      flexDirection: "column", gap: "10px",
      background: t.bgCard, border: `1px solid ${t.border}`,
      transition: "background 0.25s ease, border-color 0.25s ease",
    }}>
      <p style={{
        fontSize: "10px", fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.1em", color: t.textMuted, fontFamily: "'DM Sans', sans-serif",
      }}>{label}</p>
      <p style={{
        fontFamily: "'Syne', sans-serif", fontSize: "26px", fontWeight: 900,
        color: t.textPrimary, letterSpacing: "-0.03em", lineHeight: 1,
      }}>{value}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {trend && (
          <span style={{
            fontSize: "11px", fontWeight: 600, padding: "3px 10px",
            borderRadius: "99px", color: colors[trendDir], background: bgs[trendDir],
          }}>{trend}</span>
        )}
        {sub && <span style={{ fontSize: "11px", color: t.textMuted }}>{sub}</span>}
      </div>
    </div>
  );
}

// ─── CREATE INVOICE MODAL ──────────────────────────────────────────────────
function CreateInvoiceModal({ onClose, t }) {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState([{ name: "", qty: 1, price: 0 }]);

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsing, setParsing] = useState(false);
  const [err, setErr] = useState("");
  const recognitionRef = useRef(null);

  // ── Voice recognition (browser native — Chrome only) ──
  const startListening = () => {
    setErr("");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErr("❌ Voice recognition sirf Chrome browser mein kaam karta hai");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN"; // Hindi ke liye "hi-IN" try kar sakte ho
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onerror = () => { setListening(false); setErr("❌ Voice capture mein error aaya"); };
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript((prev) => (prev ? prev + " " + text : text));
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  // ── Send transcript to backend AI for parsing ──
  const handleParse = async () => {
    if (!transcript.trim()) return setErr("Pehle bolo ya text likho");
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
      if (data.items && data.items.length) setItems(data.items);
    } catch (e) {
      setErr("❌ " + e.message);
    } finally {
      setParsing(false);
    }
  };

  // ── Manual item editing ──
  const updateItem = (idx, key, value) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [key]: value } : it));
  };
  const addItemRow = () => setItems((prev) => [...prev, { name: "", qty: 1, price: 0 }]);
  const removeItemRow = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const subtotal = items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const tax = Math.round(subtotal * 0.18); // GST 18% — apni requirement ke hisaab se badal sakte ho
  const total = subtotal + tax;

  // ── Generate PDF ──
  const handleGeneratePDF = () => {
    if (!customerName.trim()) return setErr("Customer name zaroori hai");
    if (items.length === 0 || items.every((it) => !it.name.trim())) return setErr("Kam se kam ek item add karo");

    invoiceCounter += 1;
    const invoiceId = `INV-${invoiceCounter}`;
    const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice #: ${invoiceId}`, 14, 30);
    doc.text(`Date: ${date}`, 14, 36);

    // Customer details
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 14, 48);
    doc.setFont("helvetica", "normal");
    doc.text(customerName, 14, 54);
    if (customerEmail) doc.text(customerEmail, 14, 60);
    if (customerPhone) doc.text(customerPhone, 14, customerEmail ? 66 : 60);

    // Items table
    const tableRows = items
      .filter((it) => it.name.trim())
      .map((it) => [
        it.name,
        String(it.qty),
        `Rs. ${Number(it.price).toLocaleString("en-IN")}`,
        `Rs. ${(Number(it.qty) * Number(it.price)).toLocaleString("en-IN")}`,
      ]);

    autoTable(doc, {
      startY: 74,
      head: [["Item", "Qty", "Price", "Amount"]],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [30, 30, 30] },
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Subtotal: Rs. ${subtotal.toLocaleString("en-IN")}`, 140, finalY);
    doc.text(`GST (18%): Rs. ${tax.toLocaleString("en-IN")}`, 140, finalY + 6);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: Rs. ${total.toLocaleString("en-IN")}`, 140, finalY + 14);

    doc.save(`${invoiceId}.pdf`);
    onClose();
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
            Poora bill bolo ya type karo
          </p>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder='Jaise: "Customer Rahul Sharma, email rahul@gmail.com, 2 kg sugar 50 rupaye kilo, 1 rice bag 400 rupaye"'
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
          {listening && <p style={{ fontSize: 11, color: t.accent, margin: 0 }}>🔴 Sun raha hoon... bolo</p>}
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
            <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>Items</label>
            <button onClick={addItemRow} style={{
              background: "transparent", color: t.accent, border: "none",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>+ Add Item</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((it, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px 28px", gap: 6, alignItems: "center" }}>
                <input
                  style={inputStyle}
                  value={it.name}
                  onChange={(e) => updateItem(idx, "name", e.target.value)}
                  placeholder="Item name"
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

        {/* Totals */}
        <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <p style={{ fontSize: 12, color: t.textMuted, margin: 0 }}>Subtotal: ₹{subtotal.toLocaleString("en-IN")}</p>
          <p style={{ fontSize: 12, color: t.textMuted, margin: 0 }}>GST (18%): ₹{tax.toLocaleString("en-IN")}</p>
          <p style={{ fontSize: 16, fontWeight: 900, color: t.textPrimary, margin: 0, fontFamily: "'Syne', sans-serif" }}>
            Total: ₹{total.toLocaleString("en-IN")}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: "transparent", color: t.textMuted, border: `1px solid ${t.border}`,
            borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleGeneratePDF} style={{
            background: t.accent, color: "#fff", border: "none", borderRadius: 10,
            padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>⬇ Generate & Download PDF</button>
        </div>
      </div>
    </div>
  );
}

// ─── ORDERS PAGE ──────────────────────────────────────────────────────────────
export default function Orders() {
  const { t } = useTheme();
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus]     = useState("All");
  const [payment, setPayment]   = useState("All");
  const [sortKey, setSortKey]   = useState("id");
  const [sortDir, setSortDir]   = useState("desc");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Stats
  const totalOrders   = ORDERS.length;
  const totalRevenue  = "₹63,380";
  const delivered     = ORDERS.filter((o) => o.status === "Delivered").length;
  const cancelled     = ORDERS.filter((o) => o.status === "Cancelled").length;

  // Filter + Sort
  const filtered = ORDERS
    .filter((o) => {
      const matchSearch   = o.customer.toLowerCase().includes(search.toLowerCase()) ||
                            o.id.toLowerCase().includes(search.toLowerCase()) ||
                            o.product.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === "All" || o.category === category;
      const matchStatus   = status   === "All" || o.status   === status;
      const matchPayment  = payment  === "All" || o.payment  === payment;
      return matchSearch && matchCategory && matchStatus && matchPayment;
    })
    .sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === "qty") { va = Number(va); vb = Number(vb); }
      else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ?  1 : -1;
      return 0;
    });

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const statusStyle = {
    "Delivered":  { color: t.green,  bg: t.greenBg  },
    "Shipped":    { color: t.blue,   bg: `${t.blue}18` },
    "Processing": { color: t.orange, bg: t.orangeBg },
    "Pending":    { color: t.orange, bg: t.orangeBg },
    "Cancelled":  { color: t.red,    bg: t.redBg    },
  };

  const paymentStyle = {
    "Paid":    { color: t.green,  bg: t.greenBg  },
    "Pending": { color: t.orange, bg: t.orangeBg },
    "Failed":  { color: t.red,    bg: t.redBg    },
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

      {showInvoiceModal && <CreateInvoiceModal t={t} onClose={() => setShowInvoiceModal(false)} />}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{
              fontFamily: "'Syne', sans-serif", fontSize: "28px", fontWeight: 900,
              color: t.textPrimary, letterSpacing: "-0.03em",
              transition: "color 0.25s ease",
            }}>Orders</h1>
            <p style={{ fontSize: "13px", color: t.textMuted, marginTop: "4px" }}>
              Track, filter, and manage all customer orders
            </p>
          </div>
          <button onClick={() => setShowInvoiceModal(true)} style={{
            background: t.accent, color: "#fff", border: "none", borderRadius: 10,
            padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
          }}>+ Create Invoice</button>
        </div>

        {/* Stat Cards */}
        <div className="ord-stat-grid">
          <StatCard label="Total Orders"   value={totalOrders}  sub="all time" />
          <StatCard label="Total Revenue"  value={totalRevenue} sub="from orders" />
          <StatCard label="Delivered"      value={delivered}    trend={`${delivered} orders`} trendDir="up"   sub="completed" />
          <StatCard label="Cancelled"      value={cancelled}    trend={`${cancelled} orders`} trendDir="down" sub="lost" />
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
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={payment} onChange={(e) => setPayment(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
            </select>
            <span style={{ fontSize: "11px", color: t.textMuted, marginLeft: "auto" }}>
              {filtered.length} of {ORDERS.length} orders
            </span>
          </div>

          {/* Table */}
          <div className="ord-table-wrap">
            <table className="ord-table">
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                  {[
                    { key: "id",       label: "Order ID"  },
                    { key: "customer", label: "Customer"  },
                    { key: "product",  label: "Product"   },
                    { key: "category", label: "Category"  },
                    { key: "qty",      label: "Qty"       },
                    { key: "amount",   label: "Amount"    },
                    { key: "payment",  label: "Payment"   },
                    { key: "status",   label: "Status"    },
                    { key: "date",     label: "Date"      },
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
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{
                      textAlign: "center", padding: "40px 0",
                      color: t.textMuted, fontSize: "13px",
                    }}>No orders match your filters.</td>
                  </tr>
                ) : filtered.map((order, i) => (
                  <tr
                    key={order.id}
                    style={{
                      borderBottom: i < filtered.length - 1
                        ? `1px solid ${t.borderLight ?? t.border}` : "none",
                    }}
                  >
                    <td style={{ padding: "10px 16px 10px 0", fontFamily: "monospace", fontSize: "11px", color: t.textMuted, whiteSpace: "nowrap" }}>
                      {order.id}
                    </td>
                    <td style={{ padding: "10px 16px 10px 0", fontWeight: 600, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
                      {order.customer}
                    </td>
                    <td style={{ padding: "10px 16px 10px 0", fontSize: "12px", color: t.textMuted, whiteSpace: "nowrap" }}>
                      {order.product}
                    </td>
                    <td style={{ padding: "10px 16px 10px 0", fontSize: "11px", color: t.textMuted }}>
                      {order.category}
                    </td>
                    <td style={{ padding: "10px 16px 10px 0", fontWeight: 700, color: t.textPrimary, fontFamily: "'Syne', sans-serif" }}>
                      {order.qty}
                    </td>
                    <td style={{ padding: "10px 16px 10px 0", fontWeight: 700, color: t.textPrimary, fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap" }}>
                      {order.amount}
                    </td>
                    <td style={{ padding: "10px 16px 10px 0" }}>
                      <span style={{
                        fontSize: "10px", fontWeight: 600,
                        padding: "3px 9px", borderRadius: "99px",
                        color: paymentStyle[order.payment].color,
                        background: paymentStyle[order.payment].bg,
                        whiteSpace: "nowrap",
                      }}>
                        {order.payment}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px 10px 0" }}>
                      <span style={{
                        fontSize: "10px", fontWeight: 600,
                        padding: "3px 9px", borderRadius: "99px",
                        color: statusStyle[order.status].color,
                        background: statusStyle[order.status].bg,
                        whiteSpace: "nowrap",
                      }}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px 0", fontSize: "11px", color: t.textMuted, whiteSpace: "nowrap" }}>
                      {order.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </>
  );
}