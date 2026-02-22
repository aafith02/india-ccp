import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Briefcase, Plus, ChevronDown, ChevronUp } from "lucide-react";
import api from "../api/client";
import { toast } from "react-toastify";

const statusColors = {
  open: "bg-blue-100 text-blue-700",
  investigating: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
  appealed: "bg-red-100 text-red-600",
};

const priorityColors = {
  low: "text-gray-500",
  medium: "text-amber-500",
  high: "text-orange-600",
  critical: "text-red-600",
};

export default function CaseManagement() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ complaint_id: "", priority: "medium" });
  const [expanded, setExpanded] = useState({});
  const [updateNotes, setUpdateNotes] = useState({});
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchCases();
    if (user?.role === "central_gov") {
      api.get("/complaints?limit=100").then(r => setComplaints(r.data.complaints || [])).catch(() => {});
    }
  }, []);

  async function fetchCases() {
    try {
      const { data } = await api.get("/cases");
      setCases(data.cases || []);
    } catch {}
    setLoading(false);
  }

  async function createCase(e) {
    e.preventDefault();
    try {
      await api.post("/cases", createForm);
      toast.success("Case created successfully");
      setShowCreate(false);
      setCreateForm({ complaint_id: "", priority: "medium" });
      fetchCases();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create case");
    }
  }

  async function updateCase(caseId, updates) {
    try {
      await api.patch(`/cases/${caseId}`, updates);
      toast.success("Case updated");
      fetchCases();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update case");
    }
  }

  const filteredCases = filterStatus === "all" ? cases : cases.filter(c => c.status === filterStatus);

  if (loading) return <div className="p-8 text-gray-500">Loading cases...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Briefcase size={24} /> Case Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track and manage cases from complaints</p>
        </div>
        {user?.role === "central_gov" && (
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition">
            <Plus size={16} /> New Case
          </button>
        )}
      </div>

      {/* Create case form */}
      {showCreate && (
        <form onSubmit={createCase} className="bg-white border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-gray-800">Create Case from Complaint</h3>
          <select className="w-full border rounded-lg px-3 py-2 text-sm" value={createForm.complaint_id}
            onChange={e => setCreateForm(p => ({ ...p, complaint_id: e.target.value }))} required>
            <option value="">Select a complaint...</option>
            {complaints.filter(c => ["verified", "action_taken", "assigned_to_ngo", "investigating"].includes(c.status)).map(c => (
              <option key={c.id} value={c.id}>{c.subject} ({c.status})</option>
            ))}
          </select>
          <select className="w-full border rounded-lg px-3 py-2 text-sm" value={createForm.priority}
            onChange={e => setCreateForm(p => ({ ...p, priority: e.target.value }))}>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="critical">Critical Priority</option>
          </select>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700">Create Case</button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200">Cancel</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-2 text-sm">
        {["all", "open", "investigating", "resolved", "closed", "appealed"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg capitalize transition ${filterStatus === s ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {["open", "investigating", "resolved", "closed", "appealed"].map(s => (
          <div key={s} className="bg-white rounded-xl border p-4 text-center">
            <p className="text-lg font-bold text-gray-800">{cases.filter(c => c.status === s).length}</p>
            <p className="text-xs text-gray-500 capitalize">{s}</p>
          </div>
        ))}
      </div>

      {/* Case list */}
      {filteredCases.length === 0 ? (
        <div className="bg-gray-50 text-gray-500 p-6 rounded-xl text-center">No cases found</div>
      ) : (
        <div className="space-y-3">
          {filteredCases.map(c => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border">
              <div className="p-5 cursor-pointer" onClick={() => setExpanded(p => ({ ...p, [c.id]: !p[c.id] }))}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-teal-700 bg-teal-50 px-2 py-0.5 rounded">{c.case_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] || "bg-gray-100"}`}>
                        {c.status}
                      </span>
                      <span className={`text-xs font-medium ${priorityColors[c.priority] || ""}`}>
                        {c.priority?.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mt-2">{c.Complaint?.subject || "No complaint linked"}</h3>
                    <div className="flex gap-4 mt-1 text-xs text-gray-400">
                      {c.assignedTo && <span>Assigned: {c.assignedTo.name}</span>}
                      {c.createdBy && <span>Created by: {c.createdBy.name}</span>}
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {expanded[c.id] ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              {expanded[c.id] && (
                <div className="px-5 pb-5 border-t pt-4 space-y-3">
                  {c.Complaint && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      <p className="font-medium text-gray-700">Complaint Details</p>
                      <p className="text-gray-500 mt-1">Severity: {c.Complaint.severity} | Status: {c.Complaint.status}</p>
                      {c.Complaint.Tender && <p className="text-gray-500">Tender: {c.Complaint.Tender.title}</p>}
                      {c.Complaint.reporter && <p className="text-gray-500">Reporter: {c.Complaint.reporter.name}</p>}
                    </div>
                  )}

                  {c.resolution_notes && (
                    <div className="bg-green-50 rounded-lg p-3 text-sm">
                      <p className="font-medium text-green-700">Resolution Notes</p>
                      <p className="text-green-600 mt-1">{c.resolution_notes}</p>
                    </div>
                  )}

                  {c.penalty_details && Object.keys(c.penalty_details).length > 0 && (
                    <div className="bg-red-50 rounded-lg p-3 text-sm">
                      <p className="font-medium text-red-700">Penalty Details</p>
                      <pre className="text-red-600 mt-1 text-xs">{JSON.stringify(c.penalty_details, null, 2)}</pre>
                    </div>
                  )}

                  {/* Actions */}
                  {(user?.role === "central_gov" || (user?.role === "auditor_ngo" && c.assigned_to === user?.id)) && !["closed"].includes(c.status) && (
                    <div className="border-t pt-3 space-y-2">
                      <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} placeholder="Resolution notes..."
                        value={updateNotes[c.id] || ""} onChange={e => setUpdateNotes(p => ({ ...p, [c.id]: e.target.value }))} />
                      <div className="flex gap-2 flex-wrap">
                        {c.status === "open" && (
                          <button onClick={() => updateCase(c.id, { status: "investigating", resolution_notes: updateNotes[c.id] })}
                            className="px-3 py-1.5 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700">Start Investigating</button>
                        )}
                        {["open", "investigating"].includes(c.status) && (
                          <button onClick={() => updateCase(c.id, { status: "resolved", resolution_notes: updateNotes[c.id] })}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">Resolve</button>
                        )}
                        {["resolved", "appealed"].includes(c.status) && user?.role === "central_gov" && (
                          <button onClick={() => updateCase(c.id, { status: "closed", resolution_notes: updateNotes[c.id] })}
                            className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-700">Close Case</button>
                        )}
                        {c.status === "resolved" && (
                          <button onClick={() => updateCase(c.id, { status: "appealed", resolution_notes: updateNotes[c.id] })}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700">Appeal</button>
                        )}
                      </div>
                    </div>
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
