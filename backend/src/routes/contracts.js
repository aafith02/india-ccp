const router = require("express").Router();
const { Op } = require("sequelize");
const { sequelize, Contract, ContractTranche, Tender, Bid, User, State, Milestone, Payment } = require("../models");
const { authenticate, generateSignature } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");
const { writeAudit } = require("../middleware/auditLog");
const { notifyUser } = require("../services/notificationService");
const { adjustPoints, adjustReputation, POINTS, REPUTATION } = require("../services/pointsService");
const { scoreBid, rankBids } = require("../services/bidEvaluation");
const { isValidTransition } = require("../middleware/tenderStateMachine");
const { paginationRules, validate } = require("../middleware/validation");

/* ── Helper: create tranches ── */
function createTranches(contractId, totalAmount, count) {
  const trancheAmount = Math.floor((parseFloat(totalAmount) / count) * 100) / 100;
  const remainder = parseFloat(totalAmount) - (trancheAmount * count);
  const tranches = [];
  for (let i = 1; i <= count; i++) {
    tranches.push({
      contract_id: contractId,
      sequence: i,
      amount: i === count ? trancheAmount + remainder : trancheAmount,
      status: "pending",
    });
  }
  return tranches;
}

/* ═══════════════════════════════════════════════════════════════════
   POST /award — Award tender using AI multi-criteria scoring
   WRAPPED IN TRANSACTION
   ═══════════════════════════════════════════════════════════════════ */
router.post("/award", authenticate, authorize("state_gov"), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { tender_id, tranche_count } = req.body;
    if (!tender_id) return res.status(400).json({ error: "tender_id required" });

    const tender = await Tender.findByPk(tender_id, { transaction: t });
    if (!tender) { await t.rollback(); return res.status(404).json({ error: "Tender not found" }); }
    if (!["closed", "open"].includes(tender.status)) {
      await t.rollback();
      return res.status(400).json({ error: "Tender must be closed or open to award" });
    }

    if (req.user.state_id !== tender.state_id) {
      await t.rollback();
      return res.status(403).json({ error: "You can only award tenders in your state" });
    }

    // Fetch all submitted bids with contractor info
    const bids = await Bid.findAll({
      where: { tender_id, status: "submitted" },
      include: [{ model: User, as: "contractor", attributes: ["id", "name", "kyc_status", "reputation"] }],
      transaction: t,
    });

    if (!bids.length) { await t.rollback(); return res.status(400).json({ error: "No bids found" }); }

    // Score each bid using AI multi-criteria evaluation
    const scoredBids = bids.map(bid => {
      const aiScore = scoreBid({
        amount: bid.amount,
        budget: tender.budget_hidden,
        reputation: bid.contractor?.reputation || 0,
        timeline_days: bid.timeline_days,
      });
      return { ...bid.toJSON(), ai_score: aiScore, contractor: bid.contractor };
    });

    // Rank bids by AI score
    const ranked = rankBids(scoredBids);
    const winnerRank = ranked[0];
    const winningBid = bids.find(b => b.id === winnerRank.bid_id);

    if (winningBid.contractor.kyc_status !== "verified") {
      await t.rollback();
      return res.status(400).json({ error: "Winning contractor KYC not verified" });
    }

    // Update all bids with their AI scores
    for (const scored of scoredBids) {
      await Bid.update({ ai_score: scored.ai_score }, { where: { id: scored.id }, transaction: t });
    }

    const numTranches = tranche_count || tender.tranche_count || 5;
    const totalAmount = parseFloat(winningBid.amount);
    const sig = generateSignature(req.user.id, "AWARD_CONTRACT", tender_id);

    const contract = await Contract.create({
      tender_id,
      contractor_id: winningBid.contractor_id,
      total_amount: totalAmount,
      escrow_balance: totalAmount,
      tranche_count: numTranches,
      current_tranche: 1,
      awarded_by: req.user.id,
      signature_hash: sig,
    }, { transaction: t });

    const trancheData = createTranches(contract.id, totalAmount, numTranches);
    const tranches = await ContractTranche.bulkCreate(trancheData, { transaction: t });

    // Disburse first tranche
    const firstTranche = tranches.find(tr => tr.sequence === 1);
    const disburseSig = generateSignature(req.user.id, "DISBURSE_TRANCHE", firstTranche.id);
    await firstTranche.update({
      status: "disbursed", disbursed_at: new Date(),
      disbursed_by: req.user.id, signature_hash: disburseSig,
    }, { transaction: t });

    await Payment.create({
      tranche_id: firstTranche.id, amount: firstTranche.amount,
      status: "released", released_at: new Date(),
      released_by: req.user.id, signature_hash: disburseSig,
      tx_hash: `TG-PAY-${Date.now()}`,
    }, { transaction: t });

    await contract.update({
      escrow_balance: totalAmount - parseFloat(firstTranche.amount),
    }, { transaction: t });

    await winningBid.update({ status: "awarded" }, { transaction: t });

    await Bid.update(
      { status: "rejected" },
      { where: { tender_id, id: { [Op.ne]: winningBid.id } }, transaction: t }
    );

    await tender.update({ status: "in_progress" }, { transaction: t });

    // Deduct from state balance
    const state = await State.findByPk(tender.state_id, { transaction: t });
    if (state) {
      await state.update({
        balance: parseFloat(state.balance || 0) - totalAmount,
        total_allocated: parseFloat(state.total_allocated || 0) + totalAmount,
      }, { transaction: t });
    }

    // Create milestones
    for (let i = 0; i < numTranches; i++) {
      await Milestone.create({
        contract_id: contract.id,
        title: `Phase ${i + 1}`,
        description: i === 0 ? "Initial mobilisation — tranche disbursed" : `Phase ${i + 1} — submit work proof to unlock tranche`,
        sequence: i + 1,
        amount: tranches[i].amount,
        status: i === 0 ? "in_progress" : "pending",
      }, { transaction: t });
    }

    await t.commit();

    // Post-commit: audit, notify (non-critical)
    await writeAudit({
      actor_id: req.user.id, actor_role: "state_gov", actor_name: req.user.name,
      action: "CONTRACT_AWARDED", entity_type: "contract", entity_id: contract.id,
      details: { tender_id, contractor_id: winningBid.contractor_id, total_amount: totalAmount, ai_score: winnerRank.ai_score },
      signature_hash: sig,
    });

    await notifyUser({
      user_id: winningBid.contractor_id, type: "contract_awarded",
      title: "Contract Awarded!",
      message: `You won the contract for "${tender.title}". First tranche of Rs ${firstTranche.amount} disbursed.`,
      entity_type: "contract", entity_id: contract.id,
    });

    res.status(201).json({
      contract, tranches, rankings: ranked,
      winning_bid: { id: winningBid.id, amount: winningBid.amount, ai_score: winnerRank.ai_score },
      message: `Contract awarded via AI scoring. First tranche disbursed.`,
    });
  } catch (err) {
    await t.rollback();
    console.error("Award error:", err);
    res.status(500).json({ error: "Failed to award contract" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /my — Contractor's contracts
   ═══════════════════════════════════════════════════════════════════ */
router.get("/my", authenticate, authorize("contractor"), async (req, res) => {
  try {
    const contracts = await Contract.findAll({
      where: { contractor_id: req.user.id },
      include: [
        { model: Tender, attributes: ["id", "title", "status", "location", "district"], include: [{ model: State, attributes: ["name", "code"] }] },
        { model: ContractTranche, order: [["sequence", "ASC"]] },
        { model: Milestone, order: [["sequence", "ASC"]] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json({ contracts });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch contracts" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /:id — Contract detail
   ═══════════════════════════════════════════════════════════════════ */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id, {
      include: [
        { model: Tender, include: [{ model: State }] },
        { model: User, as: "contractor", attributes: ["id", "name", "email", "reputation", "points"] },
        { model: ContractTranche, order: [["sequence", "ASC"]], include: [{ model: Payment }] },
        { model: Milestone, order: [["sequence", "ASC"]] },
      ],
    });
    if (!contract) return res.status(404).json({ error: "Contract not found" });
    res.json({ contract });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch contract" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET / — List contracts with PAGINATION
   ═══════════════════════════════════════════════════════════════════ */
router.get("/", authenticate, authorize("state_gov", "central_gov"), paginationRules, validate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const include = [
      { model: Tender, attributes: ["id", "title", "status", "location"], include: [{ model: State, attributes: ["name", "code"] }] },
      { model: User, as: "contractor", attributes: ["id", "name"] },
      { model: ContractTranche },
    ];

    const where = {};
    if (req.user.role === "state_gov") {
      // Filter by state via Tender association
      include[0] = { ...include[0], where: { state_id: req.user.state_id } };
    }

    const { count, rows } = await Contract.findAndCountAll({
      where, include, order: [["createdAt", "DESC"]], limit, offset,
    });

    res.json({ contracts: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch contracts" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   PATCH /:id/complete — Mark contract completed (WITH TRANSACTION)
   ═══════════════════════════════════════════════════════════════════ */
router.patch("/:id/complete", authenticate, authorize("state_gov", "central_gov"), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const contract = await Contract.findByPk(req.params.id, {
      include: [{ model: Tender }],
      transaction: t,
    });
    if (!contract) { await t.rollback(); return res.status(404).json({ error: "Contract not found" }); }
    if (contract.status !== "active") { await t.rollback(); return res.status(400).json({ error: "Contract is not active" }); }

    const sig = generateSignature(req.user.id, "COMPLETE_CONTRACT", contract.id);
    await contract.update({ status: "completed" }, { transaction: t });
    await contract.Tender.update({ status: "completed" }, { transaction: t });

    await adjustPoints({
      user_id: contract.contractor_id, points: POINTS.PROJECT_COMPLETION,
      reason: "Project completed successfully",
      reference_type: "contract", reference_id: contract.id,
      transaction: t,
    });

    await adjustReputation({
      user_id: contract.contractor_id,
      delta: REPUTATION.CONTRACT_COMPLETED,
      transaction: t,
    });

    await t.commit();

    await writeAudit({
      actor_id: req.user.id, actor_role: req.user.role, actor_name: req.user.name,
      action: "CONTRACT_COMPLETED", entity_type: "contract", entity_id: contract.id,
      details: { contractor_id: contract.contractor_id, total_amount: contract.total_amount },
      signature_hash: sig,
    });

    await notifyUser({
      user_id: contract.contractor_id, type: "contract_completed",
      title: "Project Completed!",
      message: `Project "${contract.Tender.title}" marked complete. You earned ${POINTS.PROJECT_COMPLETION} points!`,
      entity_type: "contract", entity_id: contract.id,
    });

    res.json({ message: "Contract completed", contract });
  } catch (err) {
    await t.rollback();
    console.error("Complete error:", err);
    res.status(500).json({ error: "Failed to complete contract" });
  }
});

module.exports = router;
