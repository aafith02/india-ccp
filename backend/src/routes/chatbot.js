const router = require("express").Router();
const { authenticate } = require("../middleware/auth");

/*
  Simple keyword-based chatbot – v2 keeps it minimal.
  Future: plug in an LLM or Rasa NLU.
*/

const FAQ = [
  { keywords: ["tender", "create"], answer: "Only state_gov members can create tenders for their state." },
  { keywords: ["bid", "submit"], answer: "Verified contractors can bid on tenders in their state. The bid closest to the hidden budget wins." },
  { keywords: ["kyc", "verify"], answer: "After registering as a contractor, a state government member from your state will verify your KYC documents." },
  { keywords: ["tranche", "payment"], answer: "Contract amounts are split into tranches. The first tranche is disbursed upfront. Subsequent tranches are released after work proof is verified." },
  { keywords: ["work", "proof"], answer: "Contractors upload screenshots / documents as proof of work. Assigned state reviewers vote; 51% approval releases the next tranche." },
  { keywords: ["complaint", "report"], answer: "Community members can report issues. Central gov assigns an NGO to investigate. If valid, the contractor and approving reviewers are penalized." },
  { keywords: ["points", "reward"], answer: "Contractors earn points for completing projects and approved tranches. Reviewers earn points for voting. Penalties deduct points." },
  { keywords: ["ngo", "investigate"], answer: "NGO members are assigned by central gov to investigate complaints. They submit findings as confirmed_valid or confirmed_fake." },
  { keywords: ["ledger", "public", "blockchain"], answer: "All platform actions (except login details) are recorded in a tamper-evident chain-hashed audit ledger viewable by the public." },
  { keywords: ["register", "signup"], answer: "Community members can register freely. Contractors need to provide KYC data (ID number, business name) and await state verification." },
];

function findAnswer(message) {
  const lower = message.toLowerCase();
  for (const faq of FAQ) {
    if (faq.keywords.some((k) => lower.includes(k))) return faq.answer;
  }
  return "I'm not sure about that. Please contact support or check the public ledger for transparency information.";
}

/* POST / — ask a question */
router.post("/", authenticate, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });
  const reply = findAnswer(message);
  res.json({ reply });
});

module.exports = router;
