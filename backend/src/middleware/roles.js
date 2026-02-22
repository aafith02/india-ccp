/* ── Role-based access control ── */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

/* ── Same-state guard (non-central users can only access their own state) ── */
function sameState(req, res, next) {
  if (req.user.role === "central_gov") return next();
  const paramState = req.params.stateId || req.body.state_id || req.query.state_id;
  if (paramState && paramState !== req.user.state_id) {
    return res.status(403).json({ error: "Cross-state access denied" });
  }
  next();
}

module.exports = { authorize, sameState };
