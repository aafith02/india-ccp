import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Landmark, ClipboardList, Wallet, ShieldAlert, Star, BarChart3,
  Building2, PlusCircle, Search, CheckCircle, Hammer, SearchCheck,
  Home, AlertTriangle, Briefcase, ShieldBan,
} from "lucide-react";

const linkBase = "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors";
const active = "bg-white/20 text-white";
const inactive = "text-white/70 hover:bg-white/10 hover:text-white";

function SideLink({ to, icon: Icon, label }) {
  return (
    <NavLink to={to} className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>
      <Icon size={18} />{label}
    </NavLink>
  );
}

const NAV = {
  central_gov: [
    { to: "/dashboard", icon: Landmark, label: "Dashboard" },
    { to: "/tenders", icon: ClipboardList, label: "All Tenders" },
    { to: "/funding", icon: Wallet, label: "Fund Requests" },
    { to: "/complaints", icon: ShieldAlert, label: "Complaints" },
    { to: "/cases", icon: Briefcase, label: "Cases" },
    { to: "/blacklist", icon: ShieldBan, label: "Blacklist" },
    { to: "/points", icon: Star, label: "Points & Rewards" },
    { to: "/ledger", icon: BarChart3, label: "Public Ledger" },
  ],
  state_gov: [
    { to: "/dashboard", icon: Building2, label: "Dashboard" },
    { to: "/tenders", icon: ClipboardList, label: "Tenders" },
    { to: "/tenders/new", icon: PlusCircle, label: "Create Tender" },
    { to: "/kyc", icon: Search, label: "KYC Verification" },
    { to: "/verify", icon: CheckCircle, label: "Work Proof Voting" },
    { to: "/funding", icon: Wallet, label: "Funding" },
    { to: "/blacklist", icon: ShieldBan, label: "Blacklist" },
    { to: "/points", icon: Star, label: "Points" },
    { to: "/ledger", icon: BarChart3, label: "Public Ledger" },
  ],
  contractor: [
    { to: "/dashboard", icon: Hammer, label: "Dashboard" },
    { to: "/tenders", icon: ClipboardList, label: "Browse Tenders" },
    { to: "/points", icon: Star, label: "My Points" },
    { to: "/ledger", icon: BarChart3, label: "Public Ledger" },
  ],
  auditor_ngo: [
    { to: "/dashboard", icon: SearchCheck, label: "Investigations" },
    { to: "/complaints", icon: ShieldAlert, label: "Complaints" },
    { to: "/cases", icon: Briefcase, label: "Cases" },
    { to: "/ledger", icon: BarChart3, label: "Public Ledger" },
  ],
  community: [
    { to: "/dashboard", icon: Home, label: "Portal" },
    { to: "/report", icon: AlertTriangle, label: "Report Issue" },
    { to: "/points", icon: Star, label: "Leaderboard" },
    { to: "/ledger", icon: BarChart3, label: "Public Ledger" },
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  const links = NAV[user?.role] || NAV.community;
  const isStateUser = user?.role === "state_gov";
  const stateTheme = user?.State?.theme;
  const topColor = isStateUser ? (stateTheme?.primary || "#0f766e") : "#0f766e";
  const bottomColor = isStateUser ? (stateTheme?.secondary || "#134e4a") : "#134e4a";

  return (
    <aside className="w-56 min-h-screen flex flex-col py-6 px-3 gap-1" style={{ background: `linear-gradient(to bottom, ${topColor}, ${bottomColor})` }}>
      <div className="px-4 mb-6">
        <h2 className="text-white font-bold text-lg tracking-wide">TenderGuard</h2>
        <p className="text-white/60 text-xs mt-0.5">v2 — Anti-Bribery Platform</p>
      </div>
      <nav className="flex flex-col gap-0.5">
        {links.map((l) => <SideLink key={l.to} {...l} />)}
      </nav>
      <div className="mt-auto px-4 py-3 text-white/50 text-[10px]">
        <p>Signed in as</p>
        <p className="text-white/90 text-xs font-medium truncate">{user?.name}</p>
        <p className="capitalize">{user?.role?.replace("_", " ")}</p>
      </div>
    </aside>
  );
}
