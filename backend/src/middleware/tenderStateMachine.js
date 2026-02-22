/**
 * Tender Status State Machine
 * Enforces valid status transitions only.
 */

const VALID_TRANSITIONS = {
  draft:       ["open", "cancelled"],
  open:        ["closed", "cancelled"],
  closed:      ["awarded", "open", "cancelled"],   // can reopen or award
  awarded:     ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed:   [],                                   // terminal state
  cancelled:   [],                                   // terminal state
};

/**
 * Check if a tender status transition is valid.
 * @param {string} currentStatus
 * @param {string} newStatus
 * @returns {boolean}
 */
function isValidTransition(currentStatus, newStatus) {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(newStatus);
}

/**
 * Get all valid next states from current status.
 * @param {string} currentStatus
 * @returns {string[]}
 */
function getValidTransitions(currentStatus) {
  return VALID_TRANSITIONS[currentStatus] || [];
}

module.exports = { isValidTransition, getValidTransitions, VALID_TRANSITIONS };
