/**
 * End-to-end API test script.
 * Tests all endpoints with the seeded dummy data.
 * Run: node src/seed/testEndpoints.js
 */
require("dotenv").config();
const http = require("http");

const BASE = "http://localhost:5000/api";
let passed = 0, failed = 0;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (token) options.headers.Authorization = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name} ${detail}`);
  }
}

async function run() {
  console.log("═".repeat(60));
  console.log("  END-TO-END API TEST");
  console.log("═".repeat(60));

  /* ═══ 1. AUTH ═══ */
  console.log("\n━━━ AUTH ━━━");

  // Login all roles
  const loginContractor = await request("POST", "/auth/login", { email: "ka.contractor@test.com", password: "Password123!" });
  assert("Login contractor", loginContractor.status === 200 && loginContractor.body.token, `status=${loginContractor.status}`);
  const cToken = loginContractor.body.token;

  const loginStateGov = await request("POST", "/auth/login", { email: "ka.state@gov.test", password: "Password123!" });
  assert("Login state_gov", loginStateGov.status === 200 && loginStateGov.body.token);
  const sToken = loginStateGov.body.token;

  const loginCentral = await request("POST", "/auth/login", { email: "central@gov.test", password: "Password123!" });
  assert("Login central_gov", loginCentral.status === 200 && loginCentral.body.token);
  const gToken = loginCentral.body.token;

  const loginAuditor = await request("POST", "/auth/login", { email: "auditor@ngo.test", password: "Password123!" });
  assert("Login auditor_ngo", loginAuditor.status === 200 && loginAuditor.body.token);
  const aToken = loginAuditor.body.token;

  const loginCommunity = await request("POST", "/auth/login", { email: "community@test.com", password: "Password123!" });
  assert("Login community", loginCommunity.status === 200 && loginCommunity.body.token);
  const comToken = loginCommunity.body.token;

  // Bad login
  const badLogin = await request("POST", "/auth/login", { email: "ka.contractor@test.com", password: "wrongpass" });
  assert("Bad password rejected", badLogin.status === 401);

  // /me
  const me = await request("GET", "/auth/me", null, cToken);
  assert("GET /auth/me", me.status === 200 && me.body.user?.email === "ka.contractor@test.com");

  /* ═══ 2. STATES ═══ */
  console.log("\n━━━ STATES ━━━");

  const states = await request("GET", "/states");
  assert("GET /states", states.status === 200 && Array.isArray(states.body) && states.body.length >= 3, `count=${states.body?.length}`);

  // Find KA state id
  const kaState = states.body.find(s => s.code === "KA");
  assert("KA state exists", !!kaState);
  const kaId = kaState?.id;

  const stateDetail = await request("GET", `/states/${kaId}`);
  assert("GET /states/:id (KA detail)", stateDetail.status === 200 && stateDetail.body.name === "Karnataka");
  assert("State detail has stats", typeof stateDetail.body.contractorCount === "number");
  // Verify budget_hidden is NOT exposed
  const tenderInState = stateDetail.body.Tenders?.[0];
  assert("State detail hides budget_hidden", !tenderInState || tenderInState.budget_hidden === undefined, `budget_hidden=${tenderInState?.budget_hidden}`);

  /* ═══ 3. TENDERS ═══ */
  console.log("\n━━━ TENDERS ━━━");

  const tenders = await request("GET", `/tenders?state_id=${kaId}`);
  assert("GET /tenders (filtered by state)", tenders.status === 200 && Array.isArray(tenders.body));
  assert("Budget hidden from tender list", tenders.body.every(t => t.budget_hidden === undefined));

  const allTenders = await request("GET", "/tenders");
  assert("GET /tenders (all)", allTenders.status === 200 && allTenders.body.length >= 5, `count=${allTenders.body?.length}`);

  // Tender detail
  const openTender = allTenders.body.find(t => t.status === "open");
  if (openTender) {
    const tDetail = await request("GET", `/tenders/${openTender.id}`);
    assert("GET /tenders/:id", tDetail.status === 200 && tDetail.body.title);
    assert("Tender detail hides budget", tDetail.body.budget_hidden === undefined);
  }

  /* ═══ 4. BIDS ═══ */
  console.log("\n━━━ BIDS ━━━");

  // My bids (contractor)
  const myBids = await request("GET", "/bids/my", null, cToken);
  assert("GET /bids/my (contractor)", myBids.status === 200 && Array.isArray(myBids.body), `status=${myBids.status} err=${JSON.stringify(myBids.body)}`);

  const mineBids = await request("GET", "/bids/mine", null, cToken);
  assert("GET /bids/mine alias", mineBids.status === 200 && Array.isArray(mineBids.body));

  // Bids include Tender with category
  if (myBids.body.length > 0) {
    assert("Bid includes Tender data", !!myBids.body[0].Tender);
    assert("Tender has category field", myBids.body[0].Tender.category !== undefined);
  }

  // View bids for a tender (state gov)
  const inProgressTender = allTenders.body.find(t => t.status === "in_progress");
  if (inProgressTender) {
    const tenderBids = await request("GET", `/bids/tender/${inProgressTender.id}`, null, sToken);
    assert("GET /bids/tender/:id (state gov)", tenderBids.status === 200 && Array.isArray(tenderBids.body));
  }

  // Unauthorized access check
  const bidUnauth = await request("GET", "/bids/my");
  assert("Bids requires auth", bidUnauth.status === 401);

  /* ═══ 5. CONTRACTS ═══ */
  console.log("\n━━━ CONTRACTS ━━━");

  // My contracts (contractor)
  const myContracts = await request("GET", "/contracts/my", null, cToken);
  assert("GET /contracts/my (contractor)", myContracts.status === 200 && Array.isArray(myContracts.body), `status=${myContracts.status} err=${JSON.stringify(myContracts.body)}`);

  if (myContracts.body.length > 0) {
    const c = myContracts.body[0];
    assert("Contract includes Tender", !!c.Tender);
    assert("Contract includes Milestones", Array.isArray(c.Milestones));
    assert("Tender has category in contract", c.Tender?.category !== undefined);

    // Contract detail
    const cDetail = await request("GET", `/contracts/${c.id}`, null, cToken);
    assert("GET /contracts/:id", cDetail.status === 200 && cDetail.body.id === c.id);
    assert("Contract detail has contractor", !!cDetail.body.contractor);
  }

  // All contracts (central gov)
  const allContracts = await request("GET", "/contracts", null, gToken);
  assert("GET /contracts (central gov)", allContracts.status === 200 && Array.isArray(allContracts.body));

  // State gov contracts
  const stateContracts = await request("GET", "/contracts", null, sToken);
  assert("GET /contracts (state gov)", stateContracts.status === 200);

  /* ═══ 6. MILESTONES ═══ */
  console.log("\n━━━ MILESTONES ━━━");

  if (myContracts.body.length > 0) {
    const contractId = myContracts.body[0].id;
    const milestones = await request("GET", `/milestones/contract/${contractId}`, null, cToken);
    assert("GET /milestones/contract/:id", milestones.status === 200 && Array.isArray(milestones.body), `status=${milestones.status}`);
    if (milestones.body.length > 0) {
      assert("Milestones ordered by sequence", milestones.body[0].sequence <= (milestones.body[1]?.sequence || 999));
      assert("Milestone has payment data", milestones.body[0].Payment !== undefined);
    }
  }

  /* ═══ 7. WORK PROOFS ═══ */
  console.log("\n━━━ WORK PROOFS ━━━");

  // Pending work proofs (auditor)
  const pendingProofs = await request("GET", "/work-proofs/pending", null, aToken);
  assert("GET /work-proofs/pending (auditor)", pendingProofs.status === 200 && Array.isArray(pendingProofs.body), `status=${pendingProofs.status}`);

  // Community can see pending too
  const pendingCom = await request("GET", "/work-proofs/pending", null, comToken);
  assert("GET /work-proofs/pending (community)", pendingCom.status === 200);

  // State gov can see pending
  const pendingState = await request("GET", "/work-proofs/pending", null, sToken);
  assert("GET /work-proofs/pending (state gov)", pendingState.status === 200);

  if (myContracts.body.length > 0) {
    const proofsByContract = await request("GET", `/work-proofs/contract/${myContracts.body[0].id}`, null, cToken);
    assert("GET /work-proofs/contract/:id", proofsByContract.status === 200 && Array.isArray(proofsByContract.body));
  }

  /* ═══ 8. NOTIFICATIONS ═══ */
  console.log("\n━━━ NOTIFICATIONS ━━━");

  const notifs = await request("GET", "/notifications", null, cToken);
  assert("GET /notifications (contractor)", notifs.status === 200 && notifs.body.notifications, `status=${notifs.status}`);

  const unread = await request("GET", "/notifications/unread-count", null, cToken);
  assert("GET /notifications/unread-count", unread.status === 200 && typeof unread.body.count === "number");

  /* ═══ 9. FUND REQUESTS ═══ */
  console.log("\n━━━ FUNDING ━━━");

  const funds = await request("GET", "/funding", null, gToken);
  assert("GET /funding (central gov)", funds.status === 200 && Array.isArray(funds.body), `status=${funds.status}`);

  const stateFunds = await request("GET", "/funding", null, sToken);
  assert("GET /funding (state gov — own state)", stateFunds.status === 200);

  /* ═══ 10. COMPLAINTS ═══ */
  console.log("\n━━━ COMPLAINTS ━━━");

  const complaints = await request("GET", "/complaints", null, gToken);
  assert("GET /complaints (central gov)", complaints.status === 200 && Array.isArray(complaints.body));

  const complaintsAuditor = await request("GET", "/complaints", null, aToken);
  assert("GET /complaints (auditor)", complaintsAuditor.status === 200);

  // Community can submit complaint
  const newComplaint = await request("POST", "/complaints", {
    subject: "Test complaint from API test",
    description: "This is a test complaint created during automated testing.",
  }, comToken);
  assert("POST /complaints (community)", newComplaint.status === 201 && newComplaint.body.id);

  /* ═══ 11. PUBLIC ═══ */
  console.log("\n━━━ PUBLIC ENDPOINTS ━━━");

  const pubTenders = await request("GET", "/public/tenders");
  assert("GET /public/tenders (no auth)", pubTenders.status === 200 && Array.isArray(pubTenders.body));
  assert("Public tenders hide budget", pubTenders.body.every(t => t.budget_hidden === undefined));

  const pubStats = await request("GET", "/public/stats");
  assert("GET /public/stats", pubStats.status === 200 && typeof pubStats.body.totalTenders === "number");
  assert("Stats are correct", pubStats.body.totalTenders >= 5 && pubStats.body.totalContracts >= 2);

  const pubLedger = await request("GET", "/public/ledger");
  assert("GET /public/ledger", pubLedger.status === 200 && Array.isArray(pubLedger.body.entries));
  assert("Audit entries have hashes", pubLedger.body.entries[0]?.entry_hash?.length > 0);

  if (inProgressTender) {
    const pubProject = await request("GET", `/public/projects/${inProgressTender.id}`);
    assert("GET /public/projects/:id", pubProject.status === 200 && pubProject.body.title);
    assert("Public project hides budget", pubProject.body.budget_hidden === undefined);
  }

  /* ═══ 12. CHATBOT ═══ */
  console.log("\n━━━ CHATBOT ━━━");

  const chat1 = await request("POST", "/chatbot/ask", { question: "What open tenders are available?" });
  assert("Chatbot: open tenders", chat1.status === 200 && chat1.body.answer);

  const chat2 = await request("POST", "/chatbot/ask", { question: "What is the status of NH-275?" });
  assert("Chatbot: project status", chat2.status === 200 && chat2.body.answer);

  const chat3 = await request("POST", "/chatbot/ask", { question: "How do I report a complaint?" });
  assert("Chatbot: report guidance", chat3.status === 200 && chat3.body.answer);

  /* ═══ 13. RBAC CHECKS ═══ */
  console.log("\n━━━ RBAC / SECURITY ━━━");

  // Contractor cannot access admin routes
  const contractorFunding = await request("GET", "/funding", null, cToken);
  assert("Contractor blocked from /funding", contractorFunding.status === 403);

  const contractorComplaints = await request("GET", "/complaints", null, cToken);
  assert("Contractor blocked from /complaints list", contractorComplaints.status === 403);

  // Community cannot create tender
  const comTender = await request("POST", "/tenders", { title: "Hack" }, comToken);
  assert("Community blocked from creating tender", comTender.status === 403);

  // No token
  const noAuth = await request("GET", "/contracts/my");
  assert("No token → 401", noAuth.status === 401);

  /* ═══ SUMMARY ═══ */
  console.log("\n" + "═".repeat(60));
  console.log(`  RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed}`);
  console.log("═".repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
