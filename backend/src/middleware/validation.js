/**
 * Centralized validation rules using express-validator.
 */
const { body, param, query } = require("express-validator");
const { validationResult } = require("express-validator");

/* ── Run validation and return 400 with errors if any ── */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

/* ═══════════════════ AUTH ═══════════════════ */
const loginRules = [
  body("email").isEmail().withMessage("Valid email required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("role").isIn(["community", "contractor"]).withMessage("Role must be community or contractor"),
];

/* ═══════════════════ TENDERS ═══════════════════ */
const createTenderRules = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 255 }),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("budget_hidden").isFloat({ min: 1 }).withMessage("Budget must be a positive number"),
  body("bid_deadline").isISO8601().withMessage("Valid bid deadline required"),
  body("project_deadline").isISO8601().withMessage("Valid project deadline required"),
  body("tranche_count").optional().isInt({ min: 2, max: 20 }).withMessage("Tranche count must be 2-20"),
  body("category").optional().trim().isLength({ max: 100 }),
  body("location").optional().trim().isLength({ max: 255 }),
  body("district").optional().trim().isLength({ max: 255 }),
];

/* ═══════════════════ BIDS ═══════════════════ */
const createBidRules = [
  body("tender_id").isUUID().withMessage("Valid tender_id required"),
  body("amount").isFloat({ min: 1 }).withMessage("Amount must be a positive number"),
  body("proposal").optional().trim().isLength({ max: 5000 }),
  body("timeline_days").optional().isInt({ min: 1, max: 3650 }).withMessage("Timeline must be 1-3650 days"),
];

/* ═══════════════════ COMPLAINTS ═══════════════════ */
const createComplaintRules = [
  body("subject").trim().notEmpty().withMessage("Subject is required").isLength({ max: 255 }),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("severity").optional().isIn(["low", "medium", "high", "critical"]),
  body("tender_id").optional().isUUID(),
];

const investigateRules = [
  body("result").isIn(["confirmed_valid", "confirmed_fake"]).withMessage("Result must be confirmed_valid or confirmed_fake"),
  body("notes").optional().trim().isLength({ max: 5000 }),
];

/* ═══════════════════ FUNDING ═══════════════════ */
const createFundRules = [
  body("amount").isFloat({ min: 1 }).withMessage("Amount must be positive"),
  body("purpose").trim().notEmpty().withMessage("Purpose is required"),
];

const fundActionRules = [
  body("status").isIn(["approved", "rejected"]).withMessage("Status must be approved or rejected"),
  body("approved_amount").optional().isFloat({ min: 0 }),
  body("remarks").optional().trim(),
];

/* ═══════════════════ WORK PROOFS ═══════════════════ */
const createWorkProofRules = [
  body("contract_id").isUUID().withMessage("Valid contract_id required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("work_percentage").isFloat({ min: 0, max: 100 }).withMessage("Work percentage must be 0-100"),
  body("amount_requested").isFloat({ min: 0 }).withMessage("Amount requested must be positive"),
  body("tranche_id").optional().isUUID(),
  body("milestone_id").optional().isUUID(),
];

const voteRules = [
  body("vote").isIn(["approve", "reject"]).withMessage("Vote must be approve or reject"),
  body("comment").optional().trim().isLength({ max: 2000 }),
];

/* ═══════════════════ KYC ═══════════════════ */
const kycRejectRules = [
  body("reason").trim().notEmpty().withMessage("Rejection reason is required"),
];

/* ═══════════════════ PAGINATION QUERY ═══════════════════ */
const paginationRules = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

module.exports = {
  validate,
  loginRules,
  registerRules,
  createTenderRules,
  createBidRules,
  createComplaintRules,
  investigateRules,
  createFundRules,
  fundActionRules,
  createWorkProofRules,
  voteRules,
  kycRejectRules,
  paginationRules,
};
