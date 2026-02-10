require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { sequelize } = require("./models");

const app = express();

/* ── Global middleware ── */
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ── Health check ── */
app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

/* ── Routes ── */
app.use("/api/auth",       require("./routes/auth"));
app.use("/api/states",     require("./routes/states"));
app.use("/api/funding",    require("./routes/funding"));
app.use("/api/tenders",    require("./routes/tenders"));
app.use("/api/bids",       require("./routes/bids"));
app.use("/api/contracts",  require("./routes/contracts"));
app.use("/api/milestones", require("./routes/milestones"));
app.use("/api/complaints", require("./routes/complaints"));
app.use("/api/chatbot",    require("./routes/chatbot"));
app.use("/api/public",     require("./routes/public"));

/* ── Error handler ── */
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

/* ── Start ── */
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log("📦 Database connected");
    await sequelize.sync({ alter: true });
    console.log("📐 Models synced");
    app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));
  } catch (err) {
    console.error("Failed to start:", err);
    process.exit(1);
  }
}

start();
