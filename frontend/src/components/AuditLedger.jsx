import { useState, useEffect } from "react";
import api from "../api/client";
import { BookOpen, Hash, Clock, User, ArrowRight } from "lucide-react";

export default function AuditLedger() {
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/public/ledger?page=${page}&limit=25`).then(({ data }) => {
      setEntries(data.entries);
      setTotal(data.total);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / 25);

  return (
    <div className="bg-white rounded-xl shadow-card p-6 animate-fade-up">
      <h3 className="font-heading font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
        <BookOpen size={18} className="text-teal-500" /> Public Audit Ledger
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        All actions are recorded with chained hashes for tamper detection. {total} total entries.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-sand-100 transition text-sm">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <Hash size={14} className="text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">{entry.action}</span>
                    <span className="text-xs text-gray-400 capitalize">{entry.actor_role?.replace("_", " ")}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">
                    Hash: {entry.entry_hash?.slice(0, 16)}...
                    {entry.entity_type && <span> · {entry.entity_type}</span>}
                  </div>
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0">
                  <Clock size={10} />
                  {new Date(entry.createdAt).toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition"
              >
                Prev
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
