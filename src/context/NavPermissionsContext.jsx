import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { useApi } from "../hooks/useApi";

// Yeh 3 hamesha dikhte hain, chahe owner kuch bhi set kare
export const ALWAYS_VISIBLE_IDS = ["notifications", "settings", "billing", "tasks"];

function toSafeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => v !== null && v !== undefined).map((v) => String(v));
}

const NavPermissionsContext = createContext(null);

export function NavPermissionsProvider({ children }) {
  const { user } = useAuth();
  const api = useApi();
  const isOwner = user?.role === "owner";

  const [visible, setVisible] = useState([]); // sirf staff ke liye matter karta hai
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    api("/settings/nav-permissions")
      .then((res) => setVisible(toSafeStringArray(res?.visible)))
      .catch(() => setVisible([]))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const isVisible = (id) => {
    if (isOwner) return true;
    if (ALWAYS_VISIBLE_IDS.includes(id)) return true;
    return visible.includes(id);
  };

  return (
    <NavPermissionsContext.Provider value={{ isVisible, loading, isOwner, reload: load }}>
      {children}
    </NavPermissionsContext.Provider>
  );
}

export function useNavPermissions() {
  const ctx = useContext(NavPermissionsContext);
  if (!ctx) throw new Error("useNavPermissions must be used within a NavPermissionsProvider");
  return ctx;
}