import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import TenderCard from "../components/TenderCard";
import { Search, Filter } from "lucide-react";

export default function TenderList() {
  const { user } = useAuth();
  const [tenders, setTenders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (user?.role === "contractor" && user?.state_id) params.set("state_id", user.state_id);
    if (user?.role === "state_gov" && user?.state_id) params.set("state_id", user.state_id);
    if (statusFilter) params.set("status", statusFilter);
    api.get(`/tenders?${params}`).then(({ data }) => {
      setTenders(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [statusFilter, user]);

  const filtered = tenders.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  );

  const isContractor = user?.role === "contractor";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-2xl text-gray-800">
            {isContractor ? "Open Tenders" : "All Tenders"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isContractor ? "Browse and bid on tenders in your state" : "Manage public tenders"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tenders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 outline-none shadow-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 outline-none shadow-sm"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="awarded">Awarded</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white rounded-xl animate-pulse shadow-card" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-8 text-center text-gray-400">
          No tenders found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(tender => (
            <TenderCard key={tender.id} tender={tender} showBidButton={isContractor} />
          ))}
        </div>
      )}
    </div>
  );
}
