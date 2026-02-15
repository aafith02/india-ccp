import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import NotificationBell from "./NotificationBell";

export default function Header({ theme }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header
      className="flex items-center justify-between px-6 py-3 border-b border-sand-200 shadow-sm"
      style={{ backgroundColor: theme.primary + "08" }}
    >
      <div>
        <h1 className="font-heading font-semibold text-xl" style={{ color: theme.primary }}>
          TenderGuard
        </h1>
        <p className="text-xs text-gray-500">Transparent Public Tender Management</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <NotificationBell theme={theme} />

        {/* User info */}
        <div className="flex items-center gap-3 pl-4 border-l border-sand-200">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role?.replace("_", " ")}</p>
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: theme.primary }}
          >
            {user?.name?.[0] || <User size={16} />}
          </div>
          <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
