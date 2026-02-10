import { useState, useEffect } from "react";
import api from "../api/client";
import { Building2, FileText, Gavel, AlertTriangle, TrendingUp, IndianRupee } from "lucide-react";

export default function CentralDashboard() {
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/public/stats"),
      api.get("/public/ledger?limit=10"),
    ]).then(([statsRes, logsRes]) => {
      setStats(statsRes.data);
      setRecentLogs(logsRes.data.entries);
    });
  }, []);

  const cards = stats ? [
    { label: "Total Tenders",    value: stats.totalTenders,      icon: FileText,       color: "bg-blue-50 text-blue-600" },
    { label: "Open Tenders",     value: stats.openTenders,       icon: TrendingUp,     color: "bg-emerald-50 text-emerald-600" },
    { label: "Active Contracts", value: stats.totalContracts,    icon: Gavel,          color: "bg-amber-50 text-amber-600" },
    { label: "Completed",        value: stats.completedContracts,icon: Building2,      color: "bg-teal-50 text-teal-600" },
    { label: "Complaints",       value: stats.totalComplaints,   icon: AlertTriangle,  color: "bg-red-50 text-red-600" },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl text-gray-800">Central Government Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">National overview of all public tenders and contracts</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((card, i) => (
          <div key={card.label} className={`bg-white rounded-xl shadow-card p-5 animate-fade-up`} style={{ animationDelay: `${i * 0.05}s` }}>
            <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
              <card.icon size={18} />
            </div>
            <p className="text-2xl font-heading font-bold text-gray-800">{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Audit Activity */}
      <div className="bg-white rounded-xl shadow-card p-6 animate-fade-up-delay-2">
        <h3 className="font-heading font-semibold text-lg text-gray-800 mb-4">Recent Activity</h3>
        <div className="space-y-2">
          {recentLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-teal-400" />
                <span className="text-sm font-medium text-gray-700">{log.action}</span>
                <span className="text-xs text-gray-400 capitalize">{log.actor_role?.replace("_", " ")}</span>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(log.createdAt).toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
