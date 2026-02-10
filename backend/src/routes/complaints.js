const router = require("express").Router();
const { Complaint, User, Tender } = require("../models");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");
const { auditMiddleware } = require("../middleware/auditLog");

/* ── Submit complaint (any authenticated user) ── */
router.post(
  "/",
  authenticate,
  auditMiddleware("COMPLAINT_SUBMIT", "complaint"),
  async (req, res) => {
    try {
      const { tender_id, subject, description, evidence, geo_location } = req.body;
      if (!subject || !description)
        return res.status(400).json({ error: "subject and description required" });

      const complaint = await Complaint.create({
        tender_id,
        reporter_id: req.user.id,
        subject, description, evidence, geo_location,
      });
      res.status(201).json(complaint);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ── List complaints ── */
router.get("/", authenticate, authorize("central_gov", "state_gov", "auditor_ngo"), async (req, res) => {
  const { status, severity } = req.query;
  const where = {};
  if (status) where.status = status;
  if (severity) where.severity = severity;

  const complaints = await Complaint.findAll({
    where,
    include: [
      { model: User, as: "reporter", attributes: ["id", "name", "role"] },
      { model: Tender, attributes: ["id", "title", "state_id"] },
    ],
    order: [["createdAt", "DESC"]],
  });
  res.json(complaints);
});

/* ── Update complaint status (auditor/ngo or central_gov) ── */
router.patch(
  "/:id",
  authenticate,
  authorize("central_gov", "auditor_ngo"),
  auditMiddleware("COMPLAINT_UPDATE", "complaint"),
  async (req, res) => {
    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ error: "Not found" });

    const { status, severity, assigned_to } = req.body;
    if (status) complaint.status = status;
    if (severity) complaint.severity = severity;
    if (assigned_to) complaint.assigned_to = assigned_to;

    // Strike system: increment on verified complaints
    if (status === "verified") {
      complaint.strike_count += 1;
    }

    await complaint.save();
    res.json(complaint);
  }
);

module.exports = router;
