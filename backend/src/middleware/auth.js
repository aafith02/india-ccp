const jwt = require("jsonwebtoken");
const { User, State } = require("../models");

const SECRET = process.env.JWT_SECRET || "dev-secret";

/* ── Generate token ── */
function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, state_id: user.state_id },
    SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

/* ── Verify token middleware ── */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer "))
      return res.status(401).json({ error: "No token provided" });

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, SECRET);

    const user = await User.findByPk(decoded.id, {
      include: [{ model: State, attributes: ["id", "name", "code", "logo_url", "map_url", "theme"] }],
      attributes: { exclude: ["password_hash"] },
    });
    if (!user) return res.status(401).json({ error: "User not found" });
    if (user.is_blacklisted) return res.status(403).json({ error: "Account suspended" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = { signToken, authenticate };
