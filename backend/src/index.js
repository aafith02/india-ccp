require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");
const { sequelize } = require("./models");

const app = express();

/* ── Rate limiting ── */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                    // 30 attempts per window
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ── Global middleware ── */
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ── Serve uploaded files ── */
const uploadDir = path.resolve(__dirname, "../", process.env.UPLOAD_DIR || "uploads");
app.use("/uploads", express.static(uploadDir));

/* ── Health check ── */
app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

/* ── Routes ── */
app.use("/api/auth",          authLimiter, require("./routes/auth"));
app.use("/api/states",        require("./routes/states"));
app.use("/api/funding",       require("./routes/funding"));
app.use("/api/tenders",       require("./routes/tenders"));
app.use("/api/bids",          require("./routes/bids"));
app.use("/api/contracts",     require("./routes/contracts"));
app.use("/api/milestones",    require("./routes/milestones"));
app.use("/api/complaints",    require("./routes/complaints"));
app.use("/api/chatbot",       require("./routes/chatbot"));
app.use("/api/public",        require("./routes/public"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/work-proofs",   require("./routes/workProofs"));
app.use("/api/kyc",           require("./routes/kyc"));
app.use("/api/points",        require("./routes/points"));
app.use("/api/analytics",     require("./routes/analytics"));
app.use("/api/cases",         require("./routes/cases"));
app.use("/api/blacklist",     require("./routes/blacklist"));

/* ── Multer error handler ── */
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large. Maximum size is 10MB." });
  }
  if (err.message?.includes("File type")) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

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
    console.log("Database connected");
    await sequelize.sync({ alter: true });
    console.log("Models synced");
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  } catch (err) {
    console.error("Failed to start:", err);
    process.exit(1);
  }
}

start();
