/**
 * Seed test users for all roles (v2).
 * Run: node src/seed/users.js
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { sequelize, User, State } = require("../models");

const defaultPassword = "Password123!";

async function seed() {
  try {
    await sequelize.sync({ alter: true });
    const password_hash = await bcrypt.hash(defaultPassword, 12);
    const states = await State.findAll({ attributes: ["id", "name", "code"] });
    const stateByCode = Object.fromEntries(states.map((state) => [state.code, state]));
    const kaId = stateByCode.KA?.id || null;
    const mhId = stateByCode.MH?.id || null;
    const dlId = stateByCode.DL?.id || null;

    // We need central to exist first to set created_by
    const [centralUser] = await User.findOrCreate({
      where: { email: "central@gov.test" },
      defaults: { name: "Central Admin", email: "central@gov.test", role: "central_gov", password_hash },
    });

    const stateGovUsers = states.map((state) => ({
      name: `${state.name} State Officer`,
      email: `${String(state.code).toLowerCase()}.state@gov.test`,
      role: "state_gov",
      state_id: state.id,
      created_by: centralUser.id,
    }));

    const users = [
      ...stateGovUsers,

      // NGO (created by central)
      { name: "Transparency India NGO", email: "ngo1@org.test", role: "auditor_ngo", created_by: centralUser.id },
      { name: "Jan Jagriti NGO", email: "ngo2@org.test", role: "auditor_ngo", created_by: centralUser.id },

      // Contractors (self-registered with KYC)
      { name: "Ka Builder Co", email: "ka.contractor@test.com", role: "contractor", state_id: kaId, kyc_status: "verified", kyc_data: { id_number: "AADHAR-1234-5678", business_name: "Ka Builder Co Pvt Ltd" } },
      { name: "Ka Roads Pvt Ltd", email: "ka.contractor2@test.com", role: "contractor", state_id: kaId, kyc_status: "verified", kyc_data: { id_number: "AADHAR-8765-4321", business_name: "Ka Roads Pvt Ltd" } },
      { name: "Mh Infra Ltd", email: "mh.contractor@test.com", role: "contractor", state_id: mhId, kyc_status: "verified", kyc_data: { id_number: "AADHAR-1111-2222", business_name: "Mh Infra Ltd" } },
      { name: "Dl Works", email: "dl.contractor@test.com", role: "contractor", state_id: dlId, kyc_status: "pending", kyc_data: { id_number: "AADHAR-3333-4444", business_name: "Dl Works" } },

      // Community (self-registered)
      { name: "Ravi Kumar", email: "community@test.com", role: "community", state_id: kaId },
      { name: "Priya Sharma", email: "community2@test.com", role: "community", state_id: mhId },
    ];

    for (const u of users) {
      await User.findOrCreate({
        where: { email: u.email },
        defaults: { ...u, password_hash },
      });
    }

    console.log("Seeded test users for all roles (v2)");
    console.log(`Default password: ${defaultPassword}`);
    console.log("Central login: central@gov.test");
    console.log(`State gov logins created: ${stateGovUsers.length} (pattern: <state_code>.state@gov.test)`);
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seed();
