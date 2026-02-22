const router = require("express").Router();
const { Tender, State, Bid, User } = require("../models");
const { authenticate, generateSignature } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");
const { writeAudit } = require("../middleware/auditLog");
const { isValidTransition, getValidTransitions } = require("../middleware/tenderStateMachine");
const { createTenderRules, paginationRules, validate } = require("../middleware/validation");

/* ═══════════════════════════════════════════════════════════════════
   POST / — State gov creates a tender
   ═══════════════════════════════════════════════════════════════════ */
router.post("/", authenticate, authorize("state_gov"), createTenderRules, validate, async (req, res) => {
  try {
    const { title, description, scope, location, district, budget_hidden, bid_deadline, project_deadline, category, tranche_count } = req.body;

    const tender = await Tender.create({
      title, description, scope, location, district,
      budget_hidden,
      bid_deadline, project_deadline,
      status: "open",
      category: category || null,
      tranche_count: tranche_count || 5,
      state_id: req.user.state_id,
      created_by: req.user.id,
    });

    const sig = generateSignature(req.user.id, "CREATE_TENDER", tender.id);
    await writeAudit({
      actor_id: req.user.id, actor_role: "state_gov", actor_name: req.user.name,
      action: "TENDER_CREATED", entity_type: "tender", entity_id: tender.id,
      details: { title, location, district, category },
      signature_hash: sig,
    });

    res.status(201).json({ tender });
  } catch (err) {
    console.error("Create tender error:", err);
    res.status(500).json({ error: "Failed to create tender" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET / — List tenders (public, budget hidden) with PAGINATION
   ═══════════════════════════════════════════════════════════════════ */
router.get("/", paginationRules, validate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const where = {};
    if (req.query.state_id) where.state_id = req.query.state_id;
    if (req.query.status) where.status = req.query.status;
    if (req.query.category) where.category = req.query.category;

    // If authenticated contractor, only show tenders in their state
    let authedUser = null;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const jwt = require("jsonwebtoken");
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
        authedUser = await User.findByPk(decoded.id);
      }
    } catch { /* not authenticated */ }

    if ((authedUser?.role === "contractor" || authedUser?.role === "state_gov") && authedUser.state_id) {
      where.state_id = authedUser.state_id;
    }

    const { count, rows } = await Tender.findAndCountAll({
      where,
      attributes: { exclude: ["budget_hidden"] },
      include: [{ model: State, attributes: ["id", "name", "code"] }],
      order: [["createdAt", "DESC"]],
      limit, offset,
    });
    res.json({ tenders: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tenders" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /:id — Tender detail
   ═══════════════════════════════════════════════════════════════════ */
router.get("/:id", async (req, res) => {
  try {
    let authedUser = null;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const jwt = require("jsonwebtoken");
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
        authedUser = await User.findByPk(decoded.id);
      }
    } catch { /* not authenticated */ }

    const isGov = authedUser && ["state_gov", "central_gov"].includes(authedUser.role);

    const tender = await Tender.findByPk(req.params.id, {
      attributes: isGov ? undefined : { exclude: ["budget_hidden"] },
      include: [
        { model: State },
        { model: Bid, include: [{ model: User, as: "contractor", attributes: ["id", "name", "reputation", "points", "kyc_status"] }], order: [["proximity_score", "DESC"]] },
      ],
    });
    if (!tender) return res.status(404).json({ error: "Tender not found" });

    // Include valid transitions for gov users
    const validTransitions = isGov ? getValidTransitions(tender.status) : undefined;
    res.json({ tender, validTransitions });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tender" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   PATCH /:id/status — Change tender status (state machine enforced)
   ═══════════════════════════════════════════════════════════════════ */
router.patch("/:id/status", authenticate, authorize("state_gov", "central_gov"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status required" });

    const tender = await Tender.findByPk(req.params.id);
    if (!tender) return res.status(404).json({ error: "Tender not found" });

    // State gov can only manage own state
    if (req.user.role === "state_gov" && req.user.state_id !== tender.state_id) {
      return res.status(403).json({ error: "Not your state" });
    }

    // State machine enforcement
    if (!isValidTransition(tender.status, status)) {
      return res.status(400).json({
        error: `Cannot transition from '${tender.status}' to '${status}'`,
        allowed: getValidTransitions(tender.status),
      });
    }

    const sig = generateSignature(req.user.id, `TENDER_${status.toUpperCase()}`, tender.id);
    await tender.update({ status });

    await writeAudit({
      actor_id: req.user.id, actor_role: req.user.role, actor_name: req.user.name,
      action: `TENDER_${status.toUpperCase()}`, entity_type: "tender", entity_id: tender.id,
      details: { title: tender.title, from: tender.previous("status"), to: status },
      signature_hash: sig,
    });

    res.json({ message: `Tender status changed to ${status}`, tender });
  } catch (err) {
    res.status(500).json({ error: "Failed to update tender status" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   PATCH /:id/close — Close bidding (kept for backward compat)
   ═══════════════════════════════════════════════════════════════════ */
router.patch("/:id/close", authenticate, authorize("state_gov"), async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.id);
    if (!tender) return res.status(404).json({ error: "Tender not found" });
    if (tender.state_id !== req.user.state_id) return res.status(403).json({ error: "Not your state" });

    if (!isValidTransition(tender.status, "closed")) {
      return res.status(400).json({ error: `Cannot close tender in '${tender.status}' status`, allowed: getValidTransitions(tender.status) });
    }

    const sig = generateSignature(req.user.id, "CLOSE_TENDER", tender.id);
    await tender.update({ status: "closed" });

    await writeAudit({
      actor_id: req.user.id, actor_role: "state_gov", actor_name: req.user.name,
      action: "TENDER_CLOSED", entity_type: "tender", entity_id: tender.id,
      details: { title: tender.title }, signature_hash: sig,
    });

    res.json({ message: "Tender closed", tender });
  } catch (err) {
    res.status(500).json({ error: "Failed to close tender" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   PATCH /:id/cancel — Cancel tender (state machine enforced)
   ═══════════════════════════════════════════════════════════════════ */
router.patch("/:id/cancel", authenticate, authorize("state_gov", "central_gov"), async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.id);
    if (!tender) return res.status(404).json({ error: "Tender not found" });

    if (!isValidTransition(tender.status, "cancelled")) {
      return res.status(400).json({ error: `Cannot cancel tender in '${tender.status}' status` });
    }

    const sig = generateSignature(req.user.id, "CANCEL_TENDER", tender.id);
    await tender.update({ status: "cancelled" });

    await writeAudit({
      actor_id: req.user.id, actor_role: req.user.role, actor_name: req.user.name,
      action: "TENDER_CANCELLED", entity_type: "tender", entity_id: tender.id,
      details: { title: tender.title }, signature_hash: sig,
    });

    res.json({ message: "Tender cancelled", tender });
  } catch (err) {
    res.status(500).json({ error: "Failed to cancel tender" });
  }
});

module.exports = router;
