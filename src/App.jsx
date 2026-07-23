import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, useTheme } from "./components/ThemeContext";
import { NotificationProvider } from "./components/NotificationContext";
import { AuthProvider, useAuth } from "./context/AuthContext";   // ← ADD
import { Navbar, Sidebar, NAV_ITEMS } from "./components/Navbar";
import GlobalScrollbar from "./components/GlobalScrollbar";     // ← ADD
import Login from "./pages/Login";       // ← ADD
import Signup from "./pages/Signup";     // ← ADD
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
import ForgotPassword from "./pages/ForgotPassword";
import VerifyEmail from "./pages/VerifyEmail";
// ─── PROTECTED ROUTE WRAPPER ──────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null; // ya ek loading spinner
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ─── INNER APP ────────────────────────────────────────────────────────────────
function AppInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <GlobalScrollbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/*" element={

          <ProtectedRoute>
            <div className="min-h-screen" style={{ background: t.bgPage }}>
              <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
              <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
              <main className="pt-20 px-4 md:px-8 pb-10 max-w-7xl mx-auto">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/subscription" element={<Subscription />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/billing" element={<Orders />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/stocks" element={<Stocks />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/suppliers" element={<Suppliers />} />

                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>          
          <NotificationProvider>
            <AppInner />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}