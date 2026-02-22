/**
 * Analytics API — aggregated data for dashboard charts.
 */
const router = require("express").Router();
const { Op, fn, col, literal } = require("sequelize");
const { sequelize, Tender, Contract, Complaint, Payment, FundRequest, State, User } = require("../models");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");

/* ═══════════════════════════════════════════════════════════════════
   GET /overview — High-level dashboard stats
   ═══════════════════════════════════════════════════════════════════ */
router.get("/overview", authenticate, authorize("central_gov", "state_gov"), async (req, res) => {
  try {
    const stateFilter = req.user.role === "state_gov" ? { state_id: req.user.state_id } : {};

    const [
      totalTenders,
      openTenders,
      inProgressTenders,
      completedTenders,
      cancelledTenders,
      totalContracts,
      activeContracts,
      completedContracts,
      totalComplaints,
      pendingComplaints,
      verifiedComplaints,
    ] = await Promise.all([
      Tender.count({ where: stateFilter }),
      Tender.count({ where: { ...stateFilter, status: "open" } }),
      Tender.count({ where: { ...stateFilter, status: "in_progress" } }),
      Tender.count({ where: { ...stateFilter, status: "completed" } }),
      Tender.count({ where: { ...stateFilter, status: "cancelled" } }),
      Contract.count({
        include: stateFilter.state_id
          ? [{ model: Tender, where: { state_id: stateFilter.state_id }, attributes: [] }]
          : [],
      }),
      Contract.count({
        where: { status: "active" },
        include: stateFilter.state_id
          ? [{ model: Tender, where: { state_id: stateFilter.state_id }, attributes: [] }]
          : [],
      }),
      Contract.count({
        where: { status: "completed" },
        include: stateFilter.state_id
          ? [{ model: Tender, where: { state_id: stateFilter.state_id }, attributes: [] }]
          : [],
      }),
      Complaint.count(),
      Complaint.count({ where: { status: { [Op.in]: ["submitted", "assigned_to_ngo", "investigating"] } } }),
      Complaint.count({ where: { status: "verified" } }),
    ]);

    // Total disbursed
    const disbursedResult = await Payment.sum("amount", { where: { status: "released" } });

    // Total fund requests approved
    const fundApproved = await FundRequest.sum("approved_amount", { where: { status: "approved" } });

    res.json({
      totalTenders,
      openTenders,
      inProgressTenders,
      completedTenders,
      cancelledTenders,
      totalContracts,
      activeContracts,
      completedContracts,
      totalComplaints,
      pendingComplaints,
      verifiedComplaints,
      totalDisbursed: disbursedResult || 0,
      totalFundApproved: fundApproved || 0,
    });
  } catch (err) {
    console.error("Analytics overview error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /tender-by-status — Tender counts grouped by status (for pie/bar chart)
   ═══════════════════════════════════════════════════════════════════ */
router.get("/tender-by-status", authenticate, authorize("central_gov", "state_gov"), async (req, res) => {
  try {
    const stateFilter = req.user.role === "state_gov" ? { state_id: req.user.state_id } : {};

    const data = await Tender.findAll({
      where: stateFilter,
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      group: ["status"],
      raw: true,
    });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /tender-by-category — Tender counts grouped by category
   ═══════════════════════════════════════════════════════════════════ */
router.get("/tender-by-category", authenticate, authorize("central_gov", "state_gov"), async (req, res) => {
  try {
    const stateFilter = req.user.role === "state_gov" ? { state_id: req.user.state_id } : {};

    const data = await Tender.findAll({
      where: stateFilter,
      attributes: ["category", [fn("COUNT", col("id")), "count"]],
      group: ["category"],
      raw: true,
    });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /complaint-by-status — Complaint counts grouped by status
   ═══════════════════════════════════════════════════════════════════ */
router.get("/complaint-by-status", authenticate, authorize("central_gov", "state_gov", "auditor_ngo"), async (req, res) => {
  try {
    const data = await Complaint.findAll({
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      group: ["status"],
      raw: true,
    });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /spend-by-state — Total contract value per state
   ═══════════════════════════════════════════════════════════════════ */
router.get("/spend-by-state", authenticate, authorize("central_gov"), async (req, res) => {
  try {
    const data = await Contract.findAll({
      attributes: [[fn("SUM", col("Contract.total_amount")), "total"]],
      include: [{
        model: Tender,
        attributes: [],
        include: [{ model: State, attributes: ["name", "code"] }],
      }],
      group: ["Tender.State.id", "Tender.State.name", "Tender.State.code", "Tender.id"],
      raw: true,
      nest: true,
    });

    // Aggregate by state
    const byState = {};
    for (const row of data) {
      const key = row.Tender?.State?.code || "Unknown";
      const name = row.Tender?.State?.name || "Unknown";
      if (!byState[key]) byState[key] = { state: name, code: key, total: 0 };
      byState[key].total += parseFloat(row.total || 0);
    }
    res.json({ data: Object.values(byState) });
  } catch (err) {
    console.error("Spend by state error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /monthly-tenders — Tender creation count per month (last 12 months)
   ═══════════════════════════════════════════════════════════════════ */
router.get("/monthly-tenders", authenticate, authorize("central_gov", "state_gov"), async (req, res) => {
  try {
    const stateFilter = req.user.role === "state_gov" ? { state_id: req.user.state_id } : {};
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const data = await Tender.findAll({
      where: { ...stateFilter, createdAt: { [Op.gte]: twelveMonthsAgo } },
      attributes: [
        [fn("DATE_TRUNC", "month", col("createdAt")), "month"],
        [fn("COUNT", col("id")), "count"],
      ],
      group: [fn("DATE_TRUNC", "month", col("createdAt"))],
      order: [[fn("DATE_TRUNC", "month", col("createdAt")), "ASC"]],
      raw: true,
    });
    res.json({ data });
  } catch (err) {
    console.error("Monthly tenders error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

module.exports = router;
