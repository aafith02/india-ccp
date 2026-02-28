import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

const theme = { primary: "#be185d", bg: "#fdf2f8" };

export default function CommunityPortal() {
  const { user } = useAuth();
  const [stateWorks, setStateWorks] = useState(null);
  const [tenders, setTenders] = useState([]);
  const [tab, setTab] = useState("works");

  useEffect(() => {
    if (user?.state_id) {
      api.get(`/public/state-works/${user.state_id}`).then(r => setStateWorks(r.data)).catch(() => {});
    }
    api.get("/public/tenders").then(r => setTenders(r.data.tenders || [])).catch(() => {});
  }, []);

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: theme.bg }}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Community Portal</h1>
        <p className="text-gray-500 text-sm mt-1">View projects in your state and report issues</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Link to="/report" className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl p-5 hover:shadow-lg transition">
          <p className="font-semibold text-lg">Report an Issue</p>
          <p className="text-red-100 text-sm mt-1">Spot fake work or corruption? Let us know.</p>
        </Link>
        <Link to="/ledger" className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl p-5 hover:shadow-lg transition">
          <p className="font-semibold text-lg">Public Ledger</p>
          <p className="text-teal-100 text-sm mt-1">Every action recorded on-chain. Verify transparency.</p>
        </Link>
        <Link to="/points" className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-5 hover:shadow-lg transition">
          <p className="font-semibold text-lg">Leaderboard</p>
          <p className="text-purple-100 text-sm mt-1">See top contractors and verifiers.</p>
        </Link>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("works")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "works" ? "text-white" : "bg-gray-100 text-gray-600"}`}
          style={tab === "works" ? { backgroundColor: theme.primary } : undefined}
        >
          State Works
        </button>
        <button
          onClick={() => setTab("tenders")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "tenders" ? "text-white" : "bg-gray-100 text-gray-600"}`}
          style={tab === "tenders" ? { backgroundColor: theme.primary } : undefined}
        >
          Public Tenders
        </button>
      </div>

      {tab === "works" && (
        <div>
          {!user?.state_id ? (
            <p className="text-gray-400 text-sm">Select a state in your profile to see local works.</p>
          ) : stateWorks?.projects?.length > 0 ? (
            <div className="space-y-4">
              {stateWorks.projects.map(t => (
                <div key={t.id} className="bg-white rounded-xl shadow-sm border p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">{t.title}</h3>
                      <p className="text-sm text-gray-500">{t.location} — {t.category}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.status === "in_progress" ? "bg-blue-100 text-blue-700" : t.status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {t.status}
                    </span>
                  </div>

                  {t.Contract && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600">Contract: ₹{(t.Contract.total_amount / 100000).toFixed(1)}L — Tranche {t.Contract.current_tranche}/{t.Contract.tranche_count}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div className="h-2 rounded-full" style={{ width: `${(t.Contract.current_tranche / t.Contract.tranche_count) * 100}%`, backgroundColor: theme.primary }} />
                      </div>

                      {t.Contract.ContractTranches?.length > 0 && (
                        <div className="mt-2 flex gap-1">
                          {t.Contract.ContractTranches.map(tr => (
                            <span key={tr.id} className={`px-2 py-0.5 rounded text-xs ${tr.status === "disbursed" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                              T{tr.sequence}: {tr.status}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No active works found in your state.</p>
          )}
        </div>
      )}

      {tab === "tenders" && (
        <div className="space-y-3">
          {tenders.map(t => (
            <div key={t.id} className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="font-semibold text-gray-800">{t.title}</h3>
              <p className="text-sm text-gray-500">{t.State?.name} — {t.location}</p>
              <p className="text-xs text-gray-400 mt-1">{t.category} — {t.status}</p>
            </div>
          ))}
          {tenders.length === 0 && <p className="text-gray-400 text-sm">No tenders available</p>}
        </div>
      )}
    </div>
  );
}
