import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, FileText, Gavel, Wallet, Users, Shield,
  AlertTriangle, Globe, BookOpen, Building2, Eye, ClipboardCheck
} from "lucide-react";

const navItems = {
  central_gov: [
    { to: "/dashboard",   icon: LayoutDashboard, label: "Dashboard" },
    { to: "/funding",     icon: Wallet,          label: "Fund Requests" },
    { to: "/tenders",     icon: FileText,        label: "All Tenders" },
    { to: "/contracts",   icon: Gavel,           label: "Contracts" },
    { to: "/complaints",  icon: AlertTriangle,   label: "Complaints" },
    { to: "/ledger",      icon: BookOpen,        label: "Audit Ledger" },
  ],
  state_gov: [
    { to: "/dashboard",   icon: LayoutDashboard, label: "Dashboard" },
    { to: "/funding",     icon: Wallet,          label: "Fund Requests" },
    { to: "/tenders",     icon: FileText,        label: "Tenders" },
    { to: "/contracts",   icon: Gavel,           label: "Contracts" },
    { to: "/verify",      icon: ClipboardCheck,  label: "Verify Work" },
    { to: "/contractors", icon: Users,           label: "Contractors" },
    { to: "/complaints",  icon: AlertTriangle,   label: "Complaints" },
  ],
  contractor: [
    { to: "/dashboard",   icon: LayoutDashboard, label: "Dashboard" },
    { to: "/tenders",     icon: FileText,        label: "Open Tenders" },
    { to: "/my-bids",     icon: Gavel,           label: "My Bids" },
    { to: "/my-contracts",icon: Building2,       label: "My Projects" },
  ],
  community: [
    { to: "/portal",      icon: Globe,           label: "Projects" },
    { to: "/verify",      icon: Eye,             label: "Verify Projects" },
    { to: "/ledger",      icon: BookOpen,        label: "Public Ledger" },
    { to: "/report",      icon: AlertTriangle,   label: "Report Issue" },
  ],
  auditor_ngo: [
    { to: "/dashboard",   icon: LayoutDashboard, label: "Dashboard" },
    { to: "/verify",      icon: ClipboardCheck,  label: "Verify Work" },
    { to: "/complaints",  icon: AlertTriangle,   label: "Complaints" },
    { to: "/ledger",      icon: BookOpen,        label: "Audit Ledger" },
  ],
};

export default function Sidebar({ theme }) {
  const { user } = useAuth();
  const items = navItems[user?.role] || navItems.community;

  return (
    <aside
      className="w-64 flex flex-col border-r border-sand-200 shadow-card"
      style={{ backgroundColor: theme.primary + "0D" }} // very faint primary tint
    >
      {/* ── Logo area ── */}
      <div className="flex flex-col items-center py-6 px-4 border-b border-sand-200">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-heading text-2xl font-bold shadow-md"
          style={{ backgroundColor: theme.primary }}
        >
          {user?.state?.code || "IN"}
        </div>
        <h2 className="mt-3 font-heading font-semibold text-lg text-center" style={{ color: theme.primary }}>
          {user?.state?.name || "TenderGuard"}
        </h2>
        <span className="text-xs text-gray-500 mt-1 capitalize">{user?.role?.replace("_", " ")}</span>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "text-white shadow-md"
                  : "text-gray-600 hover:bg-sand-100 hover:text-gray-800"
              }`
            }
            style={({ isActive }) =>
              isActive ? { backgroundColor: theme.primary } : {}
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="p-4 border-t border-sand-200 text-center text-xs text-gray-400">
        TenderGuard v1.0
      </div>
    </aside>
  );
}
