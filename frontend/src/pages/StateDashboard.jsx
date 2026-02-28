import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import AnalyticsCharts from "../components/AnalyticsCharts";

const statusColors = {
  open: "bg-green-100 text-green-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
};

export default function StateDashboard() {
  const { user } = useAuth();
  const [tenders, setTenders] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [members, setMembers] = useState([]);
  const [finance, setFinance] = useState(null);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  function fetchData() {
    api.get("/tenders").then(r => setTenders(r.data.tenders || [])).catch(() => {});
    api.get("/contracts").then(r => setContracts(r.data.contracts || [])).catch(() => {});
    if (user?.state_id) {
      api.get(`/states/${user.state_id}/members`).then(r => setMembers(r.data.members || [])).catch(() => {});
      api.get(`/states/${user.state_id}/finance`).then(r => setFinance(r.data)).catch(() => {});
    }
  }

  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
  const openTenders = tenders.filter(t => t.status === "open").length;
  const activeContracts = contracts.filter(c => c.status === "active").length;

  const stateName = user?.State?.name || "Your State";
  const stateTheme = user?.State?.theme || { primary: "#0d9488", secondary: "#d4a76a", bg: "#f8fafc" };

  const tabs = ["overview", "analytics", "tenders", "contracts", "team"];

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: stateTheme.bg }}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{stateName} Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Manage tenders, contracts, and verification for your state</p>
      </div>

      <div className="flex gap-2">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? "text-white" : "bg-gray-100 text-gray-600"}`}
            style={tab === t ? { backgroundColor: stateTheme.primary } : undefined}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {/* State Finance Summary */}
          {finance && (
            <div className="rounded-xl border p-5" style={{ borderColor: stateTheme.secondary, background: `linear-gradient(90deg, ${stateTheme.bg}, #ffffff)` }}>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">State Treasury</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Available Balance</p>
                  <p className="text-xl font-bold text-green-700">{fmt(finance.balance)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Received</p>
                  <p className="text-xl font-bold text-blue-700">{fmt(finance.total_received)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Allocated to Contracts</p>
                  <p className="text-xl font-bold text-purple-700">{fmt(finance.total_allocated)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pending Requests</p>
                  <p className="text-xl font-bold text-amber-700">{fmt(finance.pending_fund_requests)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 text-blue-700 rounded-xl p-5">
              <p className="text-xs font-medium opacity-70">Open Tenders</p>
              <p className="text-2xl font-bold mt-1">{openTenders}</p>
            </div>
            <div className="bg-green-50 text-green-700 rounded-xl p-5">
              <p className="text-xs font-medium opacity-70">Active Contracts</p>
              <p className="text-2xl font-bold mt-1">{activeContracts}</p>
            </div>
            <div className="bg-purple-50 text-purple-700 rounded-xl p-5">
              <p className="text-xs font-medium opacity-70">Team Members</p>
              <p className="text-2xl font-bold mt-1">{members.length}</p>
            </div>
            <div className="bg-teal-50 text-teal-700 rounded-xl p-5">
              <p className="text-xs font-medium opacity-70">Total Tenders</p>
              <p className="text-2xl font-bold mt-1">{tenders.length}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Link to="/tenders/new" className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition group">
              <p className="font-semibold text-gray-800 group-hover:text-teal-600">Create Tender</p>
              <p className="text-sm text-gray-500 mt-1">Publish a new tender for contractors</p>
            </Link>
            <Link to="/kyc" className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition group">
              <p className="font-semibold text-gray-800 group-hover:text-teal-600">KYC Verification</p>
              <p className="text-sm text-gray-500 mt-1">Verify contractor identities</p>
            </Link>
            <Link to="/verify" className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition group">
              <p className="font-semibold text-gray-800 group-hover:text-teal-600">Work Proof Voting</p>
              <p className="text-sm text-gray-500 mt-1">Review and vote on submitted work proofs</p>
            </Link>
          </div>
        </div>
      )}

      {tab === "analytics" && (
        <AnalyticsCharts />
      )}

      {tab === "tenders" && (
        <div className="space-y-3">
          {tenders.length === 0 ? <p className="text-gray-400 text-sm">No tenders yet</p> : tenders.map(t => (
            <Link key={t.id} to={`/tenders/${t.id}`} className="block bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{t.title}</h3>
                  <p className="text-sm text-gray-500">{t.location} — {t.category}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[t.status] || "bg-gray-100 text-gray-500"}`}>
                  {t.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === "contracts" && (
        <div className="space-y-3">
          {contracts.length === 0 ? <p className="text-gray-400 text-sm">No contracts yet</p> : contracts.map(c => (
            <Link key={c.id} to={`/contracts/${c.id}`} className="block bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{c.Tender?.title || "Contract"}</h3>
                  <p className="text-sm text-gray-500">₹{(c.total_amount / 100000).toFixed(1)}L — Tranche {c.current_tranche}/{c.tranche_count}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] || "bg-gray-100 text-gray-500"}`}>
                  {c.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === "team" && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-800">State Officers in Your State</h3>
            <p className="text-xs text-gray-400 mt-0.5">Created by Central Government</p>
          </div>
          <div className="divide-y">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: `${stateTheme.primary}22`, color: stateTheme.primary }}>
                  {m.name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{m.name}</p>
                  <p className="text-xs text-gray-400">{m.email}</p>
                </div>
                {m.id === user?.id && <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ backgroundColor: `${stateTheme.primary}22`, color: stateTheme.primary }}>You</span>}
              </div>
            ))}
            {members.length === 0 && <p className="p-4 text-gray-400 text-sm">No team members found</p>}
          </div>
        </div>
      )}
    </div>
  );
}
