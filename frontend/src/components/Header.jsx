import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

const roleBadge = {
  central_gov: { label: "Central Gov", color: "bg-orange-100 text-orange-700" },
  state_gov: { label: "State Officer", color: "bg-blue-100 text-blue-700" },
  contractor: { label: "Contractor", color: "bg-teal-100 text-teal-700" },
  auditor_ngo: { label: "NGO Auditor", color: "bg-purple-100 text-purple-700" },
  community: { label: "Community", color: "bg-green-100 text-green-700" },
};

export default function Header() {
  const { user, logout } = useAuth();
  const badge = roleBadge[user?.role] || { label: user?.role, color: "bg-gray-100" };

  return (
    <header className="bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-gray-800">
          <span className="text-orange-500">Tender</span>
          <span className="text-teal-600">Guard</span>
          <span className="text-xs text-gray-400 ml-1">v2</span>
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {user && <NotificationBell />}
        {user && (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${badge.color}`}>{badge.label}</span>
            <span className="text-sm text-gray-600">{user.name}</span>
            <button onClick={logout} className="text-xs text-gray-400 hover:text-red-500 ml-2">Logout</button>
          </div>
        )}
      </div>
    </header>
  );
}
