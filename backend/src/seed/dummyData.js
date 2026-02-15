/**
 * Seed dummy data for the entire application flow.
 * Creates: users → fund requests → tenders → bids → contracts → milestones
 *        → payments → work proofs → complaints → audit logs → notifications
 *
 * Run: node src/seed/dummyData.js
 */
require("dotenv").config();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const {
  sequelize, State, User, FundRequest, Tender, Bid,
  Contract, Milestone, Payment, Complaint, AuditLog,
  ReputationCredit, WorkProof, Notification,
} = require("../models");

const PASSWORD = "Password123!";

/* ── helpers ── */
function days(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }
function pastDays(n) { return days(-n); }
function auditHash(data, prev) {
  const payload = JSON.stringify({ ...data, prev_hash: prev, ts: Date.now() });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

async function seed() {
  try {
    await sequelize.sync({ alter: true });
    console.log("📐 Models synced\n");

    const passwordHash = await bcrypt.hash(PASSWORD, 12);

    /* ═══════════ 1. FETCH STATES ═══════════ */
    const KA = await State.findOne({ where: { code: "KA" } });
    const MH = await State.findOne({ where: { code: "MH" } });
    const DL = await State.findOne({ where: { code: "DL" } });
    if (!KA || !MH || !DL) {
      console.error("❌ States not found. Run: npm run seed  first.");
      process.exit(1);
    }
    console.log("✅ States loaded (KA, MH, DL)");

    /* ═══════════ 2. USERS ═══════════ */
    const findOrMake = async (data) => {
      const [u] = await User.findOrCreate({
        where: { email: data.email },
        defaults: { ...data, password_hash: passwordHash },
      });
      return u;
    };

    const centralAdmin = await findOrMake({ name: "Central Admin", email: "central@gov.test", role: "central_gov" });
    const kaStateGov   = await findOrMake({ name: "Karnataka Admin", email: "ka.state@gov.test", role: "state_gov", state_id: KA.id });
    const mhStateGov   = await findOrMake({ name: "Maharashtra Admin", email: "mh.state@gov.test", role: "state_gov", state_id: MH.id });
    const kaContractor = await findOrMake({ name: "Ka Builder Co", email: "ka.contractor@test.com", role: "contractor", state_id: KA.id, kyc_status: "verified", reputation: 25 });
    const mhContractor = await findOrMake({ name: "Mh Infra Ltd", email: "mh.contractor@test.com", role: "contractor", state_id: MH.id, kyc_status: "verified", reputation: 42 });
    const dlContractor = await findOrMake({ name: "Dl Works", email: "dl.contractor@test.com", role: "contractor", state_id: DL.id, kyc_status: "verified", reputation: 18 });
    const kaContractor2 = await findOrMake({ name: "Ka Roads Pvt Ltd", email: "ka.contractor2@test.com", role: "contractor", state_id: KA.id, kyc_status: "verified", reputation: 60 });
    const auditorNgo   = await findOrMake({ name: "Audit NGO", email: "auditor@ngo.test", role: "auditor_ngo" });
    const community    = await findOrMake({ name: "Community User", email: "community@test.com", role: "community", state_id: KA.id });
    console.log("✅ 9 users ready");

    /* ═══════════ 3. FUND REQUESTS ═══════════ */
    const [fundReq1] = await FundRequest.findOrCreate({
      where: { state_id: KA.id, purpose: "Road infrastructure improvement in Bengaluru rural" },
      defaults: {
        state_id: KA.id, requested_by: kaStateGov.id,
        amount: 50000000, purpose: "Road infrastructure improvement in Bengaluru rural",
        status: "approved", approved_amount: 45000000,
        approved_by: centralAdmin.id, remarks: "Approved with 10% reduction",
      },
    });
    const [fundReq2] = await FundRequest.findOrCreate({
      where: { state_id: MH.id, purpose: "Mumbai-Pune bridge construction project" },
      defaults: {
        state_id: MH.id, requested_by: mhStateGov.id,
        amount: 120000000, purpose: "Mumbai-Pune bridge construction project",
        status: "pending",
      },
    });
    const [fundReq3] = await FundRequest.findOrCreate({
      where: { state_id: KA.id, purpose: "Water supply pipeline Dharwad district" },
      defaults: {
        state_id: KA.id, requested_by: kaStateGov.id,
        amount: 18000000, purpose: "Water supply pipeline Dharwad district",
        status: "rejected", remarks: "Insufficient documentation. Resubmit.",
      },
    });
    console.log("✅ 3 fund requests created");

    /* ═══════════ 4. TENDERS ═══════════ */
    // Tender 1: KA — in_progress (has contract, milestones, work proofs)
    const [tender1] = await Tender.findOrCreate({
      where: { title: "NH-275 Bengaluru-Mysuru Highway Resurfacing" },
      defaults: {
        state_id: KA.id, created_by: kaStateGov.id,
        title: "NH-275 Bengaluru-Mysuru Highway Resurfacing",
        description: "Complete resurfacing of 45km stretch of NH-275 between Ramanagara and Mandya. Includes drainage improvements and road marking.",
        scope: "Resurfacing, drainage, road marking, signage installation",
        location: "Bengaluru-Mysuru Highway", district: "Ramanagara",
        budget_hidden: 25000000, category: "road",
        bid_deadline: pastDays(30), project_deadline: days(180),
        qualification: { min_experience_years: 5, min_project_value: 10000000 },
        status: "in_progress",
      },
    });

    // Tender 2: KA — open (accepting bids)
    const [tender2] = await Tender.findOrCreate({
      where: { title: "Dharwad District Water Pipeline Extension" },
      defaults: {
        state_id: KA.id, created_by: kaStateGov.id,
        title: "Dharwad District Water Pipeline Extension",
        description: "Laying 25km of new water pipeline from Dharwad reservoir to surrounding villages. Includes pump stations and filtration units.",
        scope: "Pipeline laying, pump stations, water treatment",
        location: "Dharwad Rural", district: "Dharwad",
        budget_hidden: 18000000, category: "water",
        bid_deadline: days(15), project_deadline: days(365),
        qualification: { min_experience_years: 3 },
        status: "open",
      },
    });

    // Tender 3: MH — open
    const [tender3] = await Tender.findOrCreate({
      where: { title: "Pune Municipal School Building Construction" },
      defaults: {
        state_id: MH.id, created_by: mhStateGov.id,
        title: "Pune Municipal School Building Construction",
        description: "Construction of a 3-story school building with 24 classrooms, laboratory, library, and sports facilities in Hadapsar.",
        scope: "Foundation, structure, interiors, electrical, plumbing",
        location: "Hadapsar, Pune", district: "Pune",
        budget_hidden: 35000000, category: "building",
        bid_deadline: days(20), project_deadline: days(540),
        qualification: { min_experience_years: 7, min_project_value: 20000000 },
        status: "open",
      },
    });

    // Tender 4: KA — completed
    const [tender4] = await Tender.findOrCreate({
      where: { title: "Hubli Community Health Center Renovation" },
      defaults: {
        state_id: KA.id, created_by: kaStateGov.id,
        title: "Hubli Community Health Center Renovation",
        description: "Complete renovation of the Hubli Community Health Center including new OPD wing, upgraded electrical systems, and rainwater harvesting.",
        scope: "Renovation, electrical upgrade, rainwater harvesting",
        location: "Hubli", district: "Dharwad",
        budget_hidden: 8000000, category: "building",
        bid_deadline: pastDays(90), project_deadline: pastDays(5),
        qualification: { min_experience_years: 3 },
        status: "completed",
      },
    });

    // Tender 5: MH — cancelled
    const [tender5] = await Tender.findOrCreate({
      where: { title: "Nagpur Flyover Extension Phase-II" },
      defaults: {
        state_id: MH.id, created_by: mhStateGov.id,
        title: "Nagpur Flyover Extension Phase-II",
        description: "Extension of existing flyover near Nagpur railway station. Project cancelled due to revised urban plan.",
        scope: "Flyover extension, approach roads",
        location: "Nagpur", district: "Nagpur",
        budget_hidden: 95000000, category: "bridge",
        bid_deadline: pastDays(60), project_deadline: days(720),
        status: "cancelled",
      },
    });
    console.log("✅ 5 tenders created");

    /* ═══════════ 5. BIDS ═══════════ */
    // Bids for Tender 1 (awarded — kaContractor won)
    const [bid1a] = await Bid.findOrCreate({
      where: { tender_id: tender1.id, contractor_id: kaContractor.id },
      defaults: {
        tender_id: tender1.id, contractor_id: kaContractor.id,
        amount: 23500000, proposal: "We propose using polymer-modified bitumen for superior durability. Our team has completed 12 similar highway projects in Karnataka.",
        timeline_days: 150, doc_hashes: ["hash_proposal_1a", "hash_financials_1a"],
        ai_score: 78.5, status: "awarded",
      },
    });
    const [bid1b] = await Bid.findOrCreate({
      where: { tender_id: tender1.id, contractor_id: kaContractor2.id },
      defaults: {
        tender_id: tender1.id, contractor_id: kaContractor2.id,
        amount: 26000000, proposal: "Full resurfacing with hot-mix asphalt. We include 2-year maintenance warranty.",
        timeline_days: 120, doc_hashes: ["hash_proposal_1b"],
        ai_score: 65.2, status: "rejected",
      },
    });

    // Bids for Tender 2 (open — still accepting)
    const [bid2a] = await Bid.findOrCreate({
      where: { tender_id: tender2.id, contractor_id: kaContractor.id },
      defaults: {
        tender_id: tender2.id, contractor_id: kaContractor.id,
        amount: 16500000, proposal: "HDPE pipeline with 50-year lifespan. Solar-powered pump stations for energy efficiency.",
        timeline_days: 300, doc_hashes: ["hash_proposal_2a"],
        ai_score: 72.1, status: "submitted",
      },
    });
    const [bid2b] = await Bid.findOrCreate({
      where: { tender_id: tender2.id, contractor_id: kaContractor2.id },
      defaults: {
        tender_id: tender2.id, contractor_id: kaContractor2.id,
        amount: 17200000, proposal: "DI pipeline with UV filtration at pump stations. Includes 3-year maintenance.",
        timeline_days: 280, doc_hashes: ["hash_proposal_2b"],
        ai_score: 80.4, status: "submitted",
      },
    });

    // Bid for Tender 3 (open)
    const [bid3a] = await Bid.findOrCreate({
      where: { tender_id: tender3.id, contractor_id: mhContractor.id },
      defaults: {
        tender_id: tender3.id, contractor_id: mhContractor.id,
        amount: 33000000, proposal: "Earthquake-resistant RCC structure. Green building features with rooftop solar.",
        timeline_days: 450, doc_hashes: ["hash_proposal_3a"],
        ai_score: 85.3, status: "submitted",
      },
    });

    // Bids for Tender 4 (completed — kaContractor2 won)
    const [bid4a] = await Bid.findOrCreate({
      where: { tender_id: tender4.id, contractor_id: kaContractor2.id },
      defaults: {
        tender_id: tender4.id, contractor_id: kaContractor2.id,
        amount: 7500000, proposal: "Complete renovation with modern fixtures. Rainwater harvesting capacity 50,000L.",
        timeline_days: 90, doc_hashes: ["hash_proposal_4a"],
        ai_score: 88.0, status: "awarded",
      },
    });
    console.log("✅ 6 bids created");

    /* ═══════════ 6. CONTRACTS + MILESTONES ═══════════ */
    // Contract 1: Tender 1 → kaContractor (active, in progress)
    const [contract1] = await Contract.findOrCreate({
      where: { tender_id: tender1.id },
      defaults: {
        tender_id: tender1.id, contractor_id: kaContractor.id,
        total_amount: 23500000, escrow_balance: 14100000, // 60% remaining (20% initial + 20% ms1 paid)
        status: "active", award_date: pastDays(25),
      },
    });

    const ms1Data = [
      { contract_id: contract1.id, title: "Site Preparation & Drainage", description: "Clear 45km stretch, set up drainage channels", sequence: 1, amount: 4700000, due_date: pastDays(5), status: "approved", review_notes: "Drone survey confirms completion" },
      { contract_id: contract1.id, title: "Base Layer & Sub-base", description: "Lay WBM and gravel sub-base for 45km", sequence: 2, amount: 7050000, due_date: days(30), status: "proof_uploaded", proof_files: [{ url: "/uploads/base_layer_1.jpg", hash: "abc123", geo: { lat: 12.7, lng: 76.8 }, timestamp: new Date() }] },
      { contract_id: contract1.id, title: "Bitumen Surface & Markings", description: "Final resurfacing with PMB and road markings", sequence: 3, amount: 7050000, due_date: days(90), status: "pending" },
      { contract_id: contract1.id, title: "Signage & Final Inspection", description: "Install road signs, reflectors, and final audit", sequence: 4, amount: 4700000, due_date: days(150), status: "pending" },
    ];

    const milestones1 = [];
    for (const m of ms1Data) {
      const [ms] = await Milestone.findOrCreate({
        where: { contract_id: m.contract_id, sequence: m.sequence },
        defaults: m,
      });
      milestones1.push(ms);
    }

    // Contract 2: Tender 4 → kaContractor2 (completed)
    const [contract2] = await Contract.findOrCreate({
      where: { tender_id: tender4.id },
      defaults: {
        tender_id: tender4.id, contractor_id: kaContractor2.id,
        total_amount: 7500000, escrow_balance: 0,
        status: "completed", award_date: pastDays(85),
      },
    });

    const ms2Data = [
      { contract_id: contract2.id, title: "Demolition & Civil Work", sequence: 1, amount: 2500000, due_date: pastDays(60), status: "approved", review_notes: "Good quality work" },
      { contract_id: contract2.id, title: "Electrical & Plumbing", sequence: 2, amount: 2500000, due_date: pastDays(30), status: "approved", review_notes: "Approved after reinspection" },
      { contract_id: contract2.id, title: "Finishing & Handover", sequence: 3, amount: 2500000, due_date: pastDays(10), status: "approved", review_notes: "Project completed successfully" },
    ];

    const milestones2 = [];
    for (const m of ms2Data) {
      const [ms] = await Milestone.findOrCreate({
        where: { contract_id: m.contract_id, sequence: m.sequence },
        defaults: m,
      });
      milestones2.push(ms);
    }
    console.log("✅ 2 contracts, 7 milestones created");

    /* ═══════════ 7. PAYMENTS ═══════════ */
    // Initial 20% payment for contract 1
    await Payment.findOrCreate({
      where: { milestone_id: milestones1[0].id, method: "initial_disbursement" },
      defaults: {
        milestone_id: milestones1[0].id, amount: 4700000,
        status: "released", released_at: pastDays(25),
        tx_hash: `TX-INITIAL-${contract1.id.slice(0, 8)}`, method: "initial_disbursement",
      },
    });
    // Milestone 1 payment for contract 1
    await Payment.findOrCreate({
      where: { milestone_id: milestones1[0].id, method: "escrow" },
      defaults: {
        milestone_id: milestones1[0].id, amount: 4700000,
        status: "released", released_at: pastDays(3),
        tx_hash: `TX-MS1-${contract1.id.slice(0, 8)}`, method: "escrow",
      },
    });

    // All payments for contract 2 (completed)
    for (let i = 0; i < milestones2.length; i++) {
      await Payment.findOrCreate({
        where: { milestone_id: milestones2[i].id },
        defaults: {
          milestone_id: milestones2[i].id, amount: 2500000,
          status: "released", released_at: pastDays(60 - i * 25),
          tx_hash: `TX-MS${i + 1}-${contract2.id.slice(0, 8)}`, method: "escrow",
        },
      });
    }
    console.log("✅ 5 payments created");

    /* ═══════════ 8. WORK PROOFS ═══════════ */
    // Approved proof for milestone 1 of contract 1
    const [wp1] = await WorkProof.findOrCreate({
      where: { contract_id: contract1.id, milestone_id: milestones1[0].id, submitted_by: kaContractor.id },
      defaults: {
        contract_id: contract1.id, milestone_id: milestones1[0].id,
        submitted_by: kaContractor.id,
        description: "Site preparation complete. Drainage channels installed along 45km stretch. Attached drone survey photos.",
        photo_urls: [
          { url: "/uploads/site_prep_1.jpg", hash: "aaa111", geo: { lat: 12.7309, lng: 76.8250 }, timestamp: pastDays(7) },
          { url: "/uploads/drainage_1.jpg", hash: "aaa222", geo: { lat: 12.7400, lng: 76.8100 }, timestamp: pastDays(7) },
        ],
        work_percentage: 25, amount_requested: 4700000,
        status: "approved", review_notes: "Verified via drone survey. Work quality good.",
        reviewed_by: auditorNgo.id, reviewed_at: pastDays(3),
      },
    });

    // Pending proof for milestone 2 of contract 1
    const [wp2] = await WorkProof.findOrCreate({
      where: { contract_id: contract1.id, milestone_id: milestones1[1].id, submitted_by: kaContractor.id },
      defaults: {
        contract_id: contract1.id, milestone_id: milestones1[1].id,
        submitted_by: kaContractor.id,
        description: "Base layer (WBM + gravel) laid for 30km out of 45km. Remaining 15km in progress.",
        photo_urls: [
          { url: "/uploads/base_layer_photo1.jpg", hash: "bbb111", geo: { lat: 12.72, lng: 76.83 }, timestamp: pastDays(1) },
          { url: "/uploads/base_layer_photo2.jpg", hash: "bbb222", geo: { lat: 12.75, lng: 76.80 }, timestamp: pastDays(1) },
        ],
        work_percentage: 65, amount_requested: 7050000,
        status: "pending_review",
      },
    });
    console.log("✅ 2 work proofs created");

    /* ═══════════ 9. COMPLAINTS ═══════════ */
    const [complaint1] = await Complaint.findOrCreate({
      where: { tender_id: tender1.id, subject: "Substandard material used on highway stretch" },
      defaults: {
        tender_id: tender1.id, reporter_id: community.id,
        subject: "Substandard material used on highway stretch",
        description: "The resurfacing material near km 12 appears to be low-grade bitumen. Cracks already visible after 2 weeks. Attached photos.",
        evidence: [{ url: "/uploads/complaint_crack1.jpg", type: "photo" }, { url: "/uploads/complaint_crack2.jpg", type: "photo" }],
        geo_location: { lat: 12.735, lng: 76.815 },
        severity: "high", status: "investigating",
      },
    });

    const [complaint2] = await Complaint.findOrCreate({
      where: { tender_id: tender1.id, subject: "Workers not wearing safety gear" },
      defaults: {
        tender_id: tender1.id, reporter_id: community.id,
        subject: "Workers not wearing safety gear",
        description: "Observed construction workers without helmets and reflective vests near Ramanagara bypass section.",
        evidence: [{ url: "/uploads/safety_issue.jpg", type: "photo" }],
        geo_location: { lat: 12.72, lng: 76.90 },
        severity: "medium", status: "submitted",
      },
    });

    const [complaint3] = await Complaint.findOrCreate({
      where: { tender_id: tender4.id, subject: "Delay in health center handover" },
      defaults: {
        tender_id: tender4.id, reporter_id: community.id,
        subject: "Delay in health center handover",
        description: "The Hubli health center was supposed to open last month but renovation is still ongoing.",
        severity: "low", status: "dismissed",
      },
    });
    console.log("✅ 3 complaints created");

    /* ═══════════ 10. REPUTATION CREDITS ═══════════ */
    await ReputationCredit.findOrCreate({
      where: { user_id: kaContractor2.id, reason: "Project completed successfully" },
      defaults: {
        user_id: kaContractor2.id, points: 10,
        reason: "Project completed successfully", project_id: tender4.id,
      },
    });
    await ReputationCredit.findOrCreate({
      where: { user_id: kaContractor2.id, reason: "Ahead of schedule delivery" },
      defaults: {
        user_id: kaContractor2.id, points: 5,
        reason: "Ahead of schedule delivery", project_id: tender4.id,
      },
    });
    // Update reputation on user
    const totalRep = await ReputationCredit.sum("points", { where: { user_id: kaContractor2.id } });
    await User.update({ reputation: totalRep || 60 }, { where: { id: kaContractor2.id } });
    console.log("✅ Reputation credits created");

    /* ═══════════ 11. AUDIT LOGS ═══════════ */
    let prevHash = "GENESIS";
    const auditEntries = [
      { actor_id: kaStateGov.id, actor_role: "state_gov", action: "FUND_REQUEST_CREATE", entity_type: "fund_request", entity_id: fundReq1.id, details: { amount: 50000000 } },
      { actor_id: centralAdmin.id, actor_role: "central_gov", action: "FUND_REQUEST_UPDATE", entity_type: "fund_request", entity_id: fundReq1.id, details: { status: "approved", approved_amount: 45000000 } },
      { actor_id: kaStateGov.id, actor_role: "state_gov", action: "TENDER_CREATE", entity_type: "tender", entity_id: tender1.id, details: { title: tender1.title } },
      { actor_id: kaStateGov.id, actor_role: "state_gov", action: "TENDER_CREATE", entity_type: "tender", entity_id: tender2.id, details: { title: tender2.title } },
      { actor_id: kaContractor.id, actor_role: "contractor", action: "BID_SUBMIT", entity_type: "bid", entity_id: bid1a.id, details: { amount: 23500000 } },
      { actor_id: kaContractor2.id, actor_role: "contractor", action: "BID_SUBMIT", entity_type: "bid", entity_id: bid1b.id, details: { amount: 26000000 } },
      { actor_id: kaStateGov.id, actor_role: "state_gov", action: "CONTRACT_AUTO_AWARD", entity_type: "contract", entity_id: contract1.id, details: { winning_bid: bid1a.id } },
      { actor_id: kaContractor.id, actor_role: "contractor", action: "WORK_PROOF_SUBMIT", entity_type: "work_proof", entity_id: wp1.id, details: { amount_requested: 4700000 } },
      { actor_id: auditorNgo.id, actor_role: "auditor_ngo", action: "WORK_PROOF_APPROVE", entity_type: "work_proof", entity_id: wp1.id, details: { approved: true } },
      { actor_id: kaContractor.id, actor_role: "contractor", action: "WORK_PROOF_SUBMIT", entity_type: "work_proof", entity_id: wp2.id, details: { amount_requested: 7050000 } },
      { actor_id: community.id, actor_role: "community", action: "COMPLAINT_SUBMIT", entity_type: "complaint", entity_id: complaint1.id, details: { severity: "high" } },
    ];

    // Only insert if audit log is empty (idempotent)
    const existingAudits = await AuditLog.count();
    if (existingAudits === 0) {
      for (const entry of auditEntries) {
        const entryHash = auditHash(entry, prevHash);
        await AuditLog.create({ ...entry, prev_hash: prevHash, entry_hash: entryHash });
        prevHash = entryHash;
      }
      console.log("✅ 11 audit log entries created (hash-chained)");
    } else {
      console.log("⚠️  Audit logs already exist, skipping");
    }

    /* ═══════════ 12. NOTIFICATIONS ═══════════ */
    const existingNotifs = await Notification.count();
    if (existingNotifs === 0) {
      const notifications = [
        // Contractor won contract
        { user_id: kaContractor.id, type: "contract_awarded", title: "🎉 Contract Awarded!", message: `Your bid for "${tender1.title}" has been awarded! Contract amount: ₹2,35,00,000. Initial 20% (₹47,00,000) disbursed.`, entity_type: "contract", entity_id: contract1.id },
        { user_id: kaContractor.id, type: "payment_released", title: "Initial Payment Released", message: "₹47,00,000 (20% advance) has been released.", entity_type: "payment", entity_id: contract1.id },
        // Work proof approved
        { user_id: kaContractor.id, type: "proof_approved", title: "Work Proof Approved!", message: "Your work proof for milestone 1 has been approved. ₹47,00,000 released.", entity_type: "work_proof", entity_id: wp1.id },
        { user_id: kaContractor.id, type: "payment_released", title: "Milestone Payment Released", message: "₹47,00,000 released for Site Preparation & Drainage.", entity_type: "payment", entity_id: wp1.id },
        // Pending verification for NGO/community
        { user_id: auditorNgo.id, type: "verification_needed", title: "Work Proof Needs Verification", message: `New work proof submitted for "${tender1.title}". Base layer work — 65% complete.`, entity_type: "work_proof", entity_id: wp2.id },
        { user_id: community.id, type: "verification_needed", title: "Work Proof Needs Verification", message: `Contractor submitted proof for "${tender1.title}". Please review.`, entity_type: "work_proof", entity_id: wp2.id },
        // State gov notification
        { user_id: kaStateGov.id, type: "proof_submitted", title: "New Work Proof Submitted", message: `Ka Builder Co submitted proof for "${tender1.title}". ₹70,50,000 requested.`, entity_type: "work_proof", entity_id: wp2.id },
        // Completed project
        { user_id: kaContractor2.id, type: "contract_awarded", title: "🎉 Contract Awarded!", message: `Your bid for "${tender4.title}" has been awarded!`, entity_type: "contract", entity_id: contract2.id, is_read: true },
        { user_id: kaContractor2.id, type: "payment_released", title: "Final Payment Released", message: "All milestone payments released. Project completed!", entity_type: "contract", entity_id: contract2.id, is_read: true },
      ];

      await Notification.bulkCreate(notifications);
      console.log("✅ 9 notifications created");
    } else {
      console.log("⚠️  Notifications already exist, skipping");
    }

    /* ═══════════ SUMMARY ═══════════ */
    console.log("\n" + "═".repeat(60));
    console.log("✅  ALL DUMMY DATA SEEDED SUCCESSFULLY");
    console.log("═".repeat(60));
    console.log(`
📊 Data Summary:
   States:            3 used (KA, MH, DL)
   Users:             9 (1 central, 2 state, 4 contractor, 1 NGO, 1 community)
   Fund Requests:     3 (1 approved, 1 pending, 1 rejected)
   Tenders:           5 (1 in_progress, 2 open, 1 completed, 1 cancelled)
   Bids:              6 (2 awarded, 3 submitted, 1 rejected)
   Contracts:         2 (1 active, 1 completed)
   Milestones:        7 (4 for active contract, 3 for completed)
   Payments:          5 (all released)
   Work Proofs:       2 (1 approved, 1 pending_review)
   Complaints:        3 (1 investigating, 1 submitted, 1 dismissed)
   Audit Logs:        11 entries (hash-chained)
   Notifications:     9
   Reputation Credits: 2

🔑 Login Credentials (password: ${PASSWORD}):
   central@gov.test        → Central Government
   ka.state@gov.test       → Karnataka State Gov
   mh.state@gov.test       → Maharashtra State Gov
   ka.contractor@test.com  → KA Contractor (active project)
   ka.contractor2@test.com → KA Contractor 2 (completed project)
   mh.contractor@test.com  → MH Contractor (bid on school)
   dl.contractor@test.com  → DL Contractor
   auditor@ngo.test        → Auditor NGO
   community@test.com      → Community User
`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

seed();
