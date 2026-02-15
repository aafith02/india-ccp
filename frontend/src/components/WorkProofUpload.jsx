import { useState } from "react";
import api from "../api/client";
import { Upload, ImagePlus, X, FileText, Loader2 } from "lucide-react";

export default function WorkProofUpload({ contract, milestones = [], onSuccess }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    milestone_id: "",
    description: "",
    work_percentage: "",
    amount_requested: "",
    photo_urls: [],
  });
  const [photoInput, setPhotoInput] = useState("");

  const escrowBalance = parseFloat(contract?.escrow_balance || 0);

  const addPhoto = () => {
    if (!photoInput.trim()) return;
    setForm(prev => ({
      ...prev,
      photo_urls: [...prev.photo_urls, {
        url: photoInput.trim(),
        hash: `sha256-${Date.now()}`,
        geo: { lat: 0, lng: 0 },
        timestamp: new Date().toISOString(),
      }],
    }));
    setPhotoInput("");
  };

  const removePhoto = (index) => {
    setForm(prev => ({
      ...prev,
      photo_urls: prev.photo_urls.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.amount_requested) {
      alert("Description and amount are required");
      return;
    }
    if (parseFloat(form.amount_requested) > escrowBalance) {
      alert(`Amount exceeds remaining escrow balance (₹${escrowBalance.toLocaleString("en-IN")})`);
      return;
    }

    setLoading(true);
    try {
      await api.post("/work-proofs", {
        contract_id: contract.id,
        milestone_id: form.milestone_id || undefined,
        description: form.description,
        photo_urls: form.photo_urls,
        work_percentage: parseFloat(form.work_percentage) || 0,
        amount_requested: parseFloat(form.amount_requested),
      });
      setOpen(false);
      setForm({ milestone_id: "", description: "", work_percentage: "", amount_requested: "", photo_urls: [] });
      onSuccess?.();
    } catch (err) {
      alert(err.response?.data?.error || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 shadow-md hover:shadow-lg transition"
      >
        <Upload size={16} /> Submit Work Proof & Request Payment
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-card border border-blue-100 p-6 animate-fade-up">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading font-semibold text-lg text-gray-800 flex items-center gap-2">
          <FileText size={20} className="text-blue-500" />
          Submit Work Proof
        </h3>
        <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Milestone selector (optional) */}
        {milestones.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link to Milestone (optional)</label>
            <select
              value={form.milestone_id}
              onChange={(e) => setForm({ ...form, milestone_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 outline-none"
            >
              <option value="">No specific milestone</option>
              {milestones.map(ms => (
                <option key={ms.id} value={ms.id}>
                  {ms.sequence}. {ms.title} (₹{Number(ms.amount).toLocaleString("en-IN")})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Work Description *</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the work completed, materials used, progress made..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 outline-none resize-none"
            required
          />
        </div>

        {/* Work percentage */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Completed (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={form.work_percentage}
              onChange={(e) => setForm({ ...form, work_percentage: e.target.value })}
              placeholder="e.g. 30"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Requested (₹) *</label>
            <input
              type="number"
              min="1"
              max={escrowBalance}
              value={form.amount_requested}
              onChange={(e) => setForm({ ...form, amount_requested: e.target.value })}
              placeholder={`Max ₹${escrowBalance.toLocaleString("en-IN")}`}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 outline-none"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Remaining escrow: ₹{escrowBalance.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Photo URLs */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Proof Photos</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={photoInput}
              onChange={(e) => setPhotoInput(e.target.value)}
              placeholder="Paste image URL..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 outline-none"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPhoto())}
            />
            <button
              type="button"
              onClick={addPhoto}
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
            >
              <ImagePlus size={16} />
            </button>
          </div>

          {form.photo_urls.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {form.photo_urls.map((photo, i) => (
                <div key={i} className="relative group">
                  <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                    <img
                      src={photo.url}
                      alt={`Proof ${i + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 shadow-md transition disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {loading ? "Submitting..." : "Submit Proof & Request Payment"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
