import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { FileText, MapPin, Calendar, Shield } from "lucide-react";

export default function CreateTender() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", scope: "", location: "", district: "",
    budget_hidden: "", bid_deadline: "", project_deadline: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/tenders", {
        ...form,
        budget_hidden: parseFloat(form.budget_hidden),
      });
      navigate(`/tenders/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create tender");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-elevated p-8 animate-fade-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
            <FileText size={22} className="text-teal-600" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl text-gray-800">Create New Tender</h2>
            <p className="text-sm text-gray-500">Publish a public tender for your state</p>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Project Title</label>
            <input required type="text" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 outline-none"
              placeholder="e.g. Road construction NH-44 bypass"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
            <textarea required rows={4} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 outline-none resize-none"
              placeholder="Detailed project scope, requirements, and deliverables..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-600 mb-1">
                <MapPin size={14} /> Location
              </label>
              <input type="text" value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 outline-none"
                placeholder="City / area"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">District</label>
              <input type="text" value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 outline-none"
                placeholder="District name"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-600 mb-1">
              <Shield size={14} /> Budget (Hidden from public)
            </label>
            <input required type="number" min="1" step="0.01" value={form.budget_hidden}
              onChange={(e) => setForm({ ...form, budget_hidden: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 outline-none"
              placeholder="₹ Amount (not visible to bidders)"
            />
            <p className="text-xs text-gray-400 mt-1">This amount is used for AI scoring only — never shown to bidders.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-600 mb-1">
                <Calendar size={14} /> Bid Deadline
              </label>
              <input required type="datetime-local" value={form.bid_deadline}
                onChange={(e) => setForm({ ...form, bid_deadline: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 outline-none"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-600 mb-1">
                <Calendar size={14} /> Project Deadline
              </label>
              <input required type="datetime-local" value={form.project_deadline}
                onChange={(e) => setForm({ ...form, project_deadline: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition disabled:opacity-50"
            >
              {submitting ? "Publishing..." : "Publish Tender"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
