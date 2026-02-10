import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import StateMap from "../components/StateMap";
import FundingPanel from "../components/FundingPanel";
import TenderCard from "../components/TenderCard";
import { FileText, Users, Gavel, Plus, Globe, Leaf, Bird, Trees, Flower2, Shield } from "lucide-react";
import stateMetadata, { getDefaultLanguage, getLabels } from "../data/stateMetadata";

export default function StateDashboard() {
  const { user } = useAuth();
  const [tenders, setTenders] = useState([]);
  const [contractorCount, setContractorCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const state = user?.state || user?.State;
  const theme = state?.theme || { primary: "#0d9488", secondary: "#d4a76a", bg: "#faf7f2" };
  const meta = stateMetadata[state?.code] || null;

  // Language state — default to the state's primary language
  const [lang, setLang] = useState(() => getDefaultLanguage(state?.code));
  const labels = getLabels(lang);

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

  // Reset language when state changes
  useEffect(() => {
    setLang(getDefaultLanguage(state?.code));
  }, [state?.code]);

  const openCount = tenders.filter(t => t.status === "open").length;
  const awardedCount = tenders.filter(t => t.status === "awarded" || t.status === "in_progress").length;

  return (
    <div className="space-y-6">
      {/* Title row with language selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          {/* State emblem emoji */}
          {meta && (
            <span className="text-4xl" title={meta.emblem}>
              {meta.symbol.emoji}
            </span>
          )}
          <div>
            <h2 className="font-heading font-bold text-2xl" style={{ color: theme.primary }}>
              {state?.name || "State"} {labels.dashboard}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{labels.manageTenders}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language selector */}
          {meta && meta.languages.length > 1 && (
            <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-1.5">
              <Globe size={16} className="text-gray-400" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="text-sm bg-transparent border-none outline-none cursor-pointer font-medium text-gray-700"
              >
                {meta.languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.native} ({l.name})
                  </option>
                ))}
              </select>
            </div>
          )}

          <a
            href="/tenders/new"
            className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition"
            style={{ backgroundColor: theme.primary }}
          >
            <Plus size={16} /> {labels.createTender}
          </a>
        </div>
      </div>

      {/* State Symbol Card */}
      {meta && (
        <div
          className="bg-white rounded-xl shadow-card p-5 animate-fade-up border-l-4"
          style={{ borderLeftColor: theme.primary }}
        >
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Shield size={14} /> {labels.stateSymbol}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {meta.symbol.animal && meta.symbol.animal !== "Not designated" && (
              <div className="flex items-center gap-2.5 p-3 rounded-lg" style={{ backgroundColor: theme.primary + "0D" }}>
                <Leaf size={18} style={{ color: theme.primary }} />
                <div>
                  <p className="text-xs text-gray-500 font-medium">{labels.stateAnimal}</p>
                  <p className="text-sm font-semibold text-gray-800">{meta.symbol.animal}</p>
                </div>
              </div>
            )}
            {meta.symbol.bird && meta.symbol.bird !== "Not designated" && (
              <div className="flex items-center gap-2.5 p-3 rounded-lg" style={{ backgroundColor: theme.secondary + "1A" }}>
                <Bird size={18} style={{ color: theme.secondary }} />
                <div>
                  <p className="text-xs text-gray-500 font-medium">{labels.stateBird}</p>
                  <p className="text-sm font-semibold text-gray-800">{meta.symbol.bird}</p>
                </div>
              </div>
            )}
            {meta.symbol.flower && meta.symbol.flower !== "Not designated" && (
              <div className="flex items-center gap-2.5 p-3 rounded-lg" style={{ backgroundColor: theme.primary + "0D" }}>
                <Flower2 size={18} style={{ color: theme.primary }} />
                <div>
                  <p className="text-xs text-gray-500 font-medium">{labels.stateFlower}</p>
                  <p className="text-sm font-semibold text-gray-800">{meta.symbol.flower}</p>
                </div>
              </div>
            )}
            {meta.symbol.tree && meta.symbol.tree !== "Not designated" && (
              <div className="flex items-center gap-2.5 p-3 rounded-lg" style={{ backgroundColor: theme.secondary + "1A" }}>
                <Trees size={18} style={{ color: theme.secondary }} />
                <div>
                  <p className="text-xs text-gray-500 font-medium">{labels.stateTree}</p>
                  <p className="text-sm font-semibold text-gray-800">{meta.symbol.tree}</p>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-3 italic">{meta.emblem}</p>
        </div>
      )}

      {/* Top row: map + funding + quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StateMap
          stateCode={state?.code}
          stateName={state?.name}
          activeProjects={awardedCount}
          theme={theme}
          symbol={meta?.symbol}
          labels={labels}
        />

        <FundingPanel stateId={state?.id} />

        {/* Quick stats */}
        <div className="bg-white rounded-xl shadow-card p-5 space-y-4 animate-fade-up-delay-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{labels.quickStats}</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50">
              <FileText size={18} className="text-blue-500" />
              <div>
                <p className="text-lg font-bold text-blue-700">{openCount}</p>
                <p className="text-xs text-blue-500">{labels.openTenders}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50">
              <Gavel size={18} className="text-amber-500" />
              <div>
                <p className="text-lg font-bold text-amber-700">{awardedCount}</p>
                <p className="text-xs text-amber-500">{labels.activeProjects}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-teal-50">
              <Users size={18} className="text-teal-500" />
              <div>
                <p className="text-lg font-bold text-teal-700">{contractorCount}</p>
                <p className="text-xs text-teal-500">{labels.registeredContractors}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent tenders */}
      <div>
        <h3 className="font-heading font-semibold text-lg text-gray-800 mb-3">{labels.recentTenders}</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : tenders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card p-8 text-center text-gray-400">
            {labels.noTenders}
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
