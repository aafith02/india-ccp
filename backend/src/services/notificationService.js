const { Notification, User } = require("../models");

/**
 * Send a notification to a specific user.
 */
async function notifyUser({ user_id, type, title, message, entity_type, entity_id, metadata = {} }) {
  try {
    return await Notification.create({
      user_id, type, title, message, entity_type, entity_id, metadata,
    });
  } catch (err) {
    console.error("Failed to create notification:", err.message);
    return null;
  }
}

/**
 * Send notifications to all users with a specific role in a specific state.
 * Used to notify NGOs and community members when proof is uploaded.
 */
async function notifyByRole({ roles, state_id, type, title, message, entity_type, entity_id, metadata = {} }) {
  try {
    const where = { role: roles };
    if (state_id) where.state_id = state_id;

    const users = await User.findAll({
      where,
      attributes: ["id"],
    });

    const notifications = users.map(u => ({
      user_id: u.id,
      type, title, message, entity_type, entity_id, metadata,
    }));

    if (notifications.length > 0) {
      await Notification.bulkCreate(notifications);
    }

    return notifications.length;
  } catch (err) {
    console.error("Failed to send role notifications:", err.message);
    return 0;
  }
}

module.exports = { notifyUser, notifyByRole };
