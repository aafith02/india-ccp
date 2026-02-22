const { Notification, User } = require("../models");

/* ── Send notification to a single user ── */
async function notifyUser({ user_id, type, title, message, entity_type, entity_id, metadata }) {
  try {
    return await Notification.create({ user_id, type, title, message, entity_type, entity_id, metadata });
  } catch (err) {
    console.error("Notification error:", err.message);
  }
}

/* ── Send notification to all users matching roles + optional state ── */
async function notifyByRole({ roles, state_id, type, title, message, entity_type, entity_id, metadata }) {
  try {
    const where = { role: roles };
    if (state_id) where.state_id = state_id;
    const users = await User.findAll({ where, attributes: ["id"] });
    if (!users.length) return;
    const records = users.map(u => ({
      user_id: u.id, type, title, message, entity_type, entity_id, metadata: metadata || {},
    }));
    return await Notification.bulkCreate(records);
  } catch (err) {
    console.error("Bulk notification error:", err.message);
  }
}

module.exports = { notifyUser, notifyByRole };
