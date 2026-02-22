const router = require("express").Router();
const { sequelize, Case, Complaint, User, Tender } = require("../models");
const { authenticate, generateSignature } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");
const { writeAudit } = require("../middleware/auditLog");
const { notifyUser } = require("../services/notificationService");
const { paginationRules, validate } = require("../middleware/validation");
const { body } = require("express-validator");
const crypto = require("crypto");

/* ── Helper: generate a case number ── */
function generateCaseNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `CASE-${y}${m}-${rand}`;
}

/* ═══════════════════════════════════════════════════════════════════
   POST / — Create a case from a complaint (central_gov only)
   ═══════════════════════════════════════════════════════════════════ */
router.post(
  "/",
  authenticate,
  authorize("central_gov"),
  [
    body("complaint_id").isUUID().withMessage("Valid complaint_id required"),
    body("assigned_to").optional().isUUID(),
    body("priority").optional().isIn(["low", "medium", "high", "critical"]),
  ],
  validate,
  async (req, res) => {
    try {
      const { complaint_id, assigned_to, priority } = req.body;

      const complaint = await Complaint.findByPk(complaint_id);
      if (!complaint) return res.status(404).json({ error: "Complaint not found" });

      // Check no case already exists for this complaint
      const existing = await Case.findOne({ where: { complaint_id } });
      if (existing) return res.status(409).json({ error: "Case already exists for this complaint", case: existing });

      // Validate assignee if provided
      if (assigned_to) {
        const assignee = await User.findByPk(assigned_to);
        if (!assignee) return res.status(400).json({ error: "Assigned user not found" });
      }

      const caseRecord = await Case.create({
        case_number: generateCaseNumber(),
        complaint_id,
        assigned_to: assigned_to || null,
        created_by: req.user.id,
        priority: priority || complaint.severity || "medium",
        status: "open",
      });

      await writeAudit({
        actor_id: req.user.id, actor_role: "central_gov", actor_name: req.user.name,
        action: "CASE_CREATED", entity_type: "case", entity_id: caseRecord.id,
        details: { complaint_id, case_number: caseRecord.case_number },
      });

      if (assigned_to) {
        await notifyUser({
          user_id: assigned_to, type: "case_assigned",
          title: "Case Assigned", message: `You have been assigned case ${caseRecord.case_number}.`,
          entity_type: "case", entity_id: caseRecord.id,
        });
      }

      res.status(201).json({ case: caseRecord });
    } catch (err) {
      console.error("Create case error:", err);
      res.status(500).json({ error: "Failed to create case" });
    }
  }
);

/* ═══════════════════════════════════════════════════════════════════
   PATCH /:id — Update case status/notes (central_gov, auditor_ngo)
   ═══════════════════════════════════════════════════════════════════ */
router.patch(
  "/:id",
  authenticate,
  authorize("central_gov", "auditor_ngo"),
  [
    body("status").optional().isIn(["open", "investigating", "resolved", "closed", "appealed"]),
    body("resolution_notes").optional().trim().isLength({ max: 5000 }),
    body("penalty_details").optional().isObject(),
    body("assigned_to").optional().isUUID(),
  ],
  validate,
  async (req, res) => {
    try {
      const caseRecord = await Case.findByPk(req.params.id, {
        include: [{ model: Complaint }],
      });
      if (!caseRecord) return res.status(404).json({ error: "Case not found" });

      // NGOs can only update cases assigned to them
      if (req.user.role === "auditor_ngo" && caseRecord.assigned_to !== req.user.id) {
        return res.status(403).json({ error: "This case is not assigned to you" });
      }

      const updates = {};
      if (req.body.status) updates.status = req.body.status;
      if (req.body.resolution_notes) updates.resolution_notes = req.body.resolution_notes;
      if (req.body.penalty_details) updates.penalty_details = req.body.penalty_details;
      if (req.body.assigned_to) updates.assigned_to = req.body.assigned_to;
      if (req.body.status === "resolved" || req.body.status === "closed") updates.resolved_at = new Date();

      await caseRecord.update(updates);

      await writeAudit({
        actor_id: req.user.id, actor_role: req.user.role, actor_name: req.user.name,
        action: "CASE_UPDATED", entity_type: "case", entity_id: caseRecord.id,
        details: updates,
      });

      res.json({ message: "Case updated", case: caseRecord });
    } catch (err) {
      console.error("Update case error:", err);
      res.status(500).json({ error: "Failed to update case" });
    }
  }
);

/* ═══════════════════════════════════════════════════════════════════
   GET / — List cases WITH PAGINATION
   ═══════════════════════════════════════════════════════════════════ */
router.get("/", authenticate, authorize("central_gov", "auditor_ngo"), paginationRules, validate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let where = {};
    if (req.user.role === "auditor_ngo") where.assigned_to = req.user.id;
    if (req.query.status) where.status = req.query.status;

    const { count, rows } = await Case.findAndCountAll({
      where,
      include: [
        {
          model: Complaint,
          attributes: ["id", "subject", "severity", "status", "investigation_result"],
          include: [
            { model: Tender, attributes: ["id", "title"] },
            { model: User, as: "reporter", attributes: ["id", "name"] },
          ],
        },
        { model: User, as: "assignedTo", attributes: ["id", "name", "role"] },
        { model: User, as: "createdBy", attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
      limit, offset,
    });

    res.json({
      cases: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    console.error("List cases error:", err);
    res.status(500).json({ error: "Failed to fetch cases" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /:id — Single case detail
   ═══════════════════════════════════════════════════════════════════ */
router.get("/:id", authenticate, authorize("central_gov", "auditor_ngo"), async (req, res) => {
  try {
    const caseRecord = await Case.findByPk(req.params.id, {
      include: [
        {
          model: Complaint,
          include: [
            { model: Tender },
            { model: User, as: "reporter", attributes: ["id", "name", "role"] },
            { model: User, as: "assignedNgo", attributes: ["id", "name"] },
          ],
        },
        { model: User, as: "assignedTo", attributes: ["id", "name", "role"] },
        { model: User, as: "createdBy", attributes: ["id", "name"] },
      ],
    });
    if (!caseRecord) return res.status(404).json({ error: "Case not found" });
    res.json({ case: caseRecord });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch case" });
  }
});

module.exports = router;
