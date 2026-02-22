import { useState, useEffect } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import api from "../api/client";
import LoadingSkeleton from "./LoadingSkeleton";

const COLORS = ["#0d9488", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#10b981", "#6366f1"];

export default function AnalyticsCharts() {
  const [overview, setOverview] = useState(null);
  const [byStatus, setByStatus] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [complaintStatus, setComplaintStatus] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/analytics/overview").then(r => setOverview(r.data)).catch(() => {}),
      api.get("/analytics/tender-by-status").then(r => setByStatus(r.data.data || [])).catch(() => {}),
      api.get("/analytics/tender-by-category").then(r => setByCategory(r.data.data || [])).catch(() => {}),
      api.get("/analytics/complaint-by-status").then(r => setComplaintStatus(r.data.data || [])).catch(() => {}),
      api.get("/analytics/monthly-tenders").then(r => setMonthly(r.data.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton type="stats" />;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Tenders", value: overview.totalTenders, color: "bg-teal-50 text-teal-700" },
            { label: "Active Contracts", value: overview.activeContracts, color: "bg-blue-50 text-blue-700" },
            { label: "Pending Complaints", value: overview.pendingComplaints, color: "bg-red-50 text-red-700" },
            { label: "Total Contracts", value: overview.totalContracts, color: "bg-purple-50 text-purple-700" },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-xl p-5`}>
              <p className="text-xs font-medium opacity-70">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tenders by Status - Bar Chart */}
        {byStatus.length > 0 && (
          <div className="bg-white rounded-xl border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Tenders by Status</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tenders by Category - Pie Chart */}
        {byCategory.length > 0 && (
          <div className="bg-white rounded-xl border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Tenders by Category</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byCategory} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ category, count }) => `${category}: ${count}`}>
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Complaints by Status - Pie Chart */}
        {complaintStatus.length > 0 && (
          <div className="bg-white rounded-xl border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Complaints by Status</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={complaintStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label={({ status, count }) => `${status}: ${count}`}>
                  {complaintStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly Tenders - Line Chart */}
        {monthly.length > 0 && (
          <div className="bg-white rounded-xl border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Tenders</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
