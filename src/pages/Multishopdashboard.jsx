// ── MULTI-SHOP DASHBOARD COMPONENT ──────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { useTheme } from "../components/ThemeContext";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler
);

const BACKEND = "https://billing-backend-tawny.vercel.app";

// ── SHOP SELECTOR COMPONENT ────────────────────────────────────────────
function ShopSelector({ currentShopId, onShopChange, shops, loading }) {
  const { t } = useTheme();

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "12px 16px",
      background: t.bgCard,
      borderRadius: "12px",
      border: `1px solid ${t.border}`,
      marginBottom: "14px",
    }}>
      <label style={{
        fontSize: "12px",
        fontWeight: 600,
        color: t.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}>
        Select Shop:
      </label>

      <select
        value={currentShopId}
        onChange={(e) => onShopChange(e.target.value)}
        disabled={loading}
        style={{
          flex: 1,
          padding: "8px 12px",
          fontSize: "14px",
          fontWeight: 600,
          borderRadius: "8px",
          border: `1px solid ${t.border}`,
          background: t.bgCard,
          color: t.textPrimary,
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "'Syne', sans-serif",
        }}
      >
        {shops.map((shop) => (
          <option key={shop.shopId} value={shop.shopId}>
            {shop.name} ({shop.city}) - {shop.category}
          </option>
        ))}
      </select>

      {loading && (
        <span style={{
          fontSize: "12px",
          color: t.textMuted,
          fontStyle: "italic",
        }}>
          Loading...
        </span>
      )}
    </div>
  );
}

// ── ADD PRODUCT FORM ───────────────────────────────────────────────────
function AddProductForm({ shopId, onProductAdded, t }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    costPrice: "",
    stock: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND}/api/shops/product/${shopId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          price: parseFloat(formData.price),
          costPrice: parseFloat(formData.costPrice),
          stock: parseInt(formData.stock),
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Product added successfully!");
        setFormData({ name: "", category: "", price: "", costPrice: "", stock: "" });
        setIsOpen(false);
        onProductAdded();
      }
    } catch (err) {
      alert("❌ Error adding product");
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: "8px 16px",
          fontSize: "12px",
          fontWeight: 600,
          borderRadius: "8px",
          background: t.accent,
          color: "#fff",
          border: "none",
          cursor: "pointer",
          marginBottom: "14px",
        }}
      >
        + Add New Product
      </button>
    );
  }

  return (
    <div style={{
      background: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: "12px",
      padding: "16px",
      marginBottom: "14px",
    }}>
      <h3 style={{ margin: "0 0 12px", color: t.textPrimary, fontSize: "14px", fontWeight: 700 }}>
        Add New Product
      </h3>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="Product Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            style={{
              padding: "8px",
              border: `1px solid ${t.border}`,
              borderRadius: "6px",
              fontSize: "12px",
              background: t.bgCard,
              color: t.textPrimary,
            }}
          />
          <input
            type="text"
            placeholder="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
            style={{
              padding: "8px",
              border: `1px solid ${t.border}`,
              borderRadius: "6px",
              fontSize: "12px",
              background: t.bgCard,
              color: t.textPrimary,
            }}
          />
          <input
            type="number"
            placeholder="Selling Price"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            required
            style={{
              padding: "8px",
              border: `1px solid ${t.border}`,
              borderRadius: "6px",
              fontSize: "12px",
              background: t.bgCard,
              color: t.textPrimary,
            }}
          />
          <input
            type="number"
            placeholder="Cost Price"
            value={formData.costPrice}
            onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
            required
            style={{
              padding: "8px",
              border: `1px solid ${t.border}`,
              borderRadius: "6px",
              fontSize: "12px",
              background: t.bgCard,
              color: t.textPrimary,
            }}
          />
          <input
            type="number"
            placeholder="Initial Stock"
            value={formData.stock}
            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
            required
            style={{
              padding: "8px",
              border: `1px solid ${t.border}`,
              borderRadius: "6px",
              fontSize: "12px",
              background: t.bgCard,
              color: t.textPrimary,
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={{
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: 600,
              borderRadius: "6px",
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              color: t.textPrimary,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: 600,
              borderRadius: "6px",
              background: t.accent,
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Add Product
          </button>
        </div>
      </form>
    </div>
  );
}

// ── MAIN MULTI-SHOP DASHBOARD ─────────────────────────────────────────
export default function MultiShopDashboard() {
  const { t } = useTheme();
  const [shops, setShops] = useState([]);
  const [currentShopId, setCurrentShopId] = useState("shop_001");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch shops list
  useEffect(() => {
    const fetchShops = async () => {
      try {
        const res = await fetch(`${BACKEND}/api/shops/shops`);
        const data = await res.json();
        setShops(data);
      } catch (err) {
        console.error("Error fetching shops:", err);
      }
    };
    fetchShops();
  }, []);

  // Fetch dashboard data when shop changes
  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND}/api/shops/dashboard/${currentShopId}`);
        const data = await res.json();
        setDashboardData(data);
      } catch (err) {
        console.error("Error fetching dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    if (currentShopId) {
      fetchDashboard();
    }
  }, [currentShopId]);

  const handleShopChange = (shopId) => {
    setCurrentShopId(shopId);
  };

  const handleProductAdded = () => {
    // Refresh dashboard
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${BACKEND}/api/shops/dashboard/${currentShopId}`);
        const data = await res.json();
        setDashboardData(data);
      } catch (err) {
        console.error("Error refreshing dashboard:", err);
      }
    };
    fetchDashboard();
  };

  if (!dashboardData) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: t.textMuted }}>
        Loading...
      </div>
    );
  }

  const { shop, stats } = dashboardData;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: 0, overflow: "hidden" }}>
      {/* Header with Shop Selector */}
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "clamp(20px, 6vw, 28px)",
          fontWeight: 900,
          color: t.textPrimary,
          letterSpacing: "-0.03em",
          margin: 0,
        }}>
          Multi-Shop Dashboard
        </h1>
        <p style={{ fontSize: "12px", color: t.textMuted, marginTop: "4px", marginBottom: "12px" }}>
          Manage all your shops from one place
        </p>

        <ShopSelector
          currentShopId={currentShopId}
          onShopChange={handleShopChange}
          shops={shops}
          loading={loading}
        />
      </div>

      {/* Current Shop Info */}
      {!loading && (
        <div style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: "12px",
          padding: "14px",
        }}>
          <p style={{ margin: 0, fontSize: "12px", color: t.textMuted }}>
            📍 {shop.city} | 🏪 {shop.category} | Since {new Date(shop.createdAt).toLocaleDateString()}
          </p>
          <h2 style={{
            margin: "6px 0 0",
            fontSize: "18px",
            fontWeight: 700,
            color: t.textPrimary,
          }}>
            {shop.name}
          </h2>
        </div>
      )}

      {/* Add Product Button */}
      <AddProductForm shopId={currentShopId} onProductAdded={handleProductAdded} t={t} />

      {/* KPI Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "12px",
      }}>
        <KpiCard
          label="Total Revenue"
          value={`₹${stats.totalRevenue.toLocaleString("en-IN")}`}
          trend="↑ 12.4%"
          trendDir="up"
          sub="this month"
          t={t}
        />
        <KpiCard
          label="Total Orders"
          value={stats.total}
          trend={`↑ ${stats.delivered}`}
          trendDir="up"
          sub="delivered"
          t={t}
        />
        <KpiCard
          label="Pending"
          value={stats.pending}
          trend={`${stats.cancellationRate}%`}
          trendDir={stats.cancellationRate > 5 ? "down" : "neu"}
          sub="cancellation rate"
          t={t}
        />
        <KpiCard
          label="Slow Movers"
          value={stats.slowMoving.length}
          trend="⚠️"
          trendDir="down"
          sub="need attention"
          t={t}
        />
      </div>

      {/* Alerts Section */}
      {stats.outOfStock.length > 0 || stats.lowStock.length > 0 ? (
        <div style={{
          background: `${t.red}15`,
          border: `1px solid ${t.red}40`,
          borderRadius: "12px",
          padding: "14px",
        }}>
          <h3 style={{ margin: "0 0 10px", color: t.red, fontSize: "13px", fontWeight: 700 }}>
            🚨 Stock Alerts
          </h3>

          {stats.outOfStock.length > 0 && (
            <div style={{ marginBottom: "8px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 600, color: t.textPrimary }}>
                Out of Stock:
              </p>
              <p style={{ margin: 0, fontSize: "11px", color: t.textMuted }}>
                {stats.outOfStock.map((p) => p.name).join(", ")}
              </p>
            </div>
          )}

          {stats.lowStock.length > 0 && (
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 600, color: t.textPrimary }}>
                Low Stock:
              </p>
              <p style={{ margin: 0, fontSize: "11px", color: t.textMuted }}>
                {stats.lowStock.map((p) => `${p.name} (${p.stock} units)`).join(", ")}
              </p>
            </div>
          )}
        </div>
      ) : null}

      {/* Action Item: Recommendations */}
      <div style={{
        background: `${t.blue}15`,
        border: `1px solid ${t.blue}40`,
        borderRadius: "12px",
        padding: "14px",
      }}>
        <h3 style={{ margin: "0 0 10px", color: t.blue, fontSize: "13px", fontWeight: 700 }}>
          💡 Recommendations
        </h3>
        <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "11px", color: t.textMuted, lineHeight: 1.6 }}>
          {stats.slowMoving.length > 0 && (
            <li>Run a {stats.slowMoving[0].price > 1000 ? "15%" : "10%"} discount on {stats.slowMoving[0].name}</li>
          )}
          {stats.outOfStock.length > 0 && (
            <li>Urgently restock {stats.outOfStock[0].name} - high demand detected</li>
          )}
          {stats.fastGrowing.length > 0 && (
            <li>Bundle {stats.fastGrowing[0].name} with complementary products</li>
          )}
        </ul>
      </div>
    </div>
  );
}

// ── KPI CARD COMPONENT ─────────────────────────────────────────────────
function KpiCard({ label, value, trend, trendDir, sub, t }) {
  const colors = { up: t.green, down: t.red, neu: t.orange };
  const bgs = { up: t.greenBg, down: t.redBg, neu: t.orangeBg };

  return (
    <div style={{
      borderRadius: "14px",
      padding: "14px",
      background: t.bgCard,
      border: `1px solid ${t.border}`,
    }}>
      <p style={{
        fontSize: "9px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: t.textMuted,
        margin: 0,
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: "'Syne', sans-serif",
        fontSize: "24px",
        fontWeight: 900,
        color: t.textPrimary,
        margin: "8px 0",
      }}>
        {value}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        <span style={{
          fontSize: "10px",
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: "99px",
          color: colors[trendDir],
          background: bgs[trendDir],
        }}>
          {trend}
        </span>
        {sub && <span style={{ fontSize: "10px", color: t.textMuted }}>{sub}</span>}
      </div>
    </div>
  );
}