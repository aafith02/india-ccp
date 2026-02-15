import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import MilestoneTimeline from "../components/MilestoneTimeline";
import WorkProofUpload from "../components/WorkProofUpload";
import {
  Upload, CheckCircle, XCircle, AlertTriangle, Clock, IndianRupee,
  FileText, Image, Loader2, TrendingUp, Eye
} from "lucide-react";

export default function ContractExecution() {
  const { id } = useParams();
  const { user } = useAuth();
  const [contract, setContract] = useState(null);
  const [workProofs, setWorkProofs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadContract = () => {
    Promise.all([
      api.get(`/contracts/${id}`),
      api.get(`/work-proofs/contract/${id}`).catch(() => ({ data: [] })),
    ]).then(([contractRes, proofsRes]) => {
      setContract(contractRes.data);
      setWorkProofs(proofsRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadContract(); }, [id]);

  const handleApprove = async (milestoneId) => {
    try {
      await api.patch(`/milestones/${milestoneId}/approve`, { review_notes: "Approved after review" });
      loadContract();
    } catch (err) {
      alert(err.response?.data?.error || "Approval failed");
    }
  };

  const handleReject = async (milestoneId) => {
    try {
      await api.patch(`/milestones/${milestoneId}/reject`, { review_notes: "Re-upload required" });
      loadContract();
    } catch (err) {
      alert(err.response?.data?.error || "Rejection failed");
    }
  };

  if (loading) return <div className="h-64 bg-white rounded-xl animate-pulse" />;
  if (!contract) return <div className="text-center text-gray-400 py-12">Contract not found</div>;

  const milestones = contract.Milestones || [];
  const isContractor = user?.role === "contractor";
  const isGov = user?.role === "state_gov" || user?.role === "central_gov";
  const isVerifier = user?.role === "auditor_ngo" || user?.role === "community";

  const totalAmount = parseFloat(contract.total_amount);
  const escrowBalance = parseFloat(contract.escrow_balance);
  const disbursed = totalAmount - escrowBalance;
  const progress = totalAmount > 0 ? Math.round((disbursed / totalAmount) * 100) : 0;
  const initialPayment = Math.round(totalAmount * 0.20 * 100) / 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Contract info */}
      <div className="bg-white rounded-xl shadow-card p-6 animate-fade-up">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-heading font-bold text-xl text-gray-800">
              {contract.Tender?.title || "Contract"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Contractor: {contract.contractor?.name} · Rep: {contract.contractor?.reputation || 0}
            </p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium badge-${contract.status}`}>
            {contract.status}
          </span>
        </div>

        {/* Financial overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-green-50 rounded-xl">
            <p className="text-xs text-green-600 font-medium flex items-center gap-1"><IndianRupee size={10} /> Total</p>
            <p className="text-lg font-heading font-bold text-green-700">₹{totalAmount.toLocaleString("en-IN")}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-600 font-medium flex items-center gap-1"><TrendingUp size={10} /> 20% Advance</p>
            <p className="text-lg font-heading font-bold text-blue-700">₹{initialPayment.toLocaleString("en-IN")}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <p className="text-xs text-amber-600 font-medium flex items-center gap-1"><Clock size={10} /> Escrow</p>
            <p className="text-lg font-heading font-bold text-amber-700">₹{escrowBalance.toLocaleString("en-IN")}</p>
          </div>
          <div className="p-3 bg-teal-50 rounded-xl">
            <p className="text-xs text-teal-600 font-medium flex items-center gap-1"><CheckCircle size={10} /> Disbursed</p>
            <p className="text-lg font-heading font-bold text-teal-700">₹{disbursed.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-teal-400 to-green-500 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5">{progress}% of total funds disbursed</p>
      </div>

      {/* Contractor: Upload work proof */}
      {isContractor && contract.status === "active" && (
        <WorkProofUpload
          contract={contract}
          milestones={milestones}
          onSuccess={loadContract}
        />
      )}

      {/* Work Proofs History */}
      {workProofs.length > 0 && (
        <div className="bg-white rounded-xl shadow-card p-6 animate-fade-up-delay">
          <h3 className="font-heading font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
            <FileText size={18} className="text-blue-500" />
            Work Proof Submissions ({workProofs.length})
          </h3>
          <div className="space-y-4">
            {workProofs.map(proof => (
              <WorkProofCard
                key={proof.id}
                proof={proof}
                isGov={isGov}
                isVerifier={isVerifier}
                onRefresh={loadContract}
              />
            ))}
          </div>
        </div>
      )}

      {/* Milestones with actions */}
      <div className="bg-white rounded-xl shadow-card p-6 animate-fade-up-delay">
        <h3 className="font-heading font-semibold text-lg text-gray-800 mb-4">Milestones</h3>
        <div className="space-y-4">
          {milestones.map((ms) => (
            <div key={ms.id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-700">{ms.sequence}. {ms.title}</h4>
                <span className={`text-xs px-2.5 py-0.5 rounded-full badge-${ms.status}`}>
                  {ms.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-3">{ms.description}</p>
              <p className="text-sm text-gray-600 mb-3">
                Amount: ₹{Number(ms.amount).toLocaleString("en-IN")}
              </p>

              {/* Gov: approve / reject */}
              {isGov && ms.status === "proof_uploaded" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(ms.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition"
                  >
                    <CheckCircle size={14} /> Approve & Release
                  </button>
                  <button
                    onClick={() => handleReject(ms.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}

              {/* Payment info */}
              {ms.Payment && ms.Payment.status === "released" && (
                <div className="mt-2 p-2 bg-green-50 rounded-lg text-xs text-green-600">
                  ✓ Payment released: ₹{Number(ms.Payment.amount).toLocaleString("en-IN")} · TX: {ms.Payment.tx_hash}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Work proof card sub-component ── */
function WorkProofCard({ proof, isGov, isVerifier, onRefresh }) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const statusColors = {
    pending_review: { bg: "bg-orange-50", text: "text-orange-700", label: "Pending Review" },
    approved: { bg: "bg-green-50", text: "text-green-700", label: "Approved" },
    rejected: { bg: "bg-red-50", text: "text-red-700", label: "Rejected" },
  };

  const status = statusColors[proof.status] || statusColors.pending_review;

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await api.patch(`/work-proofs/${proof.id}/approve`, { review_notes: reviewNotes || "Approved" });
      onRefresh?.();
    } catch (err) {
      alert(err.response?.data?.error || "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reviewNotes.trim()) {
      alert("Please provide a rejection reason");
      return;
    }
    setActionLoading(true);
    try {
      await api.patch(`/work-proofs/${proof.id}/reject`, { review_notes: reviewNotes });
      onRefresh?.();
    } catch (err) {
      alert(err.response?.data?.error || "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={`border rounded-xl p-4 ${status.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}>
              {status.label}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(proof.createdAt).toLocaleDateString("en-IN")} at {new Date(proof.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p className="text-sm text-gray-700">{proof.description}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-green-600">₹{Number(proof.amount_requested).toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-400">{proof.work_percentage}% work</p>
        </div>
      </div>

      {/* Photos */}
      {proof.photo_urls?.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {proof.photo_urls.map((photo, i) => (
            <div key={i} className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 border border-gray-300">
              <img src={photo.url} alt={`Proof ${i + 1}`} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
            </div>
          ))}
        </div>
      )}

      {/* Warning count */}
      {proof.warning_count > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
          <AlertTriangle size={12} /> {proof.warning_count} warning(s) issued
        </div>
      )}

      {/* Review notes */}
      {proof.review_notes && proof.status !== "pending_review" && (
        <div className="mt-2 p-2 bg-white rounded-lg text-xs text-gray-600">
          <strong>Review:</strong> {proof.review_notes}
        </div>
      )}

      {/* Actions for verifiers */}
      {proof.status === "pending_review" && (isGov || isVerifier) && (
        <div className="mt-3 pt-3 border-t border-gray-200/50 space-y-2">
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Add review notes..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-300 outline-none resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white text-xs font-medium rounded-lg hover:bg-green-600 transition disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              Approve & Release ₹{Number(proof.amount_requested).toLocaleString("en-IN")}
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
