import { useState, useEffect } from "react";
import api from "../api/client";

export default function AuditLedger({ limit = 20 }) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    api.get(`/public/ledger?limit=${limit}`).then(r => setEntries(r.data.ledger || [])).catch(() => {});
  }, [limit]);

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">Recent Audit Entries</h3>
      </div>
      <div className="divide-y max-h-80 overflow-y-auto">
        {entries.map(e => (
          <div key={e.id} className="px-4 py-2 text-xs flex items-center justify-between">
            <div>
              <span className="font-medium text-gray-700">{e.actor_name || "System"}</span>
              <span className="text-gray-400 mx-1">—</span>
              <span className="text-gray-500">{e.action}</span>
            </div>
            <span className="text-gray-300">{new Date(e.created_at || e.createdAt).toLocaleString("en-IN")}</span>
          </div>
        ))}
        {entries.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">No entries yet.</div>}
      </div>
    </div>
  );
}
