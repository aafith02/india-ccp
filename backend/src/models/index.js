const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

/* ═══════════════════════════════════════════════════════════════════════
   MODELS — TenderGuard v2
   ═══════════════════════════════════════════════════════════════════════ */

/* ───────── STATES ───────── */
const State = sequelize.define("State", {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:      { type: DataTypes.STRING, allowNull: false, unique: true },
  code:      { type: DataTypes.STRING(5), allowNull: false, unique: true },
  logo_url:  { type: DataTypes.TEXT },
  map_url:   { type: DataTypes.TEXT },
  theme:     { type: DataTypes.JSONB, defaultValue: { primary: "#0d9488", secondary: "#d4a76a", bg: "#faf7f2" } },
  symbol:    { type: DataTypes.JSONB, defaultValue: {} },
  languages: { type: DataTypes.JSONB, defaultValue: ["en"] },
  balance:   { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_received: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_allocated: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
}, { tableName: "states", timestamps: true });

/* ───────── USERS ───────── */
const User = sequelize.define("User", {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:          { type: DataTypes.STRING, allowNull: false },
  email:         { type: DataTypes.STRING, allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM("central_gov", "state_gov", "contractor", "community", "auditor_ngo"),
    allowNull: false,
  },
  // KYC (primarily for contractors)
  kyc_status:          { type: DataTypes.ENUM("not_required", "pending", "verified", "rejected"), defaultValue: "not_required" },
  kyc_data:            { type: DataTypes.JSONB, defaultValue: {} },
  kyc_verified_by:     { type: DataTypes.UUID },
  kyc_verified_at:     { type: DataTypes.DATE },
  kyc_rejection_reason:{ type: DataTypes.TEXT },

  // Points & reputation
  points:          { type: DataTypes.INTEGER, defaultValue: 0 },
  reputation:      { type: DataTypes.FLOAT, defaultValue: 0 },
  is_blacklisted:  { type: DataTypes.BOOLEAN, defaultValue: false },

  // For admin-created accounts — who created them
  created_by:      { type: DataTypes.UUID },
}, { tableName: "users", timestamps: true });

/* ───────── FUND REQUESTS ───────── */
const FundRequest = sequelize.define("FundRequest", {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  amount:         { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  purpose:        { type: DataTypes.TEXT, allowNull: false },
  status:         { type: DataTypes.ENUM("pending", "approved", "rejected"), defaultValue: "pending" },
  approved_amount:{ type: DataTypes.DECIMAL(15, 2) },
  remarks:        { type: DataTypes.TEXT },
  // Signing — who acted on this
  acted_by:       { type: DataTypes.UUID },
  acted_at:       { type: DataTypes.DATE },
  signature_hash: { type: DataTypes.STRING },
}, { tableName: "fund_requests", timestamps: true });

/* ───────── TENDERS ───────── */
const Tender = sequelize.define("Tender", {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title:          { type: DataTypes.STRING, allowNull: false },
  description:    { type: DataTypes.TEXT, allowNull: false },
  scope:          { type: DataTypes.TEXT },
  location:       { type: DataTypes.STRING },
  district:       { type: DataTypes.STRING },
  budget_hidden:  { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  bid_deadline:   { type: DataTypes.DATE, allowNull: false },
  project_deadline:{ type: DataTypes.DATE, allowNull: false },
  status:         { type: DataTypes.ENUM("draft", "open", "closed", "awarded", "in_progress", "completed", "cancelled"), defaultValue: "draft" },
  category:       { type: DataTypes.STRING },
  qualification:  { type: DataTypes.JSONB, defaultValue: {} },
  tranche_count:  { type: DataTypes.INTEGER, defaultValue: 5 },
}, { tableName: "tenders", timestamps: true });

/* ───────── BIDS ───────── */
const Bid = sequelize.define("Bid", {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  amount:         { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  proposal:       { type: DataTypes.TEXT },
  timeline_days:  { type: DataTypes.INTEGER },
  doc_hashes:     { type: DataTypes.JSONB, defaultValue: [] },
  proximity_score:{ type: DataTypes.FLOAT },
  ai_score:       { type: DataTypes.FLOAT },
  status:         { type: DataTypes.ENUM("submitted", "shortlisted", "awarded", "rejected"), defaultValue: "submitted" },
}, { tableName: "bids", timestamps: true });

/* ───────── CONTRACTS ───────── */
const Contract = sequelize.define("Contract", {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  award_date:     { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  total_amount:   { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  status:         { type: DataTypes.ENUM("active", "completed", "terminated"), defaultValue: "active" },
  escrow_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tranche_count:  { type: DataTypes.INTEGER, defaultValue: 5 },
  current_tranche:{ type: DataTypes.INTEGER, defaultValue: 1 },
  awarded_by:     { type: DataTypes.UUID },
  signature_hash: { type: DataTypes.STRING },
}, { tableName: "contracts", timestamps: true });

/* ───────── CONTRACT TRANCHES ───────── */
const ContractTranche = sequelize.define("ContractTranche", {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  sequence:      { type: DataTypes.INTEGER, allowNull: false },
  amount:        { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  status:        { type: DataTypes.ENUM("pending", "disbursed", "held"), defaultValue: "pending" },
  disbursed_at:  { type: DataTypes.DATE },
  disbursed_by:  { type: DataTypes.UUID },
  signature_hash:{ type: DataTypes.STRING },
}, { tableName: "contract_tranches", timestamps: true });

/* ───────── MILESTONES ───────── */
const Milestone = sequelize.define("Milestone", {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title:       { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  sequence:    { type: DataTypes.INTEGER, allowNull: false },
  amount:      { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  due_date:    { type: DataTypes.DATE },
  status:      { type: DataTypes.ENUM("pending", "in_progress", "proof_uploaded", "under_review", "approved", "rejected"), defaultValue: "pending" },
  proof_files: { type: DataTypes.JSONB, defaultValue: [] },
  review_notes:{ type: DataTypes.TEXT },
}, { tableName: "milestones", timestamps: true });

/* ───────── PAYMENTS ───────── */
const Payment = sequelize.define("Payment", {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  amount:         { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  tx_hash:        { type: DataTypes.STRING },
  method:         { type: DataTypes.STRING, defaultValue: "escrow" },
  status:         { type: DataTypes.ENUM("pending", "released", "failed"), defaultValue: "pending" },
  released_at:    { type: DataTypes.DATE },
  released_by:    { type: DataTypes.UUID },
  signature_hash: { type: DataTypes.STRING },
}, { tableName: "payments", timestamps: true });

/* ───────── WORK PROOFS ───────── */
const WorkProof = sequelize.define("WorkProof", {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  description:      { type: DataTypes.TEXT, allowNull: false },
  photo_urls:       { type: DataTypes.JSONB, defaultValue: [] },
  work_percentage:  { type: DataTypes.FLOAT, allowNull: false },
  amount_requested: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  status:           { type: DataTypes.ENUM("pending_assignment", "under_review", "approved", "rejected"), defaultValue: "pending_assignment" },
  required_approvals:{ type: DataTypes.INTEGER, defaultValue: 0 },
  approval_count:   { type: DataTypes.INTEGER, defaultValue: 0 },
  rejection_count:  { type: DataTypes.INTEGER, defaultValue: 0 },
  review_notes:     { type: DataTypes.TEXT },
  warning_count:    { type: DataTypes.INTEGER, defaultValue: 0 },
  reviewed_at:      { type: DataTypes.DATE },
}, { tableName: "work_proofs", timestamps: true });

/* ───────── PROOF REVIEWERS ───────── */
const ProofReviewer = sequelize.define("ProofReviewer", {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  assigned_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: "proof_reviewers", timestamps: true });

/* ───────── PROOF VOTES ───────── */
const ProofVote = sequelize.define("ProofVote", {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  vote:           { type: DataTypes.ENUM("approve", "reject"), allowNull: false },
  comment:        { type: DataTypes.TEXT },
  signature_hash: { type: DataTypes.STRING },
  voted_at:       { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: "proof_votes", timestamps: true });

/* ───────── COMPLAINTS ───────── */
const Complaint = sequelize.define("Complaint", {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  subject:     { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  evidence:    { type: DataTypes.JSONB, defaultValue: [] },
  geo_location:{ type: DataTypes.JSONB },
  severity:    { type: DataTypes.ENUM("low", "medium", "high", "critical"), defaultValue: "medium" },
  status: {
    type: DataTypes.ENUM("submitted", "assigned_to_ngo", "investigating", "verified", "dismissed", "action_taken"),
    defaultValue: "submitted",
  },
  investigation_result: { type: DataTypes.ENUM("pending", "confirmed_valid", "confirmed_fake"), defaultValue: "pending" },
  investigation_notes:  { type: DataTypes.TEXT },
  penalty_applied:      { type: DataTypes.BOOLEAN, defaultValue: false },
  signature_hash:       { type: DataTypes.STRING },
}, { tableName: "complaints", timestamps: true });

/* ───────── CASES (case management from complaints) ───────── */
const Case = sequelize.define("Case", {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  case_number:      { type: DataTypes.STRING, allowNull: false, unique: true },
  status:           { type: DataTypes.ENUM("open", "investigating", "resolved", "closed", "appealed"), defaultValue: "open" },
  priority:         { type: DataTypes.ENUM("low", "medium", "high", "critical"), defaultValue: "medium" },
  penalty_details:  { type: DataTypes.JSONB, defaultValue: {} },
  resolution_notes: { type: DataTypes.TEXT },
  resolved_at:      { type: DataTypes.DATE },
}, { tableName: "cases", timestamps: true });

/* ───────── BLACKLIST REQUESTS ───────── */
const BlacklistRequest = sequelize.define("BlacklistRequest", {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  reason:        { type: DataTypes.TEXT, allowNull: false },
  status:        { type: DataTypes.ENUM("pending", "approved", "rejected"), defaultValue: "pending" },
  acted_by:      { type: DataTypes.UUID },
  acted_at:      { type: DataTypes.DATE },
  remarks:       { type: DataTypes.TEXT },
}, { tableName: "blacklist_requests", timestamps: true });

/* ───────── AUDIT LOG (immutable chain-hashed ledger) ───────── */
const AuditLog = sequelize.define("AuditLog", {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  actor_id:      { type: DataTypes.UUID },
  actor_role:    { type: DataTypes.STRING },
  actor_name:    { type: DataTypes.STRING },
  action:        { type: DataTypes.STRING, allowNull: false },
  entity_type:   { type: DataTypes.STRING },
  entity_id:     { type: DataTypes.UUID },
  details:       { type: DataTypes.JSONB, defaultValue: {} },
  ip_address:    { type: DataTypes.STRING },
  prev_hash:     { type: DataTypes.STRING },
  entry_hash:    { type: DataTypes.STRING },
  signature_hash:{ type: DataTypes.STRING },
}, { tableName: "audit_logs", timestamps: true, updatedAt: false });

/* ───────── POINTS LEDGER ───────── */
const PointsLedger = sequelize.define("PointsLedger", {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  points:         { type: DataTypes.INTEGER, allowNull: false },
  reason:         { type: DataTypes.STRING, allowNull: false },
  reference_type: { type: DataTypes.STRING },
  reference_id:   { type: DataTypes.UUID },
}, { tableName: "points_ledger", timestamps: true, updatedAt: false });

/* ───────── NOTIFICATIONS ───────── */
const Notification = sequelize.define("Notification", {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type:        { type: DataTypes.STRING, allowNull: false },
  title:       { type: DataTypes.STRING, allowNull: false },
  message:     { type: DataTypes.TEXT },
  entity_type: { type: DataTypes.STRING },
  entity_id:   { type: DataTypes.UUID },
  is_read:     { type: DataTypes.BOOLEAN, defaultValue: false },
  metadata:    { type: DataTypes.JSONB, defaultValue: {} },
}, { tableName: "notifications", timestamps: true, updatedAt: false });

/* ═══════════════════════════ RELATIONSHIPS ═══════════════════════════ */

// State ↔ Users (multiple state_gov per state)
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

// Contract ↔ ContractTranches
Contract.hasMany(ContractTranche, { foreignKey: "contract_id" });
ContractTranche.belongsTo(Contract, { foreignKey: "contract_id" });

// Contract ↔ Milestones
Contract.hasMany(Milestone, { foreignKey: "contract_id" });
Milestone.belongsTo(Contract, { foreignKey: "contract_id" });

// Milestone ↔ Payments
Milestone.hasOne(Payment, { foreignKey: "milestone_id" });
Payment.belongsTo(Milestone, { foreignKey: "milestone_id" });

// ContractTranche ↔ Payment
ContractTranche.hasOne(Payment, { foreignKey: "tranche_id" });
Payment.belongsTo(ContractTranche, { foreignKey: "tranche_id" });

// WorkProof → Milestone + Contract + User + Tranche
Milestone.hasMany(WorkProof, { foreignKey: "milestone_id" });
WorkProof.belongsTo(Milestone, { foreignKey: "milestone_id" });
Contract.hasMany(WorkProof, { foreignKey: "contract_id" });
WorkProof.belongsTo(Contract, { foreignKey: "contract_id" });
User.hasMany(WorkProof, { as: "submittedProofs", foreignKey: "submitted_by" });
WorkProof.belongsTo(User, { as: "submittedBy", foreignKey: "submitted_by" });
ContractTranche.hasMany(WorkProof, { foreignKey: "tranche_id" });
WorkProof.belongsTo(ContractTranche, { foreignKey: "tranche_id" });

// ProofReviewer → WorkProof + User
WorkProof.hasMany(ProofReviewer, { foreignKey: "work_proof_id" });
ProofReviewer.belongsTo(WorkProof, { foreignKey: "work_proof_id" });
User.hasMany(ProofReviewer, { as: "assignedReviews", foreignKey: "reviewer_id" });
ProofReviewer.belongsTo(User, { as: "reviewer", foreignKey: "reviewer_id" });
ProofReviewer.belongsTo(User, { as: "assignedBy", foreignKey: "assigned_by" });

// ProofVote → WorkProof + User
WorkProof.hasMany(ProofVote, { foreignKey: "work_proof_id" });
ProofVote.belongsTo(WorkProof, { foreignKey: "work_proof_id" });
User.hasMany(ProofVote, { as: "proofVotes", foreignKey: "voter_id" });
ProofVote.belongsTo(User, { as: "voter", foreignKey: "voter_id" });

// Complaints → Tender + Users (reporter, NGO, central assigner)
Complaint.belongsTo(Tender, { foreignKey: "tender_id" });
Complaint.belongsTo(User, { as: "reporter", foreignKey: "reporter_id" });
Complaint.belongsTo(User, { as: "assignedNgo", foreignKey: "ngo_assigned_id" });
Complaint.belongsTo(User, { as: "assignedBy", foreignKey: "ngo_assigned_by" });

// Case → Complaint + Users
Complaint.hasOne(Case, { foreignKey: "complaint_id" });
Case.belongsTo(Complaint, { foreignKey: "complaint_id" });
Case.belongsTo(User, { as: "assignedTo", foreignKey: "assigned_to" });
Case.belongsTo(User, { as: "createdBy", foreignKey: "created_by" });

// BlacklistRequest → User (target + requester)
BlacklistRequest.belongsTo(User, { as: "targetUser", foreignKey: "user_id" });
BlacklistRequest.belongsTo(User, { as: "requestedBy", foreignKey: "requested_by" });
User.hasMany(BlacklistRequest, { foreignKey: "user_id" });

// PointsLedger → User
User.hasMany(PointsLedger, { foreignKey: "user_id" });
PointsLedger.belongsTo(User, { foreignKey: "user_id" });

// Notifications → User
User.hasMany(Notification, { foreignKey: "user_id" });
Notification.belongsTo(User, { foreignKey: "user_id" });

module.exports = {
  sequelize,
  State,
  User,
  FundRequest,
  Tender,
  Bid,
  Contract,
  ContractTranche,
  Milestone,
  Payment,
  WorkProof,
  ProofReviewer,
  ProofVote,
  Complaint,
  Case,
  BlacklistRequest,
  AuditLog,
  PointsLedger,
  Notification,
};
