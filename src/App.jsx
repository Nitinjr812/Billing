import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, useTheme } from "./components/ThemeContext";
import { Navbar, Sidebar, NAV_ITEMS } from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Subscription from "./pages/Subscription";

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

  // Auto-close sidebar on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: t.bgPage }}>

      {/* ── Navbar ── */}
      <Navbar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* ── Mobile Sidebar ── */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Page Content ── */}
      <main className="pt-20 px-4 md:px-8 pb-10 max-w-7xl mx-auto">
        <Routes>
          <Route path="/"                index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"       element={<Dashboard />} />
          <Route path="/subscription"    element={<Subscription />} />
          <Route path="/inventory"       element={<PlaceholderPage name="Inventory" />} />
          <Route path="/orders"          element={<PlaceholderPage name="Orders" />} />
          <Route path="/customers"       element={<PlaceholderPage name="Customers" />} />
          <Route path="/stocks"          element={<PlaceholderPage name="Stocks" />} />
          <Route path="/notifications"   element={<PlaceholderPage name="Notifications" />} />
          <Route path="/reports"         element={<PlaceholderPage name="Reports" />} />
          <Route path="/settings"        element={<PlaceholderPage name="Settings" />} />
          {/* Fallback */}
          <Route path="*"                element={<Navigate to="/dashboard" replace />} />
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
        <AppInner />
      </ThemeProvider>
    </BrowserRouter>
  );
}