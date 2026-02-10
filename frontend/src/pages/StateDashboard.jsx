import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import StateMap from "../components/StateMap";
import FundingPanel from "../components/FundingPanel";
import TenderCard from "../components/TenderCard";
import { FileText, Users, Gavel, Plus } from "lucide-react";

export default function StateDashboard() {
  const { user } = useAuth();
  const [tenders, setTenders] = useState([]);
  const [contractorCount, setContractorCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const state = user?.state || user?.State;
  const theme = state?.theme || { primary: "#0d9488", secondary: "#d4a76a", bg: "#faf7f2" };

  useEffect(() => {
    if (state?.id) {
      Promise.all([
        api.get(`/tenders?state_id=${state.id}`),
        api.get(`/states/${state.id}`),
      ]).then(([tendersRes, stateRes]) => {
        setTenders(tendersRes.data);
        setContractorCount(stateRes.data.contractorCount || 0);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [state?.id]);

  const openCount = tenders.filter(t => t.status === "open").length;
  const awardedCount = tenders.filter(t => t.status === "awarded" || t.status === "in_progress").length;

  return (
    <div className="space-y-6">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-2xl" style={{ color: theme.primary }}>
            {state?.name || "State"} Dashboard
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage tenders, contractors, and funding</p>
        </div>
        <a
          href="/tenders/new"
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition"
          style={{ backgroundColor: theme.primary }}
        >
          <Plus size={16} /> Create Tender
        </a>
      </div>

      {/* Top row: map + funding + quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StateMap
          stateCode={state?.code}
          stateName={state?.name}
          activeProjects={awardedCount}
          theme={theme}
        />

        <FundingPanel stateId={state?.id} />

        {/* Quick stats */}
        <div className="bg-white rounded-xl shadow-card p-5 space-y-4 animate-fade-up-delay-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50">
              <FileText size={18} className="text-blue-500" />
              <div>
                <p className="text-lg font-bold text-blue-700">{openCount}</p>
                <p className="text-xs text-blue-500">Open Tenders</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50">
              <Gavel size={18} className="text-amber-500" />
              <div>
                <p className="text-lg font-bold text-amber-700">{awardedCount}</p>
                <p className="text-xs text-amber-500">Active Projects</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-teal-50">
              <Users size={18} className="text-teal-500" />
              <div>
                <p className="text-lg font-bold text-teal-700">{contractorCount}</p>
                <p className="text-xs text-teal-500">Registered Contractors</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent tenders */}
      <div>
        <h3 className="font-heading font-semibold text-lg text-gray-800 mb-3">Recent Tenders</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : tenders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card p-8 text-center text-gray-400">
            No tenders yet. Create your first tender to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {tenders.slice(0, 5).map((tender) => (
              <TenderCard key={tender.id} tender={tender} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
