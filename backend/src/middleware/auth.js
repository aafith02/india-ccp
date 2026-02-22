const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { User, State } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRY = process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRY || "7d";

/* ── Sign JWT ── */
function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, state_id: user.state_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/* ── Generate signature hash for accountability ── */
function generateSignature(actorId, action, entityId) {
  const payload = `${actorId}:${action}:${entityId}:${Date.now()}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/* ── Authenticate middleware ── */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ["password_hash"] },
      include: [{ model: State, attributes: ["id", "name", "code", "theme", "symbol", "languages"] }],
    });
    if (!user) return res.status(401).json({ error: "User not found" });
    if (user.is_blacklisted) return res.status(403).json({ error: "Account blacklisted" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = { signToken, generateSignature, authenticate };
