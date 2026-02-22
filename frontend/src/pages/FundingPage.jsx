import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function FundingPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [finance, setFinance] = useState(null);
  const [form, setForm] = useState({ amount: "", purpose: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    try {
      const { data } = await api.get("/funding");
      setRequests(data.funds || []);
    } catch { /* */ }
    // Load state finance for state_gov
    if (user?.state_id) {
      try {
        const { data } = await api.get(`/states/${user.state_id}/finance`);
        setFinance(data);
      } catch { /* */ }
    }
  }

  async function submitRequest(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/funding", { amount: Number(form.amount), purpose: form.purpose });
      setForm({ amount: "", purpose: "" });
      load();
    } catch { /* */ }
    setLoading(false);
  }

  async function act(id, action) {
    try {
      await api.patch(`/funding/${id}`, { status: action === "approve" ? "approved" : action === "reject" ? "rejected" : action });
      load();
    } catch { /* */ }
  }

  const statusColor = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-600",
    disbursed: "bg-blue-100 text-blue-700",
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Fund Requests</h1>

      {/* State Finance Summary — visible to state_gov */}
      {user?.role === "state_gov" && finance && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-green-600 font-medium">Available Balance</p>
            <p className="text-xl font-bold text-green-700">{fmt(finance.balance)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs text-blue-600 font-medium">Total Received</p>
            <p className="text-xl font-bold text-blue-700">{fmt(finance.total_received)}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-xs text-purple-600 font-medium">Allocated to Contracts</p>
            <p className="text-xl font-bold text-purple-700">{fmt(finance.total_allocated)}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-600 font-medium">Pending Requests</p>
            <p className="text-xl font-bold text-amber-700">{fmt(finance.pending_fund_requests)}</p>
          </div>
        </div>
      )}

      {/* State gov can submit new requests */}
      {user?.role === "state_gov" && (
        <form onSubmit={submitRequest} className="bg-white border rounded-xl p-5 mb-6 space-y-3">
          <h2 className="font-semibold text-gray-700">New Request</h2>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="Amount (₹)" className="border rounded-lg px-4 py-2.5 text-sm"
              value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
            <input placeholder="Purpose" className="border rounded-lg px-4 py-2.5 text-sm"
              value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} required />
          </div>
          <button type="submit" disabled={loading} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {requests.map(r => (
          <div key={r.id} className="bg-white border rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">{fmt(r.amount)}</p>
              <p className="text-sm text-gray-500">{r.purpose}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[r.status] || "bg-gray-100"}`}>
                  {r.status}
                </span>
                {r.approved_amount && r.status === "approved" && (
                  <span className="text-xs text-green-600 font-medium">Approved: {fmt(r.approved_amount)}</span>
                )}
                {r.remarks && <span className="text-xs text-gray-400 italic">— {r.remarks}</span>}
              </div>
              {r.signature_hash && (
                <p className="text-xs text-gray-300 mt-1 font-mono">Sig: {r.signature_hash.slice(0, 16)}...</p>
              )}
            </div>
            {user?.role === "central_gov" && r.status === "pending" && (
              <div className="flex gap-2">
                <button onClick={() => act(r.id, "approve")} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700">Approve</button>
                <button onClick={() => act(r.id, "reject")} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-600">Reject</button>
              </div>
            )}
          </div>
        ))}
        {requests.length === 0 && <div className="text-center text-gray-400 py-12">No fund requests yet.</div>}
      </div>
    </div>
  );
}
