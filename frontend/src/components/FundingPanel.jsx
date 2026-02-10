import { useState, useEffect } from "react";
import api from "../api/client";
import { Wallet, TrendingUp, TrendingDown, Clock } from "lucide-react";

export default function FundingPanel({ stateId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/funding").then(({ data }) => {
      setRequests(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [stateId]);

  const totalApproved = requests
    .filter(r => r.status === "approved")
    .reduce((sum, r) => sum + parseFloat(r.approved_amount || 0), 0);

  const totalPending = requests
    .filter(r => r.status === "pending")
    .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

  if (loading) return <div className="bg-white rounded-xl shadow-card p-5 animate-pulse h-32" />;

  return (
    <div className="bg-white rounded-xl shadow-card p-5 animate-fade-up-delay-2">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
        <Wallet size={16} /> Funding Overview
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-green-50">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-green-500" />
            <span className="text-xs text-green-600 font-medium">Approved</span>
          </div>
          <p className="text-lg font-heading font-bold text-green-700 mt-1">
            ₹{totalApproved.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-amber-50">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-amber-500" />
            <span className="text-xs text-amber-600 font-medium">Pending</span>
          </div>
          <p className="text-lg font-heading font-bold text-amber-700 mt-1">
            ₹{totalPending.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
        {requests.slice(0, 5).map((req) => (
          <div key={req.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
            <span className="text-gray-600 truncate flex-1">{req.purpose}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full badge-${req.status}`}>{req.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
