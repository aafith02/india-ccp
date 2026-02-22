import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { ShieldBan, ShieldCheck, AlertTriangle } from "lucide-react";
import api from "../api/client";
import { toast } from "react-toastify";

const statusColors = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-red-100 text-red-700",
  rejected: "bg-gray-100 text-gray-500",
};

export default function BlacklistManagement() {
  const { user } = useAuth();
  const [tab, setTab] = useState("requests");
  const [requests, setRequests] = useState([]);
  const [blacklisted, setBlacklisted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestForm, setRequestForm] = useState({ user_id: "", reason: "" });
  const [contractors, setContractors] = useState([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [remarks, setRemarks] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [reqRes, blRes] = await Promise.all([
        api.get("/blacklist/requests").catch(() => ({ data: { requests: [] } })),
        api.get("/blacklist/blacklisted").catch(() => ({ data: { users: [] } })),
      ]);
      setRequests(reqRes.data.requests || []);
      setBlacklisted(blRes.data.users || []);
    } catch {}
    setLoading(false);
  }

  async function submitRequest(e) {
    e.preventDefault();
    try {
      await api.post("/blacklist/request", requestForm);
      toast.success("Blacklist request submitted for central government review");
      setShowRequestForm(false);
      setRequestForm({ user_id: "", reason: "" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit request");
    }
  }

  async function handleDecision(requestId, status) {
    try {
      await api.patch(`/blacklist/request/${requestId}`, { status, remarks: remarks[requestId] || "" });
      toast.success(`Request ${status}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to process");
    }
  }

  async function directBlacklist(userId) {
    if (!confirm("Are you sure you want to blacklist this user?")) return;
    try {
      await api.patch(`/blacklist/${userId}/blacklist`);
      toast.success("User blacklisted");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    }
  }

  async function unblacklist(userId) {
    try {
      await api.patch(`/blacklist/${userId}/unblacklist`);
      toast.success("User unblacklisted");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    }
  }

  // Load contractors for state_gov request form
  useEffect(() => {
    if (user?.role === "state_gov" && showRequestForm && contractors.length === 0) {
      api.get("/blacklist/contractors")
        .then(res => setContractors(res.data.contractors || []))
        .catch(() => {});
    }
  }, [showRequestForm]);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  const tabs = [
    { key: "requests", label: `Requests (${requests.filter(r => r.status === "pending").length} pending)` },
    { key: "blacklisted", label: `Blacklisted (${blacklisted.length})` },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ShieldBan size={24} /> Blacklist Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Review blacklisting requests and manage blacklisted users</p>
        </div>
        {user?.role === "state_gov" && (
          <button onClick={() => setShowRequestForm(!showRequestForm)}
            className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition">
            <AlertTriangle size={16} /> Request Blacklist
          </button>
        )}
      </div>

      {/* State gov: submit blacklist request form */}
      {showRequestForm && user?.role === "state_gov" && (
        <form onSubmit={submitRequest} className="bg-white border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-gray-800">Request Contractor Blacklisting</h3>
          <p className="text-xs text-gray-500">This will be sent to Central Government for approval.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Contractor</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              value={requestForm.user_id} onChange={e => setRequestForm(p => ({ ...p, user_id: e.target.value }))} required>
              <option value="">-- Choose a contractor --</option>
              {contractors.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.email} (Rep: {Number(c.reputation).toFixed(1)}, Pts: {c.points})
                </option>
              ))}
            </select>
            {contractors.length === 0 && <p className="text-xs text-gray-400 mt-1">Loading contractors...</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3}
              placeholder="Explain why this contractor should be blacklisted..."
              value={requestForm.reason} onChange={e => setRequestForm(p => ({ ...p, reason: e.target.value }))} required />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Submit Request</button>
            <button type="button" onClick={() => setShowRequestForm(false)} className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200">Cancel</button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t.key ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Requests tab */}
      {tab === "requests" && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="bg-gray-50 text-gray-500 p-6 rounded-xl text-center">No blacklist requests</div>
          ) : (
            requests.map(r => (
              <div key={r.id} className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">{r.targetUser?.name || "Unknown"}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status]}`}>{r.status}</span>
                    </div>
                    <p className="text-sm text-gray-500">{r.reason}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>Email: {r.targetUser?.email}</span>
                      <span>Reputation: <span className={r.targetUser?.reputation < 0 ? "text-red-500 font-medium" : "text-green-600"}>{r.targetUser?.reputation?.toFixed(1)}</span></span>
                      <span>Points: {r.targetUser?.points}</span>
                      <span>Requested by: {r.requestedBy?.name}</span>
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Central gov: approve/reject */}
                {user?.role === "central_gov" && r.status === "pending" && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Remarks (optional)"
                      value={remarks[r.id] || ""} onChange={e => setRemarks(p => ({ ...p, [r.id]: e.target.value }))} />
                    <div className="flex gap-2">
                      <button onClick={() => handleDecision(r.id, "approved")}
                        className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Approve Blacklist</button>
                      <button onClick={() => handleDecision(r.id, "rejected")}
                        className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700">Reject Request</button>
                    </div>
                  </div>
                )}

                {r.remarks && (
                  <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded">Remarks: {r.remarks}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Blacklisted tab */}
      {tab === "blacklisted" && (
        <div className="space-y-3">
          {blacklisted.length === 0 ? (
            <div className="bg-gray-50 text-gray-500 p-6 rounded-xl text-center">No blacklisted users</div>
          ) : (
            blacklisted.map(u => (
              <div key={u.id} className="bg-white rounded-xl shadow-sm border p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldBan size={16} className="text-red-500" />
                    <span className="font-semibold text-gray-800">{u.name}</span>
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Blacklisted</span>
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-400">
                    <span>{u.email}</span>
                    <span>Role: {u.role}</span>
                    <span>Reputation: {u.reputation?.toFixed(1)}</span>
                    <span>Points: {u.points}</span>
                    {u.State && <span>State: {u.State.name}</span>}
                  </div>
                </div>
                {user?.role === "central_gov" && (
                  <button onClick={() => unblacklist(u.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">
                    <ShieldCheck size={14} /> Unblacklist
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
