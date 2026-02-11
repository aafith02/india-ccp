import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { Eye, EyeOff } from "lucide-react";

/* ── Quotes from great Indian leaders ── */
const QUOTES = [
  { text: "Be the change you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "A nation's culture resides in the hearts and in the soul of its people.", author: "Mahatma Gandhi" },
  { text: "The best way to find yourself is to lose yourself in the service of others.", author: "Mahatma Gandhi" },
  { text: "Dream, dream, dream. Dreams transform into thoughts and thoughts result in action.", author: "A.P.J. Abdul Kalam" },
  { text: "If a country is to be corruption-free, I feel there are three key people: the father, the mother, and the teacher.", author: "A.P.J. Abdul Kalam" },
  { text: "Great dreams of great dreamers are always transcended.", author: "A.P.J. Abdul Kalam" },
  { text: "Arise, awake, and stop not till the goal is reached.", author: "Swami Vivekananda" },
  { text: "Take up one idea. Make that one idea your life — think of it, dream of it, live on that idea.", author: "Swami Vivekananda" },
  { text: "Every nation's strength ultimately consists in what it can do on its own, and not in what it can borrow from others.", author: "Indira Gandhi" },
  { text: "Cultivation of mind should be the ultimate aim of human existence.", author: "Dr. B.R. Ambedkar" },
  { text: "I measure the progress of a community by the degree of progress which women have achieved.", author: "Dr. B.R. Ambedkar" },
  { text: "Faith is the bird that feels the light when the dawn is still dark.", author: "Rabindranath Tagore" },
  { text: "Where the mind is without fear and the head is held high — into that heaven of freedom, let my country awake.", author: "Rabindranath Tagore" },
  { text: "The mantra is — work hard and be honest. India will become a great nation.", author: "Sardar Vallabhbhai Patel" },
  { text: "At the dawn of history, India started on her unending quest.", author: "Jawaharlal Nehru" },
  { text: "A moment comes, which comes but rarely in history, when we step out from the old to the new.", author: "Jawaharlal Nehru" },
];

/* ── Ashoka Chakra SVG (24-spoke wheel) ── */
function AshokaChakra({ size = 80, color = "#000080" }) {
  const spokes = 24;
  const r = size / 2;
  const spokeLen = r * 0.78;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={r} cy={r} r={r - 2} fill="none" stroke={color} strokeWidth="2.5" />
      <circle cx={r} cy={r} r={r * 0.15} fill={color} />
      {[...Array(spokes)].map((_, i) => {
        const angle = (i * 360) / spokes - 90;
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={r}
            y1={r}
            x2={r + spokeLen * Math.cos(rad)}
            y2={r + spokeLen * Math.sin(rad)}
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        );
      })}
      {/* Curved petals between spokes */}
      {[...Array(spokes)].map((_, i) => {
        const a1 = ((i * 360) / spokes - 90) * (Math.PI / 180);
        const a2 = (((i + 1) * 360) / spokes - 90) * (Math.PI / 180);
        const mid = (a1 + a2) / 2;
        const innerR = r * 0.28;
        const outerR = r * 0.55;
        return (
          <circle
            key={`d-${i}`}
            cx={r + outerR * Math.cos(mid)}
            cy={r + outerR * Math.sin(mid)}
            r={2}
            fill={color}
          />
        );
      })}
    </svg>
  );
}

/* ── National Emblem of India ── */
function NationalEmblem() {
  return (
    <div className="flex flex-col items-center">
      <img
        src="/images/national-emblem.png"
        alt="National Emblem of India — Lion Capital of Ashoka"
        className="w-32 h-auto drop-shadow-2xl brightness-110"
      />
      <p className="text-sm font-bold tracking-[0.25em] mt-3 text-orange-300">
        सत्यमेव जयते
      </p>
    </div>
  );
}

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [states, setStates] = useState([]);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "community", state_id: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Pick a random quote on mount
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === "community" ? "/portal" : "/dashboard");
    }
  }, [isAuthenticated]);

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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ─── Left panel — Indian tricolour gradient + emblem + quote ─── */}
      <div
        className="hidden lg:flex lg:w-[48%] relative flex-col items-center justify-center p-12 overflow-hidden"
        style={{
          background: "linear-gradient(175deg, #FF9933 0%, #FF9933 30%, #1e293b 30%, #1e293b 70%, #138808 70%, #138808 100%)",
        }}
      >
        {/* Subtle diagonal stripes overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 30px, #fff 30px, #fff 31px)",
        }} />

        {/* Floating content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <NationalEmblem />

          <h1 className="font-heading font-bold text-3xl mt-6 text-white">
            TenderGuard
          </h1>
          <p className="text-sm font-medium mt-1 text-gray-300">
            Transparent Public Tender Management
          </p>

          {/* Quote card */}
          <div className="mt-8 rounded-xl p-6 shadow-2xl border" style={{ background: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.2)", backdropFilter: "blur(12px)" }}>
            <p className="text-gray-200 italic leading-relaxed">"{quote.text}"</p>
            <p className="mt-3 text-sm font-semibold text-orange-300">— {quote.author}</p>
          </div>

          {/* Feature highlights */}
          <div className="mt-8 grid grid-cols-2 gap-3 w-full text-sm">
            <div className="rounded-lg p-3 text-center shadow-lg" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <span className="text-xl">🛡️</span>
              <p className="mt-1 font-medium text-gray-200">Anti-Corruption</p>
            </div>
            <div className="rounded-lg p-3 text-center shadow-lg" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <span className="text-xl">🔍</span>
              <p className="mt-1 font-medium text-gray-200">Full Transparency</p>
            </div>
            <div className="rounded-lg p-3 text-center shadow-lg" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <span className="text-xl">🤖</span>
              <p className="mt-1 font-medium text-gray-200">AI-Powered Scoring</p>
            </div>
            <div className="rounded-lg p-3 text-center shadow-lg" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <span className="text-xl">📒</span>
              <p className="mt-1 font-medium text-gray-200">Audit Ledger</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right panel — Login form (Dark Theme) ─── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
        <div className="w-full max-w-md">
          {/* Tricolour top bar (visible on all screen sizes) */}
          <div className="flex rounded-t-xl overflow-hidden mb-0 shadow-lg">
            <div className="h-2 flex-1" style={{ backgroundColor: "#FF9933" }} />
            <div className="h-2 flex-1" style={{ backgroundColor: "#FFFFFF" }} />
            <div className="h-2 flex-1" style={{ backgroundColor: "#138808" }} />
          </div>

          {/* Mobile emblem (hidden on desktop) */}
          <div className="lg:hidden text-center py-6 rounded-b-none" style={{ background: "#1e293b" }}>
            <div className="flex items-center justify-center gap-3">
              <img src="/images/national-emblem.png" alt="National Emblem of India" className="w-10 h-auto brightness-110" />
              <div className="text-left">
                <h1 className="font-heading font-bold text-2xl text-white">TenderGuard</h1>
                <p className="text-xs text-gray-400">Transparent Public Tender Management</p>
              </div>
            </div>
            {/* Mobile quote */}
            <p className="text-xs italic text-gray-400 mt-3 px-4">"{quote.text}" — {quote.author}</p>
          </div>

          {/* Card */}
          <div className="rounded-2xl lg:rounded-t-2xl shadow-2xl p-8" style={{ background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {/* Tabs */}
            <div className="flex gap-1 rounded-lg p-1 mb-6" style={{ background: "rgba(255,255,255,0.05)" }}>
              <button
                onClick={() => setMode("login")}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition`}
                style={mode === "login" 
                  ? { background: "linear-gradient(90deg, #FF9933, #138808)", color: "#fff" } 
                  : { color: "#94a3b8" }
                }
              >
                Sign In
              </button>
              <button
                onClick={() => setMode("register")}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition`}
                style={mode === "register" 
                  ? { background: "linear-gradient(90deg, #FF9933, #138808)", color: "#fff" } 
                  : { color: "#94a3b8" }
                }
              >
                Register
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/50 text-red-300 text-sm rounded-lg border border-red-800">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                    placeholder="Your full name"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition pr-10"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {mode === "register" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none transition"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                    >
                      <option value="community" className="bg-slate-800">Community Member</option>
                      <option value="contractor" className="bg-slate-800">Contractor</option>
                      <option value="state_gov" className="bg-slate-800">State Government</option>
                      <option value="central_gov" className="bg-slate-800">Central Government</option>
                      <option value="auditor_ngo" className="bg-slate-800">Auditor / NGO</option>
                    </select>
                  </div>

                  {["contractor", "state_gov"].includes(form.role) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">State</label>
                      <select
                        required
                        value={form.state_id}
                        onChange={(e) => setForm({ ...form, state_id: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none transition"
                        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                      >
                        <option value="" className="bg-slate-800">Select your state</option>
                        {states.map((s) => (
                          <option key={s.id} value={s.id} className="bg-slate-800">{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Tricolour submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 font-semibold rounded-lg transition disabled:opacity-50 shadow-lg hover:shadow-xl hover:scale-[1.02] relative overflow-hidden mt-2"
                style={{
                  background: "linear-gradient(90deg, #FF9933 0%, #FF9933 33%, #FFFFFF 33%, #FFFFFF 66%, #138808 66%, #138808 100%)",
                  color: "#000080",
                }}
              >
                <span className="relative z-10 drop-shadow-sm font-bold">
                  {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
                </span>
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="p-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
              <AshokaChakra size={16} color="#94a3b8" />
            </div>
            <p className="text-xs text-gray-400">
              Secured by blockchain audit trail · Every action is logged
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
