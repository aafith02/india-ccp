import { useState, useEffect } from "react";
import api from "../api/client";
import { toast } from "react-toastify";
import AnalyticsCharts from "../components/AnalyticsCharts";

const theme = { primary: "#3730a3", bg: "#eef2ff" };

export default function CentralDashboard() {
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("overview");
  const [states, setStates] = useState([]);
  const [memberForm, setMemberForm] = useState({ name: "", email: "", password: "", state_id: "", type: "state" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchDashData();
    // Poll every 30 seconds for real-time updates
    const interval = setInterval(fetchDashData, 30000);
    return () => clearInterval(interval);
  }, []);

  function fetchDashData() {
    api.get("/public/stats").then(r => setStats(r.data.stats)).catch(() => {});
    api.get("/states").then(r => setStates(r.data.states || [])).catch(() => {});
  }

  const set = (k) => (e) => setMemberForm(p => ({ ...p, [k]: e.target.value }));

  async function createMember(e) {
    e.preventDefault();
    setMsg("");
    try {
      if (memberForm.type === "state") {
        await api.post("/auth/create-state-member", {
          name: memberForm.name, email: memberForm.email,
          password: memberForm.password, state_id: memberForm.state_id,
        });
      } else {
        await api.post("/auth/create-ngo", {
          name: memberForm.name, email: memberForm.email,
          password: memberForm.password,
        });
      }
      toast.success("Member created successfully!");
      setMemberForm({ name: "", email: "", password: "", state_id: "", type: memberForm.type });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create member");
    }
  }

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "analytics", label: "Analytics" },
    { key: "create", label: "Create Member" },
  ];

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: theme.bg }}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Central Government Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">National oversight of all tenders and activities</p>
      </div>

      <div className="flex gap-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t.key ? "text-white" : "bg-gray-100 text-gray-600"}`}
            style={tab === t.key ? { backgroundColor: theme.primary } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Tenders", value: stats?.tenders || 0, color: "bg-blue-50 text-blue-700" },
              { label: "Active Contracts", value: stats?.contracts || 0, color: "bg-green-50 text-green-700" },
              { label: "Complaints", value: stats?.complaints || 0, color: "bg-red-50 text-red-700" },
              { label: "Registered Users", value: stats?.users || 0, color: "bg-amber-50 text-amber-700" },
            ].map((s) => (
              <div key={s.label} className={`${s.color} rounded-xl p-5`}>
                <p className="text-xs font-medium opacity-70">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Quick links */}
          <div className="grid md:grid-cols-3 gap-4">
            <a href="/complaints" className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition group">
              <p className="font-semibold text-gray-800 group-hover:text-teal-600">Manage Complaints</p>
              <p className="text-sm text-gray-500 mt-1">Assign NGOs and track investigations</p>
            </a>
            <a href="/cases" className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition group">
              <p className="font-semibold text-gray-800 group-hover:text-teal-600">Case Management</p>
              <p className="text-sm text-gray-500 mt-1">Track and manage formal cases</p>
            </a>
            <a href="/funding" className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition group">
              <p className="font-semibold text-gray-800 group-hover:text-teal-600">Fund Requests</p>
              <p className="text-sm text-gray-500 mt-1">Approve or reject state funding requests</p>
            </a>
            <a href="/blacklist" className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition group">
              <p className="font-semibold text-gray-800 group-hover:text-teal-600">Blacklist Management</p>
              <p className="text-sm text-gray-500 mt-1">Review blacklist requests and manage users</p>
            </a>
            <a href="/ledger" className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition group">
              <p className="font-semibold text-gray-800 group-hover:text-teal-600">Public Ledger</p>
              <p className="text-sm text-gray-500 mt-1">Verify the chain-hashed audit trail</p>
            </a>
          </div>
        </div>
      )}

      {tab === "analytics" && (
        <AnalyticsCharts />
      )}

      {tab === "create" && (
        <div className="max-w-lg">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Create New Member</h2>

            <div className="flex gap-2 mb-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="mtype" value="state" checked={memberForm.type === "state"} onChange={set("type")} className="accent-teal-600" />
                <span className="text-sm">State Officer</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="mtype" value="ngo" checked={memberForm.type === "ngo"} onChange={set("type")} className="accent-teal-600" />
                <span className="text-sm">NGO Member</span>
              </label>
            </div>

            {msg && <div className={`text-sm p-3 rounded-lg mb-4 ${msg.includes("success") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>{msg}</div>}

            <form onSubmit={createMember} className="space-y-3">
              <input className="w-full border rounded-lg px-4 py-2.5 text-sm" placeholder="Full Name" value={memberForm.name} onChange={set("name")} required />
              <input type="email" className="w-full border rounded-lg px-4 py-2.5 text-sm" placeholder="Email" value={memberForm.email} onChange={set("email")} required />
              <input type="password" className="w-full border rounded-lg px-4 py-2.5 text-sm" placeholder="Password" value={memberForm.password} onChange={set("password")} required />
              {memberForm.type === "state" && (
                <select className="w-full border rounded-lg px-4 py-2.5 text-sm" value={memberForm.state_id} onChange={set("state_id")} required>
                  <option value="">Select State</option>
                  {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              <button type="submit" className="w-full text-white py-2.5 rounded-lg font-medium transition" style={{ backgroundColor: theme.primary }}>
                Create {memberForm.type === "state" ? "State Officer" : "NGO Member"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
