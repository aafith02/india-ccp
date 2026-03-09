const router = require("express").Router();
const { Bid, Tender, User, State } = require("../models");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");
const { writeAudit } = require("../middleware/auditLog");
const { scoreBid, detectCollusion } = require("../services/bidEvaluation");
const { scoreBidWithAI } = require("../services/aiScoring");
const { createBidRules, paginationRules, validate } = require("../middleware/validation");

/* ── Calculate proximity score ── */
function proximityScore(bidAmount, hiddenBudget) {
  const bid = parseFloat(bidAmount);
  const budget = parseFloat(hiddenBudget);
  if (budget === 0) return 0;
  const diff = Math.abs(bid - budget) / budget;
  return Math.max(0, Math.round((1 - diff * 2) * 100));
}

/* ═══════════════════════════════════════════════════════════════════
   POST / — Submit a bid (uses bidEvaluation for AI score)
   ═══════════════════════════════════════════════════════════════════ */
router.post("/", authenticate, authorize("contractor"), createBidRules, validate, async (req, res) => {
  try {
    const { tender_id, amount, proposal, timeline_days } = req.body;

    if (req.user.kyc_status !== "verified") {
      return res.status(403).json({ error: "KYC must be verified before bidding" });
    }

    const tender = await Tender.findByPk(tender_id);
    if (!tender) return res.status(404).json({ error: "Tender not found" });
    if (tender.status !== "open") return res.status(400).json({ error: "Tender is not open for bidding" });
    if (new Date() > new Date(tender.bid_deadline)) return res.status(400).json({ error: "Bid deadline passed" });

    if (req.user.state_id !== tender.state_id) {
      return res.status(403).json({ error: "Contractors can only bid on tenders in their registered state" });
    }

    const existing = await Bid.findOne({ where: { tender_id, contractor_id: req.user.id } });
    if (existing) return res.status(409).json({ error: "You have already bid on this tender" });

    // Original proximity score
    const pScore = proximityScore(amount, tender.budget_hidden);

    // Fetch state name for AI context
    const state = await State.findByPk(tender.state_id, { attributes: ["name"] });

    // AI multi-criteria score from Gemini (with land rate prediction)
    let aiScore, aiResult;
    try {
      aiResult = await scoreBidWithAI({
        amount,
        budget: tender.budget_hidden,
        reputation: req.user.reputation || 0,
        timeline_days: timeline_days || null,
        location: tender.location,
        district: tender.district,
        state: state?.name,
        category: tender.category,
        description: tender.description,
        scope: tender.scope,
      });
      aiScore = aiResult.ai_score;
    } catch (err) {
      console.error("Gemini AI scoring failed, falling back:", err.message);
      aiScore = scoreBid({
        amount,
        budget: tender.budget_hidden,
        reputation: req.user.reputation || 0,
        timeline_days: timeline_days || null,
      });
      aiResult = null;
    }

    const bid = await Bid.create({
      tender_id,
      contractor_id: req.user.id,
      amount,
      proposal: proposal || "",
      timeline_days: timeline_days || null,
      proximity_score: pScore,
      ai_score: aiScore,
    });

    await writeAudit({
      actor_id: req.user.id, actor_role: "contractor", actor_name: req.user.name,
      action: "BID_SUBMITTED", entity_type: "bid", entity_id: bid.id,
      details: {
        tender_id, amount, proximity_score: pScore, ai_score: aiScore,
        ai_prediction: aiResult?.prediction || null,
      },
    });

    res.status(201).json({
      bid: { ...bid.toJSON(), proximity_score: pScore, ai_score: aiScore },
      ai_analysis: aiResult ? {
        score_breakdown: aiResult.breakdown,
        prediction: aiResult.prediction,
      } : null,
    });
  } catch (err) {
    console.error("Bid submit error:", err);
    res.status(500).json({ error: "Failed to submit bid" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /tender/:tenderId — List bids with collusion detection
   ═══════════════════════════════════════════════════════════════════ */
router.get("/tender/:tenderId", authenticate, authorize("state_gov", "central_gov"), async (req, res) => {
  try {
    const bids = await Bid.findAll({
      where: { tender_id: req.params.tenderId },
      include: [{ model: User, as: "contractor", attributes: ["id", "name", "email", "reputation", "points", "kyc_status"] }],
      order: [["ai_score", "DESC"], ["proximity_score", "DESC"]],
    });

    // Run collusion detection
    const collusionFlags = detectCollusion(bids);

    res.json({ bids, collusionFlags });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bids" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /my — My bids (contractor) with PAGINATION
   ═══════════════════════════════════════════════════════════════════ */
router.get("/my", authenticate, authorize("contractor"), paginationRules, validate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Bid.findAndCountAll({
      where: { contractor_id: req.user.id },
      include: [{ model: Tender, attributes: ["id", "title", "status", "location", "bid_deadline"], include: [{ model: State, attributes: ["name", "code"] }] }],
      order: [["createdAt", "DESC"]],
      limit, offset,
    });
    res.json({ bids: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bids" });
  }
});

module.exports = router;
