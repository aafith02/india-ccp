/**
 * Seed demo tenders, contracts, milestones for showcase.
 * Run: node src/seed/tenders.js
 */
require("dotenv").config();
const { sequelize, State, User, Tender, Bid, Contract, Milestone, Payment } = require("../models");

async function seed() {
  try {
    await sequelize.sync({ alter: true });

    // Get states
    const ka = await State.findOne({ where: { code: "KA" } });
    const mh = await State.findOne({ where: { code: "MH" } });
    const dl = await State.findOne({ where: { code: "DL" } });

    if (!ka || !mh || !dl) {
      console.error("❌ States not found. Run states.js seed first.");
      process.exit(1);
    }

    // Get contractors
    const kaContractor = await User.findOne({ where: { email: "ka.contractor@test.com" } });
    const mhContractor = await User.findOne({ where: { email: "mh.contractor@test.com" } });
    const dlContractor = await User.findOne({ where: { email: "dl.contractor@test.com" } });

    // Get state admins
    const kaAdmin = await User.findOne({ where: { email: "ka.state@gov.test" } });
    const mhAdmin = await User.findOne({ where: { email: "mh.state@gov.test" } });

    if (!kaContractor || !mhContractor || !dlContractor) {
      console.error("❌ Contractors not found. Run users.js seed first.");
      process.exit(1);
    }

    // ═══════════════════════════════════════════════════════════════
    // TENDERS
    // ═══════════════════════════════════════════════════════════════
    const tendersData = [
      // Karnataka - In Progress
      {
        title: "Bengaluru Outer Ring Road Widening Phase-3",
        description: "Widening of 12km stretch of Outer Ring Road from Hebbal to Marathahalli. Includes 4-lane expansion, service roads, and pedestrian facilities.",
        scope: "Road widening, drainage, street lighting, signage",
        location: "Bengaluru",
        district: "Bengaluru Urban",
        budget_hidden: 85000000,
        bid_deadline: new Date("2025-09-15"),
        project_deadline: new Date("2027-03-31"),
        status: "in_progress",
        state_id: ka.id,
        created_by: kaAdmin?.id,
      },
      {
        title: "Mysore Smart City Water Supply Enhancement",
        description: "Replacement of old water pipelines and installation of smart meters in Mysore heritage zone covering 15 wards.",
        scope: "Pipeline replacement, smart metering, valve automation",
        location: "Mysore",
        district: "Mysore",
        budget_hidden: 42000000,
        bid_deadline: new Date("2025-08-20"),
        project_deadline: new Date("2026-12-31"),
        status: "in_progress",
        state_id: ka.id,
        created_by: kaAdmin?.id,
      },
      {
        title: "Hubli-Dharwad BRTS Extension",
        description: "Extension of Bus Rapid Transit System corridor by 8km with 6 new stations.",
        scope: "Road construction, station infrastructure, passenger amenities",
        location: "Hubli",
        district: "Dharwad",
        budget_hidden: 120000000,
        bid_deadline: new Date("2026-01-15"),
        project_deadline: new Date("2028-06-30"),
        status: "open",
        state_id: ka.id,
        created_by: kaAdmin?.id,
      },

      // Maharashtra - Mix of statuses
      {
        title: "Mumbai Coastal Road Tunnel Section-B",
        description: "Construction of 2.8km twin tunnel under Malabar Hill as part of Mumbai Coastal Road project.",
        scope: "Tunnel boring, ventilation systems, traffic management",
        location: "Mumbai",
        district: "Mumbai City",
        budget_hidden: 450000000,
        bid_deadline: new Date("2025-06-30"),
        project_deadline: new Date("2028-12-31"),
        status: "in_progress",
        state_id: mh.id,
        created_by: mhAdmin?.id,
      },
      {
        title: "Pune Metro Line 3 - Civil Works",
        description: "Underground metro construction from Hinjewadi to Shivajinagar covering 23km with 15 stations.",
        scope: "Underground excavation, station construction, track laying",
        location: "Pune",
        district: "Pune",
        budget_hidden: 680000000,
        bid_deadline: new Date("2025-07-15"),
        project_deadline: new Date("2029-06-30"),
        status: "awarded",
        state_id: mh.id,
        created_by: mhAdmin?.id,
      },
      {
        title: "Nagpur Orange City Water Treatment Plant",
        description: "Construction of 150 MLD water treatment plant with modern filtration technology.",
        scope: "Civil works, equipment installation, commissioning",
        location: "Nagpur",
        district: "Nagpur",
        budget_hidden: 95000000,
        bid_deadline: new Date("2026-02-28"),
        project_deadline: new Date("2027-08-31"),
        status: "open",
        state_id: mh.id,
        created_by: mhAdmin?.id,
      },

      // Delhi
      {
        title: "Delhi-NCR Elevated Corridor Phase-2",
        description: "22km elevated expressway connecting Dwarka with IGI Airport Terminal 3.",
        scope: "Elevated road construction, toll systems, landscaping",
        location: "New Delhi",
        district: "South West Delhi",
        budget_hidden: 520000000,
        bid_deadline: new Date("2025-05-31"),
        project_deadline: new Date("2028-03-31"),
        status: "in_progress",
        state_id: dl.id,
      },
      {
        title: "Smart Street Lighting - Central Delhi",
        description: "Installation of 15,000 smart LED lights with IoT monitoring in NDMC area.",
        scope: "Light installation, control systems, monitoring dashboard",
        location: "New Delhi",
        district: "Central Delhi",
        budget_hidden: 28000000,
        bid_deadline: new Date("2025-11-30"),
        project_deadline: new Date("2026-06-30"),
        status: "completed",
        state_id: dl.id,
      },
    ];

    const createdTenders = [];
    for (const t of tendersData) {
      const [tender] = await Tender.findOrCreate({
        where: { title: t.title },
        defaults: t,
      });
      createdTenders.push(tender);
    }

    console.log(`✅ Created/found ${createdTenders.length} tenders`);

    // ═══════════════════════════════════════════════════════════════
    // BIDS & CONTRACTS (for awarded/in_progress tenders)
    // ═══════════════════════════════════════════════════════════════
    
    // Bengaluru ORR - awarded to Ka Builder Co
    const orrTender = createdTenders.find(t => t.title.includes("Outer Ring Road"));
    if (orrTender && kaContractor) {
      const [bid] = await Bid.findOrCreate({
        where: { tender_id: orrTender.id, contractor_id: kaContractor.id },
        defaults: {
          tender_id: orrTender.id,
          contractor_id: kaContractor.id,
          amount: 82000000,
          proposal: "Comprehensive road widening with minimal traffic disruption using phased construction approach.",
          timeline_days: 540,
          ai_score: 87.5,
          status: "awarded",
        },
      });

      const [contract] = await Contract.findOrCreate({
        where: { tender_id: orrTender.id },
        defaults: {
          tender_id: orrTender.id,
          contractor_id: kaContractor.id,
          total_amount: 82000000,
          status: "active",
          escrow_balance: 41000000,
        },
      });

      // Milestones for ORR project
      const orrMilestones = [
        { title: "Site Survey & Preparation", description: "Complete survey, land clearing, traffic diversion setup", sequence: 1, amount: 8200000, status: "approved", due_date: new Date("2025-12-31") },
        { title: "Phase 1 - Hebbal to Manyata", description: "3km road widening with drainage", sequence: 2, amount: 20500000, status: "approved", due_date: new Date("2026-04-30") },
        { title: "Phase 2 - Manyata to Marathahalli", description: "5km road widening with service roads", sequence: 3, amount: 28700000, status: "proof_uploaded", due_date: new Date("2026-09-30") },
        { title: "Phase 3 - Final Stretch", description: "4km completion with street lighting", sequence: 4, amount: 16400000, status: "pending", due_date: new Date("2027-01-31") },
        { title: "Project Handover", description: "Final inspection, documentation, handover", sequence: 5, amount: 8200000, status: "pending", due_date: new Date("2027-03-31") },
      ];

      for (const m of orrMilestones) {
        await Milestone.findOrCreate({
          where: { contract_id: contract.id, sequence: m.sequence },
          defaults: { ...m, contract_id: contract.id },
        });
      }
    }

    // Mumbai Coastal Road - awarded to Mh Infra Ltd
    const coastalTender = createdTenders.find(t => t.title.includes("Coastal Road Tunnel"));
    if (coastalTender && mhContractor) {
      const [bid] = await Bid.findOrCreate({
        where: { tender_id: coastalTender.id, contractor_id: mhContractor.id },
        defaults: {
          tender_id: coastalTender.id,
          contractor_id: mhContractor.id,
          amount: 435000000,
          proposal: "State-of-the-art TBM technology with 24/7 monitoring and minimal surface disruption.",
          timeline_days: 1095,
          ai_score: 92.3,
          status: "awarded",
        },
      });

      const [contract] = await Contract.findOrCreate({
        where: { tender_id: coastalTender.id },
        defaults: {
          tender_id: coastalTender.id,
          contractor_id: mhContractor.id,
          total_amount: 435000000,
          status: "active",
          escrow_balance: 217500000,
        },
      });

      // Milestones
      const coastalMilestones = [
        { title: "TBM Assembly & Launch", description: "Tunnel Boring Machine setup at launch shaft", sequence: 1, amount: 65250000, status: "approved", due_date: new Date("2025-12-31") },
        { title: "Tunnel Excavation - 50%", description: "Complete 1.4km tunnel boring", sequence: 2, amount: 130500000, status: "under_review", due_date: new Date("2026-12-31") },
        { title: "Tunnel Excavation - 100%", description: "Complete remaining 1.4km", sequence: 3, amount: 130500000, status: "pending", due_date: new Date("2027-12-31") },
        { title: "Ventilation & Safety Systems", description: "Install ventilation, fire safety, CCTV", sequence: 4, amount: 65250000, status: "pending", due_date: new Date("2028-06-30") },
        { title: "Final Commissioning", description: "Testing, certification, public opening", sequence: 5, amount: 43500000, status: "pending", due_date: new Date("2028-12-31") },
      ];

      for (const m of coastalMilestones) {
        await Milestone.findOrCreate({
          where: { contract_id: contract.id, sequence: m.sequence },
          defaults: { ...m, contract_id: contract.id },
        });
      }
    }

    // Delhi Elevated Corridor - awarded to Dl Works
    const delhiTender = createdTenders.find(t => t.title.includes("Elevated Corridor"));
    if (delhiTender && dlContractor) {
      const [bid] = await Bid.findOrCreate({
        where: { tender_id: delhiTender.id, contractor_id: dlContractor.id },
        defaults: {
          tender_id: delhiTender.id,
          contractor_id: dlContractor.id,
          amount: 498000000,
          proposal: "Precast segment construction for fast execution with integrated toll systems.",
          timeline_days: 900,
          ai_score: 85.7,
          status: "awarded",
        },
      });

      const [contract] = await Contract.findOrCreate({
        where: { tender_id: delhiTender.id },
        defaults: {
          tender_id: delhiTender.id,
          contractor_id: dlContractor.id,
          total_amount: 498000000,
          status: "active",
          escrow_balance: 149400000,
        },
      });

      // Milestones
      const delhiMilestones = [
        { title: "Foundation Works", description: "Pile foundations for all 180 pillars", sequence: 1, amount: 99600000, status: "approved", due_date: new Date("2026-03-31") },
        { title: "Pillar Construction", description: "Complete pillar construction", sequence: 2, amount: 124500000, status: "proof_uploaded", due_date: new Date("2026-09-30") },
        { title: "Deck Launching", description: "Precast deck segment launching", sequence: 3, amount: 149400000, status: "pending", due_date: new Date("2027-06-30") },
        { title: "Road Surface & Systems", description: "Asphalting, barriers, lighting, toll", sequence: 4, amount: 74700000, status: "pending", due_date: new Date("2027-12-31") },
        { title: "Completion & Opening", description: "Safety audit and public opening", sequence: 5, amount: 49800000, status: "pending", due_date: new Date("2028-03-31") },
      ];

      for (const m of delhiMilestones) {
        await Milestone.findOrCreate({
          where: { contract_id: contract.id, sequence: m.sequence },
          defaults: { ...m, contract_id: contract.id },
        });
      }
    }

    // Completed project - Delhi Smart Lighting
    const lightingTender = createdTenders.find(t => t.title.includes("Smart Street Lighting"));
    if (lightingTender && dlContractor) {
      const [bid] = await Bid.findOrCreate({
        where: { tender_id: lightingTender.id, contractor_id: dlContractor.id },
        defaults: {
          tender_id: lightingTender.id,
          contractor_id: dlContractor.id,
          amount: 26500000,
          proposal: "Energy-efficient LED with smart dimming and remote monitoring.",
          timeline_days: 210,
          ai_score: 88.2,
          status: "awarded",
        },
      });

      const [contract] = await Contract.findOrCreate({
        where: { tender_id: lightingTender.id },
        defaults: {
          tender_id: lightingTender.id,
          contractor_id: dlContractor.id,
          total_amount: 26500000,
          status: "completed",
          escrow_balance: 0,
        },
      });

      // All milestones completed
      const lightMilestones = [
        { title: "Pole Installation Zone-1", description: "5000 poles in Connaught Place area", sequence: 1, amount: 8833333, status: "approved", due_date: new Date("2026-02-28") },
        { title: "Pole Installation Zone-2", description: "5000 poles in India Gate area", sequence: 2, amount: 8833333, status: "approved", due_date: new Date("2026-04-30") },
        { title: "IoT System Integration", description: "Control center and monitoring setup", sequence: 3, amount: 8833334, status: "approved", due_date: new Date("2026-06-30") },
      ];

      for (const m of lightMilestones) {
        const [milestone] = await Milestone.findOrCreate({
          where: { contract_id: contract.id, sequence: m.sequence },
          defaults: { ...m, contract_id: contract.id },
        });

        // Create payment for completed milestones
        if (m.status === "approved") {
          await Payment.findOrCreate({
            where: { milestone_id: milestone.id },
            defaults: {
              milestone_id: milestone.id,
              amount: m.amount,
              status: "released",
              released_at: new Date(),
            },
          });
        }
      }
    }

    console.log("✅ Created contracts, bids, and milestones");
    console.log("\n═══ Demo Data Summary ═══");
    console.log(`Tenders: ${createdTenders.length}`);
    console.log("  - Open: 2 (Hubli BRTS, Nagpur WTP)");
    console.log("  - Awarded: 1 (Pune Metro)");
    console.log("  - In Progress: 4 (ORR, Mysore Water, Coastal Road, Delhi Corridor)");
    console.log("  - Completed: 1 (Delhi Smart Lighting)");
    console.log("\nContractors with active projects:");
    console.log("  - Ka Builder Co: Bengaluru ORR (₹8.2 Cr)");
    console.log("  - Mh Infra Ltd: Mumbai Coastal Road (₹43.5 Cr)");
    console.log("  - Dl Works: Delhi Corridor (₹49.8 Cr), Smart Lighting (completed)");

    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seed();
