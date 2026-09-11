import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const api = useApi();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    api("/notifications")
      .then((res) => setNotifications(Array.isArray(res?.notifications) ? res.notifications : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const scanStock = useCallback(async () => {
    setLoading(true);
    try {
      await api("/notifications/scan-stock", { method: "POST" });
      await load();
    } finally {
      setLoading(false);
    }
  }, [load]);

  const markAsRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      load(); // fail hua toh real state se sync kar
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api("/notifications/read-all", { method: "PATCH" });
    } catch {
      load();
    }
  };

  // "Clear all" = sab read mark kar de (broadcast notifications poori shop
  // ke liye shared hain, isliye delete karna sabke liye hata dega)
  const clearAll = markAllAsRead;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, markAsRead, markAllAsRead, clearAll, scanStock }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}