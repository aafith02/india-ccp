const router = require("express").Router();
const { Op } = require("sequelize");
const { WorkProof, Milestone, Contract, Tender, Payment, User, State } = require("../models");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");
const { auditMiddleware, writeAudit } = require("../middleware/auditLog");
const { notifyUser, notifyByRole } = require("../services/notificationService");

/* ── Contractor submits work proof ── */
router.post(
  "/",
  authenticate,
  authorize("contractor"),
  auditMiddleware("WORK_PROOF_SUBMIT", "work_proof"),
  async (req, res) => {
    try {
      const { contract_id, milestone_id, description, photo_urls, work_percentage, amount_requested } = req.body;

      if (!contract_id || !description || !amount_requested)
        return res.status(400).json({ error: "contract_id, description, and amount_requested required" });

      // Verify contract belongs to this contractor
      const contract = await Contract.findByPk(contract_id, {
        include: [{ model: Tender, include: [{ model: State }] }],
      });
      if (!contract) return res.status(404).json({ error: "Contract not found" });
      if (contract.contractor_id !== req.user.id)
        return res.status(403).json({ error: "Not your contract" });
      if (contract.status !== "active")
        return res.status(400).json({ error: "Contract is not active" });

      // Verify amount doesn't exceed escrow balance
      if (parseFloat(amount_requested) > parseFloat(contract.escrow_balance))
        return res.status(400).json({ error: "Amount exceeds remaining escrow balance" });

      // Create work proof
      const proof = await WorkProof.create({
        contract_id,
        milestone_id: milestone_id || null,
        submitted_by: req.user.id,
        description,
        photo_urls: photo_urls || [],
        work_percentage: work_percentage || 0,
        amount_requested,
      });

      // If milestone is linked, update its status
      if (milestone_id) {
        const ms = await Milestone.findByPk(milestone_id);
        if (ms) {
          ms.status = "proof_uploaded";
          ms.proof_files = photo_urls || [];
          await ms.save();
        }
      }

      // Send notifications to NGOs and community members in the same state
      const stateId = contract.Tender?.state_id;
      const tenderTitle = contract.Tender?.title || "Project";

      await notifyByRole({
        roles: ["auditor_ngo", "community"],
        state_id: stateId,
        type: "verification_needed",
        title: "Work Proof Needs Verification",
        message: `Contractor has submitted work proof for "${tenderTitle}". ${description}. Amount requested: ₹${Number(amount_requested).toLocaleString("en-IN")} (${work_percentage}% work completed).`,
        entity_type: "work_proof",
        entity_id: proof.id,
        metadata: {
          contract_id,
          tender_title: tenderTitle,
          photo_urls: photo_urls || [],
          amount_requested,
          work_percentage,
          contractor_name: req.user.name,
        },
      });

      // Also notify state gov
      await notifyByRole({
        roles: ["state_gov"],
        state_id: stateId,
        type: "proof_submitted",
        title: "New Work Proof Submitted",
        message: `Contractor "${req.user.name}" submitted proof for "${tenderTitle}". Requesting ₹${Number(amount_requested).toLocaleString("en-IN")}.`,
        entity_type: "work_proof",
        entity_id: proof.id,
        metadata: { contract_id, photo_urls, amount_requested, work_percentage },
      });

      res.status(201).json(proof);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ── List work proofs for a contract ── */
router.get("/contract/:contractId", authenticate, async (req, res) => {
  try {
    const proofs = await WorkProof.findAll({
      where: { contract_id: req.params.contractId },
      include: [
        { model: User, as: "submittedBy", attributes: ["id", "name", "reputation"] },
        { model: Milestone, attributes: ["id", "title", "sequence"] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(proofs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── List all pending verifications (for NGO/community in their state) ── */
router.get("/pending", authenticate, authorize("auditor_ngo", "community", "state_gov"), async (req, res) => {
  try {
    const include = [
      { model: User, as: "submittedBy", attributes: ["id", "name", "reputation"] },
      { model: Milestone, attributes: ["id", "title", "sequence"] },
      {
        model: Contract,
        include: [{
          model: Tender,
          attributes: ["id", "title", "state_id", "location", "district"],
          include: [{ model: State, attributes: ["id", "name", "code"] }],
        }],
      },
    ];

    let proofs;
    if (req.user.role === "state_gov") {
      // State gov sees only their state
      proofs = await WorkProof.findAll({
        where: { status: "pending_review" },
        include,
        order: [["createdAt", "DESC"]],
      });
      proofs = proofs.filter(p => p.Contract?.Tender?.state_id === req.user.state_id);
    } else {
      // NGO/Community can see all or filter by state
      const { state_id } = req.query;
      proofs = await WorkProof.findAll({
        where: { status: "pending_review" },
        include,
        order: [["createdAt", "DESC"]],
      });
      if (state_id) {
        proofs = proofs.filter(p => p.Contract?.Tender?.state_id === state_id);
      }
    }

    res.json(proofs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Approve work proof → release payment ── */
router.patch(
  "/:id/approve",
  authenticate,
  authorize("auditor_ngo", "community", "state_gov"),
  auditMiddleware("WORK_PROOF_APPROVE", "work_proof"),
  async (req, res) => {
    try {
      const proof = await WorkProof.findByPk(req.params.id, {
        include: [
          { model: Contract, include: [{ model: Tender }] },
          { model: Milestone },
        ],
      });
      if (!proof) return res.status(404).json({ error: "Work proof not found" });
      if (proof.status !== "pending_review")
        return res.status(400).json({ error: "Proof already reviewed" });

      proof.status = "approved";
      proof.review_notes = req.body.review_notes || "Verified and approved";
      proof.reviewed_by = req.user.id;
      proof.reviewed_at = new Date();
      await proof.save();

      // Update milestone if linked
      if (proof.Milestone) {
        proof.Milestone.status = "approved";
        proof.Milestone.review_notes = proof.review_notes;
        await proof.Milestone.save();
      }

      // Release payment
      const payment = await Payment.create({
        milestone_id: proof.milestone_id || null,
        amount: proof.amount_requested,
        status: "released",
        released_at: new Date(),
        tx_hash: `TX-${Date.now()}-${proof.id.slice(0, 8)}`,
      });

      // Deduct from escrow
      const contract = proof.Contract;
      contract.escrow_balance = parseFloat(contract.escrow_balance) - parseFloat(proof.amount_requested);
      await contract.save();

      // Notify contractor
      await notifyUser({
        user_id: contract.contractor_id,
        type: "proof_approved",
        title: "Work Proof Approved!",
        message: `Your work proof has been approved. ₹${Number(proof.amount_requested).toLocaleString("en-IN")} has been released.`,
        entity_type: "work_proof",
        entity_id: proof.id,
        metadata: { amount: proof.amount_requested, payment_id: payment.id },
      });

      await notifyUser({
        user_id: contract.contractor_id,
        type: "payment_released",
        title: "Payment Released",
        message: `₹${Number(proof.amount_requested).toLocaleString("en-IN")} has been disbursed for "${proof.Contract?.Tender?.title}".`,
        entity_type: "payment",
        entity_id: payment.id,
      });

      res.json({ proof, payment });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ── Reject work proof → issue warning ── */
router.patch(
  "/:id/reject",
  authenticate,
  authorize("auditor_ngo", "community", "state_gov"),
  auditMiddleware("WORK_PROOF_REJECT", "work_proof"),
  async (req, res) => {
    try {
      const proof = await WorkProof.findByPk(req.params.id, {
        include: [
          { model: Contract, include: [{ model: Tender }] },
          { model: Milestone },
        ],
      });
      if (!proof) return res.status(404).json({ error: "Work proof not found" });
      if (proof.status !== "pending_review")
        return res.status(400).json({ error: "Proof already reviewed" });

      proof.status = "rejected";
      proof.review_notes = req.body.review_notes || "Proof verification failed";
      proof.reviewed_by = req.user.id;
      proof.reviewed_at = new Date();
      proof.warning_count = (proof.warning_count || 0) + 1;
      await proof.save();

      // Update milestone if linked
      if (proof.Milestone) {
        proof.Milestone.status = "rejected";
        proof.Milestone.review_notes = proof.review_notes;
        await proof.Milestone.save();
      }

      // Notify contractor with warning
      await notifyUser({
        user_id: proof.Contract.contractor_id,
        type: "warning_issued",
        title: "⚠️ Work Proof Rejected — Warning Issued",
        message: `Your work proof for "${proof.Contract?.Tender?.title}" was rejected. Reason: ${proof.review_notes}. This is warning #${proof.warning_count} for this proof submission.`,
        entity_type: "work_proof",
        entity_id: proof.id,
        metadata: { warning_count: proof.warning_count, reason: proof.review_notes },
      });

      res.json(proof);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ── Get single work proof detail ── */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const proof = await WorkProof.findByPk(req.params.id, {
      include: [
        { model: User, as: "submittedBy", attributes: ["id", "name", "reputation"] },
        { model: Milestone, attributes: ["id", "title", "sequence", "amount"] },
        {
          model: Contract,
          include: [
            { model: Tender, attributes: ["id", "title", "state_id", "location"] },
            { model: User, as: "contractor", attributes: ["id", "name"] },
          ],
        },
      ],
    });
    if (!proof) return res.status(404).json({ error: "Not found" });
    res.json(proof);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
