import { Link } from "react-router-dom";
import { MapPin, Calendar, Clock } from "lucide-react";

export default function TenderCard({ tender, showBidButton = false }) {
  const deadline = new Date(tender.bid_deadline);
  const isExpired = deadline < new Date();
  const daysLeft = Math.max(0, Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="bg-white rounded-xl shadow-card p-5 hover:shadow-elevated transition-shadow duration-300 animate-fade-up">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium badge-${tender.status}`}>
              {tender.status}
            </span>
            {tender.State && (
              <span className="text-xs text-gray-400">{tender.State.name}</span>
            )}
          </div>
          <h3 className="font-heading font-semibold text-base text-gray-800 mb-1">
            <Link to={`/tenders/${tender.id}`} className="hover:text-teal-600 transition-colors">
              {tender.title}
            </Link>
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2">{tender.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
        {tender.location && (
          <span className="flex items-center gap-1">
            <MapPin size={12} /> {tender.location}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar size={12} /> Deadline: {deadline.toLocaleDateString("en-IN")}
        </span>
        {!isExpired && (
          <span className="flex items-center gap-1 text-amber-500 font-medium">
            <Clock size={12} /> {daysLeft} days left
          </span>
        )}
      </div>

      {showBidButton && !isExpired && tender.status === "open" && (
        <Link
          to={`/tenders/${tender.id}/bid`}
          className="mt-4 inline-block px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition"
        >
          Submit Bid
        </Link>
      )}
    </div>
  );
}
