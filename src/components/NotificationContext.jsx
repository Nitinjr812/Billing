import { createContext, useContext, useState } from "react";

// ─── DUMMY NOTIFICATIONS ──────────────────────────────────────────────────────
const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    type: "revenue",
    icon: "📈",
    title: "Revenue Milestone Hit!",
    message: "May revenue crossed ₹4,80,000 — highest this quarter.",
    time: "2 min ago",
    read: false,
  },
  {
    id: 2,
    type: "order",
    icon: "📦",
    title: "12 New Orders Received",
    message: "Orders #1284 to #1296 are waiting for processing.",
    time: "18 min ago",
    read: false,
  },
  {
    id: 3,
    type: "inventory",
    icon: "⚠️",
    title: "Low Stock Alert",
    message: "Prod-Theta is down to 18 units. Reorder soon.",
    time: "1 hr ago",
    read: false,
  },
  {
    id: 4,
    type: "customer",
    icon: "👤",
    title: "New Customer Registered",
    message: "Simran Kaur signed up and placed her first order.",
    time: "3 hr ago",
    read: false,
  },
  {
    id: 5,
    type: "inventory",
    icon: "🚫",
    title: "Out of Stock: Prod-Omega",
    message: "Prod-Omega is completely out of stock. 10 pending orders affected.",
    time: "5 hr ago",
    read: true,
  },
  {
    id: 6,
    type: "order",
    icon: "❌",
    title: "Cancellation Spike Detected",
    message: "Cancellation rate reached 7.1% today — above your 6% threshold.",
    time: "Yesterday",
    read: true,
  },
  {
    id: 7,
    type: "report",
    icon: "📊",
    title: "Weekly Report Ready",
    message: "Your Apr 28 – May 4 performance report has been generated.",
    time: "2 days ago",
    read: true,
  },
  {
    id: 8,
    type: "revenue",
    icon: "💳",
    title: "Invoice Overdue",
    message: "3 invoices worth ₹38,500 are overdue. Follow up with clients.",
    time: "2 days ago",
    read: true,
  },
];

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

  const markAllAsRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const clearAll = () => setNotifications([]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}