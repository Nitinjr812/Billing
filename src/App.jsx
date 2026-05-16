import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, useTheme } from "./components/ThemeContext";
import { NotificationProvider } from "./components/NotificationContext";
import { Navbar, Sidebar, NAV_ITEMS } from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Subscription from "./pages/Subscription";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Stocks from "./pages/Stocks";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Suppliers from "./pages/Supliers";

// ─── PLACEHOLDER (baaki pages ke liye) ───────────────────────────────────────
function PlaceholderPage({ name }) {
  const { t } = useTheme();
  const icon = NAV_ITEMS.find((n) => n.label === name)?.icon ?? "◦";
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
        style={{ background: t.bgCard, border: `1px solid ${t.border}` }}
      >
        {icon}
      </div>
      <h2
        className="text-2xl font-black"
        style={{ fontFamily: "'Syne',sans-serif", color: t.textPrimary }}
      >
        {name}
      </h2>
      <p className="text-sm" style={{ color: t.textMuted }}>
        This section is coming soon.
      </p>
    </div>
  );
}

// ─── INNER APP ────────────────────────────────────────────────────────────────
function AppInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useTheme();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: t.bgPage }}>
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="pt-20 px-4 md:px-8 pb-10 max-w-7xl mx-auto">
        <Routes>
          <Route path="/"              index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/subscription"  element={<Subscription />} />
          <Route path="/inventory"     element={<Inventory />} />
          <Route path="/orders"        element={<Orders />} />
          <Route path="/customers"     element={<Customers />} />
          <Route path="/stocks"        element={<Stocks />} />
          <Route path="/reports"       element={<Reports />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings"      element={<Settings />} />
          <Route path="/suppliers"     element={<Suppliers />} /> {/* ← ADD THIS */}
          <Route path="*"              element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <NotificationProvider>
          <AppInner />
        </NotificationProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}