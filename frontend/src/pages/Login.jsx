import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Landmark } from "lucide-react";
import api from "../api/client";

const quotes = [
  { text: "Be the change you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "Corruption is the enemy of development.", author: "Pratibha Patil" },
  { text: "Transparency is the mother of good governance.", author: "Narendra Modi" },
  { text: "The strength of a democracy lies in its commitment to justice.", author: "B.R. Ambedkar" },
];

export default function Login() {
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "community", state_id: "", id_number: "", business_name: "" });
  const [states, setStates] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const nav = useNavigate();
  const [quote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);

  useEffect(() => { if (isAuthenticated) nav("/dashboard"); }, [isAuthenticated]);
  useEffect(() => { api.get("/states").then(r => setStates(r.data.states || [])).catch(() => {}); }, []);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        nav("/dashboard");
      } else {
        const payload = { name: form.name, email: form.email, password: form.password, role: form.role };
        if (form.role === "contractor") {
          payload.state_id = form.state_id;
          payload.kyc_data = { id_number: form.id_number, business_name: form.business_name };
        }
        if (form.role === "community" && form.state_id) payload.state_id = form.state_id;
        await api.post("/auth/register", payload);
        await login(form.email, form.password);
        nav("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 via-white to-green-600 flex-col items-center justify-center p-12 relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-orange-500" />
        <div className="absolute bottom-0 left-0 w-full h-2 bg-green-600" />
        <div className="text-center space-y-6">
          <Landmark size={72} className="text-teal-700 mx-auto" />
          <h1 className="text-4xl font-bold text-gray-800">TenderGuard</h1>
          <p className="text-xl text-gray-600 font-medium">Anti-Bribery Public Tender Platform</p>
          <div className="bg-white/80 backdrop-blur rounded-xl p-6 max-w-md shadow-lg">
            <p className="text-gray-700 italic text-lg">"{quote.text}"</p>
            <p className="text-gray-500 mt-2 text-sm font-medium">— {quote.author}</p>
          </div>
          <div className="flex gap-3 justify-center mt-4">
            <span className="w-8 h-8 bg-orange-500 rounded-full" />
            <span className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold">*</span>
            <span className="w-8 h-8 bg-green-600 rounded-full" />
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold text-teal-700 flex items-center justify-center gap-2"><Landmark size={28} /> TenderGuard</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex gap-2 mb-6">
              <button onClick={() => setMode("login")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === "login" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"}`}>Sign In</button>
              <button onClick={() => setMode("register")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === "register" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"}`}>Register</button>
            </div>

            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <input className="w-full border rounded-lg px-4 py-2.5 text-sm" placeholder="Full Name" value={form.name} onChange={set("name")} required />
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="role" value="community" checked={form.role === "community"} onChange={set("role")} className="accent-teal-600" />
                      <span className="text-sm">Community</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="role" value="contractor" checked={form.role === "contractor"} onChange={set("role")} className="accent-teal-600" />
                      <span className="text-sm">Contractor</span>
                    </label>
                  </div>
                  {(form.role === "contractor" || form.role === "community") && (
                    <select className="w-full border rounded-lg px-4 py-2.5 text-sm" value={form.state_id} onChange={set("state_id")} required={form.role === "contractor"}>
                      <option value="">Select State {form.role === "community" ? "(optional)" : ""}</option>
                      {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                  {form.role === "contractor" && (
                    <>
                      <input className="w-full border rounded-lg px-4 py-2.5 text-sm" placeholder="Aadhaar / ID Number" value={form.id_number} onChange={set("id_number")} required />
                      <input className="w-full border rounded-lg px-4 py-2.5 text-sm" placeholder="Business / Company Name" value={form.business_name} onChange={set("business_name")} required />
                      <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">Your KYC will be verified by a state government officer before you can bid.</p>
                    </>
                  )}
                </>
              )}

              <input type="email" className="w-full border rounded-lg px-4 py-2.5 text-sm" placeholder="Email" value={form.email} onChange={set("email")} required />
              <input type="password" className="w-full border rounded-lg px-4 py-2.5 text-sm" placeholder="Password" value={form.password} onChange={set("password")} required />

              <button type="submit" disabled={loading} className="w-full bg-teal-600 text-white py-2.5 rounded-lg font-medium hover:bg-teal-700 transition disabled:opacity-50">
                {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            {mode === "login" && (
              <p className="text-xs text-gray-400 text-center mt-4">
                NGO and State members are created by Central Government.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
