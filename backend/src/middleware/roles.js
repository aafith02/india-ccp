/* Role-based access control middleware */

/**
 * Allow only specified roles.
 * Usage: router.get("/path", authenticate, authorize("central_gov","state_gov"), handler)
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!allowedRoles.includes(req.user.role))
      return res.status(403).json({ error: "Insufficient permissions" });
    next();
  };
}

/**
 * Ensure contractor can only act within their own state.
 */
function sameState(req, res, next) {
  const targetState = req.params.stateId || req.body.state_id;
  if (
    req.user.role !== "central_gov" &&
    targetState &&
    req.user.state_id !== targetState
  ) {
    return res.status(403).json({ error: "Cross-state access denied" });
  }
  next();
}

module.exports = { authorize, sameState };
