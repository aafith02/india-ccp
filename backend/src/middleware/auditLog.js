const crypto = require("crypto");
const { AuditLog } = require("../models");

let lastHash = "GENESIS";

/* ── Initialize chain from DB on startup ── */
async function initChain() {
  try {
    const last = await AuditLog.findOne({ order: [["createdAt", "DESC"]] });
    if (last) lastHash = last.entry_hash;
  } catch (e) { /* first run */ }
}
initChain();

/* ── Write a chain-hashed audit entry ── */
async function writeAudit({ actor_id, actor_role, actor_name, action, entity_type, entity_id, details, ip_address, signature_hash }) {
  const prev_hash = lastHash;
  const raw = JSON.stringify({ prev_hash, actor_id, action, entity_type, entity_id, details, ts: Date.now() });
  const entry_hash = crypto.createHash("sha256").update(raw).digest("hex");
  lastHash = entry_hash;

  return AuditLog.create({
    actor_id, actor_role, actor_name, action,
    entity_type, entity_id,
    details: details || {},
    ip_address,
    prev_hash, entry_hash, signature_hash,
  });
}

module.exports = { writeAudit };
