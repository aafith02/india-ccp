import { useState, useEffect } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  Eye, CheckCircle, XCircle, AlertTriangle, MapPin, Clock,
  IndianRupee, User, FileText, Image, Loader2, ChevronDown, ChevronUp
} from "lucide-react";

export default function VerificationPanel() {
  const { user } = useAuth();
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});
  const [actionLoading, setActionLoading] = useState(null);

  const loadProofs = () => {
    setLoading(true);
    api.get("/work-proofs/pending")
      .then(({ data }) => {
        setProofs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadProofs(); }, []);

  const handleApprove = async (proofId) => {
    setActionLoading(proofId);
    try {
      await api.patch(`/work-proofs/${proofId}/approve`, {
        review_notes: reviewNotes[proofId] || "Verified — work confirmed",
      });
      loadProofs();
    } catch (err) {
      alert(err.response?.data?.error || "Approval failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (proofId) => {
    if (!reviewNotes[proofId]?.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }
    setActionLoading(proofId);
    try {
      await api.patch(`/work-proofs/${proofId}/reject`, {
        review_notes: reviewNotes[proofId],
      });
      loadProofs();
    } catch (err) {
      alert(err.response?.data?.error || "Rejection failed");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl text-gray-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <Eye size={20} className="text-orange-500" />
          </div>
          Verification Center
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Review work proofs submitted by contractors. Verify photos and descriptions before approving payment.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-card p-4 text-center">
          <p className="text-2xl font-heading font-bold text-orange-600">{proofs.length}</p>
          <p className="text-xs text-gray-500">Pending Review</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4 text-center">
          <p className="text-2xl font-heading font-bold text-green-600">
            ₹{proofs.reduce((sum, p) => sum + parseFloat(p.amount_requested || 0), 0).toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-gray-500">Total Requested</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4 text-center">
          <p className="text-2xl font-heading font-bold text-blue-600">
            {new Set(proofs.map(p => p.Contract?.Tender?.state_id).filter(Boolean)).size}
          </p>
          <p className="text-xs text-gray-500">States Involved</p>
        </div>
      </div>

      {/* Proofs list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : proofs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <CheckCircle size={48} className="mx-auto text-green-300 mb-3" />
          <p className="text-gray-400 text-sm">All caught up! No work proofs pending verification.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {proofs.map(proof => {
            const isExpanded = expandedId === proof.id;
            const tender = proof.Contract?.Tender;
            const state = tender?.State;

            return (
              <div key={proof.id} className="bg-white rounded-xl shadow-card overflow-hidden animate-fade-up">
                {/* Header */}
                <div
                  className="p-5 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => toggleExpand(proof.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <FileText size={18} className="text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                            Pending Review
                          </span>
                          {state && (
                            <span className="text-xs text-gray-400">
                              {state.name} ({state.code})
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-800">{tender?.title || "Project"}</h4>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{proof.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <User size={12} /> {proof.submittedBy?.name || "Contractor"}
                          </span>
                          <span className="flex items-center gap-1">
                            <IndianRupee size={12} /> ₹{Number(proof.amount_requested).toLocaleString("en-IN")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {proof.work_percentage}% work
                          </span>
                          {proof.photo_urls?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Image size={12} /> {proof.photo_urls.length} photos
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-green-600">
                        ₹{Number(proof.amount_requested).toLocaleString("en-IN")}
                      </span>
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 space-y-5 bg-gray-50/50">
                    {/* Full description */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">Work Description</h5>
                      <p className="text-sm text-gray-600 bg-white p-4 rounded-lg border border-gray-100">
                        {proof.description}
                      </p>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white p-3 rounded-lg border border-gray-100">
                        <p className="text-xs text-gray-500">Work Completed</p>
                        <p className="text-lg font-bold text-blue-600">{proof.work_percentage}%</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-100">
                        <p className="text-xs text-gray-500">Amount Requested</p>
                        <p className="text-lg font-bold text-green-600">₹{Number(proof.amount_requested).toLocaleString("en-IN")}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-100">
                        <p className="text-xs text-gray-500">Contractor</p>
                        <p className="text-sm font-semibold text-gray-700">{proof.submittedBy?.name}</p>
                        <p className="text-xs text-gray-400">Rep: {proof.submittedBy?.reputation || 0}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-100">
                        <p className="text-xs text-gray-500">Location</p>
                        <p className="text-sm font-semibold text-gray-700">{tender?.location || "N/A"}</p>
                        {tender?.district && <p className="text-xs text-gray-400">{tender.district}</p>}
                      </div>
                    </div>

                    {/* Photos */}
                    {proof.photo_urls?.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Image size={14} /> Proof Photos ({proof.photo_urls.length})
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {proof.photo_urls.map((photo, i) => (
                            <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-200 border border-gray-200">
                              <img
                                src={photo.url}
                                alt={`Proof ${i + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 text-xs">Image unavailable</div>';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Review notes + actions */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Review Notes</label>
                      <textarea
                        value={reviewNotes[proof.id] || ""}
                        onChange={(e) => setReviewNotes({ ...reviewNotes, [proof.id]: e.target.value })}
                        placeholder="Add your verification notes here... (required for rejection)"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 outline-none resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => handleApprove(proof.id)}
                        disabled={actionLoading === proof.id}
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white text-sm font-medium rounded-xl hover:bg-green-600 shadow-md transition disabled:opacity-50"
                      >
                        {actionLoading === proof.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        Verify & Approve Payment
                      </button>
                      <button
                        onClick={() => handleReject(proof.id)}
                        disabled={actionLoading === proof.id}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 shadow-md transition disabled:opacity-50"
                      >
                        {actionLoading === proof.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                        Reject & Issue Warning
                      </button>
                    </div>

                    {/* Warning about consequences */}
                    <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                      <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">
                        <strong>Approve:</strong> The requested amount will be released to the contractor immediately.{" "}
                        <strong>Reject:</strong> A warning will be issued to the contractor for this project. Multiple warnings may affect their reputation.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
