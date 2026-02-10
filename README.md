# TenderGuard — Transparent Public Tender Management

Anti-bribery platform for Indian public tenders with AI scoring, milestone-based payments, audit ledger, and community oversight.

## Architecture

```
backend/          Node.js + Express + Sequelize + PostgreSQL
frontend/         React + Vite + Tailwind CSS
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 1. Database Setup
```bash
# Create PostgreSQL database
createdb tender_guard
```

### 2. Backend
```bash
cd backend
cp .env.example .env        # edit DB credentials
npm install
npm run seed                 # seed all 36 states/UTs
npm run dev                  # http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                  # http://localhost:3000
```

## User Roles

| Role | Capabilities |
|------|-------------|
| **Central Gov** | Approve funding, audit all states, manage complaints |
| **State Gov** | Create tenders, verify contractors, approve milestones |
| **Contractor** | Browse tenders (own state), submit bids, upload proof |
| **Community** | View projects, public ledger, report issues |
| **Auditor/NGO** | Investigate complaints, verify/dismiss reports |

## Key Features

- **Hidden Budget**: Budget amount is never revealed to bidders
- **AI Bid Scoring**: Price proximity + reputation + timeline → score 0-100
- **Same-State Contstraint**: Contractors can only bid in their registered state
- **Milestone Payments**: Payments release only after geo-tagged proof upload + review
- **Audit Ledger**: Every action chained with SHA-256 hashes for tamper detection
- **Reputation Credits**: Contractors earn credits for clean project delivery
- **Chatbot**: Project facts lookup for community members
- **Complaint System**: Submit → Triage → Investigate → Verify → Action (strike system)

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | - | Register |
| POST | /api/auth/login | - | Login |
| GET  | /api/auth/me | JWT | Current user |
| GET  | /api/states | - | List states |
| POST | /api/funding | State | Request fund |
| PATCH| /api/funding/:id | Central | Approve/reject |
| POST | /api/tenders | State | Create tender |
| GET  | /api/tenders | - | List tenders |
| POST | /api/bids | Contractor | Submit bid |
| POST | /api/contracts/award | State | Award contract |
| PATCH| /api/milestones/:id/proof | Contractor | Upload proof |
| PATCH| /api/milestones/:id/approve | State/Central | Approve + pay |
| POST | /api/complaints | JWT | Submit complaint |
| POST | /api/chatbot/ask | - | Ask chatbot |
| GET  | /api/public/ledger | - | Audit log |
| GET  | /api/public/stats | - | Platform stats |

## Project Structure

```
backend/
  src/
    config/db.js              DB connection
    models/index.js           All Sequelize models + relations
    middleware/
      auth.js                 JWT verify
      roles.js                RBAC + same-state guard
      auditLog.js             Immutable chain-hashed logging
    routes/
      auth.js                 Register / Login / Me
      states.js               State CRUD
      funding.js              Fund request flow
      tenders.js              Tender lifecycle
      bids.js                 Bid submission + scoring
      contracts.js            Award + completion
      milestones.js           Proof upload + approval + payment
      complaints.js           Report + investigation
      chatbot.js              Fact-based Q&A
      public.js               Public read endpoints
    services/
      bidEvaluation.js        Score, rank, detect collusion
      aiScoring.js            KYC verify, proof validate, triage
    seed/states.js            Seed 36 states/UTs

frontend/
  src/
    api/client.js             Axios instance + interceptors
    context/AuthContext.jsx    Auth state + login/logout
    theme/tokens.js           Design tokens
    components/
      Layout.jsx              Shell: sidebar + header + chatbot
      Sidebar.jsx             Role-aware navigation
      Header.jsx              User info + notifications
      ChatBot.jsx             Floating chat widget
      StateMap.jsx            Abstract state map card
      TenderCard.jsx          Tender list item
      MilestoneTimeline.jsx   Visual milestone progress
      FundingPanel.jsx        Funding overview card
      ComplaintForm.jsx       Report an issue form
      AuditLedger.jsx         Public ledger viewer
    pages/
      Login.jsx               Sign in / Register
      CentralDashboard.jsx    Central gov overview
      StateDashboard.jsx      State-specific dashboard
      ContractorDashboard.jsx Contractor home
      CommunityPortal.jsx     Public project browser
      TenderList.jsx          Browse tenders
      TenderDetail.jsx        Tender + bids + milestones
      CreateTender.jsx        New tender form
      BidSubmission.jsx       Submit a bid
      ContractExecution.jsx   Milestone management
      FundingPage.jsx         Fund request flow
      PublicLedger.jsx        Audit log page
      AuditorPanel.jsx        Complaint management
      ReportIssue.jsx         Community report form
    App.jsx                   Router + protected routes
    main.jsx                  Entry point
```

## License

MIT
