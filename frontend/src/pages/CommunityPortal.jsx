import { useState, useEffect } from "react";
import api from "../api/client";
import TenderCard from "../components/TenderCard";
import ComplaintForm from "../components/ComplaintForm";
import { Globe, Search } from "lucide-react";

export default function CommunityPortal() {
  const [tenders, setTenders] = useState([]);
  const [states, setStates] = useState([]);
  const [filters, setFilters] = useState({ state_id: "", status: "" });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/states").then(({ data }) => setStates(data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.state_id) params.set("state_id", filters.state_id);
    if (filters.status) params.set("status", filters.status);
    api.get(`/public/tenders?${params}`).then(({ data }) => {
      setTenders(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filters]);

  const filtered = tenders.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6 px-4">
      {/* Header */}
      <div className="text-center animate-fade-up">
        <div className="w-16 h-16 bg-teal-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
          <Globe size={28} className="text-white" />
        </div>
        <h1 className="font-heading font-bold text-3xl text-gray-800">Community Portal</h1>
        <p className="text-gray-500 mt-2">Track public tenders, view transactions, and report issues</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-card p-4 flex flex-wrap gap-3 animate-fade-up-delay">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 outline-none"
          />
        </div>
        <select
          value={filters.state_id}
          onChange={(e) => setFilters({ ...filters, state_id: e.target.value })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 outline-none"
        >
          <option value="">All States</option>
          {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 outline-none"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="awarded">Awarded</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Tenders List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-8 text-center text-gray-400">
          No projects found matching your filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(tender => (
            <TenderCard key={tender.id} tender={tender} />
          ))}
        </div>
      )}
    </div>
  );
}
