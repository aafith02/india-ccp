const router = require("express").Router();
const { Notification, User } = require("../models");
const { authenticate } = require("../middleware/auth");

/* ── Get my notifications ── */
router.get("/", authenticate, async (req, res) => {
  try {
    const { unread_only, limit = 50, page = 1 } = req.query;
    const where = { user_id: req.user.id };
    if (unread_only === "true") where.is_read = false;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    res.json({ total: count, page: parseInt(page), notifications: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Get unread count ── */
router.get("/unread-count", authenticate, async (req, res) => {
  try {
    const count = await Notification.count({ where: { user_id: req.user.id, is_read: false } });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Mark one as read ── */
router.patch("/:id/read", authenticate, async (req, res) => {
  try {
    const notif = await Notification.findByPk(req.params.id);
    if (!notif || notif.user_id !== req.user.id)
      return res.status(404).json({ error: "Notification not found" });

    notif.is_read = true;
    await notif.save();
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Mark all as read ── */
router.patch("/read-all", authenticate, async (req, res) => {
  try {
    await Notification.update({ is_read: true }, { where: { user_id: req.user.id, is_read: false } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
