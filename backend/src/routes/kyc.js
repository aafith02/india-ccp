const router = require("express").Router();
const { User, State } = require("../models");
const { authenticate, generateSignature } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");
const { writeAudit } = require("../middleware/auditLog");
const { notifyUser } = require("../services/notificationService");

/* ═══════════════════════════════════════════════════════════════════
   GET /pending — List pending KYC applications for state_gov's state
   ═══════════════════════════════════════════════════════════════════ */
router.get("/pending", authenticate, authorize("state_gov", "central_gov"), async (req, res) => {
  try {
    const where = { role: "contractor", kyc_status: "pending" };
    // state_gov only sees their own state
    if (req.user.role === "state_gov") where.state_id = req.user.state_id;
    else if (req.query.state_id) where.state_id = req.query.state_id;

    const contractors = await User.findAll({
      where,
      attributes: { exclude: ["password_hash"] },
      include: [{ model: State, attributes: ["id", "name", "code"] }],
      order: [["createdAt", "ASC"]],
    });
    res.json({ contractors });
  } catch (err) {
    console.error("KYC pending error:", err);
    res.status(500).json({ error: "Failed to fetch pending KYC" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   PATCH /:userId/verify — State member verifies contractor KYC
   ═══════════════════════════════════════════════════════════════════ */
router.patch("/:userId/verify", authenticate, authorize("state_gov"), async (req, res) => {
  try {
    const contractor = await User.findByPk(req.params.userId);
    if (!contractor) return res.status(404).json({ error: "User not found" });
    if (contractor.role !== "contractor") return res.status(400).json({ error: "User is not a contractor" });
    if (contractor.kyc_status !== "pending") return res.status(400).json({ error: "KYC is not pending" });

    // Same-state check
    if (contractor.state_id !== req.user.state_id) {
      return res.status(403).json({ error: "You can only verify contractors in your state" });
    }

    const sig = generateSignature(req.user.id, "KYC_VERIFY", contractor.id);

    await contractor.update({
      kyc_status: "verified",
      kyc_verified_by: req.user.id,
      kyc_verified_at: new Date(),
    });

    await writeAudit({
      actor_id: req.user.id, actor_role: "state_gov", actor_name: req.user.name,
      action: "KYC_VERIFIED", entity_type: "user", entity_id: contractor.id,
      details: { contractor_name: contractor.name, state_id: contractor.state_id },
      signature_hash: sig,
    });

    await notifyUser({
      user_id: contractor.id, type: "kyc_verified",
      title: "KYC Verified", message: "Your KYC has been verified. You can now bid on tenders.",
      entity_type: "user", entity_id: contractor.id,
    });

    res.json({ message: "KYC verified", contractor: { id: contractor.id, name: contractor.name, kyc_status: "verified" } });
  } catch (err) {
    console.error("KYC verify error:", err);
    res.status(500).json({ error: "Failed to verify KYC" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   PATCH /:userId/reject — State member rejects contractor KYC
   ═══════════════════════════════════════════════════════════════════ */
router.patch("/:userId/reject", authenticate, authorize("state_gov"), async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: "Rejection reason is required" });

    const contractor = await User.findByPk(req.params.userId);
    if (!contractor) return res.status(404).json({ error: "User not found" });
    if (contractor.role !== "contractor") return res.status(400).json({ error: "User is not a contractor" });
    if (contractor.kyc_status !== "pending") return res.status(400).json({ error: "KYC is not pending" });

    if (contractor.state_id !== req.user.state_id) {
      return res.status(403).json({ error: "You can only reject contractors in your state" });
    }

    const sig = generateSignature(req.user.id, "KYC_REJECT", contractor.id);

    await contractor.update({
      kyc_status: "rejected",
      kyc_verified_by: req.user.id,
      kyc_verified_at: new Date(),
      kyc_rejection_reason: reason,
    });

    await writeAudit({
      actor_id: req.user.id, actor_role: "state_gov", actor_name: req.user.name,
      action: "KYC_REJECTED", entity_type: "user", entity_id: contractor.id,
      details: { contractor_name: contractor.name, reason }, signature_hash: sig,
    });

    await notifyUser({
      user_id: contractor.id, type: "kyc_rejected",
      title: "KYC Rejected", message: `Your KYC was rejected: ${reason}`,
      entity_type: "user", entity_id: contractor.id,
    });

    res.json({ message: "KYC rejected", contractor: { id: contractor.id, name: contractor.name, kyc_status: "rejected" } });
  } catch (err) {
    console.error("KYC reject error:", err);
    res.status(500).json({ error: "Failed to reject KYC" });
  }
});

module.exports = router;
