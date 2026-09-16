import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);
const BACKEND = "https://billing-backend-tawny.vercel.app";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suspendedInfo, setSuspendedInfo] = useState(null); // { reason }
  const navigate = useNavigate();
  const pollRef = useRef(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const setSession = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const handleSuspension = (reason) => {
    logout();
    setSuspendedInfo({ reason: reason || "" });
    navigate("/", { replace: true });
  };

  // ── GLOBAL FETCH WRAPPER — kisi bhi authenticated API response mein
  // SHOP_SUSPENDED code aaye to turant session clear + modal + redirect.
  // Isse har page ka fetch call automatically cover ho jata hai. ──────
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      try {
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
        if (url.startsWith(BACKEND) && response.status === 403) {
          const clone = response.clone();
          const data = await clone.json().catch(() => null);
          if (data?.code === "SHOP_SUSPENDED") {
            handleSuspension(data.reason);
          }
        }
      } catch {
        // ignore parse errors, don't block the real response
      }
      return response;
    };
    return () => { window.fetch = originalFetch; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── POLLING — agar user kisi page pe idle baitha hai (koi fetch nahi
  // ho rahi), tab bhi 45 sec ke andar suspend detect ho jaaye ─────────
  useEffect(() => {
    if (!token) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    const check = async () => {
      try {
        await fetch(`${BACKEND}/api/settings/ping`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // fetch wrapper upar already 403+SHOP_SUSPENDED handle kar dega
      } catch {
        // network error, ignore
      }
    };
    pollRef.current = setInterval(check, 45000);
    return () => clearInterval(pollRef.current);
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch(`${BACKEND}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || "Login failed");
      err.needsSignupVerification = data.needsSignupVerification;
      err.email = data.email;
      err.code = data.code;
      throw err;
    }
    return data;
  };

  const verifyLoginOtp = async (email, otp) => {
    const res = await fetch(`${BACKEND}/api/auth/verify-login-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || "OTP verification failed");
      err.code = data.code;
      throw err;
    }
    setSession(data);
    return data;
  };

  const signupOwner = async ({ name, email, password, shopName }) => {
    const res = await fetch(`${BACKEND}/api/auth/signup-owner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, shopName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Signup failed");
    return data;
  };

  const signupStaff = async ({ name, email, password, shopId }) => {
    const res = await fetch(`${BACKEND}/api/auth/signup-staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, shopId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Signup failed");
    return data;
  };

  const verifySignupOtp = async (email, otp) => {
    const res = await fetch(`${BACKEND}/api/auth/verify-signup-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Verification failed");
    setSession(data);
    return data;
  };

  const resendOtp = async (email) => {
    const res = await fetch(`${BACKEND}/api/auth/resend-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Resend failed");
    return data;
  };

  const forgotPassword = async (email) => {
    const res = await fetch(`${BACKEND}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };

  const resetPassword = async (email, otp, newPassword) => {
    const res = await fetch(`${BACKEND}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Reset failed");
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user, token, loading,
        login, verifyLoginOtp,
        signupOwner, signupStaff, verifySignupOtp,
        resendOtp, forgotPassword, resetPassword,
        logout,
      }}
    >
      {children}
      {suspendedInfo && (
        <SuspendedModal
          reason={suspendedInfo.reason}
          onClose={() => setSuspendedInfo(null)}
        />
      )}
    </AuthContext.Provider>
  );
}

function SuspendedModal({ reason, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "28px 24px", maxWidth: 380,
        width: "100%", textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
      }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>Shop Suspended</h2>
        <p style={{ fontSize: 13.5, color: "#555", margin: "0 0 4px", lineHeight: 1.5 }}>
          Your shop's access has been suspended by the admin.
        </p>
        {reason && (
          <p style={{ fontSize: 12.5, color: "#c0392b", margin: "8px 0 0" }}>
            Reason: {reason}
          </p>
        )}
        <button
          onClick={onClose}
          style={{
            marginTop: 20, padding: "10px 24px", borderRadius: 10, border: "none",
            background: "#111", color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}