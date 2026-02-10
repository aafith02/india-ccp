const router = require("express").Router();
const { Contract, Tender, Bid, Milestone, User, ReputationCredit } = require("../models");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");
const { auditMiddleware, writeAudit } = require("../middleware/auditLog");

/* ── Award tender → create contract + milestones ── */
router.post(
  "/award",
  authenticate,
  authorize("state_gov"),
  auditMiddleware("CONTRACT_AWARD", "contract"),
  async (req, res) => {
    try {
      const { tender_id, bid_id, milestones } = req.body;
      if (!tender_id || !bid_id || !milestones?.length)
        return res.status(400).json({ error: "tender_id, bid_id, milestones[] required" });

      const tender = await Tender.findByPk(tender_id);
      if (!tender || tender.state_id !== req.user.state_id)
        return res.status(403).json({ error: "Unauthorized" });

      const bid = await Bid.findByPk(bid_id);
      if (!bid || bid.tender_id !== tender_id)
        return res.status(400).json({ error: "Bid mismatch" });

      // Mark bid as awarded, others as rejected
      await Bid.update({ status: "rejected" }, { where: { tender_id, id: { [require("sequelize").Op.ne]: bid_id } } });
      bid.status = "awarded";
      await bid.save();

      // Update tender
      tender.status = "awarded";
      await tender.save();

      // Create contract
      const contract = await Contract.create({
        tender_id,
        contractor_id: bid.contractor_id,
        total_amount: bid.amount,
        escrow_balance: bid.amount,
      });

      // Create milestones
      const msRecords = await Promise.all(
        milestones.map((m, i) =>
          Milestone.create({
            contract_id: contract.id,
            title: m.title,
            description: m.description,
            amount: m.amount,
            due_date: m.due_date,
            sequence: i + 1,
          })
        )
      );

      res.status(201).json({ contract, milestones: msRecords });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ── Get contract detail ── */
router.get("/:id", authenticate, async (req, res) => {
  const contract = await Contract.findByPk(req.params.id, {
    include: [
      { model: Tender, attributes: ["id", "title", "location", "status"] },
      { model: User, as: "contractor", attributes: ["id", "name", "reputation"] },
      { model: Milestone, order: [["sequence", "ASC"]] },
    ],
  });
  if (!contract) return res.status(404).json({ error: "Not found" });
  res.json(contract);
});

/* ── List contracts for state ── */
router.get("/", authenticate, authorize("state_gov", "central_gov"), async (req, res) => {
  const include = [
    { model: Tender, attributes: ["id", "title", "state_id", "status"] },
    { model: User, as: "contractor", attributes: ["id", "name"] },
  ];
  const contracts = req.user.role === "central_gov"
    ? await Contract.findAll({ include, order: [["createdAt", "DESC"]] })
    : await Contract.findAll({
        include: [{ ...include[0], where: { state_id: req.user.state_id } }, include[1]],
        order: [["createdAt", "DESC"]],
      });
  res.json(contracts);
});

/* ── Complete contract (state gov) ── */
router.patch(
  "/:id/complete",
  authenticate,
  authorize("state_gov"),
  auditMiddleware("CONTRACT_COMPLETE", "contract"),
  async (req, res) => {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) return res.status(404).json({ error: "Not found" });

    contract.status = "completed";
    await contract.save();

    // Award reputation credit
    await ReputationCredit.create({
      user_id: contract.contractor_id,
      points: 10,
      reason: "Project completed successfully",
      project_id: contract.tender_id,
    });

    // Update contractor reputation
    const credits = await ReputationCredit.sum("points", { where: { user_id: contract.contractor_id } });
    await User.update({ reputation: credits }, { where: { id: contract.contractor_id } });

    res.json(contract);
  }
);

module.exports = router;
