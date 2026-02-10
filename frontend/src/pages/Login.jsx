import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { Shield, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [states, setStates] = useState([]);
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "community", state_id: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === "community" ? "/portal" : "/dashboard");
    }
  }, [isAuthenticated]);

  // Load states for registration
  useEffect(() => {
    api.get("/states").then(({ data }) => setStates(data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const u = await login(form.email, form.password);
        navigate(u.role === "community" ? "/portal" : "/dashboard");
      } else {
        await api.post("/auth/register", form);
        const u = await login(form.email, form.password);
        navigate(u.role === "community" ? "/portal" : "/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #faf7f2 0%, #e0f2f1 50%, #faf7f2 100%)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="w-20 h-20 bg-teal-500 rounded-2xl mx-auto flex items-center justify-center shadow-elevated">
            <Shield size={36} className="text-white" />
          </div>
          <h1 className="font-heading font-bold text-3xl text-teal-800 mt-4">TenderGuard</h1>
          <p className="text-gray-500 text-sm mt-1">Transparent Public Tender Management</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-elevated p-8 animate-fade-up-delay">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode === "login" ? "bg-white shadow text-teal-700" : "text-gray-500"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode === "register" ? "bg-white shadow text-teal-700" : "text-gray-500"}`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-400 outline-none"
                  placeholder="Your full name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-400 outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-400 outline-none pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-2.5 text-gray-400">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-400 outline-none"
                  >
                    <option value="community">Community Member</option>
                    <option value="contractor">Contractor</option>
                    <option value="state_gov">State Government</option>
                    <option value="central_gov">Central Government</option>
                    <option value="auditor_ngo">Auditor / NGO</option>
                  </select>
                </div>

                {["contractor", "state_gov"].includes(form.role) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">State</label>
                    <select
                      required
                      value={form.state_id}
                      onChange={(e) => setForm({ ...form, state_id: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-400 outline-none"
                    >
                      <option value="">Select your state</option>
                      {states.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition disabled:opacity-50"
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Secured by blockchain audit trail · Every action is logged
        </p>
      </div>
    </div>
  );
}
