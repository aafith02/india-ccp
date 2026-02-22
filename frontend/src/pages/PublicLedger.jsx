import { useState, useEffect } from "react";
import api from "../api/client";

export default function PublicLedger() {
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chainStatus, setChainStatus] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => { fetchLedger(); }, [page]);

  async function fetchLedger() {
    try {
      const { data } = await api.get(`/public/ledger?page=${page}&limit=20`);
      setEntries(data.ledger || data.entries || []);
      setTotalPages(data.pagination?.pages || data.totalPages || 1);
    } catch {}
  }

  async function verifyChain() {
    setVerifying(true);
    try {
      const { data } = await api.get("/public/ledger/verify");
      setChainStatus(data);
    } catch {
      setChainStatus({ valid: false, error: "Verification failed" });
    }
    setVerifying(false);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Public Audit Ledger</h1>
          <p className="text-gray-500 text-sm mt-1">Tamper-evident chain-hashed record of all platform activities</p>
        </div>
        <button onClick={verifyChain} disabled={verifying} className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition disabled:opacity-50">
          {verifying ? "Verifying..." : "Verify Chain Integrity"}
        </button>
      </div>

      {chainStatus && (
        <div className={`p-4 rounded-xl text-sm font-medium ${chainStatus.chain_valid ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {chainStatus.chain_valid
            ? `Chain verified. ${chainStatus.total_entries} entries, all hashes valid.`
            : `Chain BROKEN at entry #${chainStatus.broken_at?.index ?? "?"} (ID: ${chainStatus.broken_at?.entry_id?.slice(0,8) ?? "unknown"}). Possible tampering detected!`}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Time</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Actor</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Action</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Entity</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Signature</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-700">{e.actor_name || "System"}</p>
                    <p className="text-xs text-gray-400">{e.actor_role}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono">{e.action}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {e.entity_type} <span className="font-mono text-gray-400">{e.entity_id?.slice(0, 8)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {e.signature_hash ? (
                      <span className="font-mono text-xs text-teal-600" title={e.signature_hash}>{e.signature_hash.slice(0, 12)}...</span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-400" title={e.entry_hash}>{e.entry_hash?.slice(0, 12)}...</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded border bg-white disabled:opacity-40">Previous</button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm rounded border bg-white disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
