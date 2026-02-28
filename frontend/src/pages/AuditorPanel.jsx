import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { toast } from "react-toastify";

const statusColors = {
  submitted: "bg-blue-100 text-blue-700",
  assigned_to_ngo: "bg-purple-100 text-purple-700",
  investigating: "bg-amber-100 text-amber-700",
  verified: "bg-green-100 text-green-700",
  dismissed: "bg-gray-100 text-gray-500",
  action_taken: "bg-red-100 text-red-600",
};
const theme = { primary: "#6d28d9", bg: "#f5f3ff" };

export default function AuditorPanel() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNgo, setSelectedNgo] = useState({});
  const [investigationNotes, setInvestigationNotes] = useState({});

  useEffect(() => {
    fetchComplaints();
    if (user?.role === "central_gov") {
      api.get("/complaints/ngos").then(r => setNgos(r.data.ngos || [])).catch(() => {});
    }
  }, []);

  async function fetchComplaints() {
    try {
      const { data } = await api.get("/complaints");
      setComplaints(data.complaints || []);
    } catch {}
    setLoading(false);
  }

  async function assignNgo(complaintId) {
    const ngoId = selectedNgo[complaintId];
    if (!ngoId) return toast.warn("Select an NGO first");
    try {
      await api.patch(`/complaints/${complaintId}/assign-ngo`, { ngo_user_id: ngoId });
      toast.success("NGO assigned successfully");
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.error || "Assignment failed");
    }
  }

  async function startInvestigation(complaintId) {
    try {
      await api.patch(`/complaints/${complaintId}/start-investigation`);
      toast.success("Investigation started");
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to start investigation");
    }
  }

  async function submitInvestigation(complaintId, result) {
    try {
      await api.patch(`/complaints/${complaintId}/investigate`, {
        result: result,
        notes: investigationNotes[complaintId] || "",
      });
      toast.success(`Complaint marked as ${result}`);
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading complaints...</div>;

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: theme.bg }}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          {user?.role === "central_gov" ? "Complaint Management" : "NGO Investigations"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {user?.role === "central_gov" ? "Assign NGOs to investigate complaints" : "Review and investigate assigned complaints"}
        </p>
      </div>

      {complaints.length === 0 ? (
        <div className="bg-gray-50 text-gray-500 p-6 rounded-xl text-center">No complaints to review</div>
      ) : (
        <div className="space-y-4">
          {complaints.map(c => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{c.subject}</h3>
                  <p className="text-sm text-gray-500 mt-1">{c.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>Reporter: {c.reporter?.name || "Anonymous"}</span>
                    <span>Severity: <span className={`font-medium ${c.severity === "high" ? "text-red-500" : c.severity === "medium" ? "text-amber-500" : "text-gray-500"}`}>{c.severity}</span></span>
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[c.status] || "bg-gray-100"}`}>
                  {c.status?.replace(/_/g, " ")}
                </span>
              </div>

              {/* Evidence */}
              {c.evidence?.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {c.evidence.map((e, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">{e.type}: {e.url}</span>
                  ))}
                </div>
              )}

              {/* Central: Assign NGO */}
              {user?.role === "central_gov" && c.status === "submitted" && (
                <div className="flex gap-2 items-center mt-3 pt-3 border-t">
                  <select
                    className="border rounded-lg px-3 py-2 text-sm flex-1"
                    value={selectedNgo[c.id] || ""}
                    onChange={e => setSelectedNgo(p => ({ ...p, [c.id]: e.target.value }))}
                  >
                    <option value="">Select NGO to investigate...</option>
                    {ngos.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                  </select>
                  <button onClick={() => assignNgo(c.id)} className="px-4 py-2 text-white text-sm rounded-lg transition" style={{ backgroundColor: theme.primary }}>
                    Assign NGO
                  </button>
                </div>
              )}

              {/* Show assigned NGO */}
              {c.assignedNgo && (
                <div className="mt-2 text-sm" style={{ color: theme.primary }}>
                  Assigned to: {c.assignedNgo.name}
                </div>
              )}

              {/* NGO: Start investigation button */}
              {user?.role === "auditor_ngo" && c.status === "assigned_to_ngo" && (
                <div className="mt-3 pt-3 border-t">
                  <button onClick={() => startInvestigation(c.id)} className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition">
                    Start Investigation
                  </button>
                </div>
              )}

              {/* NGO: Submit investigation */}
              {user?.role === "auditor_ngo" && (c.status === "assigned_to_ngo" || c.status === "investigating") && (
                <div className="mt-3 pt-3 border-t">
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
                    rows={2}
                    placeholder="Investigation findings..."
                    value={investigationNotes[c.id] || ""}
                    onChange={e => setInvestigationNotes(p => ({ ...p, [c.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => submitInvestigation(c.id, "confirmed_valid")} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition">
                      Complaint Valid — Penalize
                    </button>
                    <button onClick={() => submitInvestigation(c.id, "confirmed_fake")} className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition">
                      Complaint Invalid — Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Investigation result */}
              {c.investigation_result && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${c.investigation_result === "confirmed_valid" ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-600"}`}>
                  Investigation: {c.investigation_result === "confirmed_valid" ? "Complaint confirmed — penalties applied" : "Complaint dismissed — no action taken"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
