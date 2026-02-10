import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import MilestoneTimeline from "../components/MilestoneTimeline";
import { MapPin, Calendar, Users, Award, Clock } from "lucide-react";

export default function TenderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tender, setTender] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/public/projects/${id}`).then(({ data }) => {
      setTender(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="h-64 bg-white rounded-xl animate-pulse" />;
  if (!tender) return <div className="text-center text-gray-400 py-12">Tender not found</div>;

  const contract = tender.Contract;
  const milestones = contract?.Milestones || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-card p-6 animate-fade-up">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium badge-${tender.status}`}>
            {tender.status}
          </span>
          {tender.State && <span className="text-xs text-gray-400">{tender.State.name}</span>}
        </div>

        <h1 className="font-heading font-bold text-2xl text-gray-800">{tender.title}</h1>
        <p className="text-gray-600 mt-2">{tender.description}</p>

        <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
          {tender.location && (
            <span className="flex items-center gap-1"><MapPin size={14} /> {tender.location}</span>
          )}
          <span className="flex items-center gap-1">
            <Calendar size={14} /> Bid deadline: {new Date(tender.bid_deadline).toLocaleDateString("en-IN")}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} /> Project deadline: {new Date(tender.project_deadline).toLocaleDateString("en-IN")}
          </span>
        </div>

        {/* Bid button for contractor */}
        {user?.role === "contractor" && tender.status === "open" && new Date(tender.bid_deadline) > new Date() && (
          <button
            onClick={() => navigate(`/tenders/${id}/bid`)}
            className="mt-4 px-6 py-2.5 bg-teal-500 text-white font-medium rounded-lg hover:bg-teal-600 transition"
          >
            Submit Your Bid
          </button>
        )}
      </div>

      {/* Bids summary (for state_gov) */}
      {tender.Bids && (user?.role === "state_gov" || user?.role === "central_gov") && (
        <div className="bg-white rounded-xl shadow-card p-6 animate-fade-up-delay">
          <h3 className="font-heading font-semibold text-lg text-gray-800 mb-3 flex items-center gap-2">
            <Users size={18} /> Bids ({tender.Bids.length})
          </h3>
          <div className="space-y-2">
            {tender.Bids.map((bid) => (
              <div key={bid.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <span className="text-sm font-medium text-gray-700">{bid.contractor?.name}</span>
                  <span className="text-xs text-gray-400 ml-2">Rep: {bid.contractor?.reputation}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">₹{Number(bid.amount).toLocaleString("en-IN")}</span>
                  <span className="text-xs text-teal-600 font-medium">Score: {bid.ai_score}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full badge-${bid.status}`}>{bid.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contract & Milestones */}
      {contract && (
        <div className="bg-white rounded-xl shadow-card p-6 animate-fade-up-delay-2">
          <h3 className="font-heading font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
            <Award size={18} /> Contract Progress
          </h3>
          <div className="flex gap-4 mb-6 text-sm">
            <div className="px-3 py-2 bg-green-50 rounded-lg">
              <span className="text-green-600 font-medium">Total: ₹{Number(contract.total_amount).toLocaleString("en-IN")}</span>
            </div>
            <div className="px-3 py-2 bg-amber-50 rounded-lg">
              <span className="text-amber-600 font-medium">Escrow: ₹{Number(contract.escrow_balance).toLocaleString("en-IN")}</span>
            </div>
          </div>

          <MilestoneTimeline milestones={milestones} />
        </div>
      )}
    </div>
  );
}
