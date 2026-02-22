/**
 * Comprehensive seed data for TenderGuard v2.
 * Covers EVERY status/situation so all pages display populated data.
 *
 * Users (Password for all: Password123!)
 *   central_gov:  admin@tenderguard.gov.in
 *   state_gov:    mp.gov@tenderguard.gov.in, rj.gov@tenderguard.gov.in, mh.gov@tenderguard.gov.in
 *   contractor:   asha@buildright.in (verified), vikram@infra.co.in (verified),
 *                 priya@construct.co.in (pending KYC), blacklisted@example.com (blacklisted)
 *   auditor_ngo:  ngo1@transparency.org, ngo2@watchdog.org
 *   community:    ramesh@gmail.com, sunita@gmail.com
 *
 * Run:  node src/seed/dummyData.js
 */
require("dotenv").config();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const {
  sequelize, State, User, FundRequest, Tender, Bid,
  Contract, ContractTranche, Milestone, Payment,
  WorkProof, ProofReviewer, ProofVote,
  Complaint, Case, BlacklistRequest, AuditLog, PointsLedger, Notification,
} = require("../models");

const PASSWORD = "Password123!";

/* -- helpers -- */
function days(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }
function pastDays(n) { return days(-n); }
function sigHash(actorId, action, entityId) {
  return crypto.createHash("sha256").update(`${actorId}:${action}:${entityId}:${Date.now()}`).digest("hex");
}
let prevAuditHash = "0".repeat(64);
function auditHash(data) {
  const payload = JSON.stringify({ ...data, prev_hash: prevAuditHash, ts: Date.now() });
  const h = crypto.createHash("sha256").update(payload).digest("hex");
  prevAuditHash = h;
  return h;
}

/* ================================================================= */
async function seed() {
  await sequelize.sync({ force: true });
  console.log("Tables recreated");

  const hash = await bcrypt.hash(PASSWORD, 10);

  /* ===================== STATES ===================== */
  const states = await State.bulkCreate([
    { name: "Madhya Pradesh", code: "MP", theme: { primary: "#0d9488", secondary: "#d4a76a", bg: "#faf7f2" }, languages: ["en", "hi"], balance: 45000000, total_received: 60000000, total_allocated: 15000000 },
    { name: "Rajasthan",      code: "RJ", theme: { primary: "#b91c1c", secondary: "#f59e0b", bg: "#fef9ee" }, languages: ["en", "hi"], balance: 0, total_received: 0, total_allocated: 0 },
    { name: "Maharashtra",    code: "MH", theme: { primary: "#1d4ed8", secondary: "#16a34a", bg: "#f0f9ff" }, languages: ["en", "mr"], balance: 35000000, total_received: 35000000, total_allocated: 0 },
  ]);
  const [MP, RJ, MH] = states;
  console.log("States created");

  /* ===================== USERS ===================== */
  const users = await User.bulkCreate([
    { name: "Central Admin", email: "admin@tenderguard.gov.in", password_hash: hash, role: "central_gov", points: 200, reputation: 95 },
    { name: "MP Govt Officer", email: "mp.gov@tenderguard.gov.in", password_hash: hash, role: "state_gov", state_id: MP.id, points: 120, reputation: 88 },
    { name: "RJ Govt Officer", email: "rj.gov@tenderguard.gov.in", password_hash: hash, role: "state_gov", state_id: RJ.id, points: 90, reputation: 85 },
    { name: "MH Govt Officer", email: "mh.gov@tenderguard.gov.in", password_hash: hash, role: "state_gov", state_id: MH.id, points: 60, reputation: 80 },
    { name: "Asha Constructions", email: "asha@buildright.in", password_hash: hash, role: "contractor", state_id: MP.id, kyc_status: "verified", kyc_data: { pan: "ABCPD1234E", gstin: "23AABCU9603R1ZG", company: "Asha Constructions Pvt Ltd", experience_years: 12 }, points: 180, reputation: 92 },
    { name: "Vikram Infrastructure", email: "vikram@infra.co.in", password_hash: hash, role: "contractor", state_id: RJ.id, kyc_status: "verified", kyc_data: { pan: "DEFPG5678H", gstin: "08AABCV1234K1ZK", company: "Vikram Infra Ltd", experience_years: 8 }, points: 150, reputation: 87 },
    { name: "Priya Builders", email: "priya@construct.co.in", password_hash: hash, role: "contractor", state_id: MP.id, kyc_status: "pending", kyc_data: { pan: "GHIJK9012L", gstin: "", company: "Priya Builders", experience_years: 3 }, points: 20, reputation: 50 },
    { name: "Ravi Industries", email: "blacklisted@example.com", password_hash: hash, role: "contractor", state_id: RJ.id, kyc_status: "rejected", kyc_data: { pan: "MNOPQ3456R" }, kyc_rejection_reason: "Fraudulent documents submitted", is_blacklisted: true, points: -50, reputation: 5 },
    { name: "Transparency India", email: "ngo1@transparency.org", password_hash: hash, role: "auditor_ngo", state_id: MP.id, points: 160, reputation: 94 },
    { name: "Infrastructure Watch", email: "ngo2@watchdog.org", password_hash: hash, role: "auditor_ngo", state_id: RJ.id, points: 130, reputation: 90 },
    { name: "Ramesh Kumar", email: "ramesh@gmail.com", password_hash: hash, role: "community", state_id: MP.id, points: 45, reputation: 70 },
    { name: "Sunita Devi", email: "sunita@gmail.com", password_hash: hash, role: "community", state_id: RJ.id, points: 30, reputation: 65 },
  ]);
  const [central, mpGov, rjGov, mhGov, asha, vikram, priya, ravi, ngo1, ngo2, ramesh, sunita] = users;
  console.log("Users created (12)");

  /* ===================== FUND REQUESTS ===================== */
  const funds = await FundRequest.bulkCreate([
    { state_id: MP.id, requested_by: mpGov.id, amount: 50000000, purpose: "NH-12 Highway resurfacing - Bhopal to Indore segment (124 km)", status: "approved", approved_amount: 45000000, remarks: "Approved with 10% reduction. Complete within 18 months.", acted_by: central.id, acted_at: pastDays(30), signature_hash: sigHash(central.id, "APPROVE_FUND", "f1") },
    { state_id: RJ.id, requested_by: rjGov.id, amount: 25000000, purpose: "Rural water supply pipeline network - Jaisalmer district (12 villages)", status: "pending" },
    { state_id: RJ.id, requested_by: rjGov.id, amount: 80000000, purpose: "Solar power plant installation - Barmer (50MW capacity)", status: "rejected", remarks: "Duplicate request. Already covered under PM-KUSUM scheme.", acted_by: central.id, acted_at: pastDays(15), signature_hash: sigHash(central.id, "REJECT_FUND", "f3") },
    { state_id: MH.id, requested_by: mhGov.id, amount: 35000000, purpose: "Flood relief infrastructure - Kolhapur district flood walls and drainage", status: "approved", approved_amount: 35000000, remarks: "Emergency approval - full amount sanctioned.", acted_by: central.id, acted_at: pastDays(5), signature_hash: sigHash(central.id, "APPROVE_FUND", "f4") },
    { state_id: MP.id, requested_by: mpGov.id, amount: 15000000, purpose: "Smart classroom setup in 50 government schools - Gwalior division", status: "pending" },
  ]);
  console.log("Fund requests created (5)");

  /* ===================== TENDERS ===================== */
  const tenders = await Tender.bulkCreate([
    { title: "NH-12 Highway Resurfacing Phase 1", description: "Complete resurfacing of 40km section from Bhopal to Vidisha including shoulder repair, drainage, and signage installation.", scope: "Road resurfacing, drainage channels, road markings, safety barriers", location: "Bhopal-Vidisha Highway", district: "Vidisha", budget_hidden: 42000000, bid_deadline: pastDays(60), project_deadline: days(180), status: "in_progress", category: "infrastructure", tranche_count: 4, qualification: { min_experience_years: 5, max_active_contracts: 3, required_equipment: ["road roller", "asphalt paver"] }, state_id: MP.id, created_by: mpGov.id },
    { title: "Smart Water Supply Network - Jaisalmer", description: "Installation of IoT-enabled water supply pipeline network serving 12 villages in Jaisalmer district.", scope: "Pipeline laying, pump houses, IoT sensors, mobile app for villagers", location: "Jaisalmer District", district: "Jaisalmer", budget_hidden: 23000000, bid_deadline: days(30), project_deadline: days(365), status: "open", category: "water", tranche_count: 5, qualification: { min_experience_years: 3, certification: "ISO 9001" }, state_id: RJ.id, created_by: rjGov.id },
    { title: "Govt School Renovation - 15 Schools Gwalior", description: "Structural renovation and modernisation of 15 government primary schools.", scope: "Building renovation, plumbing, electrical, solar panels", location: "Gwalior Division", district: "Gwalior", budget_hidden: 12000000, bid_deadline: pastDays(20), project_deadline: days(270), status: "awarded", category: "education", tranche_count: 4, qualification: { min_experience_years: 2 }, state_id: MP.id, created_by: mpGov.id },
    { title: "District Hospital Equipment Upgrade - Udaipur", description: "Procurement and installation of advanced medical equipment in Udaipur district hospital.", scope: "Equipment procurement, installation, training", location: "Udaipur City", district: "Udaipur", budget_hidden: 55000000, bid_deadline: pastDays(180), project_deadline: pastDays(10), status: "completed", category: "healthcare", tranche_count: 4, qualification: { min_experience_years: 5, medical_equipment_license: true }, state_id: RJ.id, created_by: rjGov.id },
    { title: "Solar Street Lighting - Bhopal Smart City", description: "Installation of 2000 solar-powered LED street lights across Bhopal municipal area.", scope: "Solar panels, LED lights, poles, wiring, monitoring system", location: "Bhopal", district: "Bhopal", budget_hidden: 8000000, bid_deadline: days(45), project_deadline: days(300), status: "draft", category: "energy", tranche_count: 4, state_id: MP.id, created_by: mpGov.id },
    { title: "Barmer Solar Plant - 50MW (CANCELLED)", description: "Large-scale solar power plant. Project cancelled due to duplicate funding under PM-KUSUM.", scope: "Solar farm design, installation, grid connection", location: "Barmer", district: "Barmer", budget_hidden: 75000000, bid_deadline: pastDays(90), project_deadline: days(500), status: "cancelled", category: "energy", tranche_count: 5, state_id: RJ.id, created_by: rjGov.id },
    { title: "Flood Wall Construction - Kolhapur", description: "Construction of 5km flood protection wall along Panchganga river in Kolhapur.", scope: "RCC wall construction, drainage outlets, embankment strengthening", location: "Kolhapur", district: "Kolhapur", budget_hidden: 32000000, bid_deadline: pastDays(5), project_deadline: days(200), status: "closed", category: "infrastructure", tranche_count: 4, qualification: { min_experience_years: 7, flood_protection_experience: true }, state_id: MH.id, created_by: mhGov.id },
    { title: "Community Health Centres - 5 PHCs Rajasthan", description: "Construction of 5 new Primary Health Centres in underserved blocks of Rajasthan with telemedicine facilities.", scope: "Building construction, medical equipment, telemedicine setup", location: "Multiple blocks", district: "Barmer", budget_hidden: 18000000, bid_deadline: days(20), project_deadline: days(400), status: "open", category: "healthcare", tranche_count: 5, qualification: { min_experience_years: 3 }, state_id: RJ.id, created_by: rjGov.id },
  ]);
  const [T1, T2, T3, T4, T5, T6, T7, T8] = tenders;
  console.log("Tenders created (8)");

  /* ===================== BIDS ===================== */
  const bids = await Bid.bulkCreate([
    { tender_id: T1.id, contractor_id: asha.id, amount: 41500000, proposal: "We will complete in 150 days using imported bitumen and modern rollers. 12 years highway experience.", timeline_days: 150, proximity_score: 97.5, status: "awarded", doc_hashes: ["sha256_abc123", "sha256_def456"] },
    { tender_id: T1.id, contractor_id: vikram.id, amount: 44000000, proposal: "Competitive pricing with 8 years of road construction experience.", timeline_days: 160, proximity_score: 82.0, status: "rejected", doc_hashes: ["sha256_ghi789"] },
    { tender_id: T2.id, contractor_id: vikram.id, amount: 22000000, proposal: "IoT water supply specialist. We have delivered similar projects in Gujarat.", timeline_days: 300, proximity_score: null, status: "submitted", doc_hashes: ["sha256_water1"] },
    { tender_id: T2.id, contractor_id: asha.id, amount: 24000000, proposal: "Full-stack water infrastructure capability.", timeline_days: 280, proximity_score: null, status: "submitted", doc_hashes: [] },
    { tender_id: T3.id, contractor_id: vikram.id, amount: 11500000, proposal: "School renovation is our speciality. We have renovated 40+ schools in Rajasthan.", timeline_days: 200, proximity_score: 95.0, status: "awarded", doc_hashes: ["sha256_school1", "sha256_school2"] },
    { tender_id: T3.id, contractor_id: priya.id, amount: 10800000, proposal: "Freshly certified contractor, very competitive pricing, eager to prove quality.", timeline_days: 220, proximity_score: 88.0, status: "shortlisted", doc_hashes: [] },
    { tender_id: T4.id, contractor_id: vikram.id, amount: 53000000, proposal: "Medical equipment sourcing partner with Siemens, GE, and Philips certified.", timeline_days: 120, proximity_score: 94.0, status: "awarded", doc_hashes: ["sha256_med1"] },
    { tender_id: T7.id, contractor_id: asha.id, amount: 30000000, proposal: "Flood protection experience from Odisha and MP. RCC specialists.", timeline_days: 170, proximity_score: null, status: "submitted", doc_hashes: ["sha256_flood1"] },
    { tender_id: T7.id, contractor_id: vikram.id, amount: 33000000, proposal: "Heavy civil construction capability. 8+ years.", timeline_days: 180, proximity_score: null, status: "submitted", doc_hashes: [] },
    { tender_id: T8.id, contractor_id: asha.id, amount: 17500000, proposal: "Health centre construction and telemedicine integration.", timeline_days: 350, proximity_score: null, status: "submitted", doc_hashes: [] },
  ]);
  const [bidT1a, bidT1v, bidT2v, bidT2a, bidT3v, bidT3p, bidT4v, bidT7a, bidT7v, bidT8a] = bids;
  console.log("Bids created (10)");

  /* ===================== CONTRACTS ===================== */
  const contracts = await Contract.bulkCreate([
    { tender_id: T1.id, contractor_id: asha.id, total_amount: 41500000, status: "active", escrow_balance: 31125000, tranche_count: 4, current_tranche: 2, awarded_by: mpGov.id, award_date: pastDays(45), signature_hash: sigHash(mpGov.id, "AWARD_CONTRACT", "c1") },
    { tender_id: T4.id, contractor_id: vikram.id, total_amount: 53000000, status: "completed", escrow_balance: 0, tranche_count: 4, current_tranche: 4, awarded_by: rjGov.id, award_date: pastDays(170), signature_hash: sigHash(rjGov.id, "AWARD_CONTRACT", "c2") },
  ]);
  const [C1, C2] = contracts;
  console.log("Contracts created (2)");

  /* ===================== CONTRACT TRANCHES ===================== */
  const tranches = await ContractTranche.bulkCreate([
    { contract_id: C1.id, sequence: 1, amount: 10375000, status: "disbursed", disbursed_at: pastDays(44), disbursed_by: mpGov.id, signature_hash: sigHash(mpGov.id, "DISBURSE_T1", "tr1") },
    { contract_id: C1.id, sequence: 2, amount: 10375000, status: "pending" },
    { contract_id: C1.id, sequence: 3, amount: 10375000, status: "pending" },
    { contract_id: C1.id, sequence: 4, amount: 10375000, status: "held" },
    { contract_id: C2.id, sequence: 1, amount: 13250000, status: "disbursed", disbursed_at: pastDays(165), disbursed_by: rjGov.id, signature_hash: sigHash(rjGov.id, "DISBURSE_T1", "tr5") },
    { contract_id: C2.id, sequence: 2, amount: 13250000, status: "disbursed", disbursed_at: pastDays(120), disbursed_by: rjGov.id, signature_hash: sigHash(rjGov.id, "DISBURSE_T2", "tr6") },
    { contract_id: C2.id, sequence: 3, amount: 13250000, status: "disbursed", disbursed_at: pastDays(60), disbursed_by: rjGov.id, signature_hash: sigHash(rjGov.id, "DISBURSE_T3", "tr7") },
    { contract_id: C2.id, sequence: 4, amount: 13250000, status: "disbursed", disbursed_at: pastDays(15), disbursed_by: rjGov.id, signature_hash: sigHash(rjGov.id, "DISBURSE_T4", "tr8") },
  ]);
  const [tr1, tr2, tr3, tr4, tr5, tr6, tr7, tr8] = tranches;
  console.log("Contract tranches created (8)");

  /* ===================== MILESTONES ===================== */
  const milestones = await Milestone.bulkCreate([
    { contract_id: C1.id, title: "Site survey & base preparation", description: "Complete topographic survey, clear debris, prepare road base for 40km stretch", sequence: 1, amount: 10375000, due_date: pastDays(30), status: "approved", proof_files: ["survey_report.pdf", "base_prep_photos.zip"], review_notes: "Survey verified by independent auditor." },
    { contract_id: C1.id, title: "Bitumen laying - first 20km", description: "Hot-mix bitumen application for km 0-20 with compaction and levelling", sequence: 2, amount: 10375000, due_date: days(15), status: "under_review", proof_files: ["progress_photos_km0_20.zip", "material_test.pdf"], review_notes: null },
    { contract_id: C1.id, title: "Bitumen laying - remaining 20km", description: "Hot-mix bitumen application for km 20-40", sequence: 3, amount: 10375000, due_date: days(60), status: "pending", proof_files: [], review_notes: null },
    { contract_id: C1.id, title: "Finishing - markings & signage", description: "Road markings, safety barriers, signage, drainage covers, final inspection", sequence: 4, amount: 10375000, due_date: days(120), status: "pending", proof_files: [], review_notes: null },
    { contract_id: C2.id, title: "Equipment procurement", description: "Purchase orders placed and equipment delivered to site", sequence: 1, amount: 13250000, due_date: pastDays(140), status: "approved", proof_files: ["po_copies.pdf"], review_notes: "All POs verified." },
    { contract_id: C2.id, title: "CT Scanner installation", description: "Siemens CT scanner installed and calibrated", sequence: 2, amount: 13250000, due_date: pastDays(100), status: "approved", proof_files: ["ct_install_photos.zip"], review_notes: "Calibration verified." },
    { contract_id: C2.id, title: "MRI & OT equipment setup", description: "MRI room shielding, MRI installation, OT table and lights", sequence: 3, amount: 13250000, due_date: pastDays(50), status: "approved", proof_files: ["mri_setup.pdf"], review_notes: "All installations inspected." },
    { contract_id: C2.id, title: "Training & handover", description: "Staff training on equipment operation, maintenance manuals, handover", sequence: 4, amount: 13250000, due_date: pastDays(12), status: "approved", proof_files: ["training_attendance.pdf"], review_notes: "Training completed for 24 staff." },
  ]);
  const [m1, m2, m3, m4, m5, m6, m7, m8] = milestones;
  console.log("Milestones created (8)");

  /* ===================== PAYMENTS ===================== */
  const payments = await Payment.bulkCreate([
    { milestone_id: m1.id, tranche_id: tr1.id, amount: 10375000, status: "released", method: "escrow", tx_hash: "0xabc1234highway1", released_at: pastDays(28), released_by: mpGov.id, signature_hash: sigHash(mpGov.id, "RELEASE_PAY", "p1") },
    { milestone_id: m2.id, tranche_id: tr2.id, amount: 10375000, status: "pending", method: "escrow", tx_hash: null },
    { milestone_id: m5.id, tranche_id: tr5.id, amount: 13250000, status: "released", method: "escrow", tx_hash: "0xmed_pay_1", released_at: pastDays(138), released_by: rjGov.id, signature_hash: sigHash(rjGov.id, "RELEASE_PAY", "p3") },
    { milestone_id: m6.id, tranche_id: tr6.id, amount: 13250000, status: "released", method: "escrow", tx_hash: "0xmed_pay_2", released_at: pastDays(98), released_by: rjGov.id, signature_hash: sigHash(rjGov.id, "RELEASE_PAY", "p4") },
    { milestone_id: m7.id, tranche_id: tr7.id, amount: 13250000, status: "released", method: "escrow", tx_hash: "0xmed_pay_3", released_at: pastDays(48), released_by: rjGov.id, signature_hash: sigHash(rjGov.id, "RELEASE_PAY", "p5") },
    { milestone_id: m8.id, tranche_id: tr8.id, amount: 13250000, status: "released", method: "escrow", tx_hash: "0xmed_pay_4", released_at: pastDays(10), released_by: rjGov.id, signature_hash: sigHash(rjGov.id, "RELEASE_PAY", "p6") },
  ]);
  console.log("Payments created (6)");

  /* ===================== WORK PROOFS ===================== */
  const proofs = await WorkProof.bulkCreate([
    { contract_id: C1.id, milestone_id: m1.id, tranche_id: tr1.id, submitted_by: asha.id, description: "Site survey complete. Base preparation done for entire 40km. Attached survey report, drone footage, and material test results.", photo_urls: ["/images/survey_overview.jpg", "/images/base_prep_1.jpg", "/images/base_prep_2.jpg", "/images/drone_shot.jpg"], work_percentage: 25, amount_requested: 10375000, status: "approved", required_approvals: 2, approval_count: 2, rejection_count: 0, review_notes: "Both reviewers confirmed work quality.", reviewed_at: pastDays(25), warning_count: 0 },
    { contract_id: C1.id, milestone_id: m2.id, tranche_id: tr2.id, submitted_by: asha.id, description: "Bitumen laying completed for km 0-20. Hot-mix applied at 65mm thickness. Compaction done with 10-tonne roller.", photo_urls: ["/images/bitumen_km5.jpg", "/images/bitumen_km12.jpg", "/images/roller_working.jpg"], work_percentage: 50, amount_requested: 10375000, status: "under_review", required_approvals: 2, approval_count: 1, rejection_count: 0, review_notes: null, warning_count: 0 },
    { contract_id: C1.id, milestone_id: m2.id, tranche_id: tr2.id, submitted_by: asha.id, description: "Initial submission - bitumen progress photos for first 10km.", photo_urls: ["/images/blurry_photo.jpg"], work_percentage: 30, amount_requested: 10375000, status: "rejected", required_approvals: 2, approval_count: 0, rejection_count: 2, review_notes: "Photos are blurry. Material test certificate missing. Please resubmit.", reviewed_at: pastDays(10), warning_count: 1 },
    { contract_id: C1.id, milestone_id: m3.id, tranche_id: tr3.id, submitted_by: asha.id, description: "Started work on km 20-25. Clearing and base preparation underway.", photo_urls: ["/images/km20_clearing.jpg"], work_percentage: 10, amount_requested: 5000000, status: "pending_assignment", required_approvals: 0, approval_count: 0, rejection_count: 0, review_notes: null, warning_count: 0 },
    { contract_id: C2.id, milestone_id: m5.id, tranche_id: tr5.id, submitted_by: vikram.id, description: "Equipment procurement complete. All POs and delivery receipts attached.", photo_urls: ["/images/equipment_delivery.jpg"], work_percentage: 25, amount_requested: 13250000, status: "approved", required_approvals: 2, approval_count: 2, rejection_count: 0, review_notes: "Verified against specifications.", reviewed_at: pastDays(136), warning_count: 0 },
    { contract_id: C2.id, milestone_id: m6.id, tranche_id: tr6.id, submitted_by: vikram.id, description: "CT Scanner installed and tested. Calibration certificate from Siemens attached.", photo_urls: ["/images/ct_installed.jpg"], work_percentage: 50, amount_requested: 13250000, status: "approved", required_approvals: 2, approval_count: 2, rejection_count: 0, review_notes: "CT calibration verified.", reviewed_at: pastDays(96), warning_count: 0 },
    { contract_id: C2.id, milestone_id: m7.id, tranche_id: tr7.id, submitted_by: vikram.id, description: "MRI room shielded, MRI installed, OT fully equipped.", photo_urls: ["/images/mri_room.jpg", "/images/ot_setup.jpg"], work_percentage: 75, amount_requested: 13250000, status: "approved", required_approvals: 2, approval_count: 2, rejection_count: 0, review_notes: "Installation meets all standards.", reviewed_at: pastDays(46), warning_count: 0 },
    { contract_id: C2.id, milestone_id: m8.id, tranche_id: tr8.id, submitted_by: vikram.id, description: "Training completed for 24 hospital staff. Handover document signed by Hospital Director.", photo_urls: ["/images/training_session.jpg"], work_percentage: 100, amount_requested: 13250000, status: "approved", required_approvals: 2, approval_count: 2, rejection_count: 0, review_notes: "Training confirmed by hospital.", reviewed_at: pastDays(8), warning_count: 0 },
  ]);
  const [wp1, wp2, wp3, wp4, wp5, wp6, wp7, wp8] = proofs;
  console.log("Work proofs created (8)");

  /* ===================== PROOF REVIEWERS ===================== */
  await ProofReviewer.bulkCreate([
    { work_proof_id: wp1.id, reviewer_id: ngo1.id, assigned_by: central.id },
    { work_proof_id: wp1.id, reviewer_id: ngo2.id, assigned_by: central.id },
    { work_proof_id: wp2.id, reviewer_id: ngo1.id, assigned_by: central.id },
    { work_proof_id: wp2.id, reviewer_id: ngo2.id, assigned_by: central.id },
    { work_proof_id: wp3.id, reviewer_id: ngo1.id, assigned_by: central.id },
    { work_proof_id: wp3.id, reviewer_id: ngo2.id, assigned_by: central.id },
    { work_proof_id: wp5.id, reviewer_id: ngo1.id, assigned_by: central.id },
    { work_proof_id: wp5.id, reviewer_id: ngo2.id, assigned_by: central.id },
    { work_proof_id: wp6.id, reviewer_id: ngo1.id, assigned_by: central.id },
    { work_proof_id: wp6.id, reviewer_id: ngo2.id, assigned_by: central.id },
    { work_proof_id: wp7.id, reviewer_id: ngo1.id, assigned_by: central.id },
    { work_proof_id: wp7.id, reviewer_id: ngo2.id, assigned_by: central.id },
    { work_proof_id: wp8.id, reviewer_id: ngo1.id, assigned_by: central.id },
    { work_proof_id: wp8.id, reviewer_id: ngo2.id, assigned_by: central.id },
  ]);
  console.log("Proof reviewers assigned (14)");

  /* ===================== PROOF VOTES ===================== */
  await ProofVote.bulkCreate([
    { work_proof_id: wp1.id, voter_id: ngo1.id, vote: "approve", comment: "Verified on-site. Work matches scope.", signature_hash: sigHash(ngo1.id, "VOTE_APPROVE", wp1.id), voted_at: pastDays(26) },
    { work_proof_id: wp1.id, voter_id: ngo2.id, vote: "approve", comment: "Satellite imagery confirms base preparation.", signature_hash: sigHash(ngo2.id, "VOTE_APPROVE", wp1.id), voted_at: pastDays(25) },
    { work_proof_id: wp2.id, voter_id: ngo1.id, vote: "approve", comment: "Inspected km 0-15. Bitumen quality looks good.", signature_hash: sigHash(ngo1.id, "VOTE_APPROVE", wp2.id), voted_at: pastDays(2) },
    { work_proof_id: wp3.id, voter_id: ngo1.id, vote: "reject", comment: "Photos are too blurry to verify any progress.", signature_hash: sigHash(ngo1.id, "VOTE_REJECT", wp3.id), voted_at: pastDays(11) },
    { work_proof_id: wp3.id, voter_id: ngo2.id, vote: "reject", comment: "No material test certificates provided.", signature_hash: sigHash(ngo2.id, "VOTE_REJECT", wp3.id), voted_at: pastDays(10) },
    { work_proof_id: wp5.id, voter_id: ngo1.id, vote: "approve", comment: "POs match specs.", signature_hash: sigHash(ngo1.id, "VOTE", wp5.id), voted_at: pastDays(137) },
    { work_proof_id: wp5.id, voter_id: ngo2.id, vote: "approve", comment: "Delivery receipts confirmed.", signature_hash: sigHash(ngo2.id, "VOTE", wp5.id), voted_at: pastDays(136) },
    { work_proof_id: wp6.id, voter_id: ngo1.id, vote: "approve", comment: "CT calibration OK.", signature_hash: sigHash(ngo1.id, "VOTE", wp6.id), voted_at: pastDays(97) },
    { work_proof_id: wp6.id, voter_id: ngo2.id, vote: "approve", comment: "Installation verified.", signature_hash: sigHash(ngo2.id, "VOTE", wp6.id), voted_at: pastDays(96) },
    { work_proof_id: wp7.id, voter_id: ngo1.id, vote: "approve", comment: "MRI room shielding test passed.", signature_hash: sigHash(ngo1.id, "VOTE", wp7.id), voted_at: pastDays(47) },
    { work_proof_id: wp7.id, voter_id: ngo2.id, vote: "approve", comment: "All OT equipment functional.", signature_hash: sigHash(ngo2.id, "VOTE", wp7.id), voted_at: pastDays(46) },
    { work_proof_id: wp8.id, voter_id: ngo1.id, vote: "approve", comment: "Training attendance verified.", signature_hash: sigHash(ngo1.id, "VOTE", wp8.id), voted_at: pastDays(9) },
    { work_proof_id: wp8.id, voter_id: ngo2.id, vote: "approve", comment: "Handover accepted by hospital.", signature_hash: sigHash(ngo2.id, "VOTE", wp8.id), voted_at: pastDays(8) },
  ]);
  console.log("Proof votes created (13)");

  /* ===================== COMPLAINTS ===================== */
  const complaints = await Complaint.bulkCreate([
    { tender_id: T1.id, reporter_id: ramesh.id, subject: "Substandard bitumen quality on NH-12", description: "I observed the bitumen layer peeling off near KM-8 after recent rain. Photos attached.", evidence: [{ url: "/images/bad_road_km8.jpg", type: "photo" }, { url: "/images/peeling_bitumen.jpg", type: "photo" }], severity: "high", status: "action_taken", ngo_assigned_id: ngo1.id, ngo_assigned_by: central.id, investigation_result: "confirmed_valid", investigation_notes: "Field visit confirmed bitumen thickness is 45mm instead of required 65mm at km 7-9.", penalty_applied: true, signature_hash: sigHash(central.id, "COMPLAINT_ACTION", "cmp1") },
    { tender_id: T1.id, reporter_id: sunita.id, subject: "Drainage channels incomplete near Vidisha", description: "Drainage channels alongside the highway near Vidisha bypass are half-built. Water is accumulating on-road.", evidence: [{ url: "/images/drainage_incomplete.jpg", type: "photo" }], severity: "medium", status: "investigating", ngo_assigned_id: ngo2.id, ngo_assigned_by: central.id, investigation_result: "pending", investigation_notes: "Site visit scheduled for next week." },
    { tender_id: T4.id, reporter_id: ramesh.id, subject: "Hospital CT scanner not operational", description: "The CT scanner installed at Udaipur district hospital has been non-functional for 2 weeks.", evidence: [{ url: "/images/ct_not_working.jpg", type: "photo" }], severity: "critical", status: "assigned_to_ngo", ngo_assigned_id: ngo1.id, ngo_assigned_by: central.id },
    { tender_id: T2.id, reporter_id: sunita.id, subject: "Water pipeline project is a scam", description: "I think the entire pipeline tender is rigged.", evidence: [], severity: "high", status: "dismissed", ngo_assigned_id: ngo2.id, ngo_assigned_by: central.id, investigation_result: "confirmed_fake", investigation_notes: "No evidence. Project is still in bidding phase." },
    { tender_id: T1.id, reporter_id: ramesh.id, subject: "Night work without safety lights on highway", description: "Workers are doing bitumen work at night without proper safety lighting or reflective vests.", evidence: [{ url: "/images/night_work_unsafe.jpg", type: "photo" }], severity: "high", status: "verified", ngo_assigned_id: ngo1.id, ngo_assigned_by: central.id, investigation_result: "confirmed_valid", investigation_notes: "Confirmed during surprise night visit." },
    { reporter_id: sunita.id, subject: "Corruption allegation - contractor and official seen together", description: "I saw the highway contractor and a government official dining together.", evidence: [], severity: "low", status: "submitted" },
  ]);
  console.log("Complaints created (6)");

  /* ===================== CASES ===================== */
  const cases = await Case.bulkCreate([
    { case_number: "CASE-202501-A1B2C3", complaint_id: complaints[0].id, assigned_to: ngo1.id, created_by: central.id, status: "resolved", priority: "high", penalty_details: { contractor_id: asha.id, points_deducted: 50, reputation_deducted: 10, reason: "Substandard bitumen thickness" }, resolution_notes: "Confirmed bitumen thickness 45mm instead of required 65mm. Penalty applied.", resolved_at: pastDays(5) },
    { case_number: "CASE-202501-D4E5F6", complaint_id: complaints[1].id, assigned_to: ngo2.id, created_by: central.id, status: "investigating", priority: "medium", penalty_details: {}, resolution_notes: null },
    { case_number: "CASE-202501-G7H8I9", complaint_id: complaints[2].id, assigned_to: ngo1.id, created_by: central.id, status: "open", priority: "critical", penalty_details: {}, resolution_notes: null },
    { case_number: "CASE-202501-J0K1L2", complaint_id: complaints[4].id, assigned_to: ngo1.id, created_by: central.id, status: "closed", priority: "high", penalty_details: { contractor_id: asha.id, points_deducted: 30, reputation_deducted: 5, reason: "Safety violation - night work" }, resolution_notes: "Safety violation confirmed. Contractor warned and penalized.", resolved_at: pastDays(2) },
  ]);
  console.log("Cases created (4)");

  /* ===================== BLACKLIST REQUESTS ===================== */
  const blRequests = await BlacklistRequest.bulkCreate([
    { user_id: ravi.id, requested_by: rjGov.id, reason: "Submitted fraudulent KYC documents (forged PAN card and fake GSTIN)", status: "approved", acted_by: central.id, acted_at: pastDays(60), remarks: "Documents verified as fraudulent by independent agency. Blacklisted immediately." },
    { user_id: priya.id, requested_by: mpGov.id, reason: "Pending KYC verification failed twice. Suspected document manipulation.", status: "pending" },
  ]);
  console.log("Blacklist requests created (2)");

  /* ===================== POINTS LEDGER ===================== */
  await PointsLedger.bulkCreate([
    { user_id: asha.id, points: 50, reason: "Bid submitted on time", reference_type: "bid", reference_id: bidT1a.id },
    { user_id: asha.id, points: 100, reason: "Work proof approved - Milestone 1", reference_type: "work_proof", reference_id: wp1.id },
    { user_id: asha.id, points: -20, reason: "Work proof rejected - poor evidence quality", reference_type: "work_proof", reference_id: wp3.id },
    { user_id: asha.id, points: 50, reason: "Bid submitted on time", reference_type: "bid", reference_id: bidT7a.id },
    { user_id: vikram.id, points: 50, reason: "Bid submitted on time", reference_type: "bid", reference_id: bidT2v.id },
    { user_id: vikram.id, points: 100, reason: "Contract completed successfully", reference_type: "contract", reference_id: C2.id },
    { user_id: ngo1.id, points: 30, reason: "Work proof review completed", reference_type: "work_proof", reference_id: wp1.id },
    { user_id: ngo1.id, points: 30, reason: "Work proof review completed", reference_type: "work_proof", reference_id: wp2.id },
    { user_id: ngo1.id, points: 50, reason: "Complaint investigation - valid finding", reference_type: "complaint", reference_id: complaints[0].id },
    { user_id: ngo1.id, points: 50, reason: "Complaint investigation - safety violation found", reference_type: "complaint", reference_id: complaints[4].id },
    { user_id: ramesh.id, points: 25, reason: "Complaint verified - bitumen quality", reference_type: "complaint", reference_id: complaints[0].id },
    { user_id: ramesh.id, points: 20, reason: "Complaint verified - safety violation", reference_type: "complaint", reference_id: complaints[4].id },
    { user_id: sunita.id, points: -10, reason: "Complaint dismissed - baseless", reference_type: "complaint", reference_id: complaints[3].id },
    { user_id: sunita.id, points: 10, reason: "Complaint submitted", reference_type: "complaint", reference_id: complaints[1].id },
    { user_id: ravi.id, points: -50, reason: "Blacklisted - fraudulent KYC documents", reference_type: "user", reference_id: ravi.id },
    { user_id: mpGov.id, points: 30, reason: "Fund request approved", reference_type: "fund_request", reference_id: funds[0].id },
    { user_id: central.id, points: 50, reason: "Triage and resolution - complaint verified", reference_type: "complaint", reference_id: complaints[0].id },
  ]);
  console.log("Points ledger entries created (17)");

  /* ===================== AUDIT LOGS ===================== */
  const auditEntries = [
    { actor_id: central.id, actor_role: "central_gov", actor_name: "Central Admin", action: "FUND_REQUEST_APPROVED", entity_type: "fund_request", entity_id: funds[0].id, details: { amount: 45000000, state: "MP" } },
    { actor_id: central.id, actor_role: "central_gov", actor_name: "Central Admin", action: "FUND_REQUEST_REJECTED", entity_type: "fund_request", entity_id: funds[2].id, details: { reason: "Duplicate request" } },
    { actor_id: mpGov.id, actor_role: "state_gov", actor_name: "MP Govt Officer", action: "TENDER_CREATED", entity_type: "tender", entity_id: T1.id, details: { title: "NH-12 Highway Resurfacing Phase 1" } },
    { actor_id: rjGov.id, actor_role: "state_gov", actor_name: "RJ Govt Officer", action: "TENDER_CREATED", entity_type: "tender", entity_id: T2.id, details: { title: "Smart Water Supply Network" } },
    { actor_id: asha.id, actor_role: "contractor", actor_name: "Asha Constructions", action: "BID_SUBMITTED", entity_type: "bid", entity_id: bidT1a.id, details: { tender: T1.id, amount: 41500000 } },
    { actor_id: vikram.id, actor_role: "contractor", actor_name: "Vikram Infrastructure", action: "BID_SUBMITTED", entity_type: "bid", entity_id: bidT1v.id, details: { tender: T1.id, amount: 44000000 } },
    { actor_id: mpGov.id, actor_role: "state_gov", actor_name: "MP Govt Officer", action: "CONTRACT_AWARDED", entity_type: "contract", entity_id: C1.id, details: { contractor: "Asha Constructions", amount: 41500000 } },
    { actor_id: mpGov.id, actor_role: "state_gov", actor_name: "MP Govt Officer", action: "TRANCHE_DISBURSED", entity_type: "tranche", entity_id: tr1.id, details: { sequence: 1, amount: 10375000 } },
    { actor_id: asha.id, actor_role: "contractor", actor_name: "Asha Constructions", action: "WORK_PROOF_SUBMITTED", entity_type: "work_proof", entity_id: wp1.id, details: { milestone: "Site survey", percentage: 25 } },
    { actor_id: central.id, actor_role: "central_gov", actor_name: "Central Admin", action: "REVIEWERS_ASSIGNED", entity_type: "work_proof", entity_id: wp1.id, details: { reviewers: ["Transparency India", "Infrastructure Watch"] } },
    { actor_id: ngo1.id, actor_role: "auditor_ngo", actor_name: "Transparency India", action: "PROOF_VOTE_APPROVE", entity_type: "work_proof", entity_id: wp1.id, details: { comment: "Verified on-site" } },
    { actor_id: ngo2.id, actor_role: "auditor_ngo", actor_name: "Infrastructure Watch", action: "PROOF_VOTE_APPROVE", entity_type: "work_proof", entity_id: wp1.id, details: { comment: "Satellite imagery confirms" } },
    { actor_id: mpGov.id, actor_role: "state_gov", actor_name: "MP Govt Officer", action: "PAYMENT_RELEASED", entity_type: "payment", entity_id: payments[0].id, details: { amount: 10375000, milestone: "Site survey" } },
    { actor_id: ramesh.id, actor_role: "community", actor_name: "Ramesh Kumar", action: "COMPLAINT_SUBMITTED", entity_type: "complaint", entity_id: complaints[0].id, details: { subject: "Substandard bitumen" } },
    { actor_id: central.id, actor_role: "central_gov", actor_name: "Central Admin", action: "NGO_ASSIGNED_TO_COMPLAINT", entity_type: "complaint", entity_id: complaints[0].id, details: { ngo: "Transparency India" } },
    { actor_id: ngo1.id, actor_role: "auditor_ngo", actor_name: "Transparency India", action: "COMPLAINT_INVESTIGATED", entity_type: "complaint", entity_id: complaints[0].id, details: { result: "confirmed_valid" } },
    { actor_id: central.id, actor_role: "central_gov", actor_name: "Central Admin", action: "COMPLAINT_ACTION_TAKEN", entity_type: "complaint", entity_id: complaints[0].id, details: { penalty: true } },
    { actor_id: asha.id, actor_role: "contractor", actor_name: "Asha Constructions", action: "WORK_PROOF_SUBMITTED", entity_type: "work_proof", entity_id: wp2.id, details: { milestone: "Bitumen laying km 0-20", percentage: 50 } },
    { actor_id: central.id, actor_role: "central_gov", actor_name: "Central Admin", action: "FUND_REQUEST_APPROVED", entity_type: "fund_request", entity_id: funds[3].id, details: { amount: 35000000, state: "MH", reason: "Emergency" } },
    { actor_id: rjGov.id, actor_role: "state_gov", actor_name: "RJ Govt Officer", action: "CONTRACT_AWARDED", entity_type: "contract", entity_id: C2.id, details: { contractor: "Vikram Infrastructure", amount: 53000000 } },
    { actor_id: rjGov.id, actor_role: "state_gov", actor_name: "RJ Govt Officer", action: "CONTRACT_COMPLETED", entity_type: "contract", entity_id: C2.id, details: { total_paid: 53000000 } },
    { actor_id: sunita.id, actor_role: "community", actor_name: "Sunita Devi", action: "COMPLAINT_SUBMITTED", entity_type: "complaint", entity_id: complaints[1].id, details: { subject: "Drainage channels incomplete" } },
    { actor_id: central.id, actor_role: "central_gov", actor_name: "Central Admin", action: "USER_BLACKLISTED", entity_type: "user", entity_id: ravi.id, details: { reason: "Fraudulent KYC documents" } },
  ];
  for (const entry of auditEntries) {
    const entryH = auditHash(entry);
    await AuditLog.create({ ...entry, prev_hash: prevAuditHash, entry_hash: entryH, ip_address: "10.0.0.1" });
  }
  console.log("Audit log entries created (" + auditEntries.length + ")");

  /* ===================== NOTIFICATIONS ===================== */
  await Notification.bulkCreate([
    { user_id: central.id, type: "fund_request", title: "New Fund Request", message: "Rajasthan has requested Rs 2.5 Cr for water supply network.", entity_type: "fund_request", entity_id: funds[1].id, is_read: false },
    { user_id: central.id, type: "fund_request", title: "New Fund Request", message: "MP has requested Rs 1.5 Cr for smart classrooms.", entity_type: "fund_request", entity_id: funds[4].id, is_read: false },
    { user_id: central.id, type: "complaint", title: "New Complaint Filed", message: "Sunita Devi reported incomplete drainage near Vidisha.", entity_type: "complaint", entity_id: complaints[1].id, is_read: false },
    { user_id: central.id, type: "complaint", title: "New Complaint Filed", message: "Corruption allegation submitted by Sunita Devi.", entity_type: "complaint", entity_id: complaints[5].id, is_read: false },
    { user_id: central.id, type: "work_proof", title: "Work Proof Needs Reviewers", message: "Asha Constructions submitted proof for km 20-25 clearing.", entity_type: "work_proof", entity_id: wp4.id, is_read: false },
    { user_id: mpGov.id, type: "bid_submitted", title: "New Bid Received", message: "Vikram Infrastructure bid Rs 4.4 Cr on NH-12 tender.", entity_type: "bid", entity_id: bidT1v.id, is_read: true },
    { user_id: mpGov.id, type: "work_proof", title: "Work Proof Under Review", message: "Bitumen laying proof for km 0-20 is being reviewed by NGOs.", entity_type: "work_proof", entity_id: wp2.id, is_read: false },
    { user_id: mpGov.id, type: "complaint", title: "Complaint Action Taken", message: "Bitumen quality complaint verified. Penalty applied to contractor.", entity_type: "complaint", entity_id: complaints[0].id, is_read: true },
    { user_id: rjGov.id, type: "contract", title: "Contract Completed", message: "Udaipur hospital equipment contract fully completed and paid.", entity_type: "contract", entity_id: C2.id, is_read: true },
    { user_id: rjGov.id, type: "bid_submitted", title: "New Bids Received", message: "2 bids received for water supply tender.", entity_type: "tender", entity_id: T2.id, is_read: false },
    { user_id: asha.id, type: "contract_awarded", title: "Contract Awarded!", message: "You have been awarded the NH-12 Highway Resurfacing contract worth Rs 4.15 Cr.", entity_type: "contract", entity_id: C1.id, is_read: true },
    { user_id: asha.id, type: "payment", title: "Payment Released", message: "Rs 1.04 Cr released for Milestone 1 completion.", entity_type: "payment", entity_id: payments[0].id, is_read: true },
    { user_id: asha.id, type: "work_proof", title: "Work Proof Rejected", message: "Your proof submission was rejected. Please resubmit with clearer evidence.", entity_type: "work_proof", entity_id: wp3.id, is_read: true },
    { user_id: asha.id, type: "work_proof", title: "Proof Under Review", message: "Your bitumen laying proof is under review. 1 of 2 votes received.", entity_type: "work_proof", entity_id: wp2.id, is_read: false },
    { user_id: vikram.id, type: "contract_awarded", title: "Contract Awarded!", message: "You have been awarded the Udaipur Hospital Equipment contract.", entity_type: "contract", entity_id: C2.id, is_read: true },
    { user_id: vikram.id, type: "payment", title: "Final Payment Released", message: "Rs 1.33 Cr final payment released. Contract complete!", entity_type: "payment", entity_id: payments[5].id, is_read: true },
    { user_id: vikram.id, type: "bid_rejected", title: "Bid Not Selected", message: "Your bid on NH-12 Highway was not selected.", entity_type: "bid", entity_id: bidT1v.id, is_read: true },
    { user_id: ngo1.id, type: "review_assigned", title: "Review Assignment", message: "You have been assigned to review work proof for bitumen laying (km 0-20).", entity_type: "work_proof", entity_id: wp2.id, is_read: false },
    { user_id: ngo1.id, type: "complaint", title: "Investigation Assignment", message: "Central gov assigned you to investigate CT scanner complaint at Udaipur hospital.", entity_type: "complaint", entity_id: complaints[2].id, is_read: false },
    { user_id: ngo2.id, type: "review_assigned", title: "Review Assignment", message: "You have been assigned to review work proof for bitumen laying (km 0-20).", entity_type: "work_proof", entity_id: wp2.id, is_read: false },
    { user_id: ramesh.id, type: "complaint_update", title: "Complaint Resolved", message: "Your complaint about substandard bitumen has been verified and action taken.", entity_type: "complaint", entity_id: complaints[0].id, is_read: false },
    { user_id: ramesh.id, type: "points_earned", title: "+25 Points Earned", message: "You earned 25 points for your verified complaint.", entity_type: "user", entity_id: ramesh.id, is_read: false },
    { user_id: sunita.id, type: "complaint_update", title: "Complaint Dismissed", message: "Your complaint about the water pipeline project was dismissed after investigation.", entity_type: "complaint", entity_id: complaints[3].id, is_read: true },
    { user_id: sunita.id, type: "complaint_update", title: "Investigation Ongoing", message: "Your complaint about incomplete drainage is being investigated.", entity_type: "complaint", entity_id: complaints[1].id, is_read: false },
  ]);
  console.log("Notifications created (24)");

  /* ===================== SUMMARY ===================== */
  console.log("\n===========================================================");
  console.log("  SEED COMPLETE - TenderGuard v2 Test Data");
  console.log("===========================================================");
  console.log("  States:                3  (MP, RJ, MH)");
  console.log("  Users:                12  (1 central, 3 state, 4 contractor, 2 NGO, 2 community)");
  console.log("  Fund Requests:         5  (2 approved, 2 pending, 1 rejected)");
  console.log("  Tenders:               8  (draft, open x2, closed, awarded, in_progress, completed, cancelled)");
  console.log("  Bids:                 10  (submitted x5, shortlisted x1, awarded x3, rejected x1)");
  console.log("  Contracts:             2  (1 active, 1 completed)");
  console.log("  Tranches:              8  (5 disbursed, 2 pending, 1 held)");
  console.log("  Milestones:            8  (5 approved, 1 under_review, 2 pending)");
  console.log("  Payments:              6  (5 released, 1 pending)");
  console.log("  Work Proofs:           8  (5 approved, 1 under_review, 1 rejected, 1 pending_assignment)");
  console.log("  Proof Reviewers:      14");
  console.log("  Proof Votes:          13");
  console.log("  Complaints:            6  (submitted, assigned_to_ngo, investigating, verified, dismissed, action_taken)");
  console.log("  Cases:                 4  (1 resolved, 1 investigating, 1 open, 1 closed)");
  console.log("  Blacklist Requests:    2  (1 approved, 1 pending)");
  console.log("  Points Ledger:        17");
  console.log("  Audit Logs:           23");
  console.log("  Notifications:        24");
  console.log("\n  Login with any email above, password: Password123!");
  console.log("===========================================================\n");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
