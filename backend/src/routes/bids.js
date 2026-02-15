const router = require("express").Router();
const { Bid, Tender, User } = require("../models");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");
const { auditMiddleware } = require("../middleware/auditLog");
const { scoreBid } = require("../services/bidEvaluation");

/* ── Submit bid (contractor, same state only) ── */
router.post(
  "/",
  authenticate,
  authorize("contractor"),
  auditMiddleware("BID_SUBMIT", "bid"),
  async (req, res) => {
    try {
      const { tender_id, amount, proposal, timeline_days, doc_hashes } = req.body;
      if (!tender_id || !amount) return res.status(400).json({ error: "tender_id and amount required" });

      // Verify KYC
      if (req.user.kyc_status !== "verified")
        return res.status(403).json({ error: "KYC not verified" });

      // Verify tender is open & same state
      const tender = await Tender.findByPk(tender_id);
      if (!tender) return res.status(404).json({ error: "Tender not found" });
      if (tender.status !== "open") return res.status(400).json({ error: "Tender not accepting bids" });
      if (new Date() > new Date(tender.bid_deadline))
        return res.status(400).json({ error: "Bid deadline passed" });
      if (tender.state_id !== req.user.state_id)
        return res.status(403).json({ error: "You can only bid in your state" });

      // Check duplicate bid
      const existing = await Bid.findOne({ where: { tender_id, contractor_id: req.user.id } });
      if (existing) return res.status(409).json({ error: "Already submitted a bid" });

      // AI score
      const ai_score = scoreBid({ amount, budget: tender.budget_hidden, reputation: req.user.reputation, timeline_days });

      const bid = await Bid.create({
        tender_id, contractor_id: req.user.id,
        amount, proposal, timeline_days, doc_hashes, ai_score,
      });

      res.status(201).json(bid);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ── List bids for a tender (state gov / central) ── */
router.get("/tender/:tenderId", authenticate, authorize("state_gov", "central_gov"), async (req, res) => {
  try {
    const bids = await Bid.findAll({
      where: { tender_id: req.params.tenderId },
      include: [{ model: User, as: "contractor", attributes: ["id", "name", "reputation", "kyc_status"] }],
      order: [["ai_score", "DESC"]],
    });
    res.json(bids);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── My bids (contractor) ── */
router.get("/mine", authenticate, authorize("contractor"), async (req, res) => {
  try {
    const bids = await Bid.findAll({
      where: { contractor_id: req.user.id },
      include: [{ model: Tender, attributes: ["id", "title", "status", "bid_deadline", "location", "category"] }],
      order: [["createdAt", "DESC"]],
    });
    res.json(bids);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* Alias for /mine */
router.get("/my", authenticate, authorize("contractor"), async (req, res) => {
  try {
    const bids = await Bid.findAll({
      where: { contractor_id: req.user.id },
      include: [{ model: Tender, attributes: ["id", "title", "status", "bid_deadline", "location", "category"] }],
      order: [["createdAt", "DESC"]],
    });
    res.json(bids);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
