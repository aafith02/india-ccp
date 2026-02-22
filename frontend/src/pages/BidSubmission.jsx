import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";

export default function BidSubmission() {
  const { id } = useParams();
  const nav = useNavigate();
  const [tender, setTender] = useState(null);
  const [form, setForm] = useState({ amount: "", timeline_days: "", proposal: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/tenders/${id}`).then(r => setTender(r.data.tender)).catch(() => {});
  }, [id]);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/bids", {
        tender_id: id,
        amount: Number(form.amount),
        timeline_days: Number(form.timeline_days),
        proposal: form.proposal,
      });
      nav(`/tenders/${id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit bid");
    }
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Submit Bid</h1>
      {tender && <p className="text-gray-500 text-sm mb-6">{tender.title}</p>}

      <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-lg text-sm mb-6">
        The bid closest to the hidden budget wins. Price your bid competitively based on fair cost estimation.
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bid Amount (₹)</label>
          <input type="number" className="w-full border rounded-lg px-4 py-2.5 text-sm" placeholder="Enter your bid amount" value={form.amount} onChange={set("amount")} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Timeline (days)</label>
          <input type="number" className="w-full border rounded-lg px-4 py-2.5 text-sm" placeholder="Estimated completion days" value={form.timeline_days} onChange={set("timeline_days")} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Proposal</label>
          <textarea className="w-full border rounded-lg px-4 py-2.5 text-sm" rows={5} placeholder="Describe your approach, experience, and value..." value={form.proposal} onChange={set("proposal")} required />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-teal-600 text-white py-2.5 rounded-lg font-medium hover:bg-teal-700 transition disabled:opacity-50">
          {loading ? "Submitting..." : "Submit Bid"}
        </button>
      </form>
    </div>
  );
}
