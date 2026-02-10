import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { Wallet, Plus, CheckCircle, XCircle } from "lucide-react";

export default function FundingPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: "", purpose: "" });
  const [loading, setLoading] = useState(true);

  const loadRequests = () => {
    api.get("/funding").then(({ data }) => {
      setRequests(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadRequests(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/funding", { amount: parseFloat(form.amount), purpose: form.purpose });
      setForm({ amount: "", purpose: "" });
      setShowForm(false);
      loadRequests();
    } catch (err) {
      alert(err.response?.data?.error || "Failed");
    }
  };

  const handleAction = async (id, status, approved_amount) => {
    try {
      await api.patch(`/funding/${id}`, { status, approved_amount });
      loadRequests();
    } catch (err) {
      alert(err.response?.data?.error || "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-2xl text-gray-800">Fund Requests</h2>
          <p className="text-sm text-gray-500 mt-1">
            {user?.role === "state_gov" ? "Request funding from Central Government" : "Review state funding requests"}
          </p>
        </div>
        {user?.role === "state_gov" && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition"
          >
            <Plus size={16} /> New Request
          </button>
        )}
      </div>

      {/* New request form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-card p-6 animate-fade-up space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Amount (₹)</label>
            <input
              type="number"
              required
              min="1"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Purpose</label>
            <textarea
              required
              rows={3}
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 outline-none resize-none"
              placeholder="Describe the purpose of this fund request..."
            />
          </div>
          <button type="submit" className="px-6 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition">
            Submit Request
          </button>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="bg-white rounded-xl shadow-card p-5 animate-fade-up">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet size={14} className="text-teal-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {req.State?.name || "State"} — ₹{Number(req.amount).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{req.purpose}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Requested by {req.requestedBy?.name} · {new Date(req.createdAt).toLocaleDateString("en-IN")}
                  </p>
                  {req.approved_amount && (
                    <p className="text-xs text-green-600 mt-1">Approved: ₹{Number(req.approved_amount).toLocaleString("en-IN")}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium badge-${req.status}`}>{req.status}</span>
                  {user?.role === "central_gov" && req.status === "pending" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAction(req.id, "approved", req.amount)}
                        className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
                        title="Approve"
                      >
                        <CheckCircle size={14} />
                      </button>
                      <button
                        onClick={() => handleAction(req.id, "rejected")}
                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                        title="Reject"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
