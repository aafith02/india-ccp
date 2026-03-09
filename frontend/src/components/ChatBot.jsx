import { useState, useRef, useEffect } from "react";
import { MessageCircle, Bot, X, Globe, Send } from "lucide-react";
import api from "../api/client";

const LANGUAGES = [
  { code: "en", label: "English", hint: "Ask in English..." },
  { code: "hi", label: "हिन्दी", hint: "हिंदी में पूछें..." },
  { code: "ta", label: "தமிழ்", hint: "தமிழில் கேளுங்கள்..." },
  { code: "te", label: "తెలుగు", hint: "తెలుగులో అడగండి..." },
  { code: "kn", label: "ಕನ್ನಡ", hint: "ಕನ್ನಡದಲ್ಲಿ ಕೇಳಿ..." },
  { code: "bn", label: "বাংলা", hint: "বাংলায় জিজ্ঞাসা করুন..." },
  { code: "mr", label: "मराठी", hint: "मराठीत विचारा..." },
  { code: "gu", label: "ગુજરાતી", hint: "ગુજરાતીમાં પૂછો..." },
  { code: "ml", label: "മലയാളം", hint: "മലയാളത്തിൽ ചോദിക്കൂ..." },
  { code: "pa", label: "ਪੰਜਾਬੀ", hint: "ਪੰਜਾਬੀ ਵਿੱਚ ਪੁੱਛੋ..." },
  { code: "or", label: "ଓଡ଼ିଆ", hint: "ଓଡ଼ିଆରେ ପଚାରନ୍ତୁ..." },
  { code: "ur", label: "اردو", hint: "...اردو میں پوچھیں" },
];

const GREETING = {
  en: "Namaste! I'm the TenderGuard AI assistant. Ask me about tenders, bids, payments, KYC, complaints, or anything about the platform — in any Indian language!",
  hi: "नमस्ते! मैं TenderGuard AI सहायक हूँ। मुझसे टेंडर, बोली, भुगतान, KYC, शिकायत या प्लेटफ़ॉर्म के बारे में कुछ भी पूछें — किसी भी भारतीय भाषा में!",
  ta: "வணக்கம்! நான் TenderGuard AI உதவியாளர். டெண்டர், ஏலம், கட்டணம், KYC, புகார் அல்லது தளம் குறித்து எதையும் கேளுங்கள்!",
  te: "నమస్కారం! నేను TenderGuard AI సహాయకుడను. టెండర్లు, బిడ్‌లు, చెల్లింపులు, KYC, ఫిర్యాదులు గురించి అడగండి!",
  kn: "ನಮಸ್ಕಾರ! ನಾನು TenderGuard AI ಸಹಾಯಕ. ಟೆಂಡರ್, ಬಿಡ್, ಪಾವತಿ, KYC, ದೂರುಗಳ ಬಗ್ಗೆ ಕೇಳಿ!",
  bn: "নমস্কার! আমি TenderGuard AI সহকারী। টেন্ডার, বিড, পেমেন্ট, KYC, অভিযোগ সম্পর্কে জিজ্ঞাসা করুন!",
  mr: "नमस्कार! मी TenderGuard AI सहाय्यक आहे. टेंडर, बोली, पेमेंट, KYC, तक्रार यांबद्दल विचारा!",
  gu: "નમસ્તે! હું TenderGuard AI સહાયક છું. ટેન્ડર, બિડ, ચુકવણી, KYC, ફરિયાદ વિશે પૂછો!",
  ml: "നമസ്കാരം! ഞാൻ TenderGuard AI അസിസ്റ്റന്റ്. ടെൻഡർ, ബിഡ്, പേയ്മെന്റ്, KYC, പരാതി എന്നിവയെക്കുറിച്ച് ചോദിക്കൂ!",
  pa: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ TenderGuard AI ਸਹਾਇਕ ਹਾਂ। ਟੈਂਡਰ, ਬੋਲੀ, ਭੁਗਤਾਨ, KYC, ਸ਼ਿਕਾਇਤ ਬਾਰੇ ਪੁੱਛੋ!",
  or: "ନମସ୍କାର! ମୁଁ TenderGuard AI ସହାୟକ। ଟେଣ୍ଡର, ବିଡ୍, ଦେୟ, KYC, ଅଭିଯୋଗ ବିଷୟରେ ପଚାରନ୍ତୁ!",
  ur: "!نمستے! میں TenderGuard AI اسسٹنٹ ہوں۔ ٹینڈر، بولی، ادائیگی، KYC، شکایات کے بارے میں پوچھیں",
};

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState("en");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: GREETING.en },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottom = useRef(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function switchLang(code) {
    setLang(code);
    setShowLangPicker(false);
    setMessages([{ role: "bot", text: GREETING[code] || GREETING.en }]);
  }

  async function send(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput("");
    const newMessages = [...messages, { role: "user", text: q }];
    setMessages(newMessages);
    setLoading(true);
    try {
      // Send conversation history (last 10 messages) for context
      const history = newMessages.slice(-10).map(m => ({
        role: m.role === "user" ? "user" : "bot",
        text: m.text,
      }));
      const { data } = await api.post("/chatbot", { message: q, history });
      setMessages(p => [...p, { role: "bot", text: data.reply }]);
    } catch {
      setMessages(p => [...p, { role: "bot", text: "Sorry, I couldn't process that. Please try again." }]);
    }
    setLoading(false);
  }

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <>
      <button onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 bg-teal-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-teal-700 transition text-xl">
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[28rem] bg-white border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-teal-600 text-white px-4 py-3 text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={18} /> TenderGuard AI
            </div>
            <div className="relative">
              <button
                onClick={() => setShowLangPicker(p => !p)}
                className="flex items-center gap-1 bg-teal-700 hover:bg-teal-800 px-2 py-1 rounded text-xs transition"
              >
                <Globe size={14} /> {currentLang.label}
              </button>
              {showLangPicker && (
                <div className="absolute right-0 top-8 bg-white text-gray-800 rounded-lg shadow-xl border max-h-52 overflow-y-auto w-36 z-50">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => switchLang(l.code)}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-teal-50 transition ${lang === l.code ? "bg-teal-50 font-semibold text-teal-700" : ""}`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl whitespace-pre-wrap ${
                  m.role === "user" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-700"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-400 px-3 py-2 rounded-xl text-sm flex items-center gap-2">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>●</span>
                  <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>●</span>
                </div>
              </div>
            )}
            <div ref={bottom} />
          </div>

          {/* Input */}
          <form onSubmit={send} className="p-2 border-t flex gap-2">
            <input className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
              placeholder={currentLang.hint}
              value={input} onChange={e => setInput(e.target.value)} />
            <button type="submit" disabled={loading}
              className="bg-teal-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1">
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
