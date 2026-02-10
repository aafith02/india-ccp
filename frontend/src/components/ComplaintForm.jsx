import { useState } from "react";
import api from "../api/client";
import { AlertTriangle, Upload, MapPin } from "lucide-react";

export default function ComplaintForm({ tenderId, onSubmitted }) {
  const [form, setForm] = useState({ subject: "", description: "", evidence: [] });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Get geolocation if available
      let geo_location = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          geo_location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch (_) { /* location denied, skip */ }
      }

      await api.post("/complaints", {
        tender_id: tenderId,
        subject: form.subject,
        description: form.description,
        evidence: form.evidence,
        geo_location,
      });

      setSuccess(true);
      setForm({ subject: "", description: "", evidence: [] });
      onSubmitted?.();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 rounded-xl p-6 text-center animate-fade-up">
        <AlertTriangle size={32} className="text-green-500 mx-auto mb-2" />
        <h3 className="font-heading font-semibold text-green-700">Report Submitted</h3>
        <p className="text-sm text-green-600 mt-1">Your complaint has been logged and will be reviewed.</p>
        <button onClick={() => setSuccess(false)} className="mt-3 text-sm text-teal-600 hover:underline">
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-card p-6 animate-fade-up">
      <h3 className="font-heading font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
        <AlertTriangle size={18} className="text-coral-500" /> Report an Issue
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Subject</label>
          <input
            type="text"
            required
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-400 outline-none transition"
            placeholder="Brief description of the issue"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-400 outline-none transition resize-none"
            placeholder="Detailed description with evidence..."
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          <MapPin size={12} /> Your location will be attached automatically if permitted
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-coral-500 text-white font-medium rounded-lg hover:bg-coral-400 transition disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Report"}
        </button>
      </div>
    </form>
  );
}
