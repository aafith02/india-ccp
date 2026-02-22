import { useState } from "react";
import api from "../api/client";

export default function WorkProofUpload({ contractId, milestoneId, trancheId, onUploaded }) {
  const [form, setForm] = useState({ description: "", work_percentage: "", amount_requested: "" });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.description || !form.work_percentage || !form.amount_requested) {
      setError("Description, work percentage, and amount requested are required");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("contract_id", contractId);
      if (milestoneId) fd.append("milestone_id", milestoneId);
      if (trancheId) fd.append("tranche_id", trancheId);
      fd.append("description", form.description);
      fd.append("work_percentage", form.work_percentage);
      fd.append("amount_requested", form.amount_requested);
      for (const f of files) {
        fd.append("photos", f);
      }
      await api.post("/work-proofs", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm({ description: "", work_percentage: "", amount_requested: "" });
      setFiles([]);
      onUploaded?.();
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded-lg">{error}</div>}
      <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3}
        placeholder="Describe the work completed..." value={form.description}
        onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required />
      <div className="grid grid-cols-2 gap-3">
        <input type="number" min="0" max="100" step="1" className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Work % completed" value={form.work_percentage}
          onChange={e => setForm(p => ({ ...p, work_percentage: e.target.value }))} required />
        <input type="number" min="0" step="0.01" className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Amount requested (Rs)" value={form.amount_requested}
          onChange={e => setForm(p => ({ ...p, amount_requested: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Upload Photos (max 10)</label>
        <input type="file" multiple accept="image/*,.pdf" className="text-sm"
          onChange={e => setFiles(Array.from(e.target.files || []))} />
        {files.length > 0 && <p className="text-xs text-gray-400 mt-1">{files.length} file(s) selected</p>}
      </div>
      <button type="submit" disabled={loading}
        className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50">
        {loading ? "Submitting..." : "Submit Work Proof"}
      </button>
    </form>
  );
}
