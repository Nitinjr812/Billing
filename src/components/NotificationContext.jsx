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

  // ── Delete ONE notification (used for the per-card trash button) ────
  const deleteNotification = async (id) => {
    const prev = notifications;
    setNotifications((cur) => cur.filter((n) => n._id !== id)); // optimistic
    try {
      await api(`/notifications/${id}`, { method: "DELETE" });
    } catch {
      setNotifications(prev); // revert on failure
    }
  };

  // ── Delete MANY at once (used when clearing a deduped "x3" group) ───
  const deleteMany = async (ids) => {
    const prev = notifications;
    setNotifications((cur) => cur.filter((n) => !ids.includes(n._id))); // optimistic
    try {
      await Promise.all(ids.map((id) => api(`/notifications/${id}`, { method: "DELETE" })));
    } catch {
      setNotifications(prev);
      load(); // resync — some may have deleted, some not
    }
  };

  // "Clear all" = actually delete everything, not just mark as read.
  const clearAll = async () => {
    const prev = notifications;
    setNotifications([]); // optimistic
    try {
      await api("/notifications", { method: "DELETE" });
    } catch {
      setNotifications(prev); // revert on failure
      load();
    }
  };

  // ── AI suggestion for a single notification, cached in local state ──
  const [suggestionLoading, setSuggestionLoading] = useState({}); // { [id]: bool }

  const getSuggestion = async (id) => {
    // already cached on the notification object from a previous fetch/backend
    const existing = notifications.find((n) => n._id === id);
    if (existing?.aiSuggestion) return existing.aiSuggestion;

    setSuggestionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await api(`/notifications/${id}/suggest`, { method: "POST" });
      const suggestion = res?.suggestion || "Could not generate a suggestion right now.";
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, aiSuggestion: suggestion } : n))
      );
      return suggestion;
    } catch {
      return "Could not generate a suggestion right now — try again.";
    } finally {
      setSuggestionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        clearAll,
        deleteNotification,
        deleteMany,
        scanStock,
        getSuggestion,
        suggestionLoading,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}