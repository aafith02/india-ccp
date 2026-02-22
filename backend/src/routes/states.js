const router = require("express").Router();
const { State, User, Tender, Contract, FundRequest, WorkProof, Bid } = require("../models");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");
const { Op } = require("sequelize");

/* GET / — List all states */
router.get("/", async (req, res) => {
  try {
    const states = await State.findAll({ order: [["name", "ASC"]] });
    res.json({ states });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch states" });
  }
});

/* GET /:id — State detail with stats */
router.get("/:id", async (req, res) => {
  try {
    const state = await State.findByPk(req.params.id);
    if (!state) return res.status(404).json({ error: "State not found" });

    // Aggregate stats
    const [stateGovCount, contractorCount, communityCount, tenderCount, contractCount, pendingKyc] = await Promise.all([
      User.count({ where: { state_id: state.id, role: "state_gov" } }),
      User.count({ where: { state_id: state.id, role: "contractor" } }),
      User.count({ where: { state_id: state.id, role: "community" } }),
      Tender.count({ where: { state_id: state.id } }),
      Contract.count({ include: [{ model: Tender, where: { state_id: state.id }, attributes: [] }] }),
      User.count({ where: { state_id: state.id, role: "contractor", kyc_status: "pending" } }),
    ]);

    res.json({
      state,
      stats: { stateGovCount, contractorCount, communityCount, tenderCount, contractCount, pendingKyc },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch state" });
  }
});

/* GET /:id/members — List state_gov members */
router.get("/:id/members", async (req, res) => {
  try {
    const members = await User.findAll({
      where: { state_id: req.params.id, role: "state_gov" },
      attributes: ["id", "name", "email", "points", "reputation", "createdAt"],
      order: [["name", "ASC"]],
    });
    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

/* GET /:id/finance — State financial summary (balance, received, allocated) */
router.get("/:id/finance", authenticate, authorize("state_gov", "central_gov"), async (req, res) => {
  try {
    const state = await State.findByPk(req.params.id);
    if (!state) return res.status(404).json({ error: "State not found" });

    // If state_gov, enforce same state
    if (req.user.role === "state_gov" && req.user.state_id !== state.id) {
      return res.status(403).json({ error: "Not your state" });
    }

    // Count active contracts & their total value
    const activeContracts = await Contract.findAll({
      include: [{ model: Tender, where: { state_id: state.id }, attributes: [] }],
      where: { status: "active" },
    });
    const activeContractValue = activeContracts.reduce((sum, c) => sum + parseFloat(c.total_amount), 0);

    // Pending fund requests
    const pendingRequests = await FundRequest.findAll({
      where: { state_id: state.id, status: "pending" },
    });
    const pendingAmount = pendingRequests.reduce((sum, f) => sum + parseFloat(f.amount), 0);

    res.json({
      balance: parseFloat(state.balance || 0),
      total_received: parseFloat(state.total_received || 0),
      total_allocated: parseFloat(state.total_allocated || 0),
      active_contract_value: activeContractValue,
      pending_fund_requests: pendingAmount,
      available_for_tenders: parseFloat(state.balance || 0),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch financial data" });
  }
});

module.exports = router;

