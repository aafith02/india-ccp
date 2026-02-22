const { PointsLedger, User } = require("../models");

/* ── Award/deduct points and update user total (transaction-safe) ── */
async function adjustPoints({ user_id, points, reason, reference_type, reference_id, transaction }) {
  try {
    const opts = transaction ? { transaction } : {};
    await PointsLedger.create({ user_id, points, reason, reference_type, reference_id }, opts);
    await User.increment("points", { by: points, where: { id: user_id }, ...opts });
    return true;
  } catch (err) {
    console.error("Points error:", err.message);
    return false;
  }
}

/* ── Adjust reputation score (transaction-safe) ── */
async function adjustReputation({ user_id, delta, transaction }) {
  try {
    const opts = transaction ? { transaction } : {};
    await User.increment("reputation", { by: delta, where: { id: user_id }, ...opts });
    // Auto-flag for blacklist review if reputation drops below -20
    const user = await User.findByPk(user_id, { attributes: ["reputation"], ...opts });
    return { updated: true, reputation: user?.reputation ?? 0 };
  } catch (err) {
    console.error("Reputation error:", err.message);
    return { updated: false };
  }
}

/* Reputation deltas */
const REPUTATION = {
  CONTRACT_COMPLETED:        5,   // contractor completes full project
  TRANCHE_APPROVED:          2,   // per tranche verified successfully
  COMPLAINT_CONFIRMED_CONTRACTOR: -10, // contractor with valid complaint
  COMPLAINT_CONFIRMED_APPROVER:   -15, // state_gov who approved faked work
  FALSE_COMPLAINT_REPORTER:  -3,  // reporter who filed a fake complaint
  COMPLAINT_VALID_REPORTER:   2,  // reporter whose complaint was valid
};

/* Point values */
const POINTS = {
  PROJECT_COMPLETION:     100,   // contractor completes full project
  TRANCHE_APPROVED:        20,   // per tranche verified successfully
  VERIFICATION_VOTE:        5,   // state_gov member votes on proof
  COMPLAINT_CONFIRMED:     10,   // community member's complaint was valid
  PENALTY_FAKE_APPROVAL:  -50,   // state_gov who approved faked work
  PENALTY_COMPLAINT:      -30,   // contractor with valid complaint against them
  PENALTY_FALSE_COMPLAINT: -20,  // community member filed a fake complaint
};

module.exports = { adjustPoints, adjustReputation, POINTS, REPUTATION };
