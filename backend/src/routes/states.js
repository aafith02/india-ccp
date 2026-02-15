const router = require("express").Router();
const { State, Tender, User, Contract, Bid, Complaint, FundRequest, WorkProof } = require("../models");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");

/* ── List all states ── */
router.get("/", async (_req, res) => {
  try {
    const states = await State.findAll({ order: [["name", "ASC"]] });
    res.json(states);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Get single state with comprehensive stats ── */
router.get("/:id", async (req, res) => {
  try {
  const state = await State.findByPk(req.params.id, {
    include: [
      { model: Tender, attributes: ["id", "title", "status", "location", "district", "category"] },
    ],
  });
  if (!state) return res.status(404).json({ error: "State not found" });

  const contractorCount = await User.count({ where: { state_id: state.id, role: "contractor" } });
  const communityCount = await User.count({ where: { state_id: state.id, role: "community" } });
  const ngoCount = await User.count({ where: { role: "auditor_ngo" } });

  // Tender stats
  const tenderIds = state.Tenders.map(t => t.id);
  const totalBids = tenderIds.length > 0 ? await Bid.count({ where: { tender_id: tenderIds } }) : 0;
  const activeContracts = tenderIds.length > 0 ? await Contract.count({ where: { tender_id: tenderIds, status: "active" } }) : 0;
  const completedContracts = tenderIds.length > 0 ? await Contract.count({ where: { tender_id: tenderIds, status: "completed" } }) : 0;
  const complaintCount = tenderIds.length > 0 ? await Complaint.count({ where: { tender_id: tenderIds } }) : 0;

  // Fund stats
  const fundRequests = await FundRequest.findAll({ where: { state_id: state.id } });
  const totalFundApproved = fundRequests
    .filter(f => f.status === "approved")
    .reduce((sum, f) => sum + parseFloat(f.approved_amount || 0), 0);
  const totalFundPending = fundRequests
    .filter(f => f.status === "pending")
    .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);

  // Pending verifications
  const pendingVerifications = tenderIds.length > 0
    ? await WorkProof.count({
        where: { status: "pending_review" },
        include: [{ model: Contract, where: { tender_id: tenderIds }, attributes: [] }],
      }).catch(() => 0)
    : 0;

  res.json({
    ...state.toJSON(),
    contractorCount,
    communityCount,
    ngoCount,
    totalBids,
    activeContracts,
    completedContracts,
    complaintCount,
    totalFundApproved,
    totalFundPending,
    pendingVerifications,
  });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Update state theme/assets (central gov only) ── */
router.put("/:id", authenticate, authorize("central_gov"), async (req, res) => {
  const state = await State.findByPk(req.params.id);
  if (!state) return res.status(404).json({ error: "State not found" });

  const { theme, logo_url, map_url } = req.body;
  if (theme) state.theme = theme;
  if (logo_url) state.logo_url = logo_url;
  if (map_url) state.map_url = map_url;
  await state.save();
  res.json(state);
});

module.exports = router;
