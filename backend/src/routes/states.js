const router = require("express").Router();
const { State, Tender, User } = require("../models");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/roles");

/* ── List all states ── */
router.get("/", async (_req, res) => {
  const states = await State.findAll({ order: [["name", "ASC"]] });
  res.json(states);
});

/* ── Get single state with stats ── */
router.get("/:id", async (req, res) => {
  const state = await State.findByPk(req.params.id, {
    include: [
      { model: Tender, attributes: ["id", "title", "status"] },
    ],
  });
  if (!state) return res.status(404).json({ error: "State not found" });

  const contractorCount = await User.count({ where: { state_id: state.id, role: "contractor" } });
  res.json({ ...state.toJSON(), contractorCount });
});

/* ── Update state theme/assets (central gov only) ── */
router.put("/:id", authenticate, authorize("central_gov"), async (req, res) => {
  const state = await State.findByPk(req.params.id);
  if (!state) return res.status(404).json({ error: "State not found" });

  const { theme, logo_url, map_url } = req.body;
  if (theme) state.theme = theme;
  if (logo_url) state.logo_url = logo_url;
  if (map_url) state.map_url = map_url;
  await state.save();
  res.json(state);
});

module.exports = router;
