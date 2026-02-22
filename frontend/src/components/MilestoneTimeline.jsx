import { Circle, CircleDot, CheckCircle2, Clock } from "lucide-react";

const StatusIcon = ({ status }) => {
  switch (status) {
    case "in_progress": return <Clock size={18} className="text-amber-500" />;
    case "completed": return <CircleDot size={18} className="text-blue-500" />;
    case "verified": return <CheckCircle2 size={18} className="text-green-600" />;
    default: return <Circle size={18} className="text-gray-400" />;
  }
};

export default function MilestoneTimeline({ milestones = [] }) {
  return (
    <div className="space-y-0">
      {milestones.map((m, i) => (
        <div key={m.id} className="flex gap-3 items-start">
          <div className="flex flex-col items-center">
            <StatusIcon status={m.status} />
            {i < milestones.length - 1 && <div className="w-px h-8 bg-gray-200" />}
          </div>
          <div className="pb-4">
            <p className="text-sm font-medium text-gray-700">{m.title}</p>
            {m.description && <p className="text-xs text-gray-400">{m.description}</p>}
            <p className="text-xs text-gray-300 mt-0.5 capitalize">{m.status?.replace("_", " ")}</p>
          </div>
        </div>
      ))}
      {milestones.length === 0 && <p className="text-sm text-gray-400">No milestones yet.</p>}
    </div>
  );
}
