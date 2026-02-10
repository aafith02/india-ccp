import { CheckCircle, Clock, AlertCircle, Circle } from "lucide-react";

const statusConfig = {
  pending:       { icon: Circle,      color: "text-gray-400",  bg: "bg-gray-100" },
  proof_uploaded:{ icon: Clock,       color: "text-amber-500", bg: "bg-amber-50" },
  under_review:  { icon: Clock,       color: "text-blue-500",  bg: "bg-blue-50" },
  approved:      { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50" },
  rejected:      { icon: AlertCircle, color: "text-red-500",   bg: "bg-red-50" },
};

export default function MilestoneTimeline({ milestones = [] }) {
  return (
    <div className="space-y-0">
      {milestones.map((ms, index) => {
        const cfg = statusConfig[ms.status] || statusConfig.pending;
        const Icon = cfg.icon;
        const isLast = index === milestones.length - 1;

        return (
          <div key={ms.id} className="flex gap-4">
            {/* Vertical line + icon */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center`}>
                <Icon size={16} className={cfg.color} />
              </div>
              {!isLast && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
            </div>

            {/* Content */}
            <div className={`pb-6 flex-1 ${isLast ? "" : ""}`}>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">{ms.title}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full badge-${ms.status}`}>
                  {ms.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{ms.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span>₹{Number(ms.amount).toLocaleString("en-IN")}</span>
                {ms.due_date && <span>Due: {new Date(ms.due_date).toLocaleDateString("en-IN")}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
