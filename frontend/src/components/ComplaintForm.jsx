import { useState, useEffect } from "react";
import api from "../api/client";
import { toast } from "react-toastify";

export default function ComplaintForm({ tenderId, onSubmitted }) {
  const [form, setForm] = useState({ subject: "", description: "", severity: "medium", evidence: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/complaints", {
        tender_id: tenderId,
        subject: form.subject,
        description: form.description,
        severity: form.severity,
        evidence: form.evidence || undefined,
      });
      onSubmitted?.();
      toast.success("Complaint submitted successfully");
      setForm({ subject: "", description: "", severity: "medium", evidence: "" });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit");
      toast.error(err.response?.data?.error || "Failed to submit");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded-lg">{error}</div>}
      <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Subject" value={form.subject} onChange={set("subject")} required />
      <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3}
        placeholder="Describe the issue..." value={form.description} onChange={set("description")} required />
      <div className="flex gap-3">
        <select className="border rounded-lg px-3 py-2 text-sm" value={form.severity} onChange={set("severity")}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <input className="flex-1 border rounded-lg px-3 py-2 text-sm"
          placeholder="Evidence URL (optional)" value={form.evidence} onChange={set("evidence")} />
      </div>
      <button type="submit" disabled={loading}
        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
        {loading ? "Submitting..." : "Submit Complaint"}
      </button>
    </form>
  );
}
