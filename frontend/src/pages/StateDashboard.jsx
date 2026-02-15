import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import StateMap from "../components/StateMap";
import FundingPanel from "../components/FundingPanel";
import TenderCard from "../components/TenderCard";
import {
  FileText, Users, Gavel, Plus, Globe, Leaf, Bird, Trees, Flower2, Shield,
  CheckCircle, AlertTriangle, Eye, BarChart3,
  ChevronRight, Activity, Wallet
} from "lucide-react";
import stateMetadata, { getDefaultLanguage, getLabels } from "../data/stateMetadata";

/* ── state-specific gradient backgrounds ── */
const stateGradients = {
  KA: "from-purple-600 to-indigo-700",
  MH: "from-orange-500 to-red-600",
  TN: "from-red-600 to-yellow-500",
  KL: "from-green-600 to-emerald-700",
  GJ: "from-blue-500 to-cyan-600",
  RJ: "from-amber-500 to-orange-600",
  UP: "from-blue-600 to-indigo-600",
  WB: "from-blue-400 to-green-500",
  BR: "from-yellow-500 to-amber-600",
  MP: "from-teal-500 to-green-600",
  AP: "from-yellow-400 to-orange-500",
  TS: "from-pink-500 to-rose-600",
  PB: "from-orange-400 to-yellow-500",
  HR: "from-green-500 to-lime-600",
  HP: "from-blue-300 to-indigo-500",
  UK: "from-green-400 to-teal-600",
  JH: "from-emerald-500 to-green-700",
  CG: "from-green-600 to-lime-500",
  OD: "from-blue-500 to-blue-700",
  AS: "from-red-400 to-pink-500",
  GA: "from-cyan-400 to-blue-500",
  DL: "from-red-500 to-orange-500",
  SK: "from-blue-400 to-pink-400",
  MN: "from-green-400 to-emerald-500",
  ML: "from-green-500 to-teal-500",
  MZ: "from-blue-500 to-purple-500",
  NL: "from-blue-400 to-green-400",
  AR: "from-green-500 to-blue-500",
  TR: "from-green-400 to-orange-400",
};

/* ── state-specific welcome messages ── */
const stateWelcome = {
  KA: { greeting: "ನಮಸ್ಕಾರ", tagline: "Namma Karnataka — Land of Sandalwood" },
  MH: { greeting: "नमस्कार", tagline: "Jai Maharashtra — Land of the Marathas" },
  TN: { greeting: "வணக்கம்", tagline: "Tamil Nadu — Where Heritage Meets Progress" },
  KL: { greeting: "നമസ്കാരം", tagline: "God's Own Country" },
  GJ: { greeting: "નમસ્તે", tagline: "Gujarat — The Land of Lions" },
  RJ: { greeting: "खम्मा घणी", tagline: "Rajasthan — Land of Kings" },
  UP: { greeting: "नमस्ते", tagline: "Uttar Pradesh — Gateway of India's Heritage" },
  WB: { greeting: "নমস্কার", tagline: "West Bengal — The Cultural Capital" },
  BR: { greeting: "प्रणाम", tagline: "Bihar — The Land of Buddha" },
  MP: { greeting: "नमस्ते", tagline: "Madhya Pradesh — The Heart of India" },
  AP: { greeting: "నమస్కారం", tagline: "Andhra Pradesh — The Rice Bowl of India" },
  TS: { greeting: "నమస్కారం", tagline: "Telangana — The Kohinoor of India" },
  PB: { greeting: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ", tagline: "Punjab — Land of Five Rivers" },
  HR: { greeting: "राम राम", tagline: "Haryana — The Green Land" },
  HP: { greeting: "नमस्ते", tagline: "Himachal — Dev Bhoomi" },
  UK: { greeting: "नमस्ते", tagline: "Uttarakhand — Land of Gods" },
  DL: { greeting: "नमस्ते", tagline: "Delhi — The National Capital" },
  GA: { greeting: "नमस्कार", tagline: "Goa — Pearl of the Orient" },
  AS: { greeting: "নমস্কাৰ", tagline: "Assam — The Land of Red River" },
};

export default function StateDashboard() {
  const { user } = useAuth();
  const [tenders, setTenders] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [stateStats, setStateStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const state = user?.state || user?.State;
  const theme = state?.theme || { primary: "#0d9488", secondary: "#d4a76a", bg: "#faf7f2" };
  const meta = stateMetadata[state?.code] || null;
  const gradient = stateGradients[state?.code] || "from-teal-500 to-teal-700";
  const welcome = stateWelcome[state?.code] || { greeting: "Welcome", tagline: "State Dashboard" };

  const [lang, setLang] = useState(() => getDefaultLanguage(state?.code));
  const labels = getLabels(lang);

  useEffect(() => {
    if (state?.id) {
      Promise.all([
        api.get(`/tenders?state_id=${state.id}`),
        api.get(`/states/${state.id}`),
        api.get("/contracts").catch(() => ({ data: [] })),
      ]).then(([tendersRes, stateRes, contractsRes]) => {
        setTenders(tendersRes.data);
        setStateStats(stateRes.data);
        setContracts(contractsRes.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [state?.id]);

  useEffect(() => {
    setLang(getDefaultLanguage(state?.code));
  }, [state?.code]);

  const openCount = tenders.filter(t => t.status === "open").length;
  const awardedCount = tenders.filter(t => t.status === "awarded" || t.status === "in_progress").length;
  const completedCount = tenders.filter(t => t.status === "completed").length;
  const totalTenders = tenders.length;

  const tabs = [
    { id: "overview", label: labels.dashboard || "Overview", icon: BarChart3 },
    { id: "tenders", label: labels.recentTenders || "Tenders", icon: FileText },
    { id: "contracts", label: "Contracts", icon: Gavel },
    { id: "funding", label: "Funding", icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      {/* ═══ HERO BANNER — unique per state ═══ */}
      <div className={`bg-gradient-to-r ${gradient} rounded-2xl p-6 text-white shadow-lg relative overflow-hidden animate-fade-up`}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white transform translate-x-20 -translate-y-20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white transform -translate-x-10 translate-y-10" />
        </div>

        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-5">
            {meta && (
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-5xl shadow-inner">
                {meta.symbol.emoji}
              </div>
            )}
            <div>
              <p className="text-white/70 text-sm font-medium mb-1">
                {welcome.greeting}, {user?.name}
              </p>
              <h2 className="font-heading font-bold text-3xl">
                {state?.name || "State"} {labels.dashboard}
              </h2>
              <p className="text-white/80 text-sm mt-1">{welcome.tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {meta && meta.languages.length > 1 && (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5">
                <Globe size={16} className="text-white/80" />
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="text-sm bg-transparent border-none outline-none cursor-pointer font-medium text-white"
                >
                  {meta.languages.map((l) => (
                    <option key={l.code} value={l.code} className="text-gray-800">
                      {l.native} ({l.name})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <a
              href="/tenders/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl transition"
              style={{ color: theme.primary }}
            >
              <Plus size={16} /> {labels.createTender}
            </a>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3">
            <p className="text-2xl font-heading font-bold">{openCount}</p>
            <p className="text-xs text-white/70">{labels.openTenders}</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3">
            <p className="text-2xl font-heading font-bold">{awardedCount}</p>
            <p className="text-xs text-white/70">{labels.activeProjects}</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3">
            <p className="text-2xl font-heading font-bold">{completedCount}</p>
            <p className="text-xs text-white/70">Completed</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3">
            <p className="text-2xl font-heading font-bold">{stateStats.contractorCount || 0}</p>
            <p className="text-xs text-white/70">{labels.registeredContractors}</p>
          </div>
        </div>
      </div>

      {/* ═══ STATE SYMBOLS STRIP ═══ */}
      {meta && (
        <div className="bg-white rounded-xl shadow-card p-4 animate-fade-up-delay flex flex-wrap items-center gap-4 border-l-4" style={{ borderLeftColor: theme.primary }}>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            <Shield size={14} /> {labels.stateSymbol}
          </div>
          <div className="flex flex-wrap gap-3 flex-1">
            {meta.symbol.animal && meta.symbol.animal !== "Not designated" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: theme.primary + "15", color: theme.primary }}>
                <Leaf size={12} /> {meta.symbol.animal}
              </span>
            )}
            {meta.symbol.bird && meta.symbol.bird !== "Not designated" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: theme.secondary + "20", color: "#92400e" }}>
                <Bird size={12} /> {meta.symbol.bird}
              </span>
            )}
            {meta.symbol.flower && meta.symbol.flower !== "Not designated" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: theme.primary + "15", color: theme.primary }}>
                <Flower2 size={12} /> {meta.symbol.flower}
              </span>
            )}
            {meta.symbol.tree && meta.symbol.tree !== "Not designated" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: theme.secondary + "20", color: "#92400e" }}>
                <Trees size={12} /> {meta.symbol.tree}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 italic">{meta.emblem}</p>
        </div>
      )}

      {/* ═══ TAB NAVIGATION ═══ */}
      <div className="flex gap-1 bg-white rounded-xl shadow-card p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "text-white shadow-md"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            style={activeTab === tab.id ? { backgroundColor: theme.primary } : {}}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-fade-up">
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
            <div className="bg-white rounded-xl shadow-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{labels.quickStats}</h3>
              <div className="space-y-2">
                <StatRow icon={FileText} color="blue" label="Total Tenders" value={totalTenders} />
                <StatRow icon={Gavel} color="amber" label={labels.activeProjects} value={awardedCount} />
                <StatRow icon={CheckCircle} color="green" label="Completed" value={stateStats.completedContracts || 0} />
                <StatRow icon={Users} color="teal" label={labels.registeredContractors} value={stateStats.contractorCount || 0} />
                <StatRow icon={Eye} color="purple" label="Pending Verifications" value={stateStats.pendingVerifications || 0} />
                <StatRow icon={AlertTriangle} color="red" label="Complaints" value={stateStats.complaintCount || 0} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg text-gray-800 flex items-center gap-2">
                <Activity size={18} style={{ color: theme.primary }} />
                {labels.recentTenders}
              </h3>
              <a href="/tenders" className="text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all" style={{ color: theme.primary }}>
                View All <ChevronRight size={14} />
              </a>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-50 rounded-xl animate-pulse" />)}
              </div>
            ) : tenders.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                {labels.noTenders}
              </div>
            ) : (
              <div className="space-y-3">
                {tenders.slice(0, 5).map(tender => (
                  <TenderCard key={tender.id} tender={tender} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "tenders" && (
        <div className="space-y-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-lg text-gray-800">All Tenders ({totalTenders})</h3>
            <a
              href="/tenders/new"
              className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg"
              style={{ backgroundColor: theme.primary }}
            >
              <Plus size={16} /> {labels.createTender}
            </a>
          </div>
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
              {tenders.map(tender => (
                <TenderWithActions key={tender.id} tender={tender} theme={theme} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "contracts" && (
        <div className="space-y-4 animate-fade-up">
          <h3 className="font-heading font-semibold text-lg text-gray-800">Contracts & Project Tracking</h3>
          {contracts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-card p-8 text-center text-gray-400">
              No contracts yet. Award tenders to see contracts here.
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map(contract => (
                <ContractCard key={contract.id} contract={contract} theme={theme} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "funding" && (
        <div className="space-y-4 animate-fade-up">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-card p-6">
              <h3 className="font-heading font-semibold text-lg text-gray-800 mb-4">Funding Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-green-50">
                  <p className="text-xs text-green-600 font-medium">Total Approved</p>
                  <p className="text-xl font-heading font-bold text-green-700 mt-1">
                    ₹{(stateStats.totalFundApproved || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50">
                  <p className="text-xs text-amber-600 font-medium">Pending Requests</p>
                  <p className="text-xl font-heading font-bold text-amber-700 mt-1">
                    ₹{(stateStats.totalFundPending || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
              <a href="/funding" className="mt-4 inline-flex items-center gap-1 text-sm font-medium hover:gap-2 transition-all" style={{ color: theme.primary }}>
                Manage Fund Requests <ChevronRight size={14} />
              </a>
            </div>
            <FundingPanel stateId={state?.id} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Reusable sub-components ── */

function StatRow({ icon: Icon, color, label, value }) {
  const colors = {
    blue: "bg-blue-50 text-blue-500",
    amber: "bg-amber-50 text-amber-500",
    green: "bg-green-50 text-green-500",
    teal: "bg-teal-50 text-teal-500",
    purple: "bg-purple-50 text-purple-500",
    red: "bg-red-50 text-red-500",
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg ${c.split(" ")[0]}`}>
      <Icon size={16} className={c.split(" ")[1]} />
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className="text-lg font-bold text-gray-700">{value}</p>
    </div>
  );
}

function TenderWithActions({ tender, theme }) {
  const deadline = new Date(tender.bid_deadline);
  const isExpired = deadline < new Date();
  const bidCount = tender.Bids?.length || 0;

  return (
    <div className="bg-white rounded-xl shadow-card p-5 hover:shadow-elevated transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium badge-${tender.status}`}>
              {tender.status}
            </span>
            {bidCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                {bidCount} bids
              </span>
            )}
          </div>
          <h4 className="font-heading font-semibold text-base text-gray-800">
            <a href={`/tenders/${tender.id}`} className="hover:underline">{tender.title}</a>
          </h4>
          <p className="text-sm text-gray-500 line-clamp-1 mt-1">{tender.description}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            {tender.location && <span>📍 {tender.location}</span>}
            <span>📅 {deadline.toLocaleDateString("en-IN")}</span>
            {!isExpired && <span className="text-amber-500 font-medium">⏳ {Math.ceil((deadline - new Date()) / 86400000)} days left</span>}
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <a
            href={`/tenders/${tender.id}`}
            className="px-3 py-1.5 text-xs rounded-lg font-medium transition"
            style={{ backgroundColor: theme.primary + "15", color: theme.primary }}
          >
            View
          </a>
        </div>
      </div>
    </div>
  );
}

function ContractCard({ contract, theme }) {
  const progress = contract.total_amount > 0
    ? Math.round(((parseFloat(contract.total_amount) - parseFloat(contract.escrow_balance)) / parseFloat(contract.total_amount)) * 100)
    : 0;

  return (
    <a href={`/contracts/${contract.id}`} className="block bg-white rounded-xl shadow-card p-5 hover:shadow-elevated transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-heading font-semibold text-base text-gray-800">{contract.Tender?.title || "Contract"}</h4>
          <p className="text-xs text-gray-400 mt-0.5">Contractor: {contract.contractor?.name}</p>
        </div>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium badge-${contract.status}`}>
          {contract.status}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm mb-3">
        <span className="text-green-600 font-medium">₹{Number(contract.total_amount).toLocaleString("en-IN")}</span>
        <span className="text-gray-400">Escrow: ₹{Number(contract.escrow_balance).toLocaleString("en-IN")}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: theme.primary }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1.5">{progress}% funds disbursed</p>
    </a>
  );
}
