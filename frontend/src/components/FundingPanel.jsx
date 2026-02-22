import { useState, useEffect } from "react";
import api from "../api/client";

export default function FundingPanel() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    api.get("/funding").then(r => setRequests(r.data.funds || [])).catch(() => {});
  }, []);

  const statusColor = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-600",
    disbursed: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-2">
      {requests.slice(0, 5).map(r => (
        <div key={r.id} className="flex items-center justify-between bg-white border rounded-lg p-3">
          <div>
            <p className="text-sm font-medium text-gray-700">₹{Number(r.amount).toLocaleString("en-IN")}</p>
            <p className="text-xs text-gray-400">{r.purpose}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor[r.status] || "bg-gray-100"}`}>
            {r.status}
          </span>
        </div>
      ))}
      {requests.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No fund requests.</p>}
    </div>
  );
}
