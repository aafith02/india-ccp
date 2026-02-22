const router = require("express").Router();
const { Milestone, Contract, Payment, ContractTranche } = require("../models");
const { authenticate } = require("../middleware/auth");

/* GET /contract/:contractId — List milestones */
router.get("/contract/:contractId", authenticate, async (req, res) => {
  try {
    const milestones = await Milestone.findAll({
      where: { contract_id: req.params.contractId },
      include: [{ model: Payment }],
      order: [["sequence", "ASC"]],
    });
    res.json({ milestones });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch milestones" });
  }
});

module.exports = router;
