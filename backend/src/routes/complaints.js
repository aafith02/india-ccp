const router = require("express").Router();
const { sequelize, Complaint, Tender, User, State, ProofVote, WorkProof, Contract: ContractModel } = require("../models");
const { authenticate, generateSignature } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");
const { writeAudit } = require("../middleware/auditLog");
const { notifyUser, notifyByRole } = require("../services/notificationService");
const { adjustPoints, adjustReputation, POINTS, REPUTATION } = require("../services/pointsService");
const { upload, filesToUrls } = require("../middleware/upload");
const { createComplaintRules, investigateRules, paginationRules, validate } = require("../middleware/validation");

/* ═══════════════════════════════════════════════════════════════════
   POST / — Community/anyone submits a complaint (WITH FILE UPLOAD)
   Accepts multipart/form-data: files[] (up to 5 files) + JSON fields
   ═══════════════════════════════════════════════════════════════════ */
router.post("/", authenticate, upload.array("files", 5), createComplaintRules, validate, async (req, res) => {
  try {
    const { tender_id, subject, description, geo_location, severity } = req.body;

    // Build evidence from uploaded files + any URL-based evidence in body
    let evidence = [];
    if (req.files && req.files.length > 0) {
      const urls = filesToUrls(req.files);
      evidence = urls.map(url => ({ url, type: "file" }));
    }
    if (req.body.evidence) {
      const bodyEvidence = typeof req.body.evidence === "string" ? JSON.parse(req.body.evidence) : req.body.evidence;
      if (Array.isArray(bodyEvidence)) evidence = [...evidence, ...bodyEvidence];
    }

    const complaint = await Complaint.create({
      tender_id: tender_id || null,
      reporter_id: req.user.id,
      subject, description,
      severity: severity || "medium",
      evidence,
      geo_location: geo_location ? (typeof geo_location === "string" ? JSON.parse(geo_location) : geo_location) : null,
      status: "submitted",
    });

    await writeAudit({
      actor_id: req.user.id, actor_role: req.user.role, actor_name: req.user.name,
      action: "COMPLAINT_SUBMITTED", entity_type: "complaint", entity_id: complaint.id,
      details: { subject, tender_id, file_count: req.files?.length || 0 },
    });

    await notifyByRole({
      roles: ["central_gov"],
      type: "complaint_submitted", title: "New Complaint",
      message: `A new complaint "${subject}" has been submitted. Please review and assign an NGO.`,
      entity_type: "complaint", entity_id: complaint.id,
    });

    res.status(201).json({ complaint });
  } catch (err) {
    console.error("Complaint submit error:", err);
    res.status(500).json({ error: "Failed to submit complaint" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   PATCH /:id/assign-ngo — Central gov assigns an NGO to investigate
   ═══════════════════════════════════════════════════════════════════ */
router.patch("/:id/assign-ngo", authenticate, authorize("central_gov"), async (req, res) => {
  try {
    const { ngo_user_id } = req.body;
    if (!ngo_user_id) return res.status(400).json({ error: "ngo_user_id required" });

    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ error: "Complaint not found" });
    if (!["submitted"].includes(complaint.status)) {
      return res.status(400).json({ error: "Complaint already assigned or resolved" });
    }

    const ngo = await User.findByPk(ngo_user_id);
    if (!ngo || ngo.role !== "auditor_ngo") {
      return res.status(400).json({ error: "Invalid NGO user" });
    }

    const sig = generateSignature(req.user.id, "ASSIGN_NGO", complaint.id);

    await complaint.update({
      status: "assigned_to_ngo",
      ngo_assigned_id: ngo_user_id,
      ngo_assigned_by: req.user.id,
      signature_hash: sig,
    });

    await writeAudit({
      actor_id: req.user.id, actor_role: "central_gov", actor_name: req.user.name,
      action: "NGO_ASSIGNED_TO_COMPLAINT", entity_type: "complaint", entity_id: complaint.id,
      details: { ngo_user_id, ngo_name: ngo.name }, signature_hash: sig,
    });

    await notifyUser({
      user_id: ngo_user_id, type: "complaint_assigned",
      title: "Investigation Assignment", message: `You have been assigned to investigate: "${complaint.subject}"`,
      entity_type: "complaint", entity_id: complaint.id,
    });

    res.json({ message: "NGO assigned", complaint });
  } catch (err) {
    console.error("Assign NGO error:", err);
    res.status(500).json({ error: "Failed to assign NGO" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   PATCH /:id/start-investigation — NGO marks complaint as being actively investigated
   ═══════════════════════════════════════════════════════════════════ */
router.patch("/:id/start-investigation", authenticate, authorize("auditor_ngo"), async (req, res) => {
  try {
    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ error: "Complaint not found" });
    if (complaint.ngo_assigned_id !== req.user.id) {
      return res.status(403).json({ error: "This complaint is not assigned to you" });
    }
    if (complaint.status !== "assigned_to_ngo") {
      return res.status(400).json({ error: "Complaint is not in 'assigned_to_ngo' status" });
    }

    await complaint.update({ status: "investigating" });

    await writeAudit({
      actor_id: req.user.id, actor_role: "auditor_ngo", actor_name: req.user.name,
      action: "INVESTIGATION_STARTED", entity_type: "complaint", entity_id: complaint.id,
      details: {},
    });

    res.json({ message: "Investigation started", complaint });
  } catch (err) {
    console.error("Start investigation error:", err);
    res.status(500).json({ error: "Failed to start investigation" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   PATCH /:id/investigate — NGO submits investigation (WITH TRANSACTION)
   confirmed_valid → penalty on contractor + approvers + reputation hit
   confirmed_fake → penalty on reporter + reputation hit + "dismissed"
   Sets penalty_applied=true and uses "action_taken" status properly
   ═══════════════════════════════════════════════════════════════════ */
router.patch("/:id/investigate", authenticate, authorize("auditor_ngo"), investigateRules, validate, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { result, notes } = req.body;

    const complaint = await Complaint.findByPk(req.params.id, {
      include: [{ model: Tender }],
      transaction: t,
    });
    if (!complaint) { await t.rollback(); return res.status(404).json({ error: "Complaint not found" }); }
    if (complaint.ngo_assigned_id !== req.user.id) {
      await t.rollback(); return res.status(403).json({ error: "This complaint is not assigned to you" });
    }
    if (!["assigned_to_ngo", "investigating"].includes(complaint.status)) {
      await t.rollback(); return res.status(400).json({ error: "Complaint not in investigation phase" });
    }

    const sig = generateSignature(req.user.id, "INVESTIGATE", complaint.id);
    let penaltiesApplied = false;

    if (result === "confirmed_valid") {
      // Penalize the contractor if tender linked
      if (complaint.tender_id) {
        const contract = await ContractModel.findOne({ where: { tender_id: complaint.tender_id }, transaction: t });
        if (contract) {
          await adjustPoints({
            user_id: contract.contractor_id, points: POINTS.PENALTY_COMPLAINT,
            reason: "Valid complaint confirmed against your work",
            reference_type: "complaint", reference_id: complaint.id,
            transaction: t,
          });
          await adjustReputation({
            user_id: contract.contractor_id,
            delta: REPUTATION.COMPLAINT_CONFIRMED_CONTRACTOR,
            transaction: t,
          });

          const proofs = await WorkProof.findAll({
            where: { contract_id: contract.id, status: "approved" },
            transaction: t,
          });

          for (const proof of proofs) {
            const approveVotes = await ProofVote.findAll({
              where: { work_proof_id: proof.id, vote: "approve" },
              transaction: t,
            });
            for (const v of approveVotes) {
              await adjustPoints({
                user_id: v.voter_id, points: POINTS.PENALTY_FAKE_APPROVAL,
                reason: "Approved work that was verified as fraudulent",
                reference_type: "complaint", reference_id: complaint.id,
                transaction: t,
              });
              await adjustReputation({
                user_id: v.voter_id,
                delta: REPUTATION.COMPLAINT_CONFIRMED_APPROVER,
                transaction: t,
              });
            }
          }
          penaltiesApplied = true;
        }
      }

      // Reward the reporter
      await adjustPoints({
        user_id: complaint.reporter_id, points: POINTS.COMPLAINT_CONFIRMED,
        reason: "Your complaint was verified as valid",
        reference_type: "complaint", reference_id: complaint.id,
        transaction: t,
      });
      await adjustReputation({
        user_id: complaint.reporter_id,
        delta: REPUTATION.COMPLAINT_VALID_REPORTER,
        transaction: t,
      });

      // Use "action_taken" if penalties were applied, else "verified"
      await complaint.update({
        status: penaltiesApplied ? "action_taken" : "verified",
        investigation_result: "confirmed_valid",
        investigation_notes: notes || "",
        penalty_applied: penaltiesApplied,
        signature_hash: sig,
      }, { transaction: t });

      await t.commit();

      // Post-commit notifications
      if (complaint.tender_id) {
        const contract = await ContractModel.findOne({ where: { tender_id: complaint.tender_id } });
        if (contract) {
          await notifyUser({
            user_id: contract.contractor_id, type: "complaint_verified",
            title: "Complaint Verified Against You",
            message: `Investigation confirmed complaint "${complaint.subject}" is valid. Points and reputation deducted.`,
            entity_type: "complaint", entity_id: complaint.id,
          });

          // Check if contractor reputation is extremely low → notify for blacklist review
          const contractor = await User.findByPk(contract.contractor_id, { attributes: ["reputation"] });
          if (contractor && contractor.reputation <= -20) {
            await notifyByRole({
              roles: ["central_gov"],
              type: "blacklist_review", title: "Blacklist Review Needed",
              message: `Contractor reputation dropped to ${contractor.reputation}. Consider blacklisting.`,
              entity_type: "user", entity_id: contract.contractor_id,
            });
          }
        }
      }

      await notifyUser({
        user_id: complaint.reporter_id, type: "complaint_resolved",
        title: "Complaint Verified", message: "Your complaint has been verified. Thank you for your vigilance!",
        entity_type: "complaint", entity_id: complaint.id,
      });

    } else {
      // confirmed_fake → penalize the reporter for filing a false complaint
      await adjustPoints({
        user_id: complaint.reporter_id, points: POINTS.PENALTY_FALSE_COMPLAINT,
        reason: "Filed a complaint that was confirmed as false",
        reference_type: "complaint", reference_id: complaint.id,
        transaction: t,
      });
      await adjustReputation({
        user_id: complaint.reporter_id,
        delta: REPUTATION.FALSE_COMPLAINT_REPORTER,
        transaction: t,
      });

      await complaint.update({
        status: "dismissed",
        investigation_result: "confirmed_fake",
        investigation_notes: notes || "",
        penalty_applied: true,
        signature_hash: sig,
      }, { transaction: t });

      await t.commit();

      await notifyUser({
        user_id: complaint.reporter_id, type: "complaint_dismissed",
        title: "Complaint Dismissed",
        message: "After investigation, your complaint was not substantiated. Points deducted for false reporting.",
        entity_type: "complaint", entity_id: complaint.id,
      });
    }

    await writeAudit({
      actor_id: req.user.id, actor_role: "auditor_ngo", actor_name: req.user.name,
      action: `COMPLAINT_${result.toUpperCase()}`, entity_type: "complaint", entity_id: complaint.id,
      details: { result, notes, penalty_applied: complaint.penalty_applied }, signature_hash: sig,
    });

    res.json({ message: `Complaint ${result}`, complaint });
  } catch (err) {
    await t.rollback();
    console.error("Investigate error:", err);
    res.status(500).json({ error: "Failed to record investigation" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET / — List complaints WITH PAGINATION
   Central: all; NGO: assigned to them; Community: their own
   ═══════════════════════════════════════════════════════════════════ */
router.get("/", authenticate, paginationRules, validate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let where = {};
    if (req.user.role === "auditor_ngo") {
      where.ngo_assigned_id = req.user.id;
    } else if (req.user.role === "community") {
      where.reporter_id = req.user.id;
    } else if (req.user.role !== "central_gov") {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (req.query.status) where.status = req.query.status;

    const { count, rows } = await Complaint.findAndCountAll({
      where,
      include: [
        { model: Tender, attributes: ["id", "title", "location"] },
        { model: User, as: "reporter", attributes: ["id", "name", "role"] },
        { model: User, as: "assignedNgo", attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
      limit, offset,
    });

    res.json({
      complaints: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    console.error("List complaints error:", err);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /ngos — List available NGOs for assignment (central only)
   Multi-state: NGOs are not restricted by state — any NGO can investigate
   ═══════════════════════════════════════════════════════════════════ */
router.get("/ngos", authenticate, authorize("central_gov"), async (req, res) => {
  try {
    const ngos = await User.findAll({
      where: { role: "auditor_ngo", is_blacklisted: false },
      attributes: ["id", "name", "email", "state_id", "points", "reputation"],
      include: [{ model: State, attributes: ["name", "code"], required: false }],
    });
    res.json({ ngos });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch NGOs" });
  }
});

module.exports = router;
