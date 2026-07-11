import { useState, useEffect, useMemo } from "react";
import { useTheme } from "../components/ThemeContext";
import VoiceAddProduct from "../components/VoiceAddProduct";

const BACKEND = "https://billing-backend-tawny.vercel.app";
const STATUSES = ["All", "In Stock", "Low Stock", "Out of Stock"];
// Starter suggestions shown even before any products exist. Once products
// are added, real categories (ranked by how often they're used) take over.
const DEFAULT_CATEGORY_SUGGESTIONS = ["Electronics", "Apparel", "Home Goods"];

function getStatus(stock) {
  if (stock === 0) return "Out of Stock";
  if (stock < 50) return "Low Stock";
  return "In Stock";
}

// Build a list of categories sorted by how frequently they're used
// (most-used first), falling back to the starter suggestions.
function useCategorySuggestions(products) {
  return useMemo(() => {
    const counts = new Map();
    (products || []).forEach((p) => {
      if (!p.category) return;
      const key = p.category.trim();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const fromProducts = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    const merged = [...fromProducts];
    DEFAULT_CATEGORY_SUGGESTIONS.forEach((c) => {
      if (!merged.some((m) => m.toLowerCase() === c.toLowerCase())) merged.push(c);
    });
    return merged;
  }, [products]);
}

// ─── STAT CARD ────────────────────────────────────────────────────────────
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

// ─── ADD PRODUCT MODAL ─────────────────────────────────────────────────────
function AddProductModal({ onClose, onAdded, t, existingProducts, categorySuggestions }) {
  const [form, setForm] = useState({ productId: "", name: "", category: "", stock: "", price: "", growthPercent: "0" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setErr("");
    if (!form.productId || !form.name || !form.category.trim() || !form.stock || !form.price) {
      return setErr("Product ID, Name, Category, Stock and Price is mandatory");
    }

    const dupe = existingProducts.find(
      (p) => p.name.trim().toLowerCase() === form.name.trim().toLowerCase()
    );
    if (dupe) {
      return setErr(`"${form.name}" already exists (SKU: ${dupe.productId}). Edit it instead using the ✎ button.`);
    }

    setSaving(true);
    try {
      const res = await fetch(`${BACKEND}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: form.productId,
          name: form.name,
          category: form.category.trim(),
          stock: Number(form.stock),
          price: Number(form.price),
          growthPercent: Number(form.growthPercent) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Product add nahi hua");
      onAdded();
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
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16,
        padding: 24, width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 12,
      }}>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 18, color: t.textPrimary, margin: 0 }}>Add Product</h3>

        <div>
          <label style={{ fontSize: 11, color: t.textMuted }}>Product ID / SKU</label>
          <input style={inputStyle} value={form.productId} onChange={set("productId")} placeholder="SKU-013" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: t.textMuted }}>Name</label>
          <input style={inputStyle} value={form.name} onChange={set("name")} placeholder="Product name" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: t.textMuted }}>Category</label>
            <input
              style={inputStyle}
              list="category-suggestions"
              value={form.category}
              onChange={set("category")}
              placeholder="Type or pick a category"
            />
            <datalist id="category-suggestions">
              {categorySuggestions.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label style={{ fontSize: 11, color: t.textMuted }}>Growth %</label>
            <input style={inputStyle} type="number" value={form.growthPercent} onChange={set("growthPercent")} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: t.textMuted }}>Stock (Qty)</label>
            <input style={inputStyle} type="number" value={form.stock} onChange={set("stock")} placeholder="100" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: t.textMuted }}>Price (₹)</label>
            <input style={inputStyle} type="number" value={form.price} onChange={set("price")} placeholder="999" />
          </div>
        </div>

        {err && <p style={{ fontSize: 12, color: t.red, margin: 0 }}>❌ {err}</p>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
          <button onClick={onClose} style={{
            background: "transparent", color: t.textMuted, border: `1px solid ${t.border}`,
            borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{
            background: t.accent, color: "#fff", border: "none", borderRadius: 10,
            padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}>{saving ? "Saving..." : "Add Product"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── EDIT PRODUCT MODAL ─────────────────────────────────────────────────────
function EditProductModal({ product, onClose, onSaved, t, existingProducts, categorySuggestions }) {
  const [form, setForm] = useState({
    name: product.name,
    category: product.category,
    stock: String(product.stock),
    price: String(product.price),
    growthPercent: String(product.growthPercent ?? 0),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setErr("");
    if (!form.name || !form.category.trim() || form.stock === "" || form.price === "") {
      return setErr("Name, Category, Stock and Price is mandatory");
    }

    const dupe = existingProducts.find(
      (p) => p._id !== product._id && p.name.trim().toLowerCase() === form.name.trim().toLowerCase()
    );
    if (dupe) {
      return setErr(`"${form.name}" already exists (SKU: ${dupe.productId}).`);
    }

    setSaving(true);
    try {
      const res = await fetch(`${BACKEND}/api/products/${product._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category.trim(),
          stock: Number(form.stock),
          price: Number(form.price),
          growthPercent: Number(form.growthPercent) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Product update nahi hua");
      onSaved();
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
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16,
        padding: 24, width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 12,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 18, color: t.textPrimary, margin: 0 }}>Edit Product</h3>
          <span style={{ fontFamily: "monospace", fontSize: 11, color: t.textMuted }}>{product.productId}</span>
        </div>

        <div>
          <label style={{ fontSize: 11, color: t.textMuted }}>Name</label>
          <input style={inputStyle} value={form.name} onChange={set("name")} placeholder="Product name" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: t.textMuted }}>Category</label>
            <input
              style={inputStyle}
              list="category-suggestions-edit"
              value={form.category}
              onChange={set("category")}
              placeholder="Type or pick a category"
            />
            <datalist id="category-suggestions-edit">
              {categorySuggestions.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label style={{ fontSize: 11, color: t.textMuted }}>Growth %</label>
            <input style={inputStyle} type="number" value={form.growthPercent} onChange={set("growthPercent")} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: t.textMuted }}>Stock (Qty)</label>
            <input style={inputStyle} type="number" value={form.stock} onChange={set("stock")} placeholder="100" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: t.textMuted }}>Price (₹)</label>
            <input style={inputStyle} type="number" value={form.price} onChange={set("price")} placeholder="999" />
          </div>
        </div>

        {err && <p style={{ fontSize: 12, color: t.red, margin: 0 }}>❌ {err}</p>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
          <button onClick={onClose} style={{
            background: "transparent", color: t.textMuted, border: `1px solid ${t.border}`,
            borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{
            background: t.accent, color: "#fff", border: "none", borderRadius: 10,
            padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}>{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Icon ───────────────────────────────────────────────────────────────
function EditIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

// ─── INVENTORY PAGE ────────────────────────────────────────────────────────
export default function Inventory() {
  const { t } = useTheme();
  const [products, setProducts] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const loadProducts = () => {
    fetch(`${BACKEND}/api/products`)
      .then((res) => res.json())
      .then(setProducts)
      .catch((e) => setLoadErr(e.message || "Products load nahi ho paaye"));
  };

  useEffect(() => { loadProducts(); }, []);

  const categorySuggestions = useCategorySuggestions(products);

  if (!products) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontSize: 13 }}>
        {loadErr ? `❌ ${loadErr}` : "Loading inventory..."}
      </div>
    );
  }

  const withStatus = products.map((p) => ({ ...p, status: getStatus(p.stock) }));

  // Categories that actually exist in the data right now, for the filter dropdown.
  const filterCategories = [...new Set(withStatus.map((p) => p.category).filter(Boolean))].sort();

  const totalSKUs = withStatus.length;
  const totalQty = withStatus.reduce((s, i) => s + i.stock, 0);
  const lowStock = withStatus.filter((i) => i.status === "Low Stock").length;
  const outOfStock = withStatus.filter((i) => i.status === "Out of Stock").length;

  const filtered = withStatus
    .filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.productId.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === "All" || item.category === category;
      const matchStatus = status === "All" || item.status === status;
      return matchSearch && matchCategory && matchStatus;
    })
    .sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (typeof va === "number") { /* keep numeric */ }
      else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const statusStyle = {
    "In Stock": { color: t.green, bg: t.greenBg },
    "Low Stock": { color: t.orange, bg: t.orangeBg },
    "Out of Stock": { color: t.red, bg: t.redBg },
  };

  const inputStyle = {
    background: t.bgCard, border: `1px solid ${t.border}`, color: t.textPrimary,
    borderRadius: "10px", padding: "8px 14px", fontSize: "12px",
    fontFamily: "'DM Sans', sans-serif", outline: "none",
  };

  // Native <option> elements often ignore the parent <select>'s CSS color
  // and fall back to system colors (white text on white background in
  // dark themes). Styling each <option> explicitly fixes this in Chrome/Edge/Firefox.
  const optionStyle = { color: t.textPrimary, background: t.bgCard };

  const SortArrow = ({ col }) => {
    if (sortKey !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4, color: t.accent }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <>
      <style>{`
        .inv-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap: 12px; }
        .inv-filters { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
        .inv-table-wrap { overflow-x: auto; }
        .inv-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .inv-table th { cursor: pointer; user-select: none; }
        .inv-table th:hover { opacity: 0.8; }
        .inv-edit-btn { background: transparent; border: none; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
        @media (max-width: 640px) { .inv-stat-grid { grid-template-columns: repeat(2,1fr); } }
      `}</style>

      {showAdd && (
        <AddProductModal
          t={t}
          existingProducts={products}
          categorySuggestions={categorySuggestions}
          onClose={() => setShowAdd(false)}
          onAdded={loadProducts}
        />
      )}
      {editProduct && (
        <EditProductModal
          t={t}
          product={editProduct}
          existingProducts={products}
          categorySuggestions={categorySuggestions}
          onClose={() => setEditProduct(null)}
          onSaved={loadProducts}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "28px", fontWeight: 900, color: t.textPrimary, letterSpacing: "-0.03em" }}>Inventory</h1>
            <p style={{ fontSize: "13px", color: t.textMuted, marginTop: "4px" }}>Manage your product stock, SKUs, and availability</p>
          </div>
          <VoiceAddProduct onProductAdded={loadProducts} />
          <button onClick={() => setShowAdd(true)} style={{
            background: t.accent, color: "#fff", border: "none", borderRadius: 10,
            padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
          }}>+ Add Product</button>
        </div>

        <div className="inv-stat-grid">
          <StatCard label="Total SKUs" value={totalSKUs} sub="products tracked" />
          <StatCard label="Total Qty" value={totalQty.toLocaleString("en-IN")} sub="units in store" />
          <StatCard label="Low Stock" value={lowStock} trend={`${lowStock} items`} trendDir="neu" sub="need reorder" />
          <StatCard label="Out of Stock" value={outOfStock} trend={`${outOfStock} items`} trendDir="down" sub="unavailable" />
        </div>

        <div style={{
          borderRadius: "16px", padding: "20px", background: t.bgCard, border: `1px solid ${t.border}`,
          display: "flex", flexDirection: "column", gap: "16px",
        }}>
          <div className="inv-filters">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or SKU…" style={{ ...inputStyle, flex: "1 1 200px", minWidth: "160px" }} />
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option style={optionStyle}>All</option>
              {filterCategories.map((c) => <option key={c} style={optionStyle}>{c}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {STATUSES.map((s) => <option key={s} style={optionStyle}>{s}</option>)}
            </select>
            <span style={{ fontSize: "11px", color: t.textMuted, marginLeft: "auto" }}>{filtered.length} of {withStatus.length} items</span>
          </div>

          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                  {[
                    { key: "productId", label: "SKU" },
                    { key: "name", label: "Product" },
                    { key: "category", label: "Category" },
                    { key: "stock", label: "Stock" },
                    { key: "price", label: "Price" },
                    { key: "growthPercent", label: "Growth" },
                    { key: "status", label: "Status" },
                  ].map(({ key, label }) => (
                    <th key={key} onClick={() => handleSort(key)} style={{
                      textAlign: "left", paddingBottom: "10px", fontSize: "10px", fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMuted,
                      fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
                    }}>{label}<SortArrow col={key} /></th>
                  ))}
                  <th style={{
                    textAlign: "left", paddingBottom: "10px", fontSize: "10px", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMuted,
                    fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", cursor: "default",
                  }}>Edit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: t.textMuted, fontSize: "13px" }}>No items match your filters.</td></tr>
                ) : filtered.map((item, i) => (
                  <tr key={item._id || item.productId} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${t.borderLight ?? t.border}` : "none" }}>
                    <td style={{ padding: "10px 16px 10px 0", fontFamily: "monospace", fontSize: "11px", color: t.textMuted }}>{item.productId}</td>
                    <td style={{ padding: "10px 16px 10px 0", fontWeight: 600, color: t.textPrimary, whiteSpace: "nowrap" }}>{item.name}</td>
                    <td style={{ padding: "10px 16px 10px 0", fontSize: "11px", color: t.textMuted }}>{item.category}</td>
                    <td style={{ padding: "10px 16px 10px 0", fontWeight: 700, color: item.stock === 0 ? t.red : item.stock < 50 ? t.orange : t.textPrimary, fontFamily: "'Syne', sans-serif" }}>{item.stock.toLocaleString("en-IN")}</td>
                    <td style={{ padding: "10px 16px 10px 0", fontWeight: 600, color: t.textPrimary }}>₹{item.price.toLocaleString("en-IN")}</td>
                    <td style={{ padding: "10px 16px 10px 0", fontSize: "11px", color: item.growthPercent >= 0 ? t.green : t.red }}>{item.growthPercent >= 0 ? "+" : ""}{item.growthPercent}%</td>
                    <td style={{ padding: "10px 0" }}>
                      <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 9px", borderRadius: "99px", color: statusStyle[item.status].color, background: statusStyle[item.status].bg, whiteSpace: "nowrap" }}>{item.status}</span>
                    </td>
                    <td style={{ padding: "10px 0" }}>
                      <button
                        className="inv-edit-btn"
                        onClick={() => setEditProduct(item)}
                        title="Edit product"
                        style={{ color: t.accent }}
                      ><EditIcon /></button>
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