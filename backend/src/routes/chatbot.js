const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const { chat } = require("../services/chatbotService");
const { predictLandRate } = require("../services/aiScoring");

/* ═══════════════════════════════════════════════════════════════════
   POST / — Gemini-powered multilingual chatbot
   Detects user's language and responds in the same language.
   Grounded with system instructions to TenderGuard domain only.
   ═══════════════════════════════════════════════════════════════════ */
router.post("/", authenticate, async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });

  try {
    const result = await chat(message, {
      role: req.user.role,
      state: req.user.state_id ? req.user.State?.name : undefined,
      history: history || [],
    });
    res.json({ reply: result.reply });
  } catch (err) {
    console.error("Chatbot error:", err.message);
    res.json({
      reply: "I'm experiencing a temporary issue. Please try again in a moment. Meanwhile, you can check the public ledger or contact support.",
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /predict-rate — AI land/construction rate prediction
   Used by state_gov when creating tenders to get fair rate estimate.
   ═══════════════════════════════════════════════════════════════════ */
router.post("/predict-rate", authenticate, async (req, res) => {
  const { location, district, state, category, description, scope } = req.body;
  if (!location && !district) {
    return res.status(400).json({ error: "Location or district required" });
  }
  try {
    const prediction = await predictLandRate({ location, district, state, category, description, scope });
    if (!prediction.success) {
      return res.status(502).json({ error: "AI prediction unavailable", details: prediction.error });
    }
    res.json({ prediction });
  } catch (err) {
    console.error("Predict rate error:", err.message);
    res.status(500).json({ error: "Failed to predict rate" });
  }
});

module.exports = router;
