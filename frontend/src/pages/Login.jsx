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

/* ── India Map SVG silhouette for background ── */
function IndiaMapBg() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 500 600"
      preserveAspectRatio="xMidYMid meet"
      style={{ opacity: 0.06 }}
    >
      {/* Simplified India map outline */}
      <path
        d="M220,30 L240,28 L260,35 L275,32 L290,40 L310,38 L325,45 L340,42 L355,50
           L365,55 L370,65 L375,80 L380,95 L385,110 L378,125 L370,135
           L372,150 L380,165 L385,180 L382,195 L375,210 L378,225
           L385,240 L390,255 L395,270 L392,285 L385,300 L380,315
           L375,330 L370,345 L365,355 L355,365 L345,375 L340,390
           L335,405 L325,415 L315,425 L305,440 L295,455 L285,465
           L275,475 L265,490 L258,505 L255,520 L250,535 L245,545
           L240,555 L235,560 L230,555 L225,545 L218,530 L210,515
           L205,500 L195,485 L185,470 L175,460 L165,445 L155,430
           L148,415 L142,400 L135,385 L130,370 L125,355 L120,340
           L115,325 L112,310 L110,295 L108,280 L110,265 L115,250
           L118,235 L120,220 L125,205 L130,190 L128,175 L125,160
           L130,145 L135,130 L140,115 L148,100 L155,90 L165,78
           L175,68 L185,58 L195,48 L205,40 L215,33 Z"
        fill="#000080"
      />
      {/* Sri Lanka */}
      <ellipse cx="265" cy="575" rx="18" ry="12" fill="#000080" />
    </svg>
  );
}

/* ── Ashoka Chakra SVG (24-spoke wheel) ── */
function AshokaChakra({ size = 80 }) {
  const spokes = 24;
  const r = size / 2;
  const spokeLen = r * 0.78;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={r} cy={r} r={r - 2} fill="none" stroke="#000080" strokeWidth="2.5" />
      <circle cx={r} cy={r} r={r * 0.15} fill="#000080" />
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
            stroke="#000080"
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
            fill="#000080"
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
        className="w-32 h-auto drop-shadow-lg"
      />
      <p className="text-sm font-bold tracking-[0.25em] mt-3" style={{ color: "#000080" }}>
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
      {/* ─── Left panel — Indian tricolour gradient + emblem + quote + India map ─── */}
      <div
        className="hidden lg:flex lg:w-[48%] relative flex-col items-center justify-center p-12 overflow-hidden"
        style={{
          background: "linear-gradient(175deg, #FF9933 0%, #FF9933 30%, #FFFFFF 30%, #FFFFFF 70%, #138808 70%, #138808 100%)",
        }}
      >
        {/* India map silhouette background */}
        <IndiaMapBg />

        {/* Subtle diagonal stripes overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 30px, #000 30px, #000 31px)",
        }} />

        {/* Floating content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <NationalEmblem />

          <h1 className="font-heading font-bold text-3xl mt-6" style={{ color: "#000080" }}>
            TenderGuard
          </h1>
          <p className="text-sm font-medium mt-1" style={{ color: "#333" }}>
            Transparent Public Tender Management
          </p>

          {/* Quote card */}
          <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/60">
            <p className="text-gray-700 italic leading-relaxed">"{quote.text}"</p>
            <p className="mt-3 text-sm font-semibold" style={{ color: "#000080" }}>— {quote.author}</p>
          </div>

          {/* Feature highlights */}
          <div className="mt-8 grid grid-cols-2 gap-3 w-full text-sm">
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 text-center shadow-sm">
              <span className="text-xl">🛡️</span>
              <p className="mt-1 font-medium text-gray-700">Anti-Corruption</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 text-center shadow-sm">
              <span className="text-xl">🔍</span>
              <p className="mt-1 font-medium text-gray-700">Full Transparency</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 text-center shadow-sm">
              <span className="text-xl">🤖</span>
              <p className="mt-1 font-medium text-gray-700">AI-Powered Scoring</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 text-center shadow-sm">
              <span className="text-xl">📒</span>
              <p className="mt-1 font-medium text-gray-700">Audit Ledger</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right panel — Login form ─── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12" style={{ background: "#faf7f2" }}>
        <div className="w-full max-w-md">
          {/* Tricolour top bar (visible on all screen sizes) */}
          <div className="flex rounded-t-xl overflow-hidden mb-0 shadow-sm">
            <div className="h-1.5 flex-1" style={{ backgroundColor: "#FF9933" }} />
            <div className="h-1.5 flex-1" style={{ backgroundColor: "#FFFFFF", borderTop: "1px solid #eee" }} />
            <div className="h-1.5 flex-1" style={{ backgroundColor: "#138808" }} />
          </div>

          {/* Mobile emblem (hidden on desktop) */}
          <div className="lg:hidden text-center py-6 bg-white rounded-b-none">
            <div className="flex items-center justify-center gap-3">
              <img src="/images/national-emblem.png" alt="National Emblem of India" className="w-10 h-auto" />
              <div className="text-left">
                <h1 className="font-heading font-bold text-2xl" style={{ color: "#000080" }}>TenderGuard</h1>
                <p className="text-xs text-gray-500">Transparent Public Tender Management</p>
              </div>
            </div>
            {/* Mobile quote */}
            <p className="text-xs italic text-gray-500 mt-3 px-4">"{quote.text}" — {quote.author}</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl lg:rounded-t-2xl shadow-elevated p-8">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                  mode === "login" ? "bg-white shadow text-gray-800" : "text-gray-500"
                }`}
                style={mode === "login" ? { color: "#000080" } : {}}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode("register")}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                  mode === "register" ? "bg-white shadow text-gray-800" : "text-gray-500"
                }`}
                style={mode === "register" ? { color: "#000080" } : {}}
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
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
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
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
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
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none pr-10"
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
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
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
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
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

              {/* Tricolour submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-white font-semibold rounded-lg transition disabled:opacity-50 shadow-md hover:shadow-lg relative overflow-hidden"
                style={{
                  background: "linear-gradient(90deg, #FF9933 0%, #FF9933 33%, #FFFFFF 33%, #FFFFFF 66%, #138808 66%, #138808 100%)",
                  color: "#000080",
                }}
              >
                <span className="relative z-10 drop-shadow-sm">
                  {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
                </span>
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <AshokaChakra size={16} />
            <p className="text-xs text-gray-400">
              Secured by blockchain audit trail · Every action is logged
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
