import { useState, useEffect, useRef } from "react";
import api from "../api/client";

export default function NotificationBell() {
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function load() {
    try {
      const { data } = await api.get("/notifications");
      setNotifs(data.notifications || []);
    } catch { /* */ }
  }

  async function markRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      load();
    } catch { /* */ }
  }

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="relative text-gray-500 hover:text-gray-700">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-72 bg-white border rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Notifications</span>
            {unread > 0 && <span className="text-xs text-teal-600">{unread} new</span>}
          </div>
          <div className="divide-y">
            {notifs.slice(0, 20).map(n => (
              <div key={n.id} className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-50 ${!n.is_read ? "bg-teal-50" : ""}`}
                onClick={() => !n.is_read && markRead(n.id)}>
                <p className="text-gray-700">{n.message}</p>
                <p className="text-gray-300 mt-0.5">{new Date(n.createdAt).toLocaleString("en-IN")}</p>
              </div>
            ))}
            {notifs.length === 0 && (
              <div className="px-3 py-6 text-center text-gray-400 text-xs">No notifications</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
