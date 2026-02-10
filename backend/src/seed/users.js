/**
 * Seed test users for all roles.
 * Run: node src/seed/users.js
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { sequelize, User, State } = require("../models");

const defaultPassword = "Password123!";

async function getStateId(code) {
  const state = await State.findOne({ where: { code } });
  return state ? state.id : null;
}

async function seed() {
  try {
    await sequelize.sync({ alter: true });

    const password_hash = await bcrypt.hash(defaultPassword, 12);

    const kaId = await getStateId("KA");
    const mhId = await getStateId("MH");
    const dlId = await getStateId("DL");

    const users = [
      // Central Gov
      { name: "Central Admin", email: "central@gov.test", role: "central_gov" },

      // State Gov
      { name: "Karnataka Admin", email: "ka.state@gov.test", role: "state_gov", state_id: kaId },
      { name: "Maharashtra Admin", email: "mh.state@gov.test", role: "state_gov", state_id: mhId },

      // Contractors
      { name: "Ka Builder Co", email: "ka.contractor@test.com", role: "contractor", state_id: kaId, kyc_status: "verified", reputation: 25 },
      { name: "Mh Infra Ltd", email: "mh.contractor@test.com", role: "contractor", state_id: mhId, kyc_status: "verified", reputation: 42 },
      { name: "Dl Works", email: "dl.contractor@test.com", role: "contractor", state_id: dlId, kyc_status: "verified", reputation: 18 },

      // Auditor/NGO
      { name: "Audit NGO", email: "auditor@ngo.test", role: "auditor_ngo" },

      // Community
      { name: "Community User", email: "community@test.com", role: "community" },
    ];

    for (const u of users) {
      const [user, created] = await User.findOrCreate({
        where: { email: u.email },
        defaults: { ...u, password_hash },
      });

      if (!created) {
        // Keep existing password; update role/state if missing
        if (!user.role || user.role !== u.role || user.state_id !== u.state_id) {
          user.role = u.role;
          user.state_id = u.state_id || null;
          if (u.kyc_status) user.kyc_status = u.kyc_status;
          if (typeof u.reputation === "number") user.reputation = u.reputation;
          await user.save();
        }
      }
    }

    console.log("✅ Seeded test users for all roles");
    console.log(`Default password for seeded users: ${defaultPassword}`);
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seed();
