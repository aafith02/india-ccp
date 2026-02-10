import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import MilestoneTimeline from "../components/MilestoneTimeline";
import { Upload, CheckCircle, XCircle } from "lucide-react";

export default function ContractExecution() {
  const { id } = useParams();
  const { user } = useAuth();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadContract = () => {
    api.get(`/contracts/${id}`).then(({ data }) => {
      setContract(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadContract(); }, [id]);

  const handleProofUpload = async (milestoneId) => {
    // In production: open file picker, upload, get URL + hash + geo
    const proof_files = [{
      url: `https://storage.example.com/proof-${Date.now()}.jpg`,
      hash: `sha256-${Date.now()}`,
      geo: { lat: 28.6139, lng: 77.2090 },
      timestamp: new Date().toISOString(),
    }];

    try {
      await api.patch(`/milestones/${milestoneId}/proof`, { proof_files });
      loadContract();
    } catch (err) {
      alert(err.response?.data?.error || "Upload failed");
    }
  };

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Contract info */}
      <div className="bg-white rounded-xl shadow-card p-6 animate-fade-up">
        <h2 className="font-heading font-bold text-xl text-gray-800">
          {contract.Tender?.title || "Contract"}
        </h2>
        <div className="flex gap-4 mt-3 text-sm">
          <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-lg font-medium">
            Status: {contract.status}
          </span>
          <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg">
            Total: ₹{Number(contract.total_amount).toLocaleString("en-IN")}
          </span>
          <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg">
            Escrow: ₹{Number(contract.escrow_balance).toLocaleString("en-IN")}
          </span>
        </div>
      </div>

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

              {/* Contractor: upload proof */}
              {isContractor && ms.status === "pending" && (
                <button
                  onClick={() => handleProofUpload(ms.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition"
                >
                  <Upload size={14} /> Upload Proof
                </button>
              )}

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
