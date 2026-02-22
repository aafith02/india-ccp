const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { User, State } = require("../models");
const { signToken, generateSignature, authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");
const { writeAudit } = require("../middleware/auditLog");
const { loginRules, registerRules, validate } = require("../middleware/validation");

/* ═══════════════════════════════════════════════════════════════════
   POST /register — Public registration
   Community: just email + password + name
   Contractor: more fields + KYC pending
   ═══════════════════════════════════════════════════════════════════ */
router.post("/register", registerRules, validate, async (req, res) => {
  try {
    const { name, email, password, role, state_id, kyc_data } = req.body;

    // Only community and contractor can self-register
    if (!["community", "contractor"].includes(role)) {
      return res.status(400).json({ error: "Only community and contractor accounts can self-register" });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    // Contractor needs state and KYC data
    if (role === "contractor") {
      if (!state_id) return res.status(400).json({ error: "Contractors must select a state" });
      if (!kyc_data || !kyc_data.id_number || !kyc_data.business_name) {
        return res.status(400).json({ error: "Contractors must provide KYC details (id_number, business_name)" });
      }
    }

    // Check duplicate
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    const password_hash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name, email, password_hash, role,
      state_id: role === "contractor" ? state_id : (state_id || null),
      kyc_status: role === "contractor" ? "pending" : "not_required",
      kyc_data: role === "contractor" ? kyc_data : {},
    });

    const token = signToken(user);

    await writeAudit({
      actor_id: user.id, actor_role: role, actor_name: name,
      action: "USER_REGISTERED", entity_type: "user", entity_id: user.id,
      details: { role, state_id },
    });

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, state_id: user.state_id, kyc_status: user.kyc_status, points: user.points },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /login
   ═══════════════════════════════════════════════════════════════════ */
router.post("/login", loginRules, validate, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({
      where: { email },
      include: [{ model: State, attributes: ["id", "name", "code", "theme", "symbol", "languages"] }],
    });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.is_blacklisted) return res.status(403).json({ error: "Account blacklisted" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user);

    await writeAudit({
      actor_id: user.id, actor_role: user.role, actor_name: user.name,
      action: "USER_LOGIN", entity_type: "user", entity_id: user.id,
    });

    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        state_id: user.state_id, State: user.State,
        kyc_status: user.kyc_status, points: user.points, reputation: user.reputation,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /me — Current user profile
   ═══════════════════════════════════════════════════════════════════ */
router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

/* ═══════════════════════════════════════════════════════════════════
   POST /create-ngo — Central gov creates NGO/auditor account
   ═══════════════════════════════════════════════════════════════════ */
router.post("/create-ngo", authenticate, authorize("central_gov"), async (req, res) => {
  try {
    const { name, email, password, state_id } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    const password_hash = await bcrypt.hash(password, 12);
    const ngo = await User.create({
      name, email, password_hash,
      role: "auditor_ngo",
      state_id: state_id || null,
      kyc_status: "not_required",
      created_by: req.user.id,
    });

    const sig = generateSignature(req.user.id, "CREATE_NGO", ngo.id);
    await writeAudit({
      actor_id: req.user.id, actor_role: "central_gov", actor_name: req.user.name,
      action: "NGO_CREATED", entity_type: "user", entity_id: ngo.id,
      details: { ngo_name: name, state_id }, signature_hash: sig,
    });

    res.status(201).json({ message: "NGO account created", user: { id: ngo.id, name: ngo.name, email: ngo.email, role: ngo.role } });
  } catch (err) {
    console.error("Create NGO error:", err);
    res.status(500).json({ error: "Failed to create NGO account" });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /create-state-member — Central gov creates state_gov member
   ═══════════════════════════════════════════════════════════════════ */
router.post("/create-state-member", authenticate, authorize("central_gov"), async (req, res) => {
  try {
    const { name, email, password, state_id } = req.body;
    if (!name || !email || !password || !state_id) {
      return res.status(400).json({ error: "Name, email, password, and state_id are required" });
    }
    const state = await State.findByPk(state_id);
    if (!state) return res.status(404).json({ error: "State not found" });

    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    const password_hash = await bcrypt.hash(password, 12);
    const member = await User.create({
      name, email, password_hash,
      role: "state_gov",
      state_id,
      kyc_status: "not_required",
      created_by: req.user.id,
    });

    const sig = generateSignature(req.user.id, "CREATE_STATE_MEMBER", member.id);
    await writeAudit({
      actor_id: req.user.id, actor_role: "central_gov", actor_name: req.user.name,
      action: "STATE_MEMBER_CREATED", entity_type: "user", entity_id: member.id,
      details: { member_name: name, state_id, state_name: state.name }, signature_hash: sig,
    });

    res.status(201).json({ message: "State member created", user: { id: member.id, name: member.name, email: member.email, role: member.role, state_id: member.state_id } });
  } catch (err) {
    console.error("Create state member error:", err);
    res.status(500).json({ error: "Failed to create state member" });
  }
});

module.exports = router;
