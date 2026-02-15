import { useState, useEffect, useRef } from "react";
import api from "../api/client";
import { Bell, Check, CheckCheck, X, AlertTriangle, CheckCircle, IndianRupee, Award, Eye, Clock } from "lucide-react";

const typeIcons = {
  proof_submitted: { icon: Eye, color: "text-blue-500", bg: "bg-blue-50" },
  proof_approved: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50" },
  proof_rejected: { icon: X, color: "text-red-500", bg: "bg-red-50" },
  payment_released: { icon: IndianRupee, color: "text-green-600", bg: "bg-green-50" },
  contract_awarded: { icon: Award, color: "text-purple-500", bg: "bg-purple-50" },
  bid_won: { icon: Award, color: "text-amber-500", bg: "bg-amber-50" },
  verification_needed: { icon: Eye, color: "text-orange-500", bg: "bg-orange-50" },
  warning_issued: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
  milestone_due: { icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
};

export default function NotificationBell({ theme }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);

  const loadNotifications = async () => {
    try {
      const [{ data: notifs }, { data: countData }] = await Promise.all([
        api.get("/notifications?limit=20"),
        api.get("/notifications/unread-count"),
      ]);
      setNotifications(notifs.notifications || []);
      setUnreadCount(countData.count || 0);
    } catch {
      // Silently fail if endpoint not ready
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const formatTime = (ts) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) loadNotifications(); }}
        className="relative p-2 rounded-lg hover:bg-sand-100 transition"
      >
        <Bell size={18} className="text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 max-h-[500px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-heading font-semibold text-sm text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: theme?.primary }}>
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map(n => {
                const cfg = typeIcons[n.type] || typeIcons.proof_submitted;
                const Icon = cfg.icon;
                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer ${!n.is_read ? "bg-blue-50/30" : ""}`}
                    onClick={() => !n.is_read && markRead(n.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon size={14} className={cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-700 truncate">{n.title}</p>
                          {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{formatTime(n.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
