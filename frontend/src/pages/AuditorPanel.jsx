import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { AlertTriangle, CheckCircle, XCircle, Eye, ClipboardCheck, ArrowRight } from "lucide-react";

export default function AuditorPanel() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const loadComplaints = () => {
    const params = filter ? `?status=${filter}` : "";
    api.get(`/complaints${params}`).then(({ data }) => {
      setComplaints(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadComplaints(); }, [filter]);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/complaints/${id}`, { status });
      loadComplaints();
    } catch (err) {
      alert(err.response?.data?.error || "Update failed");
    }
  };

  const severityColor = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      {/* Verification CTA */}
      <Link
        to="/verify"
        className="block bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl p-4 text-white shadow-md hover:shadow-lg transition"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <ClipboardCheck size={22} className="text-white" />
            </div>
            <div>
              <p className="font-semibold">Work Proof Verification Center</p>
              <p className="text-violet-100 text-sm">Review and verify contractor work proofs for active projects</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-violet-100" />
        </div>
      </Link>

      <div>
        <h2 className="font-heading font-bold text-2xl text-gray-800">Complaint Management</h2>
        <p className="text-sm text-gray-500 mt-1">Review, investigate, and resolve reports</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["", "submitted", "triaged", "investigating", "verified", "dismissed"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
              filter === s ? "bg-teal-500 text-white" : "bg-white text-gray-600 hover:bg-gray-100 shadow-sm"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Complaints list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-8 text-center text-gray-400">
          No complaints matching the filter.
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map(c => (
            <div key={c.id} className="bg-white rounded-xl shadow-card p-5 animate-fade-up">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={14} className="text-coral-500" />
                    <h4 className="font-semibold text-gray-700 text-sm">{c.subject}</h4>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{c.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>By: {c.reporter?.name || "Anonymous"}</span>
                    <span>Tender: {c.Tender?.title || "N/A"}</span>
                    <span>{new Date(c.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColor[c.severity]}`}>
                    {c.severity}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full badge-${c.status === "verified" ? "verified" : c.status === "dismissed" ? "rejected" : "pending"}`}>
                    {c.status}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {(user?.role === "central_gov" || user?.role === "auditor_ngo") && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  {c.status === "submitted" && (
                    <button onClick={() => updateStatus(c.id, "triaged")} className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition flex items-center gap-1">
                      <Eye size={12} /> Triage
                    </button>
                  )}
                  {["submitted", "triaged"].includes(c.status) && (
                    <button onClick={() => updateStatus(c.id, "investigating")} className="px-3 py-1.5 text-xs bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition">
                      Investigate
                    </button>
                  )}
                  {c.status === "investigating" && (
                    <>
                      <button onClick={() => updateStatus(c.id, "verified")} className="px-3 py-1.5 text-xs bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition flex items-center gap-1">
                        <CheckCircle size={12} /> Verify
                      </button>
                      <button onClick={() => updateStatus(c.id, "dismissed")} className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex items-center gap-1">
                        <XCircle size={12} /> Dismiss
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
