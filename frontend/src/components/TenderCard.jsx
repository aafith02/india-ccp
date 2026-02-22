import { Link } from "react-router-dom";

const statusColor = {
  draft: "bg-gray-100 text-gray-600",
  open: "bg-green-100 text-green-700",
  closed: "bg-amber-100 text-amber-700",
  awarded: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-600",
};

export default function TenderCard({ tender }) {
  const t = tender;
  return (
    <Link to={`/tenders/${t.id}`}
      className="bg-white rounded-xl border p-4 hover:shadow-md transition block">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 truncate">{t.title}</h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <span className="capitalize">{t.category}</span>
            <span>•</span>
            <span>{t.location || t.district}</span>
            <span>•</span>
            <span>{t.tranche_count || 4} tranches</span>
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ml-3 whitespace-nowrap ${statusColor[t.status] || "bg-gray-100"}`}>
          {t.status}
        </span>
      </div>
    </Link>
  );
}
