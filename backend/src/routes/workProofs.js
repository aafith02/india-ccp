const router = require("express").Router();
const { Op } = require("sequelize");
const { sequelize, WorkProof, ProofReviewer, ProofVote, Contract, ContractTranche, Milestone, User, State, Tender, Payment } = require("../models");
const { authenticate, generateSignature } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");
const { writeAudit } = require("../middleware/auditLog");
const { notifyUser, notifyByRole } = require("../services/notificationService");
const { adjustPoints, adjustReputation, POINTS, REPUTATION } = require("../services/pointsService");
const { upload, filesToUrls } = require("../middleware/upload");
const { createWorkProofRules, voteRules, paginationRules, validate } = require("../middleware/validation");

/* ═══════════════════════════════════════════════════════════════════
   POST / — Contractor submits work proof WITH FILE UPLOAD
   Accepts multipart/form-data: photos[] (up to 10 files) + JSON fields
   ═══════════════════════════════════════════════════════════════════ */
router.post("/", authenticate, authorize("contractor"), upload.array("photos", 10), createWorkProofRules, validate, async (req, res) => {
  try {
    const { contract_id, tranche_id, milestone_id, description, work_percentage, amount_requested } = req.body;

    const contract = await Contract.findByPk(contract_id, {
      include: [{ model: Tender }],
    });
    if (!contract) return res.status(404).json({ error: "Contract not found" });
    if (contract.contractor_id !== req.user.id) return res.status(403).json({ error: "Not your contract" });
    if (contract.status !== "active") return res.status(400).json({ error: "Contract is not active" });

    // Build photo_urls from uploaded files OR from JSON body
    let photo_urls = [];
    if (req.files && req.files.length > 0) {
      photo_urls = filesToUrls(req.files);
    } else if (req.body.photo_urls) {
      photo_urls = Array.isArray(req.body.photo_urls) ? req.body.photo_urls : JSON.parse(req.body.photo_urls || "[]");
    }

    const proof = await WorkProof.create({
      contract_id,
      tranche_id: tranche_id || null,
      milestone_id: milestone_id || null,
      submitted_by: req.user.id,
      description,
      photo_urls,
      work_percentage: parseFloat(work_percentage),
      amount_requested: parseFloat(amount_requested),
      status: "pending_assignment",
    });

    await writeAudit({
      actor_id: req.user.id, actor_role: "contractor", actor_name: req.user.name,
      action: "PROOF_SUBMITTED", entity_type: "work_proof", entity_id: proof.id,
      details: { contract_id, work_percentage, amount_requested, photo_count: photo_urls.length },
    });

    await notifyByRole({
      roles: ["state_gov"], state_id: contract.Tender.state_id,
      type: "proof_submitted", title: "New Work Proof Submitted",
      message: `Contractor submitted proof for "${contract.Tender.title}". Please assign reviewers.`,
      entity_type: "work_proof", entity_id: proof.id,
    });

    res.status(201).json({ proof });
  } catch (err) {
    console.error("Submit proof error:", err);
    res.status(500).json({ error: "Failed to submit proof" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /:id/assign-reviewers — State gov assigns reviewers
   ═══════════════════════════════════════════════════════════════════ */
router.post("/:id/assign-reviewers", authenticate, authorize("state_gov"), async (req, res) => {
  try {
    const { reviewer_ids } = req.body;
    if (!reviewer_ids || !reviewer_ids.length) {
      return res.status(400).json({ error: "reviewer_ids array required" });
    }

    const proof = await WorkProof.findByPk(req.params.id, {
      include: [{ model: Contract, include: [{ model: Tender }] }],
    });
    if (!proof) return res.status(404).json({ error: "Work proof not found" });
    if (proof.status !== "pending_assignment") {
      return res.status(400).json({ error: "Proof is not pending assignment" });
    }

    const tenderStateId = proof.Contract.Tender.state_id;
    if (req.user.state_id !== tenderStateId) {
      return res.status(403).json({ error: "You can only assign reviewers for your state" });
    }

    const reviewers = await User.findAll({
      where: { id: reviewer_ids, role: "state_gov", state_id: tenderStateId },
    });
    if (reviewers.length === 0) {
      return res.status(400).json({ error: "No valid state_gov reviewers found" });
    }

    const assignments = reviewers.map(r => ({
      work_proof_id: proof.id,
      reviewer_id: r.id,
      assigned_by: req.user.id,
    }));
    await ProofReviewer.bulkCreate(assignments);

    const requiredApprovals = Math.ceil(reviewers.length * 0.51);

    await proof.update({
      status: "under_review",
      required_approvals: requiredApprovals,
    });

    const sig = generateSignature(req.user.id, "ASSIGN_REVIEWERS", proof.id);
    await writeAudit({
      actor_id: req.user.id, actor_role: "state_gov", actor_name: req.user.name,
      action: "REVIEWERS_ASSIGNED", entity_type: "work_proof", entity_id: proof.id,
      details: { reviewer_count: reviewers.length, required_approvals: requiredApprovals },
      signature_hash: sig,
    });

    for (const r of reviewers) {
      await notifyUser({
        user_id: r.id, type: "verification_needed",
        title: "Review Assignment", message: "You have been assigned to review a work proof. Please vote.",
        entity_type: "work_proof", entity_id: proof.id,
      });
    }

    res.json({
      message: `${reviewers.length} reviewers assigned. ${requiredApprovals} approvals needed.`,
      proof,
    });
  } catch (err) {
    console.error("Assign reviewers error:", err);
    res.status(500).json({ error: "Failed to assign reviewers" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /:id/vote — Vote on proof (WRAPPED IN TRANSACTION for disburse)
   ═══════════════════════════════════════════════════════════════════ */
router.post("/:id/vote", authenticate, authorize("state_gov"), voteRules, validate, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { vote, comment } = req.body;

    const proof = await WorkProof.findByPk(req.params.id, {
      include: [
        { model: Contract, include: [{ model: Tender }, { model: ContractTranche, order: [["sequence", "ASC"]] }] },
        { model: ProofReviewer },
        { model: ProofVote },
      ],
      transaction: t,
    });
    if (!proof) { await t.rollback(); return res.status(404).json({ error: "Work proof not found" }); }
    if (proof.status !== "under_review") { await t.rollback(); return res.status(400).json({ error: "Proof is not under review" }); }

    const isAssigned = proof.ProofReviewers.some(r => r.reviewer_id === req.user.id);
    if (!isAssigned) { await t.rollback(); return res.status(403).json({ error: "You are not assigned to review this proof" }); }

    const alreadyVoted = proof.ProofVotes.some(v => v.voter_id === req.user.id);
    if (alreadyVoted) { await t.rollback(); return res.status(409).json({ error: "You have already voted" }); }

    const sig = generateSignature(req.user.id, `VOTE_${vote.toUpperCase()}`, proof.id);

    await ProofVote.create({
      work_proof_id: proof.id,
      voter_id: req.user.id,
      vote,
      comment: comment || null,
      signature_hash: sig,
    }, { transaction: t });

    const newApprovals = proof.approval_count + (vote === "approve" ? 1 : 0);
    const newRejections = proof.rejection_count + (vote === "reject" ? 1 : 0);
    await proof.update({ approval_count: newApprovals, rejection_count: newRejections }, { transaction: t });

    // Check thresholds
    const totalReviewers = proof.ProofReviewers.length;
    const requiredRejects = Math.ceil(totalReviewers * 0.51);

    if (newApprovals >= proof.required_approvals) {
      // APPROVED — disburse next tranche (all within transaction)
      await proof.update({ status: "approved", reviewed_at: new Date() }, { transaction: t });

      const nextTranche = proof.Contract.ContractTranches.find(tr => tr.status === "pending");
      if (nextTranche) {
        const disburseSig = generateSignature("system", "AUTO_DISBURSE", nextTranche.id);
        await nextTranche.update({
          status: "disbursed", disbursed_at: new Date(),
          disbursed_by: req.user.id, signature_hash: disburseSig,
        }, { transaction: t });

        await Payment.create({
          tranche_id: nextTranche.id, amount: nextTranche.amount,
          status: "released", released_at: new Date(),
          released_by: req.user.id, signature_hash: disburseSig,
          tx_hash: `TG-PAY-${Date.now()}`,
        }, { transaction: t });

        await proof.Contract.update({
          escrow_balance: parseFloat(proof.Contract.escrow_balance) - parseFloat(nextTranche.amount),
          current_tranche: nextTranche.sequence + 1,
        }, { transaction: t });

        if (proof.milestone_id) {
          await Milestone.update({ status: "approved" }, { where: { id: proof.milestone_id }, transaction: t });

          // Unlock the next milestone (set to in_progress)
          const currentMilestone = await Milestone.findByPk(proof.milestone_id, { transaction: t });
          if (currentMilestone) {
            const nextMilestone = await Milestone.findOne({
              where: {
                contract_id: proof.contract_id,
                sequence: currentMilestone.sequence + 1,
                status: "pending",
              },
              transaction: t,
            });
            if (nextMilestone) {
              await nextMilestone.update({ status: "in_progress" }, { transaction: t });
            }
          }
        }

        await t.commit();

        // Post-commit notifications (non-critical)
        await writeAudit({
          actor_id: req.user.id, actor_role: req.user.role, actor_name: req.user.name,
          action: "TRANCHE_DISBURSED", entity_type: "contract_tranche", entity_id: nextTranche.id,
          details: { contract_id: proof.contract_id, sequence: nextTranche.sequence, amount: nextTranche.amount, auto: true },
          signature_hash: disburseSig,
        });

        await notifyUser({
          user_id: proof.Contract.contractor_id, type: "payment_released",
          title: "Payment Released!", message: `Tranche ${nextTranche.sequence} of Rs ${nextTranche.amount} released for verified work.`,
          entity_type: "contract_tranche", entity_id: nextTranche.id,
        });

        await adjustPoints({
          user_id: proof.Contract.contractor_id, points: POINTS.TRANCHE_APPROVED,
          reason: `Tranche ${nextTranche.sequence} approved`,
          reference_type: "work_proof", reference_id: proof.id,
        });

        await adjustReputation({
          user_id: proof.Contract.contractor_id,
          delta: REPUTATION.TRANCHE_APPROVED,
        });
      } else {
        await t.commit();
      }

      // Voter points (post-commit)
      await adjustPoints({
        user_id: req.user.id, points: POINTS.VERIFICATION_VOTE,
        reason: "Voted on work proof verification",
        reference_type: "work_proof", reference_id: proof.id,
      });

      return res.json({ message: "Proof approved! Next tranche disbursed.", proof, status: "approved" });
    } else if (newRejections >= requiredRejects) {
      // REJECTED
      await proof.update({
        status: "rejected", reviewed_at: new Date(),
        warning_count: proof.warning_count + 1,
      }, { transaction: t });

      if (proof.milestone_id) {
        await Milestone.update({ status: "rejected" }, { where: { id: proof.milestone_id }, transaction: t });
      }

      await t.commit();

      await notifyUser({
        user_id: proof.Contract.contractor_id, type: "proof_rejected",
        title: "Work Proof Rejected", message: "Your work proof was rejected by the majority of reviewers. Please re-submit.",
        entity_type: "work_proof", entity_id: proof.id,
      });

      await adjustPoints({
        user_id: req.user.id, points: POINTS.VERIFICATION_VOTE,
        reason: "Voted on work proof verification",
        reference_type: "work_proof", reference_id: proof.id,
      });

      return res.json({ message: "Proof rejected by majority vote.", proof, status: "rejected" });
    } else {
      await t.commit();

      await adjustPoints({
        user_id: req.user.id, points: POINTS.VERIFICATION_VOTE,
        reason: "Voted on work proof verification",
        reference_type: "work_proof", reference_id: proof.id,
      });

      return res.json({
        message: `Vote recorded. ${newApprovals}/${proof.required_approvals} approvals, ${newRejections} rejections.`,
        status: "under_review",
      });
    }
  } catch (err) {
    if (!t.finished) await t.rollback();
    console.error("Vote error:", err);
    res.status(500).json({ error: "Failed to record vote" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /pending — Pending proofs for review (with PAGINATION)
   ═══════════════════════════════════════════════════════════════════ */
router.get("/pending", authenticate, authorize("state_gov", "central_gov"), paginationRules, validate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const where = { status: { [Op.in]: ["pending_assignment", "under_review"] } };

    const include = [
      { model: Contract, include: [{ model: Tender, include: [{ model: State }] }, { model: User, as: "contractor", attributes: ["id", "name", "reputation", "points"] }] },
      { model: User, as: "submittedBy", attributes: ["id", "name"] },
      { model: ProofReviewer, include: [{ model: User, as: "reviewer", attributes: ["id", "name"] }] },
      { model: ProofVote, include: [{ model: User, as: "voter", attributes: ["id", "name"] }] },
    ];

    // For state_gov, filter via nested Tender state
    if (req.user.role === "state_gov") {
      include[0].include[0].where = { state_id: req.user.state_id };
    }

    const { count, rows } = await WorkProof.findAndCountAll({
      where, include, order: [["createdAt", "DESC"]], limit, offset,
    });

    res.json({
      proofs: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    console.error("Pending proofs error:", err);
    res.status(500).json({ error: "Failed to fetch pending proofs" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /contract/:contractId — All proofs for a contract
   ═══════════════════════════════════════════════════════════════════ */
router.get("/contract/:contractId", authenticate, async (req, res) => {
  try {
    const proofs = await WorkProof.findAll({
      where: { contract_id: req.params.contractId },
      include: [
        { model: User, as: "submittedBy", attributes: ["id", "name"] },
        { model: ProofReviewer, include: [{ model: User, as: "reviewer", attributes: ["id", "name"] }] },
        { model: ProofVote, include: [{ model: User, as: "voter", attributes: ["id", "name"] }] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json({ proofs });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch proofs" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /:id — Single proof detail
   ═══════════════════════════════════════════════════════════════════ */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const proof = await WorkProof.findByPk(req.params.id, {
      include: [
        { model: Contract, include: [{ model: Tender }, { model: User, as: "contractor", attributes: ["id", "name", "reputation", "points"] }] },
        { model: User, as: "submittedBy", attributes: ["id", "name"] },
        { model: ProofReviewer, include: [{ model: User, as: "reviewer", attributes: ["id", "name"] }] },
        { model: ProofVote, include: [{ model: User, as: "voter", attributes: ["id", "name"] }] },
        { model: ContractTranche },
      ],
    });
    if (!proof) return res.status(404).json({ error: "Work proof not found" });
    res.json({ proof });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch proof" });
  }
});

module.exports = router;
