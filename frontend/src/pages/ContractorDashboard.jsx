import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, FileText, Gavel, Building2, Clock, CheckCircle,
  XCircle, AlertTriangle, IndianRupee, TrendingUp, ArrowRight,
  Camera, Award, Loader2, BarChart3
} from "lucide-react";

export default function ContractorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [bids, setBids] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [workProofs, setWorkProofs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bidsRes, contractsRes] = await Promise.all([
        api.get("/bids/my").catch(() => ({ data: [] })),
        api.get("/contracts/my").catch(() => ({ data: [] })),
      ]);
      setBids(bidsRes.data);
      setContracts(contractsRes.data);

      // Load work proofs for each contract
      const proofPromises = (contractsRes.data || []).map(c =>
        api.get(`/work-proofs/contract/${c.id}`).catch(() => ({ data: [] }))
      );
      const proofResults = await Promise.all(proofPromises);
      const allProofs = proofResults.flatMap(r => r.data);
      setWorkProofs(allProofs);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
    setLoading(false);
  };

  // Stats
  const activeBids = bids.filter(b => b.status === "submitted" || b.status === "under_review");
  const wonBids = bids.filter(b => b.status === "awarded");
  const activeContracts = contracts.filter(c => c.status === "active");
  const completedContracts = contracts.filter(c => c.status === "completed");
  const pendingProofs = workProofs.filter(p => p.status === "pending_review");
  const approvedProofs = workProofs.filter(p => p.status === "approved");
  const rejectedProofs = workProofs.filter(p => p.status === "rejected");
  const totalEarned = approvedProofs.reduce((s, p) => s + parseFloat(p.amount_requested || 0), 0);
  const totalWarnings = workProofs.reduce((s, p) => s + (p.warning_count || 0), 0);

  const stats = [
    { label: "Active Bids",    value: activeBids.length,      icon: FileText,       color: "bg-blue-50 text-blue-600" },
    { label: "Won Contracts",   value: wonBids.length + contracts.length, icon: Award, color: "bg-green-50 text-green-600" },
    { label: "Active Projects", value: activeContracts.length, icon: Building2,      color: "bg-indigo-50 text-indigo-600" },
    { label: "Proofs Pending",  value: pendingProofs.length,   icon: Clock,          color: "bg-amber-50 text-amber-600" },
    { label: "Total Earned",    value: `₹${(totalEarned / 100000).toFixed(1)}L`, icon: IndianRupee, color: "bg-emerald-50 text-emerald-600" },
    { label: "Warnings",       value: totalWarnings,           icon: AlertTriangle,  color: totalWarnings > 0 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500" },
  ];

  const tabs = [
    { key: "overview",  label: "Overview",    icon: LayoutDashboard },
    { key: "bids",      label: "My Bids",     icon: Gavel },
    { key: "contracts", label: "My Projects", icon: Building2 },
    { key: "proofs",    label: "Work Proofs",  icon: Camera },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-2xl p-6 text-white">
        <h1 className="font-heading font-bold text-2xl">Welcome back, {user?.name} 👷</h1>
        <p className="text-indigo-100 mt-1 text-sm">
          {activeContracts.length > 0
            ? `You have ${activeContracts.length} active project${activeContracts.length > 1 ? "s" : ""} in progress`
            : "Browse open tenders and submit your bids"
          }
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-xl shadow-card p-4 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-2`}>
              <s.icon size={18} />
            </div>
            <p className="text-xl font-bold text-gray-800">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl shadow-card p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              tab === t.key
                ? "bg-indigo-500 text-white shadow-md"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && <OverviewTab bids={bids} contracts={contracts} workProofs={workProofs} navigate={navigate} />}
      {tab === "bids" && <BidsTab bids={bids} navigate={navigate} />}
      {tab === "contracts" && <ContractsTab contracts={contracts} navigate={navigate} />}
      {tab === "proofs" && <ProofsTab workProofs={workProofs} contracts={contracts} />}
    </div>
  );
}

/* ── Overview Tab ── */
function OverviewTab({ bids, contracts, workProofs, navigate }) {
  const recentBids = [...bids].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
  const activeContracts = contracts.filter(c => c.status === "active").slice(0, 3);
  const recentProofs = [...workProofs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Active Projects */}
      <div className="bg-white rounded-xl shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Building2 size={18} className="text-indigo-500" /> Active Projects
          </h3>
          <button onClick={() => navigate("/my-contracts")} className="text-xs text-indigo-500 hover:underline">View all</button>
        </div>
        {activeContracts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No active projects yet</p>
        ) : (
          <div className="space-y-3">
            {activeContracts.map(c => (
              <Link
                key={c.id}
                to={`/contracts/${c.id}`}
                className="block p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{c.Tender?.title || `Contract #${c.id}`}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.Tender?.location || "—"}</p>
                  </div>
                  <ArrowRight size={14} className="text-gray-400 mt-1" />
                </div>
                {/* Progress bar */}
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{Math.round((parseFloat(c.total_amount || 0) - parseFloat(c.escrow_balance || 0)) / parseFloat(c.total_amount || 1) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-400 to-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.round((parseFloat(c.total_amount || 0) - parseFloat(c.escrow_balance || 0)) / parseFloat(c.total_amount || 1) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-2 text-xs text-gray-400">
                  <span>₹{(parseFloat(c.total_amount || 0) / 100000).toFixed(1)}L total</span>
                  <span>₹{(parseFloat(c.escrow_balance || 0) / 100000).toFixed(1)}L remaining</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Bids */}
      <div className="bg-white rounded-xl shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Gavel size={18} className="text-blue-500" /> Recent Bids
          </h3>
          <button onClick={() => navigate("/my-bids")} className="text-xs text-indigo-500 hover:underline">View all</button>
        </div>
        {recentBids.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400 mb-3">No bids submitted yet</p>
            <Link to="/tenders" className="inline-flex items-center gap-1 text-sm text-indigo-500 hover:underline">
              Browse tenders <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentBids.map(b => (
              <div key={b.id} className="p-3 rounded-lg border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{b.Tender?.title || `Tender #${b.tender_id}`}</p>
                    <p className="text-xs text-gray-400 mt-0.5">₹{(parseFloat(b.amount) / 100000).toFixed(1)}L bid</p>
                  </div>
                  <BidStatusBadge status={b.status} />
                </div>
                {b.ai_score && (
                  <div className="flex items-center gap-1 mt-2">
                    <BarChart3 size={12} className="text-indigo-400" />
                    <span className="text-xs text-gray-500">AI Score: {b.ai_score}/100</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Work Proofs */}
      <div className="bg-white rounded-xl shadow-card p-5 md:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Camera size={18} className="text-teal-500" /> Recent Work Proofs
          </h3>
        </div>
        {recentProofs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No work proofs submitted yet. Submit proof from your active project pages.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {recentProofs.map(p => (
              <div key={p.id} className="p-3 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <ProofStatusBadge status={p.status} />
                  <span className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString("en-IN")}</span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">{p.description}</p>
                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                  <span>{p.work_percentage}% work</span>
                  <span>₹{(parseFloat(p.amount_requested || 0) / 100000).toFixed(1)}L</span>
                </div>
                {p.warning_count > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                    <AlertTriangle size={12} /> {p.warning_count} warning{p.warning_count > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Bids Tab ── */
function BidsTab({ bids, navigate }) {
  const sorted = [...bids].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="space-y-3">
      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-8 text-center">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No bids submitted yet</p>
          <Link to="/tenders" className="inline-flex items-center gap-1 mt-3 text-sm text-indigo-500 hover:underline">
            Browse open tenders <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        sorted.map(b => (
          <div key={b.id} className="bg-white rounded-xl shadow-card p-5 animate-fade-up">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Link to={`/tenders/${b.tender_id}`} className="font-semibold text-gray-700 hover:text-indigo-600 transition">
                  {b.Tender?.title || `Tender #${b.tender_id}`}
                </Link>
                <p className="text-sm text-gray-500 mt-0.5">{b.Tender?.location || "—"} • {b.Tender?.category || "—"}</p>

                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                  <div>
                    <span className="text-gray-400 text-xs">Bid Amount</span>
                    <p className="font-semibold text-gray-700">₹{parseFloat(b.amount).toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">Duration</span>
                    <p className="font-semibold text-gray-700">{b.timeline_days || "—"} days</p>
                  </div>
                  {b.ai_score && (
                    <div>
                      <span className="text-gray-400 text-xs">AI Score</span>
                      <p className="font-semibold text-indigo-600">{b.ai_score}/100</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400 text-xs">Submitted</span>
                    <p className="font-semibold text-gray-700">{new Date(b.createdAt).toLocaleDateString("en-IN")}</p>
                  </div>
                </div>
              </div>
              <BidStatusBadge status={b.status} />
            </div>

            {b.status === "awarded" && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <Award size={14} /> You won this tender!
                </span>
                <Link
                  to={`/contracts/${b.contract_id || b.id}`}
                  className="text-xs bg-indigo-500 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-600 transition"
                >
                  View Contract →
                </Link>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ── Contracts Tab ── */
function ContractsTab({ contracts, navigate }) {
  const sorted = [...contracts].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (b.status === "active" && a.status !== "active") return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div className="space-y-3">
      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-8 text-center">
          <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No contracts yet. Win a bid to get started!</p>
        </div>
      ) : (
        sorted.map(c => {
          const progress = Math.round(
            (parseFloat(c.total_amount || 0) - parseFloat(c.escrow_balance || 0)) /
            parseFloat(c.total_amount || 1) * 100
          );

          return (
            <Link
              key={c.id}
              to={`/contracts/${c.id}`}
              className="block bg-white rounded-xl shadow-card p-5 hover:shadow-md transition animate-fade-up"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-700">{c.Tender?.title || `Contract #${c.id}`}</h4>
                  <p className="text-sm text-gray-500 mt-0.5">{c.Tender?.location || "—"}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  c.status === "active" ? "bg-green-50 text-green-600" :
                  c.status === "completed" ? "bg-blue-50 text-blue-600" :
                  "bg-gray-100 text-gray-500"
                }`}>
                  {c.status}
                </span>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div>
                  <p className="text-xs text-gray-400">Total Value</p>
                  <p className="text-sm font-semibold text-gray-700">₹{(parseFloat(c.total_amount || 0) / 100000).toFixed(1)}L</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Advance (20%)</p>
                  <p className="text-sm font-semibold text-green-600">₹{(parseFloat(c.total_amount || 0) * 0.2 / 100000).toFixed(1)}L</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Disbursed</p>
                  <p className="text-sm font-semibold text-indigo-600">
                    ₹{((parseFloat(c.total_amount || 0) - parseFloat(c.escrow_balance || 0)) / 100000).toFixed(1)}L
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Remaining</p>
                  <p className="text-sm font-semibold text-gray-700">₹{(parseFloat(c.escrow_balance || 0) / 100000).toFixed(1)}L</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Financial Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      progress >= 80 ? "bg-gradient-to-r from-green-400 to-emerald-500" :
                      progress >= 40 ? "bg-gradient-to-r from-indigo-400 to-blue-500" :
                      "bg-gradient-to-r from-amber-400 to-orange-500"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span>Started {new Date(c.createdAt).toLocaleDateString("en-IN")}</span>
                <span className="flex items-center gap-1 text-indigo-500 font-medium">
                  View details <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}

/* ── Proofs Tab ── */
function ProofsTab({ workProofs, contracts }) {
  const sorted = [...workProofs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="space-y-3">
      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-8 text-center">
          <Camera size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No work proofs submitted yet</p>
          <p className="text-xs text-gray-400 mt-1">Go to an active project to upload proof of work</p>
        </div>
      ) : (
        sorted.map(p => {
          const contract = contracts.find(c => c.id === p.contract_id);
          return (
            <div key={p.id} className="bg-white rounded-xl shadow-card p-5 animate-fade-up">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <ProofStatusBadge status={p.status} />
                    {p.warning_count > 0 && (
                      <span className="text-xs text-red-500 flex items-center gap-0.5">
                        <AlertTriangle size={12} /> {p.warning_count} warning{p.warning_count > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{p.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Contract: {contract?.Tender?.title || `#${p.contract_id}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-700">₹{parseFloat(p.amount_requested).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-gray-400">{p.work_percentage}% work</p>
                </div>
              </div>

              {/* Photos */}
              {p.photo_urls?.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {p.photo_urls.slice(0, 4).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Proof ${i + 1}`}
                      className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  ))}
                  {p.photo_urls.length > 4 && (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                      +{p.photo_urls.length - 4}
                    </div>
                  )}
                </div>
              )}

              {/* Review notes */}
              {p.review_notes && (
                <div className={`mt-3 p-2 rounded-lg text-xs ${
                  p.status === "approved" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}>
                  <span className="font-medium">Reviewer Notes:</span> {p.review_notes}
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                <span>Submitted {new Date(p.createdAt).toLocaleDateString("en-IN")}</span>
                {p.reviewed_at && (
                  <span>Reviewed {new Date(p.reviewed_at).toLocaleDateString("en-IN")}</span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ── Badge Components ── */
function BidStatusBadge({ status }) {
  const styles = {
    submitted: "bg-blue-50 text-blue-600",
    under_review: "bg-amber-50 text-amber-600",
    awarded: "bg-green-50 text-green-600",
    rejected: "bg-red-50 text-red-600",
    withdrawn: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${styles[status] || "bg-gray-100 text-gray-500"}`}>
      {status?.replace("_", " ")}
    </span>
  );
}

function ProofStatusBadge({ status }) {
  const config = {
    pending_review: { icon: Clock,       bg: "bg-amber-50 text-amber-600",  label: "Pending Review" },
    approved:       { icon: CheckCircle, bg: "bg-green-50 text-green-600",  label: "Approved" },
    rejected:       { icon: XCircle,     bg: "bg-red-50 text-red-600",      label: "Rejected" },
  };
  const c = config[status] || config.pending_review;
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${c.bg}`}>
      <c.icon size={12} /> {c.label}
    </span>
  );
}
