import { createContext, useContext, useState, useEffect } from "react";

const BACKEND = "https://billing-backend-tawny.vercel.app";
const SA_ROUTE = "/api/sa-x7k9q2";

const SuperAdminAuthContext = createContext(null);

export function SuperAdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("sa_token"));
  const [admin, setAdmin] = useState(() => {
    const raw = localStorage.getItem("sa_admin");
    return raw ? JSON.parse(raw) : null;
  });

  const login = async (email, password) => {
    const res = await fetch(`${BACKEND}${SA_ROUTE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");

    localStorage.setItem("sa_token", data.token);
    localStorage.setItem("sa_admin", JSON.stringify({ name: data.name, email: data.email }));
    setToken(data.token);
    setAdmin({ name: data.name, email: data.email });
  };

  const logout = () => {
    localStorage.removeItem("sa_token");
    localStorage.removeItem("sa_admin");
    setToken(null);
    setAdmin(null);
  };

  const api = async (path, options = {}) => {
    const res = await fetch(`${BACKEND}${SA_ROUTE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (res.status === 401 || res.status === 403) {
      logout();
      throw new Error("Session expired, please login again");
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };

  return (
    <SuperAdminAuthContext.Provider value={{ token, admin, login, logout, api }}>
      {children}
    </SuperAdminAuthContext.Provider>
  );
}

export function useSuperAdminAuth() {
  const ctx = useContext(SuperAdminAuthContext);
  if (!ctx) throw new Error("useSuperAdminAuth must be used within SuperAdminAuthProvider");
  return ctx;
}