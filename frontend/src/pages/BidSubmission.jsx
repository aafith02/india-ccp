import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import { Gavel, IndianRupee, Clock, FileText } from "lucide-react";

export default function BidSubmission() {
  const { id: tenderId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ amount: "", proposal: "", timeline_days: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/bids", {
        tender_id: tenderId,
        amount: parseFloat(form.amount),
        proposal: form.proposal,
        timeline_days: parseInt(form.timeline_days) || null,
      });
      navigate(`/tenders/${tenderId}`, { state: { bidSuccess: true } });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit bid");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-elevated p-8 animate-fade-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
            <Gavel size={22} className="text-teal-600" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl text-gray-800">Submit Your Bid</h2>
            <p className="text-sm text-gray-500">Submit a competitive and fair bid</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
              <IndianRupee size={14} /> Bid Amount (₹)
            </label>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-400 outline-none"
              placeholder="Enter your bid amount"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
              <Clock size={14} /> Estimated Timeline (days)
            </label>
            <input
              type="number"
              min="1"
              value={form.timeline_days}
              onChange={(e) => setForm({ ...form, timeline_days: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-400 outline-none"
              placeholder="Number of days to complete"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
              <FileText size={14} /> Proposal
            </label>
            <textarea
              rows={5}
              value={form.proposal}
              onChange={(e) => setForm({ ...form, proposal: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-400 outline-none resize-none"
              placeholder="Describe your approach, methodology, and relevant experience..."
            />
          </div>

          <div className="bg-amber-50 p-3 rounded-lg text-xs text-amber-700 flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">⚠</span>
            <span>
              Your bid is final and cannot be modified. AI will score your bid based on price, reputation, and timeline.
              Submitting a manipulated bid may result in blacklisting.
            </span>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Bid"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
