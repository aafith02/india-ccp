const router = require("express").Router();
const { FundRequest, State, User } = require("../models");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");
const { auditMiddleware } = require("../middleware/auditLog");

/* ── State requests fund from central ── */
router.post(
  "/",
  authenticate,
  authorize("state_gov"),
  auditMiddleware("FUND_REQUEST_CREATE", "fund_request"),
  async (req, res) => {
    try {
      const { amount, purpose } = req.body;
      if (!amount || !purpose) return res.status(400).json({ error: "amount and purpose required" });

      const fund = await FundRequest.create({
        state_id: req.user.state_id,
        requested_by: req.user.id,
        amount,
        purpose,
      });
      res.status(201).json(fund);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ── Central gov lists all fund requests ── */
router.get("/", authenticate, authorize("central_gov", "state_gov"), async (req, res) => {
  const where = req.user.role === "state_gov" ? { state_id: req.user.state_id } : {};
  const funds = await FundRequest.findAll({
    where,
    include: [
      { model: State, attributes: ["name", "code"] },
      { model: User, as: "requestedBy", attributes: ["name"] },
    ],
    order: [["createdAt", "DESC"]],
  });
  res.json(funds);
});

/* ── Central gov approves / rejects ── */
router.patch(
  "/:id",
  authenticate,
  authorize("central_gov"),
  auditMiddleware("FUND_REQUEST_UPDATE", "fund_request"),
  async (req, res) => {
    const fund = await FundRequest.findByPk(req.params.id);
    if (!fund) return res.status(404).json({ error: "Not found" });

    const { status, approved_amount, remarks } = req.body;
    if (status) fund.status = status;
    if (approved_amount) fund.approved_amount = approved_amount;
    if (remarks) fund.remarks = remarks;
    fund.approved_by = req.user.id;
    await fund.save();
    res.json(fund);
  }
);

module.exports = router;
