import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider, useTheme } from "./components/ThemeContext";
import { NotificationProvider } from "./components/NotificationContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NavPermissionsProvider, useNavPermissions } from "./context/NavPermissionsContext";
import { SuperAdminAuthProvider, useSuperAdminAuth } from "./context/SuperAdminAuthContext";
import { SuperAdminUIProvider } from "./context/SuperAdminUIContext";
import { Navbar, Sidebar, NAV_ITEMS } from "./components/Navbar";
import GlobalScrollbar from "./components/GlobalScrollbar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Subscription from "./pages/Subscription";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Stocks from "./pages/Stocks";
import Reports from "./pages/Reports";
import DiscountPermissions from "./pages/DiscountPermissions";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Suppliers from "./pages/Supliers";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyEmail from "./pages/VerifyEmail";
import LandingPage from "./pages/Landingpage";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import Tasks from "../src/pages/Tasks";
import SplashScreen from "./components/SplashScreen";
import { registerServiceWorker } from "./registerServiceWorker";
registerServiceWorker();

// ─── PROTECTED ROUTE WRAPPER ──────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ─── SUPER ADMIN PROTECTED ROUTE ──────────────────────────────────────────
function SuperAdminProtectedRoute({ children }) {
  const { token } = useSuperAdminAuth();
  if (!token) return <Navigate to="/sa-x7k9q2-login" replace />;
  return children;
}

// ─── ROOT ("/") ────────────────────────────────────────────────────────────
function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

// ─── NAV GUARD — staff ko URL type karke restricted page pe jaane se roke ──
function useNavGuard() {
  const { user } = useAuth();
  const { isVisible, loading } = useNavPermissions();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || loading) return;
    const current = NAV_ITEMS.find((n) =>
      location.pathname.toLowerCase().startsWith(n.path.toLowerCase())
    );
    if (current && !isVisible(current.id)) {
      navigate("/notifications", { replace: true });
    }
  }, [user, loading, location.pathname, isVisible, navigate]);
}

// ─── INNER APP ────────────────────────────────────────────────────────────────
function AppInner() {
  const [showSplash, setShowSplash] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useTheme();

  useNavGuard();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
    {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <GlobalScrollbar />
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ─ Super Admin routes (secret, standalone) ─ */}
        <Route path="/sa-x7k9q2-login" element={<SuperAdminLogin />} />
        <Route
          path="/sa-x7k9q2-dashboard"
          element={
            <SuperAdminProtectedRoute>
              <SuperAdminDashboard />
            </SuperAdminProtectedRoute>
          }
        />
 
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="min-h-screen" style={{ background: t.bgPage }}>
                <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <main className="pt-20 px-4 md:px-8 pb-10 max-w-7xl mx-auto">
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/subscription" element={<Subscription />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/billing" element={<Orders />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/stocks" element={<Stocks />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/suppliers" element={<Suppliers />} />
                    <Route path="/discount-permissions" element={<DiscountPermissions />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <SuperAdminAuthProvider>
          <SuperAdminUIProvider>
            <AuthProvider>
              <NavPermissionsProvider>
                <NotificationProvider>
                  <AppInner />
                </NotificationProvider>
              </NavPermissionsProvider>
            </AuthProvider>
          </SuperAdminUIProvider>
        </SuperAdminAuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}