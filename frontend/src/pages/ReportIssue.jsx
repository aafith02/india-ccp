import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { CheckCircle2, Upload, X } from "lucide-react";
import api from "../api/client";

export default function ReportIssue() {
  const { user } = useAuth();
  const [tenders, setTenders] = useState([]);
  const [form, setForm] = useState({ tender_id: "", subject: "", description: "", severity: "medium", evidence: "" });
  const [files, setFiles] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/public/tenders").then(r => setTenders(r.data.tenders || [])).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  function handleFileChange(e) {
    const newFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...newFiles].slice(0, 5)); // max 5 files
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("tender_id", form.tender_id);
      formData.append("subject", form.subject);
      formData.append("description", form.description);
      formData.append("severity", form.severity);
      if (form.evidence) {
        formData.append("evidence", JSON.stringify([{ url: form.evidence, type: "link" }]));
      }
      files.forEach(f => formData.append("files", f));

      await api.post("/complaints", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit complaint");
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="p-6 max-w-lg">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <CheckCircle2 size={40} className="text-green-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-green-700 mb-2">Complaint Submitted</h2>
          <p className="text-sm text-green-600">Your complaint has been recorded and will be reviewed by the Central Government. An NGO will be assigned to investigate.</p>
          <button onClick={() => { setSubmitted(false); setForm({ tender_id: "", subject: "", description: "", severity: "medium", evidence: "" }); setFiles([]); }}
            className="mt-4 text-sm text-teal-600 underline">Submit another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Report an Issue</h1>
      <p className="text-sm text-gray-500 mb-6">Report suspected corruption, poor work quality, or irregularities in public projects.</p>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Related Tender / Project</label>
          <select className="w-full border rounded-lg px-4 py-2.5 text-sm" value={form.tender_id} onChange={set("tender_id")} required>
            <option value="">Select tender...</option>
            {tenders.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <input className="w-full border rounded-lg px-4 py-2.5 text-sm" value={form.subject} onChange={set("subject")} placeholder="Brief subject line..." required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className="w-full border rounded-lg px-4 py-2.5 text-sm" rows={4} value={form.description} onChange={set("description")} placeholder="Describe what you observed..." required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
          <select className="w-full border rounded-lg px-4 py-2.5 text-sm" value={form.severity} onChange={set("severity")}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Evidence Files (up to 5)</label>
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
            <Upload size={24} className="text-gray-400 mx-auto mb-2" />
            <label className="cursor-pointer text-sm text-teal-600 hover:text-teal-700 font-medium">
              Click to upload files
              <input type="file" multiple accept="image/*,.pdf,.zip" onChange={handleFileChange} className="hidden" />
            </label>
            <p className="text-xs text-gray-400 mt-1">Images, PDF, ZIP. Max 10MB each.</p>
          </div>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                  <span className="truncate max-w-[150px]">{f.name}</span>
                  <button type="button" onClick={() => removeFile(i)}><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Evidence URL (optional)</label>
          <input className="w-full border rounded-lg px-4 py-2.5 text-sm" value={form.evidence} onChange={set("evidence")} placeholder="Link to photos, documents, etc." />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">
          {loading ? "Submitting..." : "Submit Complaint"}
        </button>
      </form>
    </div>
  );
}
