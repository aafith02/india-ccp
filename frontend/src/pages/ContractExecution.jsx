import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { CheckCircle, Clock, Upload, FileText, ChevronDown, ChevronUp, Loader2, Lock, AlertCircle } from "lucide-react";

export default function ContractExecution() {
  const { id } = useParams();
  const { user } = useAuth();
  const [contract, setContract] = useState(null);
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [phaseDesc, setPhaseDesc] = useState("");
  const [phaseFiles, setPhaseFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchContract(); }, [id]);

  async function fetchContract() {
    try {
      const { data } = await api.get(`/contracts/${id}`);
      setContract(data.contract);
      const wp = await api.get(`/work-proofs/contract/${id}`);
      setProofs(wp.data.proofs || []);
    } catch {}
    setLoading(false);
  }

  async function submitPhaseProof(milestone) {
    if (!phaseDesc.trim()) return alert("Please describe the work completed");
    setSubmitting(true);
    try {
      const tranches = contract?.ContractTranches?.sort((a, b) => a.sequence - b.sequence) || [];
      const matchingTranche = tranches.find(t => t.sequence === milestone.sequence && t.status === "pending")
        || tranches.find(t => t.status === "pending");

      const totalMilestones = contract?.Milestones?.length || 1;
      const pct = Math.round((milestone.sequence / totalMilestones) * 100);

      const fd = new FormData();
      fd.append("contract_id", id);
      if (matchingTranche) fd.append("tranche_id", matchingTranche.id);
      fd.append("milestone_id", milestone.id);
      fd.append("description", phaseDesc);
      fd.append("work_percentage", pct);
      fd.append("amount_requested", Number(milestone.amount));
      phaseFiles.forEach(f => fd.append("photos", f));

      await api.post("/work-proofs", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setExpandedPhase(null);
      setPhaseDesc("");
      setPhaseFiles([]);
      fetchContract();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to submit proof");
    }
    setSubmitting(false);
  }

  if (loading) return <div className="p-8 text-gray-500">Loading contract...</div>;
  if (!contract) return <div className="p-8 text-red-500">Contract not found</div>;

  const isContractor = user?.role === "contractor" && contract.contractor_id === user?.id;
  const disbursed = contract.ContractTranches?.filter(t => t.status === "disbursed").reduce((s, t) => s + Number(t.amount), 0) || 0;
  const milestones = (contract.Milestones || []).sort((a, b) => a.sequence - b.sequence);
  const totalPhases = milestones.length || 1;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{contract.Tender?.title || "Contract Details"}</h1>
        <p className="text-gray-500 text-sm mt-1">Contract #{id.slice(0, 8)}</p>
      </div>

      {/* Financial overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 text-blue-700 rounded-xl p-4">
          <p className="text-xs opacity-70">Total Amount</p>
          <p className="text-xl font-bold mt-1">₹{(contract.total_amount / 100000).toFixed(1)}L</p>
        </div>
        <div className="bg-green-50 text-green-700 rounded-xl p-4">
          <p className="text-xs opacity-70">Disbursed</p>
          <p className="text-xl font-bold mt-1">₹{(disbursed / 100000).toFixed(1)}L</p>
        </div>
        <div className="bg-amber-50 text-amber-700 rounded-xl p-4">
          <p className="text-xs opacity-70">Escrow Balance</p>
          <p className="text-xl font-bold mt-1">₹{(contract.escrow_balance / 100000).toFixed(1)}L</p>
        </div>
        <div className="bg-purple-50 text-purple-700 rounded-xl p-4">
          <p className="text-xs opacity-70">Tranche Progress</p>
          <p className="text-xl font-bold mt-1">{contract.current_tranche}/{contract.tranche_count}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Contract Progress</span>
          <span>{Math.round((contract.current_tranche / contract.tranche_count) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="bg-teal-500 h-3 rounded-full transition-all" style={{ width: `${(contract.current_tranche / contract.tranche_count) * 100}%` }} />
        </div>
      </div>

      {/* Tranches */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Tranches</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {contract.ContractTranches?.sort((a, b) => a.sequence - b.sequence).map(t => (
            <div key={t.id} className={`rounded-xl p-4 ${t.status === "disbursed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              <p className="text-xs font-medium opacity-70">Tranche {t.sequence}</p>
              <p className="text-lg font-bold mt-1">₹{(t.amount / 100000).toFixed(1)}L</p>
              <p className="text-xs mt-1 capitalize">{t.status}</p>
              {t.disbursed_at && <p className="text-xs opacity-60 mt-0.5">{new Date(t.disbursed_at).toLocaleDateString()}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ Phase Tiles ═══════════ */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Project Phases</h2>
        <p className="text-xs text-gray-400 mb-4">
          {isContractor
            ? "Click on the active phase to submit your work proof"
            : "Track milestone completion progress"}
        </p>

        <div className="space-y-3">
          {milestones.map((m, idx) => {
            const phaseProofs = proofs.filter(p => p.milestone_id === m.id);
            const isActive = m.status === "in_progress";
            const isActionable = isContractor && isActive && contract.status === "active";
            const isExpanded = expandedPhase === m.id;
            const cumulativePct = Math.round((m.sequence / totalPhases) * 100);

            // Status config
            const statusCfg = {
              approved:       { bg: "bg-green-50 border-green-200", badge: "bg-green-100 text-green-700", icon: <CheckCircle size={20} className="text-green-500" />, label: "Completed" },
              in_progress:    { bg: "bg-blue-50 border-blue-300 ring-2 ring-blue-200", badge: "bg-blue-100 text-blue-700", icon: <Clock size={20} className="text-blue-500 animate-pulse" />, label: "In Progress" },
              proof_uploaded: { bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-700", icon: <Upload size={20} className="text-amber-500" />, label: "Proof Submitted" },
              under_review:   { bg: "bg-purple-50 border-purple-200", badge: "bg-purple-100 text-purple-700", icon: <FileText size={20} className="text-purple-500" />, label: "Under Review" },
              rejected:       { bg: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-700", icon: <AlertCircle size={20} className="text-red-500" />, label: "Rejected" },
              pending:        { bg: "bg-gray-50 border-gray-200 opacity-60", badge: "bg-gray-100 text-gray-500", icon: <Lock size={14} className="text-gray-400" />, label: "Locked" },
            };
            const cfg = statusCfg[m.status] || statusCfg.pending;

            return (
              <div key={m.id} className={`rounded-xl border-2 transition-all ${cfg.bg} ${isActionable ? "cursor-pointer hover:shadow-md" : ""}`}>
                {/* Card header — always visible */}
                <div
                  className="p-4 flex items-center gap-4"
                  onClick={() => {
                    if (isActionable) setExpandedPhase(isExpanded ? null : m.id);
                  }}
                >
                  {/* Phase number badge */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                    ${m.status === "approved" ? "bg-green-200 text-green-800"
                      : isActive ? "bg-blue-200 text-blue-800"
                      : "bg-gray-200 text-gray-500"}`}>
                    {m.sequence}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-sm">{m.title || `Phase ${m.sequence}`}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>₹{(m.amount / 100000).toFixed(1)}L</span>
                      <span>Cumulative: {cumulativePct}%</span>
                      {m.description && <span className="truncate">{m.description}</span>}
                    </div>
                  </div>

                  {/* Status icon + expand arrow */}
                  <div className="flex items-center gap-2 shrink-0">
                    {cfg.icon}
                    {isActionable && (
                      isExpanded ? <ChevronUp size={18} className="text-blue-400" /> : <ChevronDown size={18} className="text-blue-400" />
                    )}
                  </div>
                </div>

                {/* Existing proofs for this phase */}
                {phaseProofs.length > 0 && (
                  <div className="px-4 pb-2">
                    {phaseProofs.map(wp => (
                      <div key={wp.id} className="flex items-center justify-between bg-white/70 border rounded-lg px-3 py-2 mb-1">
                        <div>
                          <p className="text-xs font-medium text-gray-700">{wp.description}</p>
                          <p className="text-[10px] text-gray-400">Votes: {wp.approval_count}/{wp.required_approvals} — {new Date(wp.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          wp.status === "approved" ? "bg-green-100 text-green-700"
                          : wp.status === "rejected" ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                        }`}>{wp.status?.replace(/_/g, " ")}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Expandable proof submission form */}
                {isExpanded && isActionable && (
                  <div className="border-t-2 border-blue-200 p-4 space-y-3 bg-white/50 rounded-b-xl">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Submit Proof for Phase {m.sequence}</p>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-blue-50 rounded-lg p-2.5">
                        <p className="text-gray-500">Tranche Amount</p>
                        <p className="font-bold text-blue-700">₹{(m.amount / 100000).toFixed(1)}L</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2.5">
                        <p className="text-gray-500">Work Completion</p>
                        <p className="font-bold text-blue-700">{cumulativePct}%</p>
                      </div>
                    </div>

                    <textarea
                      className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                      rows={3}
                      placeholder={`Describe the work completed in Phase ${m.sequence}...`}
                      value={phaseDesc}
                      onChange={e => setPhaseDesc(e.target.value)}
                    />

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Upload Photos / Documents</label>
                      <input
                        type="file" multiple accept="image/*,.pdf,.zip"
                        className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600 file:px-3 file:py-1 file:text-xs"
                        onChange={e => setPhaseFiles(Array.from(e.target.files))}
                      />
                      {phaseFiles.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">{phaseFiles.length} file(s) selected</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => submitPhaseProof(m)}
                        disabled={submitting}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {submitting ? "Submitting..." : "Submit Phase Proof"}
                      </button>
                      <button
                        onClick={() => { setExpandedPhase(null); setPhaseDesc(""); setPhaseFiles([]); }}
                        className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200"
                      >Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
