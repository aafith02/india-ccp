const router = require("express").Router();
const { Tender, Contract, Milestone, Payment, AuditLog, State, Bid, Complaint } = require("../models");

/* ═══ Public endpoints — no auth required ═══ */

/* ── Public tender list (budget hidden) ── */
router.get("/tenders", async (req, res) => {
  try {
    const { state_id, status } = req.query;
    const where = {};
    if (state_id) where.state_id = state_id;
    if (status) where.status = status;

    const tenders = await Tender.findAll({
      where,
      attributes: { exclude: ["budget_hidden"] },
      include: [{ model: State, attributes: ["name", "code"] }],
      order: [["bid_deadline", "ASC"]],
    });
    res.json(tenders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Public project detail ── */
router.get("/projects/:tenderId", async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.tenderId, {
      attributes: { exclude: ["budget_hidden"] },
      include: [
        { model: State, attributes: ["name", "code", "logo_url"] },
        { model: Contract, include: [{ model: Milestone, include: [Payment] }] },
      ],
    });
    if (!tender) return res.status(404).json({ error: "Project not found" });
    res.json(tender);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Public ledger (audit log, read-only) ── */
router.get("/ledger", async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const { count, rows } = await AuditLog.findAndCountAll({
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset,
      attributes: { exclude: ["ip_address"] },
    });
    res.json({ total: count, page: parseInt(page), entries: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Public stats ── */
router.get("/stats", async (_req, res) => {
  try {
    const [totalTenders, openTenders, totalContracts, completedContracts, totalComplaints] = await Promise.all([
      Tender.count(),
      Tender.count({ where: { status: "open" } }),
      Contract.count(),
      Contract.count({ where: { status: "completed" } }),
      Complaint.count(),
    ]);
    res.json({ totalTenders, openTenders, totalContracts, completedContracts, totalComplaints });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
