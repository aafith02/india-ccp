import { useState, useEffect } from "react";
import { Camera } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

const statusBg = {
  pending_assignment: "bg-gray-100 text-gray-500",
  under_review: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

export default function VerificationPanel() {
  const { user } = useAuth();
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState({});
  const [stateMembers, setStateMembers] = useState([]);
  const [assignees, setAssignees] = useState({});

  useEffect(() => {
    fetchProofs();
    if (user?.state_id) {
      api.get(`/states/${user.state_id}/members`).then(r => setStateMembers(r.data.members || [])).catch(() => {});
    }
  }, []);

  async function fetchProofs() {
    try {
      const { data } = await api.get("/work-proofs/pending");
      setProofs(data.proofs || []);
    } catch {}
    setLoading(false);
  }

  async function vote(proofId, voteType) {
    try {
      await api.post(`/work-proofs/${proofId}/vote`, { vote: voteType, comment: comments[proofId] || "" });
      toast.success(`Vote recorded: ${voteType}`);
      fetchProofs();
    } catch (err) {
      toast.error(err.response?.data?.error || "Vote failed");
    }
  }

  async function assignReviewers(proofId) {
    const ids = assignees[proofId] || [];
    if (ids.length === 0) return toast.warn("Select at least one reviewer");
    try {
      await api.post(`/work-proofs/${proofId}/assign-reviewers`, { reviewer_ids: ids });
      toast.success("Reviewers assigned");
      fetchProofs();
    } catch (err) {
      toast.error(err.response?.data?.error || "Assignment failed");
    }
  }

  function toggleAssignee(proofId, memberId) {
    setAssignees(prev => {
      const curr = prev[proofId] || [];
      return { ...prev, [proofId]: curr.includes(memberId) ? curr.filter(id => id !== memberId) : [...curr, memberId] };
    });
  }

  if (loading) return <div className="p-8 text-gray-500">Loading work proofs...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Work Proof Verification</h1>
        <p className="text-gray-500 text-sm mt-1">Review submissions and cast your vote (51% majority required)</p>
      </div>

      {proofs.length === 0 ? (
        <div className="bg-gray-50 text-gray-500 p-6 rounded-xl text-center">No work proofs to review</div>
      ) : (
        <div className="space-y-4">
          {proofs.map(wp => {
            const myVote = wp.ProofVotes?.find(v => v.voter_id === user?.id);
            const isReviewer = wp.ProofReviewers?.some(r => r.reviewer_id === user?.id);

            return (
              <div key={wp.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">{wp.description}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Submitted by {wp.submittedBy?.name || wp.Contract?.contractor?.name || "Contractor"} — {new Date(wp.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBg[wp.status] || "bg-gray-100"}`}>
                      {wp.status?.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Photos */}
                  {wp.photo_urls?.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto">
                      {wp.photo_urls.map((url, i) => {
                        const src = url.startsWith("http") ? url : `${import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000"}${url}`;
                        const isPdf = url.toLowerCase().endsWith(".pdf");
                        const isZip = url.toLowerCase().endsWith(".zip");
                        return isPdf || isZip ? (
                          <a key={i} href={src} target="_blank" rel="noreferrer"
                            className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg flex flex-col items-center justify-center border hover:bg-gray-200 transition">
                            <Camera size={20} className="text-gray-500" />
                            <span className="text-[10px] text-gray-500 mt-1">{url.split("/").pop()}</span>
                          </a>
                        ) : (
                          <a key={i} href={src} target="_blank" rel="noreferrer" className="flex-shrink-0">
                            <img src={src} alt={`Proof ${i + 1}`}
                              className="w-24 h-24 object-cover rounded-lg border hover:opacity-80 transition"
                              onError={e => { e.target.onerror = null; e.target.src = ''; e.target.className = 'w-24 h-24 bg-gray-100 rounded-lg border flex items-center justify-center'; e.target.alt = 'Image not available'; }}
                            />
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {/* Vote progress */}
                  {wp.status === "under_review" && (
                    <div className="mt-4 bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Votes: {wp.approval_count} approve / {wp.rejection_count} reject</span>
                        <span className="text-gray-500">Need {wp.required_approvals} approvals</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(wp.approval_count / (wp.required_approvals || 1)) * 100}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Assign reviewers (for pending_assignment) */}
                  {wp.status === "pending_assignment" && (
                    <div className="mt-4 bg-amber-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-amber-700 mb-2">Assign Reviewers</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {stateMembers.map(m => (
                          <button
                            key={m.id}
                            onClick={() => toggleAssignee(wp.id, m.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${(assignees[wp.id] || []).includes(m.id) ? "bg-teal-600 text-white" : "bg-white text-gray-600 border"}`}
                          >
                            {m.name}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => assignReviewers(wp.id)} className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition">
                        Assign Selected ({(assignees[wp.id] || []).length})
                      </button>
                    </div>
                  )}

                  {/* Cast vote (for under_review + assigned reviewer + not yet voted) */}
                  {wp.status === "under_review" && isReviewer && !myVote && (
                    <div className="mt-4 border-t pt-4">
                      <textarea
                        className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
                        rows={2}
                        placeholder="Comments (optional)..."
                        value={comments[wp.id] || ""}
                        onChange={e => setComments(p => ({ ...p, [wp.id]: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => vote(wp.id, "approve")} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition">
                          Approve
                        </button>
                        <button onClick={() => vote(wp.id, "reject")} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition">
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {myVote && (
                    <div className="mt-3 text-sm text-gray-500">
                      You voted: <span className={`font-medium ${myVote.vote === "approve" ? "text-green-600" : "text-red-600"}`}>{myVote.vote}</span>
                    </div>
                  )}

                  {/* All votes list */}
                  {wp.ProofVotes?.length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <p className="text-xs text-gray-400 mb-1">Votes Cast</p>
                      <div className="flex flex-wrap gap-2">
                        {wp.ProofVotes.map(v => (
                          <span key={v.id} className={`px-2 py-1 rounded-full text-xs ${v.vote === "approve" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                            {v.voter?.name || "Reviewer"}: {v.vote}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
