const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { User, State } = require("../models");
const { signToken, authenticate } = require("../middleware/auth");
const { writeAudit } = require("../middleware/auditLog");

/* ── Register ── */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, state_id, kyc_data } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ error: "name, email, password, role required" });

    if (await User.findOne({ where: { email } }))
      return res.status(409).json({ error: "Email already registered" });

    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password_hash, role, state_id, kyc_data });

    await writeAudit({ actor_id: user.id, actor_role: role, action: "USER_REGISTER", entity_type: "user", entity_id: user.id, ip_address: req.ip });

    res.status(201).json({ id: user.id, token: signToken(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Login ── */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({
      where: { email },
      include: [{ model: State, attributes: ["id", "name", "code", "logo_url", "map_url", "theme"] }],
    });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.is_blacklisted) return res.status(403).json({ error: "Account suspended" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    await writeAudit({ actor_id: user.id, actor_role: user.role, action: "USER_LOGIN", entity_type: "user", entity_id: user.id, ip_address: req.ip });

    res.json({
      token: signToken(user),
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, state_id: user.state_id,
        kyc_status: user.kyc_status, reputation: user.reputation,
        state: user.State,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Me ── */
router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
