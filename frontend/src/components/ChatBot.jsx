import { useState, useRef, useEffect } from "react";
import api from "../api/client";
import { MessageCircle, X, Send } from "lucide-react";

export default function ChatBot({ theme }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! I can help you find project status, payment info, and open tenders. What would you like to know?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const question = input.trim();
    setMessages((prev) => [...prev, { from: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/chatbot/ask", { question });
      setMessages((prev) => [...prev, { from: "bot", text: data.answer }]);
    } catch {
      setMessages((prev) => [...prev, { from: "bot", text: "Sorry, I couldn't process that. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-elevated flex items-center justify-center text-white z-50 hover:scale-105 transition-transform"
          style={{ backgroundColor: theme.primary }}
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-elevated flex flex-col z-50 overflow-hidden animate-fade-up">
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between text-white" style={{ backgroundColor: theme.primary }}>
            <div className="flex items-center gap-2">
              <MessageCircle size={18} />
              <span className="font-heading font-semibold text-sm">TenderGuard Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="hover:bg-white/20 p-1 rounded">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                    msg.from === "user"
                      ? "text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-700 rounded-bl-sm"
                  }`}
                  style={msg.from === "user" ? { backgroundColor: theme.primary } : {}}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-xl text-sm text-gray-400">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask about a project..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-400 outline-none"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="p-2 rounded-lg text-white disabled:opacity-40 transition"
                style={{ backgroundColor: theme.primary }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
