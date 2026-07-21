import { createContext, useContext, useState, useEffect, useCallback } from "react";

const BACKEND = "https://billing-backend-tawny.vercel.app";

// ─── Turn the backend's alert buckets into a flat notification list ───────
// data looks like: { outOfStock: [product, ...], lowStock: [...], slowMoving: [...] }
// Each product has at least: _id, name, stock, price.
//
// _id is built as "<type>-<product._id>" so that:
//   1. Re-scanning doesn't create duplicate notifications for the same issue.
//   2. Read/unread status survives a rescan (see scanStock below).
function buildNotifications(data) {
  const built = [];

  (data?.outOfStock || []).forEach((p) => {
    built.push({
      _id: `outOfStock-${p._id}`,
      type: "outOfStock",
      productName: p.name,
      message: `${p.name} is completely out of stock.`,
      createdAt: new Date().toISOString(),
    });
  });

  (data?.lowStock || []).forEach((p) => {
    built.push({
      _id: `lowStock-${p._id}`,
      type: "lowStock",
      productName: p.name,
      message: `${p.name} is down to ${p.stock} units. Reorder soon.`,
      createdAt: new Date().toISOString(),
    });
  });

  (data?.slowMoving || []).forEach((p) => {
    built.push({
      _id: `slowMoving-${p._id}`,
      type: "slowMoving",
      productName: p.name,
      message: `${p.name} hasn't sold in a while. Consider a discount or promo.`,
      createdAt: new Date().toISOString(),
    });
  });

  return built;
}

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);

  // scanStock = fetch the latest alerts from the backend and rebuild the
  // notification list. Called on mount, by the "🔄 Rescan Stock" button,
  // and by StockAlertPopup after a suggestion is requested.
  const scanStock = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/products/alerts`);
      const data = await res.json();
      const built = buildNotifications(data);

      setNotifications((prev) =>
        built.map((n) => ({
          ...n,
          read: readIds.has(n._id) || prev.find((p) => p._id === n._id)?.read || false,
        }))
      );
    } catch {
      // Network/API hiccup — keep whatever notifications we already had
      // instead of wiping the list to empty.
    } finally {
      setLoading(false);
    }
  }, [readIds]);

  useEffect(() => {
    scanStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAsRead = (id) => {
    setReadIds((prev) => new Set(prev).add(id));
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const ids = prev.map((n) => n._id);
      setReadIds((r) => new Set([...r, ...ids]));
      return prev.map((n) => ({ ...n, read: true }));
    });
  };

  const clearAll = () => {
    setNotifications([]);
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
        scanStock,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}