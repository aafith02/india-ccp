const router = require("express").Router();
const { User, BlacklistRequest, State } = require("../models");
const { authenticate, generateSignature } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");
const { writeAudit } = require("../middleware/auditLog");
const { notifyUser, notifyByRole } = require("../services/notificationService");
const { paginationRules, validate } = require("../middleware/validation");
const { body } = require("express-validator");

/* ═══════════════════════════════════════════════════════════════════
   POST /request — State gov requests blacklisting of a contractor
   (triggered automatically when reputation drops below threshold,
    or manually by state_gov)
   ═══════════════════════════════════════════════════════════════════ */
router.post(
  "/request",
  authenticate,
  authorize("state_gov"),
  [
    body("user_id").isUUID().withMessage("Valid user_id required"),
    body("reason").trim().notEmpty().withMessage("Reason is required"),
  ],
  validate,
  async (req, res) => {
    try {
      const { user_id, reason } = req.body;

      const target = await User.findByPk(user_id);
      if (!target) return res.status(404).json({ error: "User not found" });
      if (target.is_blacklisted) return res.status(400).json({ error: "User is already blacklisted" });
      if (target.role !== "contractor") return res.status(400).json({ error: "Only contractors can be blacklisted" });

      // Check for existing pending request
      const existing = await BlacklistRequest.findOne({ where: { user_id, status: "pending" } });
      if (existing) return res.status(409).json({ error: "A pending blacklist request already exists", request: existing });

      const request = await BlacklistRequest.create({
        user_id,
        requested_by: req.user.id,
        reason,
        status: "pending",
      });

      await writeAudit({
        actor_id: req.user.id, actor_role: "state_gov", actor_name: req.user.name,
        action: "BLACKLIST_REQUESTED", entity_type: "user", entity_id: user_id,
        details: { reason, target_name: target.name, reputation: target.reputation },
      });

      await notifyByRole({
        roles: ["central_gov"],
        type: "blacklist_request", title: "Blacklist Request",
        message: `State official requested blacklisting of contractor "${target.name}" (reputation: ${target.reputation}). Reason: ${reason}`,
        entity_type: "blacklist_request", entity_id: request.id,
      });

      res.status(201).json({ request });
    } catch (err) {
      console.error("Blacklist request error:", err);
      res.status(500).json({ error: "Failed to create blacklist request" });
    }
  }
);

/* ═══════════════════════════════════════════════════════════════════
   PATCH /request/:id — Central gov approves/rejects blacklist request
   ═══════════════════════════════════════════════════════════════════ */
router.patch(
  "/request/:id",
  authenticate,
  authorize("central_gov"),
  [
    body("status").isIn(["approved", "rejected"]).withMessage("Status must be approved or rejected"),
    body("remarks").optional().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const request = await BlacklistRequest.findByPk(req.params.id, {
        include: [{ model: User, as: "targetUser", attributes: ["id", "name", "reputation"] }],
      });
      if (!request) return res.status(404).json({ error: "Request not found" });
      if (request.status !== "pending") return res.status(400).json({ error: "Request already processed" });

      const sig = generateSignature(req.user.id, `BLACKLIST_${req.body.status.toUpperCase()}`, request.user_id);

      await request.update({
        status: req.body.status,
        acted_by: req.user.id,
        acted_at: new Date(),
        remarks: req.body.remarks || null,
      });

      if (req.body.status === "approved") {
        await User.update({ is_blacklisted: true }, { where: { id: request.user_id } });

        await notifyUser({
          user_id: request.user_id, type: "blacklisted",
          title: "Account Blacklisted",
          message: "Your account has been blacklisted due to poor performance and verified complaints. Contact administration to appeal.",
          entity_type: "blacklist_request", entity_id: request.id,
        });
      }

      await writeAudit({
        actor_id: req.user.id, actor_role: "central_gov", actor_name: req.user.name,
        action: `BLACKLIST_REQUEST_${req.body.status.toUpperCase()}`, entity_type: "user", entity_id: request.user_id,
        details: { status: req.body.status, remarks: req.body.remarks }, signature_hash: sig,
      });

      // Notify the requesting state_gov of the decision
      await notifyUser({
        user_id: request.requested_by, type: "blacklist_decision",
        title: `Blacklist Request ${req.body.status}`,
        message: `Your blacklist request for "${request.targetUser?.name}" has been ${req.body.status}.`,
        entity_type: "blacklist_request", entity_id: request.id,
      });

      res.json({ message: `Request ${req.body.status}`, request });
    } catch (err) {
      console.error("Blacklist decision error:", err);
      res.status(500).json({ error: "Failed to process blacklist request" });
    }
  }
);

/* ═══════════════════════════════════════════════════════════════════
   GET /requests — List blacklist requests WITH PAGINATION
   ═══════════════════════════════════════════════════════════════════ */
router.get("/requests", authenticate, authorize("central_gov", "state_gov"), paginationRules, validate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.status) where.status = req.query.status;

    const { count, rows } = await BlacklistRequest.findAndCountAll({
      where,
      include: [
        { model: User, as: "targetUser", attributes: ["id", "name", "email", "reputation", "points", "is_blacklisted"] },
        { model: User, as: "requestedBy", attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
      limit, offset,
    });

    res.json({
      requests: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blacklist requests" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   PATCH /:userId/blacklist — Direct blacklist (central_gov only)
   ═══════════════════════════════════════════════════════════════════ */
router.patch("/:userId/blacklist", authenticate, authorize("central_gov"), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.is_blacklisted) return res.status(400).json({ error: "Already blacklisted" });

    const sig = generateSignature(req.user.id, "BLACKLIST", user.id);
    await user.update({ is_blacklisted: true });

    await writeAudit({
      actor_id: req.user.id, actor_role: "central_gov", actor_name: req.user.name,
      action: "USER_BLACKLISTED", entity_type: "user", entity_id: user.id,
      details: { name: user.name, role: user.role, reputation: user.reputation }, signature_hash: sig,
    });

    await notifyUser({
      user_id: user.id, type: "blacklisted",
      title: "Account Blacklisted",
      message: "Your account has been blacklisted. Contact administration to appeal.",
      entity_type: "user", entity_id: user.id,
    });

    res.json({ message: "User blacklisted", user: { id: user.id, name: user.name, is_blacklisted: true } });
  } catch (err) {
    res.status(500).json({ error: "Failed to blacklist user" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   PATCH /:userId/unblacklist — Remove blacklist (central_gov only)
   ═══════════════════════════════════════════════════════════════════ */
router.patch("/:userId/unblacklist", authenticate, authorize("central_gov"), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.is_blacklisted) return res.status(400).json({ error: "User is not blacklisted" });

    const sig = generateSignature(req.user.id, "UNBLACKLIST", user.id);
    await user.update({ is_blacklisted: false });

    await writeAudit({
      actor_id: req.user.id, actor_role: "central_gov", actor_name: req.user.name,
      action: "USER_UNBLACKLISTED", entity_type: "user", entity_id: user.id,
      details: { name: user.name, role: user.role }, signature_hash: sig,
    });

    await notifyUser({
      user_id: user.id, type: "unblacklisted",
      title: "Blacklist Removed",
      message: "Your blacklist status has been removed. You may resume activities.",
      entity_type: "user", entity_id: user.id,
    });

    res.json({ message: "User unblacklisted", user: { id: user.id, name: user.name, is_blacklisted: false } });
  } catch (err) {
    res.status(500).json({ error: "Failed to unblacklist user" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /contractors — List contractors (for blacklist dropdown)
   State gov sees only their state's contractors
   ═══════════════════════════════════════════════════════════════════ */
router.get("/contractors", authenticate, authorize("state_gov", "central_gov"), async (req, res) => {
  try {
    const where = { role: "contractor", is_blacklisted: false };
    if (req.user.role === "state_gov" && req.user.state_id) {
      where.state_id = req.user.state_id;
    }
    const contractors = await User.findAll({
      where,
      attributes: ["id", "name", "email", "reputation", "points"],
      include: [{ model: State, attributes: ["name", "code"], required: false }],
      order: [["name", "ASC"]],
    });
    res.json({ contractors });
  } catch (err) {
    console.error("Fetch contractors error:", err);
    res.status(500).json({ error: "Failed to fetch contractors" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /blacklisted — List all blacklisted users
   ═══════════════════════════════════════════════════════════════════ */
router.get("/blacklisted", authenticate, authorize("central_gov", "state_gov"), async (req, res) => {
  try {
    const users = await User.findAll({
      where: { is_blacklisted: true },
      attributes: ["id", "name", "email", "role", "reputation", "points", "is_blacklisted", "createdAt"],
      include: [{ model: State, attributes: ["name", "code"], required: false }],
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blacklisted users" });
  }
});

module.exports = router;
