const router = require("express").Router();
const { Milestone, Payment, Contract } = require("../models");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");
const { auditMiddleware } = require("../middleware/auditLog");

/* ── Upload proof for milestone (contractor) ── */
router.patch(
  "/:id/proof",
  authenticate,
  authorize("contractor"),
  auditMiddleware("MILESTONE_PROOF", "milestone"),
  async (req, res) => {
    const ms = await Milestone.findByPk(req.params.id, { include: [Contract] });
    if (!ms) return res.status(404).json({ error: "Milestone not found" });
    if (ms.Contract.contractor_id !== req.user.id)
      return res.status(403).json({ error: "Not your contract" });

    const { proof_files } = req.body; // [{ url, hash, geo: {lat,lng}, timestamp }]
    ms.proof_files = proof_files;
    ms.status = "proof_uploaded";
    await ms.save();
    res.json(ms);
  }
);

/* ── Approve milestone → release payment (state gov) ── */
router.patch(
  "/:id/approve",
  authenticate,
  authorize("state_gov", "central_gov"),
  auditMiddleware("MILESTONE_APPROVE", "milestone"),
  async (req, res) => {
    const ms = await Milestone.findByPk(req.params.id, { include: [Contract] });
    if (!ms) return res.status(404).json({ error: "Milestone not found" });

    ms.status = "approved";
    ms.review_notes = req.body.review_notes || "";
    await ms.save();

    // Release payment
    const payment = await Payment.create({
      milestone_id: ms.id,
      amount: ms.amount,
      status: "released",
      released_at: new Date(),
      tx_hash: `TX-${Date.now()}-${ms.id.slice(0, 8)}`, // placeholder; blockchain later
    });

    // Deduct from escrow
    const contract = ms.Contract;
    contract.escrow_balance = parseFloat(contract.escrow_balance) - parseFloat(ms.amount);
    await contract.save();

    res.json({ milestone: ms, payment });
  }
);

/* ── Reject milestone ── */
router.patch(
  "/:id/reject",
  authenticate,
  authorize("state_gov", "central_gov"),
  auditMiddleware("MILESTONE_REJECT", "milestone"),
  async (req, res) => {
    const ms = await Milestone.findByPk(req.params.id);
    if (!ms) return res.status(404).json({ error: "Not found" });

    ms.status = "rejected";
    ms.review_notes = req.body.review_notes || "Proof insufficient";
    await ms.save();
    res.json(ms);
  }
);

/* ── List milestones for a contract ── */
router.get("/contract/:contractId", authenticate, async (req, res) => {
  const milestones = await Milestone.findAll({
    where: { contract_id: req.params.contractId },
    include: [{ model: Payment }],
    order: [["sequence", "ASC"]],
  });
  res.json(milestones);
});

module.exports = router;
