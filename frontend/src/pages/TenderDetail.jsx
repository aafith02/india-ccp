import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function TenderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [tender, setTender] = useState(null);
  const [bids, setBids] = useState([]);
  const [validTransitions, setValidTransitions] = useState([]);
  const [awarding, setAwarding] = useState(false);
  const [closing, setClosing] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isGov = user?.role === "state_gov" || user?.role === "central_gov";

  useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      const { data } = await api.get(`/tenders/${id}`);
      setTender(data.tender);
      setValidTransitions(data.validTransitions || []);
      setBids(data.tender?.Bids || []);
    } catch { /* ignore */ }
  }

  async function closeBidding() {
    setClosing(true);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/tenders/${id}/close`);
      setSuccess("Bidding closed successfully. You can now award the contract.");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to close bidding");
    }
    setClosing(false);
  }

  async function changeStatus(newStatus) {
    setChangingStatus(true);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/tenders/${id}/status`, { status: newStatus });
      setSuccess(`Tender status changed to ${newStatus}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change status");
    }
    setChangingStatus(false);
  }

  async function awardContract() {
    setAwarding(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await api.post("/contracts/award", { tender_id: id });
      setSuccess(`Contract awarded! First tranche disbursed. AI score: ${data.winning_bid?.ai_score?.toFixed(1)}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to award contract");
    }
    setAwarding(false);
  }

  if (!tender) return <div className="p-6 text-gray-400">Loading...</div>;

  const statusColor = {
    draft: "bg-gray-100 text-gray-600",
    open: "bg-green-100 text-green-700",
    closed: "bg-amber-100 text-amber-700",
    awarded: "bg-blue-100 text-blue-700",
    in_progress: "bg-purple-100 text-purple-700",
    completed: "bg-teal-100 text-teal-700",
    cancelled: "bg-red-100 text-red-600",
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{tender.title}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span className="capitalize">{tender.category}</span>
            <span>•</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[tender.status] || "bg-gray-100"}`}>
              {tender.status?.replace("_", " ")}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {user?.role === "contractor" && tender.status === "open" && (
            <Link to={`/tenders/${id}/bid`} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700">
              Submit Bid
            </Link>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg mb-4">{success}</div>}

      {/* State gov action bar */}
      {isGov && validTransitions && validTransitions.length > 0 && (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Actions</h3>
          <div className="flex flex-wrap gap-2">
            {tender.status === "open" && bids.length > 0 && (
              <button onClick={closeBidding} disabled={closing}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition disabled:opacity-50">
                {closing ? "Closing..." : `Close Bidding (${bids.length} bids received)`}
              </button>
            )}
            {(tender.status === "closed" || tender.status === "open") && bids.length > 0 && (
              <button onClick={awardContract} disabled={awarding}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                {awarding ? "Awarding via AI..." : "Award Contract (AI Scoring)"}
              </button>
            )}
            {validTransitions.filter(s => !["closed", "awarded"].includes(s)).map(status => (
              <button key={status} onClick={() => changeStatus(status)} disabled={changingStatus}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                  status === "cancelled" ? "bg-red-500 text-white hover:bg-red-600" :
                  status === "open" ? "bg-green-600 text-white hover:bg-green-700" :
                  "bg-gray-600 text-white hover:bg-gray-700"
                }`}>
                {changingStatus ? "..." : status === "cancelled" ? "Cancel Tender" : `Move to ${status.replace("_", " ")}`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Budget — only visible to gov users (backend already excludes for non-gov) */}
        {isGov && tender.budget_hidden && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-600">Hidden Budget</p>
            <p className="text-lg font-bold text-amber-700">₹{Number(tender.budget_hidden).toLocaleString("en-IN")}</p>
          </div>
        )}
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-400">Tranches</p>
          <p className="text-lg font-bold text-gray-800">{tender.tranche_count || 4}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-400">Bid Deadline</p>
          <p className="text-lg font-bold text-gray-800">{tender.bid_deadline ? new Date(tender.bid_deadline).toLocaleDateString("en-IN") : "—"}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-400">Project Deadline</p>
          <p className="text-lg font-bold text-gray-800">{tender.project_deadline ? new Date(tender.project_deadline).toLocaleDateString("en-IN") : "—"}</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-2">Description</h2>
        <p className="text-sm text-gray-600 leading-relaxed">{tender.description}</p>
        {tender.scope && (
          <>
            <h3 className="font-semibold text-gray-700 mt-4 mb-1">Scope of Work</h3>
            <p className="text-sm text-gray-600">{tender.scope}</p>
          </>
        )}
        {tender.qualification && Object.keys(tender.qualification).length > 0 && (
          <>
            <h3 className="font-semibold text-gray-700 mt-4 mb-1">Qualifications Required</h3>
            <ul className="text-sm text-gray-600 list-disc ml-4">
              {Object.entries(tender.qualification).map(([k, v]) => <li key={k}>{k.replace(/_/g, " ")}: {String(v)}</li>)}
            </ul>
          </>
        )}
      </div>

      {/* Bids — visible ONLY to state_gov and central_gov */}
      {isGov && bids.length > 0 && (
        <div className="bg-white border rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-gray-700 mb-3">Bids ({bids.length})</h2>
          <div className="space-y-3">
            {bids.sort((a, b) => {
              const scoreA = a.ai_score ?? a.proximity_score ?? null;
              const scoreB = b.ai_score ?? b.proximity_score ?? null;
              if (scoreA != null && scoreB != null) return scoreB - scoreA;
              if (scoreA != null) return -1;
              if (scoreB != null) return 1;
              return Number(a.amount) - Number(b.amount);
            }).map((bid, idx) => {
              const hasScore = bid.ai_score != null || bid.proximity_score != null;
              return (
              <div key={bid.id} className={`flex items-center justify-between p-3 rounded-lg ${idx === 0 && hasScore ? "bg-green-50 border border-green-200" : "bg-gray-50"}`}>
                <div className="flex items-center gap-3">
                  {idx === 0 && hasScore && <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">Top Ranked</span>}
                  <div>
                    <p className="text-sm font-medium text-gray-700">{bid.contractor?.name || "Contractor"}</p>
                    <p className="text-xs text-gray-400">
                      {bid.timeline_days} days • ₹{Number(bid.amount).toLocaleString("en-IN")}
                      {bid.contractor?.reputation && <span className="ml-2">Rep: {bid.contractor.reputation}</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right flex gap-4">
                  {bid.ai_score != null && (
                    <div>
                      <span className={`text-sm font-bold ${bid.ai_score >= 70 ? "text-blue-600" : bid.ai_score >= 40 ? "text-amber-600" : "text-red-500"}`}>
                        {bid.ai_score?.toFixed(1)}
                      </span>
                      <p className="text-xs text-gray-400">AI score</p>
                    </div>
                  )}
                  <div>
                    <span className={`text-sm font-bold ${bid.proximity_score >= 80 ? "text-green-600" : bid.proximity_score >= 50 ? "text-amber-600" : "text-red-500"}`}>
                      {bid.proximity_score?.toFixed(1) || "—"}
                    </span>
                    <p className="text-xs text-gray-400">proximity</p>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {/* Contractor: show bid count only, no details */}
      {user?.role === "contractor" && bids.length > 0 && (
        <div className="bg-gray-50 border rounded-xl p-4 mb-6 text-sm text-gray-500">
          {bids.length} bid{bids.length > 1 ? "s" : ""} have been submitted for this tender.
        </div>
      )}

      {/* Status messages */}
      {(tender.status === "awarded" || tender.status === "in_progress") && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-xl text-sm">
          This tender has been awarded. {tender.status === "in_progress" && "Work is in progress."}
          {isGov && (
            <Link to={`/contracts`} className="ml-2 underline font-medium">View contracts →</Link>
          )}
          {user?.role === "contractor" && (
            <Link to={`/dashboard`} className="ml-2 underline font-medium">View your contracts →</Link>
          )}
        </div>
      )}

      {tender.status === "completed" && (
        <div className="bg-teal-50 border border-teal-200 text-teal-700 p-4 rounded-xl text-sm">
          This tender has been completed successfully.
        </div>
      )}

      {tender.status === "cancelled" && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
          This tender has been cancelled.
        </div>
      )}
    </div>
  );
}
