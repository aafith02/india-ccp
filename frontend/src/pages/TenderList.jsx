import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Search } from "lucide-react";
import api from "../api/client";

export default function TenderList() {
  const { user } = useAuth();
  const [tenders, setTenders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    const url = user ? "/tenders" : "/public/tenders";
    api.get(url).then(r => setTenders(r.data.tenders || [])).catch(() => {});
  }, [user]);

  // Extract unique categories from tenders
  const categories = [...new Set(tenders.map(t => t.category).filter(Boolean))];

  const filtered = tenders.filter(t => {
    if (filter !== "all" && t.status !== filter) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      return (
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.location?.toLowerCase().includes(q) ||
        t.district?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusColor = {
    draft: "bg-gray-100 text-gray-600",
    open: "bg-green-100 text-green-700",
    closed: "bg-amber-100 text-amber-700",
    awarded: "bg-blue-100 text-blue-700",
    in_progress: "bg-purple-100 text-purple-700",
    completed: "bg-teal-100 text-teal-700",
    cancelled: "bg-red-100 text-red-600",
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tenders</h1>
        {user?.role === "state_gov" && (
          <Link to="/tenders/new" className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition">
            + New Tender
          </Link>
        )}
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          placeholder="Search tenders by title, location, category..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="flex gap-1 text-sm">
          {["all", "open", "closed", "awarded", "in_progress", "completed", "draft"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg capitalize transition ${filter === s ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
        {categories.length > 0 && (
          <select
            className="ml-auto border rounded-lg px-3 py-1.5 text-sm text-gray-600"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-3">{filtered.length} tender{filtered.length !== 1 ? "s" : ""} found</p>

      <div className="grid gap-4">
        {filtered.map(t => (
          <Link key={t.id} to={`/tenders/${t.id}`}
            className="bg-white rounded-xl border p-5 hover:shadow-md transition block">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{t.title}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{t.description}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                  {t.category && <span className="capitalize">{t.category}</span>}
                  {t.location && <><span>•</span><span>{t.location}</span></>}
                  {t.district && <><span>•</span><span>{t.district}</span></>}
                  {t.bid_deadline && <>
                    <span>•</span>
                    <span>Deadline: {new Date(t.bid_deadline).toLocaleDateString("en-IN")}</span>
                  </>}
                  <span>•</span>
                  <span>{t.tranche_count || 4} tranches</span>
                </div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[t.status] || "bg-gray-100"}`}>
                {t.status?.replace("_", " ")}
              </span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-12">No tenders found.</div>
        )}
      </div>
    </div>
  );
}
