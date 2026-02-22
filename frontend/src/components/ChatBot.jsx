import { useState, useRef, useEffect } from "react";
import { MessageCircle, Bot, X } from "lucide-react";
import api from "../api/client";

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Namaste! I'm the TenderGuard assistant. Ask me about tenders, bids, tranches, KYC, complaints, or how the platform works." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottom = useRef(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput("");
    setMessages(p => [...p, { role: "user", text: q }]);
    setLoading(true);
    try {
      const { data } = await api.post("/chatbot", { message: q });
      setMessages(p => [...p, { role: "bot", text: data.reply }]);
    } catch {
      setMessages(p => [...p, { role: "bot", text: "Sorry, I couldn't process that. Please try again." }]);
    }
    setLoading(false);
  }

  return (
    <>
      <button onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 bg-teal-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-teal-700 transition text-xl">
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 h-96 bg-white border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-teal-600 text-white px-4 py-3 text-sm font-semibold flex items-center gap-2">
            <Bot size={18} /> TenderGuard Assistant
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl ${
                  m.role === "user" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-700"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-400 px-3 py-2 rounded-xl text-sm">Typing...</div>
              </div>
            )}
            <div ref={bottom} />
          </div>

          <form onSubmit={send} className="p-2 border-t flex gap-2">
            <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Ask something..."
              value={input} onChange={e => setInput(e.target.value)} />
            <button type="submit" disabled={loading} className="bg-teal-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50">
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
