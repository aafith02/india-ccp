const router = require("express").Router();
const { sequelize, FundRequest, State, User } = require("../models");
const { authenticate, generateSignature } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");
const { writeAudit } = require("../middleware/auditLog");
const { notifyByRole } = require("../services/notificationService");
const { createFundRules, fundActionRules, paginationRules, validate } = require("../middleware/validation");

/* POST / — State gov requests funding */
router.post("/", authenticate, authorize("state_gov"), createFundRules, validate, async (req, res) => {
  try {
    const { amount, purpose } = req.body;

    const fund = await FundRequest.create({
      state_id: req.user.state_id,
      requested_by: req.user.id,
      amount, purpose,
    });

    await writeAudit({
      actor_id: req.user.id, actor_role: "state_gov", actor_name: req.user.name,
      action: "FUND_REQUESTED", entity_type: "fund_request", entity_id: fund.id,
      details: { amount, purpose, state_id: req.user.state_id },
    });

    await notifyByRole({
      roles: ["central_gov"], type: "fund_requested",
      title: "New Fund Request", message: `Fund request of Rs ${amount} from state.`,
      entity_type: "fund_request", entity_id: fund.id,
    });

    res.status(201).json({ fund });
  } catch (err) {
    res.status(500).json({ error: "Failed to create fund request" });
  }
});

/* GET / — List fund requests WITH PAGINATION */
router.get("/", authenticate, authorize("state_gov", "central_gov"), paginationRules, validate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.user.role === "state_gov") where.state_id = req.user.state_id;
    if (req.query.status) where.status = req.query.status;

    const { count, rows } = await FundRequest.findAndCountAll({
      where,
      include: [
        { model: State, attributes: ["id", "name", "code"] },
        { model: User, as: "requestedBy", attributes: ["id", "name"] },
        { model: User, as: "approvedBy", attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
      limit, offset,
    });

    res.json({
      funds: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch fund requests" });
  }
});

/* PATCH /:id — Central gov approves/rejects */
router.patch("/:id", authenticate, authorize("central_gov"), fundActionRules, validate, async (req, res) => {
  try {
    const { status, approved_amount, remarks } = req.body;

    const fund = await FundRequest.findByPk(req.params.id);
    if (!fund) return res.status(404).json({ error: "Fund request not found" });
    if (fund.status !== "pending") return res.status(400).json({ error: "Already processed" });

    const sig = generateSignature(req.user.id, `FUND_${status.toUpperCase()}`, fund.id);

    const finalAmount = status === "approved" ? parseFloat(approved_amount || fund.amount) : null;

    await fund.update({
      status,
      approved_amount: finalAmount,
      approved_by: req.user.id,
      remarks: remarks || null,
      acted_by: req.user.id,
      acted_at: new Date(),
      signature_hash: sig,
    });

    // If approved, add to state balance
    if (status === "approved" && finalAmount) {
      const state = await State.findByPk(fund.state_id);
      if (state) {
        await state.update({
          balance: parseFloat(state.balance || 0) + finalAmount,
          total_received: parseFloat(state.total_received || 0) + finalAmount,
        });
      }
    }

    await writeAudit({
      actor_id: req.user.id, actor_role: "central_gov", actor_name: req.user.name,
      action: `FUND_${status.toUpperCase()}`, entity_type: "fund_request", entity_id: fund.id,
      details: { status, approved_amount: fund.approved_amount, remarks },
      signature_hash: sig,
    });

    await notifyByRole({
      roles: ["state_gov"], state_id: fund.state_id,
      type: `fund_${status}`, title: `Funding ${status}`,
      message: `Your fund request has been ${status}${status === "approved" ? ` for Rs ${fund.approved_amount}` : ""}.`,
      entity_type: "fund_request", entity_id: fund.id,
    });

    res.json({ message: `Fund request ${status}`, fund });
  } catch (err) {
    res.status(500).json({ error: "Failed to process fund request" });
  }
});

module.exports = router;
