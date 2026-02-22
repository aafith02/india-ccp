import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Star } from "lucide-react";
import api from "../api/client";

const roleLabels = { contractor: "Contractors", state_gov: "State Officers", community: "Community", auditor_ngo: "NGOs" };

export default function PointsPage() {
  const { user } = useAuth();
  const [myPoints, setMyPoints] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [tab, setTab] = useState("leaderboard");

  useEffect(() => {
    api.get("/points/my").then(r => setMyPoints(r.data)).catch(() => {});
    fetchLeaderboard();
  }, []);

  function fetchLeaderboard(role) {
    const q = role ? `?role=${role}` : "";
    api.get(`/points/leaderboard${q}`).then(r => setLeaderboard(r.data.leaderboard || [])).catch(() => {});
  }

  function handleRoleFilter(role) {
    setRoleFilter(role);
    fetchLeaderboard(role);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Points & Rewards</h1>
        <p className="text-gray-500 text-sm mt-1">Track performance and accountability</p>
      </div>

      {/* My Points Summary */}
      {myPoints && (
        <div className="bg-gradient-to-r from-teal-500 to-teal-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm">Your Total Points</p>
              <p className="text-4xl font-bold mt-1">{myPoints.total ?? myPoints.total_points ?? 0}</p>
            </div>
            <Star size={56} className="opacity-30" />
          </div>
          {myPoints.history?.length > 0 && (
            <div className="mt-4 border-t border-teal-400/30 pt-4">
              <p className="text-teal-100 text-xs mb-2">Recent Activity</p>
              <div className="space-y-1">
                {myPoints.history.slice(0, 5).map((h, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-teal-100">{h.reason}</span>
                    <span className={`font-medium ${h.points > 0 ? "text-green-200" : "text-red-200"}`}>
                      {h.points > 0 ? "+" : ""}{h.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("leaderboard")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "leaderboard" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"}`}>
          Leaderboard
        </button>
        {myPoints?.history?.length > 0 && (
          <button onClick={() => setTab("history")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "history" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"}`}>
            My History
          </button>
        )}
      </div>

      {tab === "leaderboard" && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex gap-2 flex-wrap">
            <button onClick={() => handleRoleFilter("")} className={`px-3 py-1.5 rounded-full text-xs font-medium ${!roleFilter ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-500"}`}>All</button>
            {Object.entries(roleLabels).map(([k, v]) => (
              <button key={k} onClick={() => handleRoleFilter(k)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${roleFilter === k ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-500"}`}>{v}</button>
            ))}
          </div>
          <div className="divide-y">
            {leaderboard.map((u, i) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-gray-50 text-gray-400"}`}>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-sm">{u.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{u.role?.replace("_", " ")}</p>
                </div>
                <span className="text-lg font-bold text-teal-600">{u.points || 0}</span>
              </div>
            ))}
            {leaderboard.length === 0 && <div className="p-6 text-center text-gray-400 text-sm">No data</div>}
          </div>
        </div>
      )}

      {tab === "history" && myPoints?.history && (
        <div className="bg-white rounded-xl shadow-sm border divide-y">
          {myPoints.history.map((h, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-gray-700">{h.reason}</p>
                <p className="text-xs text-gray-400">{h.reference_type} — {new Date(h.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={`text-lg font-bold ${h.points > 0 ? "text-green-600" : "text-red-600"}`}>
                {h.points > 0 ? "+" : ""}{h.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
