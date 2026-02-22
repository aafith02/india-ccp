const router = require("express").Router();
const { Tender, Contract, ContractTranche, Milestone, Payment, State, User, AuditLog, Complaint, WorkProof } = require("../models");
const { Op } = require("sequelize");

/* ═══════════════════════════════════════════════════════════════════
   GET /tenders — Public tender list (budget hidden)
   ═══════════════════════════════════════════════════════════════════ */
router.get("/tenders", async (req, res) => {
  try {
    const where = {};
    if (req.query.state_id) where.state_id = req.query.state_id;
    if (req.query.status) where.status = req.query.status;

    const tenders = await Tender.findAll({
      where,
      attributes: { exclude: ["budget_hidden"] },
      include: [{ model: State, attributes: ["id", "name", "code"] }],
      order: [["createdAt", "DESC"]],
    });
    res.json({ tenders });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tenders" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /projects/:tenderId — Public project detail
   ═══════════════════════════════════════════════════════════════════ */
router.get("/projects/:tenderId", async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.tenderId, {
      attributes: { exclude: ["budget_hidden"] },
      include: [
        { model: State, attributes: ["id", "name", "code"] },
        {
          model: Contract,
          include: [
            { model: User, as: "contractor", attributes: ["id", "name", "reputation", "points"] },
            { model: ContractTranche, order: [["sequence", "ASC"]] },
            { model: Milestone, order: [["sequence", "ASC"]] },
          ],
        },
      ],
    });
    if (!tender) return res.status(404).json({ error: "Tender not found" });
    res.json({ tender });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /ledger — Public blockchain-like audit ledger
   Shows: tender creation, fund allocation, contract awards,
   proof submissions, verifications, complaints — everything except
   login details and IP addresses
   ═══════════════════════════════════════════════════════════════════ */
router.get("/ledger", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    // Exclude login/register events and IP for privacy
    const where = {
      action: {
        [Op.notIn]: ["USER_LOGIN", "USER_REGISTERED"],
      },
    };

    if (req.query.entity_type) where.entity_type = req.query.entity_type;
    if (req.query.action) where.action = req.query.action;

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      attributes: { exclude: ["ip_address"] },
      order: [["createdAt", "DESC"]],
      limit, offset,
    });

    res.json({
      ledger: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ledger" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /ledger/verify — Verify chain integrity
   ═══════════════════════════════════════════════════════════════════ */
router.get("/ledger/verify", async (req, res) => {
  try {
    const crypto = require("crypto");
    const entries = await AuditLog.findAll({ order: [["createdAt", "ASC"]] });

    let isValid = true;
    let brokenAt = null;

    for (let i = 1; i < entries.length; i++) {
      if (entries[i].prev_hash !== entries[i - 1].entry_hash) {
        isValid = false;
        brokenAt = { index: i, entry_id: entries[i].id };
        break;
      }
    }

    res.json({
      chain_valid: isValid,
      total_entries: entries.length,
      broken_at: brokenAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to verify chain" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /stats — Platform statistics
   ═══════════════════════════════════════════════════════════════════ */
router.get("/stats", async (req, res) => {
  try {
    const [tenders, openTenders, contracts, completed, complaints, users] = await Promise.all([
      Tender.count(),
      Tender.count({ where: { status: "open" } }),
      Contract.count(),
      Contract.count({ where: { status: "completed" } }),
      Complaint.count(),
      User.count({ where: { role: { [Op.ne]: "central_gov" } } }),
    ]);

    res.json({ stats: { tenders, openTenders, contracts, completed, complaints, users } });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /state-works/:stateId — Community sees work done in their state
   ═══════════════════════════════════════════════════════════════════ */
router.get("/state-works/:stateId", async (req, res) => {
  try {
    const tenders = await Tender.findAll({
      where: { state_id: req.params.stateId, status: { [Op.in]: ["in_progress", "completed", "awarded"] } },
      attributes: { exclude: ["budget_hidden"] },
      include: [
        { model: State, attributes: ["id", "name", "code"] },
        {
          model: Contract,
          include: [
            { model: User, as: "contractor", attributes: ["id", "name", "reputation", "points"] },
            { model: ContractTranche, attributes: ["id", "sequence", "amount", "status", "disbursed_at"] },
            {
              model: WorkProof,
              attributes: ["id", "description", "photo_urls", "work_percentage", "status", "approval_count", "rejection_count", "createdAt"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ projects: tenders });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch state works" });
  }
});

module.exports = router;
