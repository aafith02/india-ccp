const router = require("express").Router();
const { Op } = require("sequelize");
const { Tender, Bid, State, User } = require("../models");
const { authenticate } = require("../middleware/auth");
const { authorize, sameState } = require("../middleware/roles");
const { auditMiddleware } = require("../middleware/auditLog");

/* ── Create tender (state gov) ── */
router.post(
  "/",
  authenticate,
  authorize("state_gov"),
  auditMiddleware("TENDER_CREATE", "tender"),
  async (req, res) => {
    try {
      const { title, description, scope, location, district, budget_hidden, bid_deadline, project_deadline, qualification, category } = req.body;
      if (!title || !description || !budget_hidden || !bid_deadline || !project_deadline)
        return res.status(400).json({ error: "Missing required fields" });

      const tender = await Tender.create({
        state_id: req.user.state_id,
        created_by: req.user.id,
        title, description, scope, location, district,
        budget_hidden,
        bid_deadline, project_deadline,
        qualification,
        category,
        status: "open",
      });
      res.status(201).json(tender);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ── List tenders (public — hides budget) ── */
router.get("/", async (req, res) => {
  try {
    const { state_id, status } = req.query;
    const where = {};
    if (state_id) where.state_id = state_id;
    if (status) where.status = status;

    const tenders = await Tender.findAll({
      where,
      attributes: { exclude: ["budget_hidden"] },
      include: [{ model: State, attributes: ["name", "code"] }],
      order: [["bid_deadline", "ASC"]],
    });
    res.json(tenders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Get tender detail ── */
router.get("/:id", async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.id, {
      attributes: { exclude: ["budget_hidden"] },
      include: [
        { model: State, attributes: ["name", "code", "logo_url"] },
        { model: Bid, attributes: ["id", "amount", "status", "ai_score", "createdAt"],
          include: [{ model: User, as: "contractor", attributes: ["id", "name", "reputation"] }] },
      ],
    });
    if (!tender) return res.status(404).json({ error: "Tender not found" });
    res.json(tender);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Close bidding (auto or manual) ── */
router.patch(
  "/:id/close",
  authenticate,
  authorize("state_gov"),
  auditMiddleware("TENDER_CLOSE", "tender"),
  async (req, res) => {
    const tender = await Tender.findByPk(req.params.id);
    if (!tender) return res.status(404).json({ error: "Not found" });
    if (tender.state_id !== req.user.state_id)
      return res.status(403).json({ error: "Not your state" });

    tender.status = "closed";
    await tender.save();
    res.json(tender);
  }
);

/* ── Cancel tender ── */
router.patch(
  "/:id/cancel",
  authenticate,
  authorize("state_gov", "central_gov"),
  auditMiddleware("TENDER_CANCEL", "tender"),
  async (req, res) => {
    const tender = await Tender.findByPk(req.params.id);
    if (!tender) return res.status(404).json({ error: "Not found" });
    tender.status = "cancelled";
    await tender.save();
    res.json(tender);
  }
);

module.exports = router;
