const router = require("express").Router();
const { Notification } = require("../models");
const { authenticate } = require("../middleware/auth");

/* GET / — User's notifications */
router.get("/", authenticate, async (req, res) => {
  try {
    const where = { user_id: req.user.id };
    if (req.query.unread_only === "true") where.is_read = false;
    const limit = parseInt(req.query.limit) || 20;

    const notifications = await Notification.findAll({
      where, order: [["createdAt", "DESC"]], limit,
    });
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

/* GET /unread-count */
router.get("/unread-count", authenticate, async (req, res) => {
  try {
    const count = await Notification.count({ where: { user_id: req.user.id, is_read: false } });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

/* PATCH /:id/read */
router.patch("/:id/read", authenticate, async (req, res) => {
  try {
    const n = await Notification.findByPk(req.params.id);
    if (!n || n.user_id !== req.user.id) return res.status(404).json({ error: "Not found" });
    await n.update({ is_read: true });
    res.json({ notification: n });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

/* PATCH /read-all */
router.patch("/read-all", authenticate, async (req, res) => {
  try {
    await Notification.update({ is_read: true }, { where: { user_id: req.user.id, is_read: false } });
    res.json({ message: "All marked read" });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

module.exports = router;
