const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

/* ───────── STATES ───────── */
const State = sequelize.define("State", {
  id:       { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:     { type: DataTypes.STRING, allowNull: false, unique: true },
  code:     { type: DataTypes.STRING(5), allowNull: false, unique: true },
  logo_url: { type: DataTypes.TEXT },
  map_url:  { type: DataTypes.TEXT },
  theme:    { type: DataTypes.JSONB, defaultValue: { primary: "#0d9488", secondary: "#d4a76a", bg: "#faf7f2" } },
}, { tableName: "states", timestamps: true });

/* ───────── USERS ───────── */
const User = sequelize.define("User", {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:          { type: DataTypes.STRING, allowNull: false },
  email:         { type: DataTypes.STRING, allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  role:          { type: DataTypes.ENUM("central_gov", "state_gov", "contractor", "community", "auditor_ngo"), allowNull: false },
  kyc_status:    { type: DataTypes.ENUM("pending", "verified", "rejected"), defaultValue: "pending" },
  kyc_data:      { type: DataTypes.JSONB, defaultValue: {} },
  reputation:    { type: DataTypes.FLOAT, defaultValue: 0 },
  is_blacklisted:{ type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: "users", timestamps: true });

/* ───────── FUND REQUESTS ───────── */
const FundRequest = sequelize.define("FundRequest", {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  amount:         { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  purpose:        { type: DataTypes.TEXT, allowNull: false },
  status:         { type: DataTypes.ENUM("pending", "approved", "rejected"), defaultValue: "pending" },
  approved_amount:{ type: DataTypes.DECIMAL(15, 2) },
  remarks:        { type: DataTypes.TEXT },
}, { tableName: "fund_requests", timestamps: true });

/* ───────── TENDERS ───────── */
const Tender = sequelize.define("Tender", {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title:          { type: DataTypes.STRING, allowNull: false },
  description:    { type: DataTypes.TEXT, allowNull: false },
  scope:          { type: DataTypes.TEXT },
  location:       { type: DataTypes.STRING },
  district:       { type: DataTypes.STRING },
  budget_hidden:  { type: DataTypes.DECIMAL(15, 2), allowNull: false },  // hidden from public
  bid_deadline:   { type: DataTypes.DATE, allowNull: false },
  project_deadline:{ type: DataTypes.DATE, allowNull: false },
  status:         { type: DataTypes.ENUM("draft", "open", "closed", "awarded", "in_progress", "completed", "cancelled"), defaultValue: "draft" },
  qualification:  { type: DataTypes.JSONB, defaultValue: {} },  // min requirements
}, { tableName: "tenders", timestamps: true });

/* ───────── BIDS ───────── */
const Bid = sequelize.define("Bid", {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  amount:         { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  proposal:       { type: DataTypes.TEXT },
  timeline_days:  { type: DataTypes.INTEGER },
  doc_hashes:     { type: DataTypes.JSONB, defaultValue: [] },   // hashes of uploaded docs
  ai_score:       { type: DataTypes.FLOAT },
  status:         { type: DataTypes.ENUM("submitted", "shortlisted", "awarded", "rejected"), defaultValue: "submitted" },
}, { tableName: "bids", timestamps: true });

/* ───────── CONTRACTS ───────── */
const Contract = sequelize.define("Contract", {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  award_date:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  total_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  status:       { type: DataTypes.ENUM("active", "completed", "terminated"), defaultValue: "active" },
  escrow_balance:{ type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
}, { tableName: "contracts", timestamps: true });

/* ───────── MILESTONES ───────── */
const Milestone = sequelize.define("Milestone", {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title:       { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  sequence:    { type: DataTypes.INTEGER, allowNull: false },
  amount:      { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  due_date:    { type: DataTypes.DATE },
  status:      { type: DataTypes.ENUM("pending", "proof_uploaded", "under_review", "approved", "rejected"), defaultValue: "pending" },
  proof_files: { type: DataTypes.JSONB, defaultValue: [] },   // { url, hash, geo, timestamp }
  review_notes:{ type: DataTypes.TEXT },
}, { tableName: "milestones", timestamps: true });

/* ───────── PAYMENTS ───────── */
const Payment = sequelize.define("Payment", {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  amount:      { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  tx_hash:     { type: DataTypes.STRING },   // blockchain tx hash (future)
  method:      { type: DataTypes.STRING, defaultValue: "escrow" },
  status:      { type: DataTypes.ENUM("pending", "released", "failed"), defaultValue: "pending" },
  released_at: { type: DataTypes.DATE },
}, { tableName: "payments", timestamps: true });

/* ───────── COMPLAINTS ───────── */
const Complaint = sequelize.define("Complaint", {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  subject:     { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  evidence:    { type: DataTypes.JSONB, defaultValue: [] },
  geo_location:{ type: DataTypes.JSONB },
  severity:    { type: DataTypes.ENUM("low", "medium", "high", "critical"), defaultValue: "medium" },
  status:      { type: DataTypes.ENUM("submitted", "triaged", "investigating", "verified", "dismissed", "action_taken"), defaultValue: "submitted" },
  strike_count:{ type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: "complaints", timestamps: true });

/* ───────── AUDIT LOG (immutable ledger) ───────── */
const AuditLog = sequelize.define("AuditLog", {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  actor_id:    { type: DataTypes.UUID },
  actor_role:  { type: DataTypes.STRING },
  action:      { type: DataTypes.STRING, allowNull: false },
  entity_type: { type: DataTypes.STRING },
  entity_id:   { type: DataTypes.UUID },
  details:     { type: DataTypes.JSONB, defaultValue: {} },
  ip_address:  { type: DataTypes.STRING },
  prev_hash:   { type: DataTypes.STRING },  // chain hash for tamper detection
  entry_hash:  { type: DataTypes.STRING },
}, { tableName: "audit_logs", timestamps: true, updatedAt: false });

/* ───────── REPUTATION CREDITS ───────── */
const ReputationCredit = sequelize.define("ReputationCredit", {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  points:      { type: DataTypes.FLOAT, allowNull: false },
  reason:      { type: DataTypes.STRING },
  project_id:  { type: DataTypes.UUID },
}, { tableName: "reputation_credits", timestamps: true, updatedAt: false });

/* ═══════════════════════════ RELATIONSHIPS ═══════════════════════════ */

// State ↔ Users
State.hasMany(User, { foreignKey: "state_id" });
User.belongsTo(State, { foreignKey: "state_id" });

// State ↔ FundRequests
State.hasMany(FundRequest, { foreignKey: "state_id" });
FundRequest.belongsTo(State, { foreignKey: "state_id" });
FundRequest.belongsTo(User, { as: "requestedBy", foreignKey: "requested_by" });
FundRequest.belongsTo(User, { as: "approvedBy", foreignKey: "approved_by" });

// State ↔ Tenders
State.hasMany(Tender, { foreignKey: "state_id" });
Tender.belongsTo(State, { foreignKey: "state_id" });
Tender.belongsTo(User, { as: "createdBy", foreignKey: "created_by" });

// Tender ↔ Bids
Tender.hasMany(Bid, { foreignKey: "tender_id" });
Bid.belongsTo(Tender, { foreignKey: "tender_id" });
Bid.belongsTo(User, { as: "contractor", foreignKey: "contractor_id" });

// Tender + Contractor → Contract
Tender.hasOne(Contract, { foreignKey: "tender_id" });
Contract.belongsTo(Tender, { foreignKey: "tender_id" });
Contract.belongsTo(User, { as: "contractor", foreignKey: "contractor_id" });

// Contract ↔ Milestones
Contract.hasMany(Milestone, { foreignKey: "contract_id" });
Milestone.belongsTo(Contract, { foreignKey: "contract_id" });

// Milestone ↔ Payments
Milestone.hasOne(Payment, { foreignKey: "milestone_id" });
Payment.belongsTo(Milestone, { foreignKey: "milestone_id" });

// Tender/Contract ↔ Complaints
Complaint.belongsTo(Tender, { foreignKey: "tender_id" });
Complaint.belongsTo(User, { as: "reporter", foreignKey: "reporter_id" });
Complaint.belongsTo(User, { as: "assignedTo", foreignKey: "assigned_to" });

// Reputation credits → User
User.hasMany(ReputationCredit, { foreignKey: "user_id" });
ReputationCredit.belongsTo(User, { foreignKey: "user_id" });

module.exports = {
  sequelize,
  State,
  User,
  FundRequest,
  Tender,
  Bid,
  Contract,
  Milestone,
  Payment,
  Complaint,
  AuditLog,
  ReputationCredit,
};
