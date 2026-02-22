const router = require("express").Router();
const { PointsLedger, User } = require("../models");
const { authenticate } = require("../middleware/auth");

/* ═══════════════════════════════════════════════════════════════════
   GET /my — My points and history
   ═══════════════════════════════════════════════════════════════════ */
router.get("/my", authenticate, async (req, res) => {
  try {
    const history = await PointsLedger.findAll({
      where: { user_id: req.user.id },
      order: [["createdAt", "DESC"]],
      limit: 50,
    });
    res.json({ total: req.user.points, history });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch points" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /leaderboard — Top users by points
   ═══════════════════════════════════════════════════════════════════ */
router.get("/leaderboard", async (req, res) => {
  try {
    const role = req.query.role;
    const where = { is_blacklisted: false };
    if (role) where.role = role;

    const users = await User.findAll({
      where,
      attributes: ["id", "name", "role", "points", "reputation"],
      order: [["points", "DESC"]],
      limit: 50,
    });
    res.json({ leaderboard: users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /user/:userId — Points history for a user (admin/self)
   ═══════════════════════════════════════════════════════════════════ */
router.get("/user/:userId", authenticate, async (req, res) => {
  try {
    // Only self, central_gov or state_gov can view
    if (req.user.id !== req.params.userId && !["central_gov", "state_gov"].includes(req.user.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const history = await PointsLedger.findAll({
      where: { user_id: req.params.userId },
      order: [["createdAt", "DESC"]],
    });
    const user = await User.findByPk(req.params.userId, { attributes: ["id", "name", "points", "role"] });
    res.json({ user, history });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch points" });
  }
});

module.exports = router;
