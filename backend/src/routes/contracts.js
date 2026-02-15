const router = require("express").Router();
const { Contract, Tender, Bid, Milestone, User, ReputationCredit, Payment } = require("../models");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");
const { auditMiddleware, writeAudit } = require("../middleware/auditLog");
const { notifyUser } = require("../services/notificationService");

/* ── Auto-award tender to closest bidder → create contract + milestones + 20% initial payment ── */
router.post(
  "/auto-award",
  authenticate,
  authorize("state_gov"),
  auditMiddleware("CONTRACT_AUTO_AWARD", "contract"),
  async (req, res) => {
    try {
      const { tender_id, milestones } = req.body;
      if (!tender_id || !milestones?.length)
        return res.status(400).json({ error: "tender_id and milestones[] required" });

      const tender = await Tender.findByPk(tender_id);
      if (!tender || tender.state_id !== req.user.state_id)
        return res.status(403).json({ error: "Unauthorized" });

      if (tender.status !== "closed" && tender.status !== "open")
        return res.status(400).json({ error: "Tender must be open or closed to award" });

      // Find all bids for this tender, sorted by AI score (closest bid wins)
      const bids = await Bid.findAll({
        where: { tender_id },
        order: [["ai_score", "DESC"]],
        include: [{ model: User, as: "contractor", attributes: ["id", "name", "reputation", "kyc_status"] }],
      });

      if (bids.length === 0)
        return res.status(400).json({ error: "No bids submitted for this tender" });

      // The highest AI-scored bid wins (closest to budget gets highest score)
      const winningBid = bids[0];

      // Mark winning bid as awarded, others as rejected
      await Bid.update(
        { status: "rejected" },
        { where: { tender_id, id: { [require("sequelize").Op.ne]: winningBid.id } } }
      );
      winningBid.status = "awarded";
      await winningBid.save();

      // Update tender status
      tender.status = "awarded";
      await tender.save();

      const totalAmount = parseFloat(winningBid.amount);

      // Create contract
      const contract = await Contract.create({
        tender_id,
        contractor_id: winningBid.contractor_id,
        total_amount: totalAmount,
        escrow_balance: totalAmount,
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

      // === 20% Initial Payment ===
      const initialAmount = Math.round(totalAmount * 0.20 * 100) / 100;
      const initialPayment = await Payment.create({
        milestone_id: msRecords[0]?.id || null,
        amount: initialAmount,
        status: "released",
        released_at: new Date(),
        tx_hash: `TX-INITIAL-${Date.now()}-${contract.id.slice(0, 8)}`,
        method: "initial_disbursement",
      });

      // Deduct from escrow
      contract.escrow_balance = totalAmount - initialAmount;
      await contract.save();

      // Update tender to in_progress
      tender.status = "in_progress";
      await tender.save();

      // Notify the winning contractor
      await notifyUser({
        user_id: winningBid.contractor_id,
        type: "contract_awarded",
        title: "🎉 Contract Awarded!",
        message: `Your bid for "${tender.title}" has been awarded! Contract amount: ₹${totalAmount.toLocaleString("en-IN")}. An initial payment of 20% (₹${initialAmount.toLocaleString("en-IN")}) has been disbursed.`,
        entity_type: "contract",
        entity_id: contract.id,
        metadata: { initial_payment: initialAmount, total_amount: totalAmount },
      });

      await notifyUser({
        user_id: winningBid.contractor_id,
        type: "payment_released",
        title: "Initial Payment Released",
        message: `₹${initialAmount.toLocaleString("en-IN")} (20% advance) has been released for "${tender.title}".`,
        entity_type: "payment",
        entity_id: initialPayment.id,
      });

      res.status(201).json({
        contract,
        milestones: msRecords,
        winning_bid: winningBid,
        initial_payment: initialPayment,
        all_bids_count: bids.length,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ── Award tender → create contract + milestones (manual selection) ── */
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

/* ── Get my contracts (contractor) ── */
router.get("/my", authenticate, async (req, res) => {
  try {
    const contracts = await Contract.findAll({
      where: { contractor_id: req.user.id },
      include: [
        { model: Tender, attributes: ["id", "title", "location", "category", "status"] },
        { model: Milestone, order: [["sequence", "ASC"]] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Get contract detail ── */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id, {
      include: [
        { model: Tender, attributes: ["id", "title", "location", "category", "status"] },
        { model: User, as: "contractor", attributes: ["id", "name", "reputation"] },
        { model: Milestone, order: [["sequence", "ASC"]] },
      ],
    });
    if (!contract) return res.status(404).json({ error: "Not found" });
    res.json(contract);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── List contracts for state ── */
router.get("/", authenticate, authorize("state_gov", "central_gov"), async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
