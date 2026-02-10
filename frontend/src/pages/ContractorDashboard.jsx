import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import TenderCard from "../components/TenderCard";
import { Award, Gavel, Star, TrendingUp } from "lucide-react";

export default function ContractorDashboard() {
  const { user } = useAuth();
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/bids/mine").then(({ data }) => {
      setBids(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const activeBids = bids.filter(b => b.status === "submitted");
  const wonBids = bids.filter(b => b.status === "awarded");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl text-gray-800">Contractor Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-card p-5 animate-fade-up">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-2">
            <Gavel size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-heading font-bold">{bids.length}</p>
          <p className="text-xs text-gray-500">Total Bids</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-5 animate-fade-up-delay">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-2">
            <TrendingUp size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-heading font-bold">{activeBids.length}</p>
          <p className="text-xs text-gray-500">Active Bids</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-5 animate-fade-up-delay-2">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-2">
            <Award size={18} className="text-green-500" />
          </div>
          <p className="text-2xl font-heading font-bold">{wonBids.length}</p>
          <p className="text-xs text-gray-500">Won Contracts</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-5 animate-fade-up-delay-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center mb-2">
            <Star size={18} className="text-teal-500" />
          </div>
          <p className="text-2xl font-heading font-bold">{user?.reputation || 0}</p>
          <p className="text-xs text-gray-500">Reputation Score</p>
        </div>
      </div>

      {/* KYC Status */}
      <div className={`rounded-xl p-4 flex items-center gap-3 ${
        user?.kyc_status === "verified" ? "bg-green-50" :
        user?.kyc_status === "rejected" ? "bg-red-50" : "bg-amber-50"
      }`}>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full badge-${user?.kyc_status}`}>
          KYC: {user?.kyc_status}
        </span>
        <span className="text-sm text-gray-600">
          {user?.kyc_status === "verified" ? "You are verified and can submit bids." :
           user?.kyc_status === "rejected" ? "Your KYC was rejected. Please re-submit." :
           "Your KYC is pending verification. You cannot bid until verified."}
        </span>
      </div>

      {/* Recent Bids */}
      <div>
        <h3 className="font-heading font-semibold text-lg text-gray-800 mb-3">My Recent Bids</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : bids.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card p-8 text-center text-gray-400">
            No bids yet. Browse open tenders to submit your first bid.
          </div>
        ) : (
          <div className="space-y-3">
            {bids.slice(0, 10).map((bid) => (
              <div key={bid.id} className="bg-white rounded-xl shadow-card p-4 flex items-center justify-between animate-fade-up">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">{bid.Tender?.title || "Tender"}</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Bid: ₹{Number(bid.amount).toLocaleString("en-IN")} · Score: {bid.ai_score || "N/A"}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium badge-${bid.status}`}>
                  {bid.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
