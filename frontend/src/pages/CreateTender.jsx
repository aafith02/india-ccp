import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function CreateTender() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [states, setStates] = useState([]);
  const [form, setForm] = useState({
    title: "", description: "", category: "infrastructure",
    scope: "", location: "", district: "",
    budget_hidden: "", bid_deadline: "", project_deadline: "",
    state_id: user?.state_id || "", tranche_count: 4,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/states").then(r => setStates(r.data.states || [])).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.budget_hidden) { setError("Hidden budget is required"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/tenders", {
        title: form.title,
        description: form.description,
        scope: form.scope || undefined,
        location: form.location || undefined,
        district: form.district || undefined,
        category: form.category,
        budget_hidden: Number(form.budget_hidden),
        bid_deadline: form.bid_deadline,
        project_deadline: form.project_deadline,
        tranche_count: Number(form.tranche_count),
      });
      nav(`/tenders/${data.tender.id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create tender");
    }
    setLoading(false);
  }

  const categories = ["infrastructure", "healthcare", "education", "sanitation", "transport", "energy", "water", "housing", "digital", "agriculture"];

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Create New Tender</h1>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input className="w-full border rounded-lg px-4 py-2.5 text-sm" value={form.title} onChange={set("title")} placeholder="Road Construction in XYZ District" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className="w-full border rounded-lg px-4 py-2.5 text-sm" rows={4} value={form.description} onChange={set("description")} placeholder="Detailed scope of work..." required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select className="w-full border rounded-lg px-4 py-2.5 text-sm capitalize" value={form.category} onChange={set("category")}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <select className="w-full border rounded-lg px-4 py-2.5 text-sm" value={form.state_id} onChange={set("state_id")} required>
              <option value="">Select state...</option>
              {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input className="w-full border rounded-lg px-4 py-2.5 text-sm" value={form.location} onChange={set("location")} placeholder="City / Highway" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
            <input className="w-full border rounded-lg px-4 py-2.5 text-sm" value={form.district} onChange={set("district")} placeholder="District name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hidden Budget (₹)</label>
            <input type="number" className="w-full border rounded-lg px-4 py-2.5 text-sm" value={form.budget_hidden} onChange={set("budget_hidden")} required />
            <p className="text-xs text-gray-400 mt-1">Not visible to bidders — closest bid wins</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Scope of Work</label>
          <textarea className="w-full border rounded-lg px-4 py-2.5 text-sm" rows={2} value={form.scope} onChange={set("scope")} placeholder="Resurfacing, drainage, signage installation..." />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bid Deadline</label>
            <input type="date" className="w-full border rounded-lg px-4 py-2.5 text-sm" value={form.bid_deadline} onChange={set("bid_deadline")} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Deadline</label>
            <input type="date" className="w-full border rounded-lg px-4 py-2.5 text-sm" value={form.project_deadline} onChange={set("project_deadline")} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tranches (4–5)</label>
            <select className="w-full border rounded-lg px-4 py-2.5 text-sm" value={form.tranche_count} onChange={set("tranche_count")}>
              <option value={4}>4 tranches</option>
              <option value={5}>5 tranches</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">First tranche disbursed upfront on award</p>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-teal-600 text-white py-2.5 rounded-lg font-medium hover:bg-teal-700 transition disabled:opacity-50">
          {loading ? "Creating..." : "Create Tender"}
        </button>
      </form>
    </div>
  );
}
