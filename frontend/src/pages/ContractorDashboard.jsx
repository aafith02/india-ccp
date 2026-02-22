import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

const bidStatus = { submitted: "bg-blue-100 text-blue-700", awarded: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-600" };
const wpStatus = { pending_assignment: "bg-gray-100 text-gray-500", under_review: "bg-blue-100 text-blue-700", approved: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-600" };

export default function ContractorDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [bids, setBids] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [points, setPoints] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  function fetchData() {
    api.get("/bids/my").then(r => setBids(r.data.bids || [])).catch(() => {});
    api.get("/contracts/my").then(r => setContracts(r.data.contracts || [])).catch(() => {});
    api.get("/points/my").then(r => setPoints(r.data)).catch(() => {});
  }

  const kycPending = user?.kyc_status === "pending";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Contractor Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your bids, contracts, and work proofs</p>
      </div>

      {kycPending && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-xl">
          <p className="font-medium">KYC Verification Pending</p>
          <p className="text-sm mt-1">Your account is awaiting KYC verification by a state officer. You cannot bid until verified.</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 text-blue-700 rounded-xl p-5">
          <p className="text-xs font-medium opacity-70">Active Bids</p>
          <p className="text-2xl font-bold mt-1">{bids.filter(b => b.status === "submitted").length}</p>
        </div>
        <div className="bg-green-50 text-green-700 rounded-xl p-5">
          <p className="text-xs font-medium opacity-70">Active Contracts</p>
          <p className="text-2xl font-bold mt-1">{contracts.filter(c => c.status === "active").length}</p>
        </div>
        <div className="bg-teal-50 text-teal-700 rounded-xl p-5">
          <p className="text-xs font-medium opacity-70">Points</p>
          <p className="text-2xl font-bold mt-1">{points?.total ?? points?.total_points ?? user?.points ?? 0}</p>
        </div>
        <div className="bg-purple-50 text-purple-700 rounded-xl p-5">
          <p className="text-xs font-medium opacity-70">Won Bids</p>
          <p className="text-2xl font-bold mt-1">{bids.filter(b => b.status === "awarded").length}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {["overview", "bids", "contracts"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"}`}>{t}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid md:grid-cols-3 gap-4">
          <Link to="/tenders" className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition group">
            <p className="font-semibold text-gray-800 group-hover:text-teal-600">Browse Tenders</p>
            <p className="text-sm text-gray-500 mt-1">Find and bid on open tenders in your state</p>
          </Link>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <p className="font-semibold text-gray-800 mb-2">Active Contracts</p>
            <p className="text-sm text-gray-500 mb-3">Submit work proofs & track tranche disbursements</p>
            <div className="space-y-2">
              {contracts.filter(c => c.status === "active").length === 0 && <p className="text-xs text-gray-400">No active contracts yet.</p>}
              {contracts.filter(c => c.status === "active").map(c => (
                <Link key={c.id} to={`/contracts/${c.id}`} className="block bg-teal-50 rounded-lg px-3 py-2 text-sm text-teal-700 hover:bg-teal-100 transition">
                  {c.Tender?.title || "Contract"} — Tranche {c.current_tranche}/{c.tranche_count}
                </Link>
              ))}
            </div>
          </div>
          <Link to="/points" className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition group">
            <p className="font-semibold text-gray-800 group-hover:text-teal-600">Points & Leaderboard</p>
            <p className="text-sm text-gray-500 mt-1">View your performance and rankings</p>
          </Link>
        </div>
      )}

      {tab === "bids" && (
        <div className="space-y-3">
          {bids.length === 0 ? <p className="text-gray-400 text-sm">No bids yet. Browse tenders to submit bids.</p> : bids.map(b => (
            <div key={b.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{b.Tender?.title || "Tender"}</h3>
                  <p className="text-sm text-gray-500 mt-1">Bid: ₹{(b.amount / 100000).toFixed(1)}L — Proximity Score: {b.proximity_score?.toFixed(1) || "N/A"}</p>
                  <p className="text-xs text-gray-400 mt-1">{b.timeline_days} days timeline</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bidStatus[b.status] || "bg-gray-100"}`}>{b.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "contracts" && (
        <div className="space-y-3">
          {contracts.length === 0 ? <p className="text-gray-400 text-sm">No contracts yet.</p> : contracts.map(c => (
            <Link key={c.id} to={`/contracts/${c.id}`} className="block bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{c.Tender?.title || "Contract"}</h3>
                  <p className="text-sm text-gray-500 mt-1">₹{(c.total_amount / 100000).toFixed(1)}L — Tranche {c.current_tranche}/{c.tranche_count}</p>
                  <div className="mt-2 w-48 bg-gray-200 rounded-full h-2">
                    <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${(c.current_tranche / c.tranche_count) * 100}%` }} />
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{c.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
