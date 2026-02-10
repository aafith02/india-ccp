/**
 * Seed all 28 Indian states + 8 UTs with theme colors.
 * Run: node src/seed/states.js
 */
require("dotenv").config();
const { sequelize, State } = require("../models");

const states = [
  { name: "Andhra Pradesh",       code: "AP",  theme: { primary: "#1e6f5c", secondary: "#e8c547", bg: "#f5f1e8" } },
  { name: "Arunachal Pradesh",    code: "AR",  theme: { primary: "#2d6a4f", secondary: "#d4a276", bg: "#faf7f2" } },
  { name: "Assam",                code: "AS",  theme: { primary: "#6b4226", secondary: "#e6c229", bg: "#fff8e7" } },
  { name: "Bihar",                code: "BR",  theme: { primary: "#b5651d", secondary: "#4a7c59", bg: "#fdf6ec" } },
  { name: "Chhattisgarh",         code: "CG",  theme: { primary: "#2e7d32", secondary: "#ff8f00", bg: "#f1f8e9" } },
  { name: "Goa",                  code: "GA",  theme: { primary: "#00838f", secondary: "#f9a825", bg: "#e0f7fa" } },
  { name: "Gujarat",              code: "GJ",  theme: { primary: "#c62828", secondary: "#fbc02d", bg: "#fff3e0" } },
  { name: "Haryana",              code: "HR",  theme: { primary: "#1565c0", secondary: "#43a047", bg: "#e3f2fd" } },
  { name: "Himachal Pradesh",     code: "HP",  theme: { primary: "#283593", secondary: "#66bb6a", bg: "#e8eaf6" } },
  { name: "Jharkhand",            code: "JH",  theme: { primary: "#4e342e", secondary: "#7cb342", bg: "#efebe9" } },
  { name: "Karnataka",            code: "KA",  theme: { primary: "#ad1457", secondary: "#fdd835", bg: "#fce4ec" } },
  { name: "Kerala",               code: "KL",  theme: { primary: "#00695c", secondary: "#ffb300", bg: "#e0f2f1" } },
  { name: "Madhya Pradesh",       code: "MP",  theme: { primary: "#2e7d32", secondary: "#ff6f00", bg: "#f1f8e9" } },
  { name: "Maharashtra",          code: "MH",  theme: { primary: "#e65100", secondary: "#1b5e20", bg: "#fff3e0" } },
  { name: "Manipur",              code: "MN",  theme: { primary: "#4527a0", secondary: "#e65100", bg: "#ede7f6" } },
  { name: "Meghalaya",            code: "ML",  theme: { primary: "#1b5e20", secondary: "#fbc02d", bg: "#e8f5e9" } },
  { name: "Mizoram",              code: "MZ",  theme: { primary: "#0277bd", secondary: "#ef6c00", bg: "#e1f5fe" } },
  { name: "Nagaland",             code: "NL",  theme: { primary: "#33691e", secondary: "#d84315", bg: "#f1f8e9" } },
  { name: "Odisha",               code: "OD",  theme: { primary: "#bf360c", secondary: "#0097a7", bg: "#fbe9e7" } },
  { name: "Punjab",               code: "PB",  theme: { primary: "#e65100", secondary: "#1565c0", bg: "#fff3e0" } },
  { name: "Rajasthan",            code: "RJ",  theme: { primary: "#b71c1c", secondary: "#f9a825", bg: "#fce4ec" } },
  { name: "Sikkim",               code: "SK",  theme: { primary: "#00838f", secondary: "#ff8f00", bg: "#e0f7fa" } },
  { name: "Tamil Nadu",           code: "TN",  theme: { primary: "#880e4f", secondary: "#fdd835", bg: "#fce4ec" } },
  { name: "Telangana",            code: "TS",  theme: { primary: "#1a237e", secondary: "#ffab00", bg: "#e8eaf6" } },
  { name: "Tripura",              code: "TR",  theme: { primary: "#4a148c", secondary: "#00c853", bg: "#f3e5f5" } },
  { name: "Uttar Pradesh",        code: "UP",  theme: { primary: "#0d47a1", secondary: "#e65100", bg: "#e3f2fd" } },
  { name: "Uttarakhand",          code: "UK",  theme: { primary: "#1b5e20", secondary: "#01579b", bg: "#e8f5e9" } },
  { name: "West Bengal",          code: "WB",  theme: { primary: "#311b92", secondary: "#f57f17", bg: "#ede7f6" } },
  // Union Territories
  { name: "Andaman & Nicobar",    code: "AN",  theme: { primary: "#006064", secondary: "#ff6d00", bg: "#e0f7fa" } },
  { name: "Chandigarh",           code: "CH",  theme: { primary: "#37474f", secondary: "#ffab00", bg: "#eceff1" } },
  { name: "Dadra Nagar Haveli & Daman Diu", code: "DD", theme: { primary: "#004d40", secondary: "#ff8f00", bg: "#e0f2f1" } },
  { name: "Delhi",                code: "DL",  theme: { primary: "#b71c1c", secondary: "#1565c0", bg: "#ffebee" } },
  { name: "Jammu & Kashmir",      code: "JK",  theme: { primary: "#1a237e", secondary: "#2e7d32", bg: "#e8eaf6" } },
  { name: "Ladakh",               code: "LA",  theme: { primary: "#283593", secondary: "#ff8f00", bg: "#e8eaf6" } },
  { name: "Lakshadweep",          code: "LD",  theme: { primary: "#01579b", secondary: "#00c853", bg: "#e1f5fe" } },
  { name: "Puducherry",           code: "PY",  theme: { primary: "#880e4f", secondary: "#00838f", bg: "#fce4ec" } },
];

async function seed() {
  try {
    await sequelize.sync({ alter: true });
    for (const s of states) {
      await State.upsert(s);
    }
    console.log(`✅ Seeded ${states.length} states/UTs`);
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seed();
