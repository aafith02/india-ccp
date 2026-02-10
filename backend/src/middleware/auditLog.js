const crypto = require("crypto");
const { AuditLog } = require("../models");

let lastHash = "GENESIS";

/**
 * Write an immutable audit log entry with chained hashes.
 */
async function writeAudit({ actor_id, actor_role, action, entity_type, entity_id, details = {}, ip_address }) {
  const payload = JSON.stringify({ actor_id, action, entity_type, entity_id, details, prev_hash: lastHash, ts: Date.now() });
  const entry_hash = crypto.createHash("sha256").update(payload).digest("hex");

  const entry = await AuditLog.create({
    actor_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    details,
    ip_address,
    prev_hash: lastHash,
    entry_hash,
  });

  lastHash = entry_hash;
  return entry;
}

/**
 * Express middleware — auto-log every mutating request.
 */
function auditMiddleware(action, entityType) {
  return async (req, res, next) => {
    // store original json to intercept response
    const originalJson = res.json.bind(res);
    res.json = async function (body) {
      if (res.statusCode < 400 && req.user) {
        try {
          await writeAudit({
            actor_id: req.user.id,
            actor_role: req.user.role,
            action,
            entity_type: entityType,
            entity_id: body?.id || req.params.id,
            details: { method: req.method, path: req.originalUrl },
            ip_address: req.ip,
          });
        } catch (_) { /* non-blocking */ }
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { writeAudit, auditMiddleware };
