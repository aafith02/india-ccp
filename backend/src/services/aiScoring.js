/**
 * AI Scoring Service — Gemini-powered land-rate prediction & bid evaluation.
 *
 * 1. predictLandRate  — asks Gemini for the estimated govt land/construction rate
 *                       for a given Indian location + project category.
 * 2. scoreBidWithAI   — uses the predicted fair rate to compute how close a bid is
 *                       and combines it with reputation + timeline factors.
 * 3. triageComplaint  — Gemini-based severity classification.
 * 4. verifyKYC / validateProof — kept as local heuristics (no LLM needed).
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

let _model = null;

function getModel() {
  if (_model) return _model;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set in environment");
  const genAI = new GoogleGenerativeAI(apiKey);
  _model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  return _model;
}

/* ═══════════════════════════════════════════════════════════════════
   predictLandRate — Gemini estimates fair govt rate for this project
   ═══════════════════════════════════════════════════════════════════ */
async function predictLandRate({ location, district, state, category, description, scope }) {
  const model = getModel();

  const prompt = `You are an Indian government civil engineering cost estimation expert.

Given the following public tender project details, estimate the FAIR MARKET RATE that the government should budget for this project. Consider:
- Current Indian government Schedule of Rates (SOR) for the state
- PWD (Public Works Department) standard rates
- Location-specific factors (terrain, accessibility, labor rates)
- Material and transportation costs typical for the region
- Category-specific benchmarks

Project Details:
- State: ${state || "Not specified"}
- District: ${district || "Not specified"}
- Location: ${location || "Not specified"}
- Category: ${category || "General"}
- Description: ${description || "Not provided"}
- Scope: ${scope || "Not provided"}

Respond ONLY in this exact JSON format (no markdown, no explanation):
{"estimated_rate_per_unit": <number>, "unit": "<sq.m or km or unit>", "total_estimated_cost": <number in INR>, "confidence": <0.0 to 1.0>, "factors": ["factor1", "factor2"], "rate_range": {"low": <number>, "high": <number>}, "reasoning": "<one line>"}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      success: true,
      estimated_rate_per_unit: parsed.estimated_rate_per_unit,
      unit: parsed.unit,
      total_estimated_cost: parsed.total_estimated_cost,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      factors: parsed.factors || [],
      rate_range: parsed.rate_range || { low: 0, high: 0 },
      reasoning: parsed.reasoning || "",
    };
  } catch (err) {
    console.error("Gemini predictLandRate error:", err.message);
    return { success: false, error: err.message };
  }
}

/* ═══════════════════════════════════════════════════════════════════
   scoreBidWithAI — Uses predicted fair rate to rank bids intelligently
   ═══════════════════════════════════════════════════════════════════ */
async function scoreBidWithAI({ amount, budget, reputation = 0, timeline_days = null, location, district, state, category, description, scope }) {
  // Step 1: Get Gemini's predicted fair cost for this project
  const prediction = await predictLandRate({ location, district, state, category, description, scope });

  // Use predicted cost as reference if available, else fall back to hidden budget
  const fairCost = (prediction.success && prediction.total_estimated_cost > 0)
    ? prediction.total_estimated_cost
    : parseFloat(budget);

  const bidAmount = parseFloat(amount);
  const budgetAmount = parseFloat(budget);

  // Step 2: AI Fair-Rate proximity score (0–40 pts)
  // How close is the bid to the AI-predicted fair cost?
  let fairRateScore = 0;
  if (prediction.success && fairCost > 0) {
    const deviation = Math.abs(bidAmount - fairCost) / fairCost;
    if (deviation <= 0.05) fairRateScore = 40;        // within 5% of fair rate
    else if (deviation <= 0.10) fairRateScore = 35;    // within 10%
    else if (deviation <= 0.20) fairRateScore = 25;    // within 20%
    else if (deviation <= 0.40) fairRateScore = 15;    // within 40%
    else fairRateScore = 5;                             // far off
  } else {
    // Fallback: use budget proximity
    const ratio = bidAmount / budgetAmount;
    if (ratio >= 0.85 && ratio <= 1.0) fairRateScore = 35;
    else if (ratio >= 0.70 && ratio < 0.85) fairRateScore = 25;
    else if (ratio > 1.0 && ratio <= 1.15) fairRateScore = 20;
    else fairRateScore = 10;
  }

  // Step 3: Budget proximity score (0–25 pts)
  let budgetScore = 0;
  const budgetRatio = bidAmount / budgetAmount;
  if (budgetRatio > 1.0) {
    budgetScore = Math.max(0, 25 - (budgetRatio - 1) * 50);
  } else if (budgetRatio >= 0.7) {
    budgetScore = 15 + (budgetRatio - 0.7) * (10 / 0.3);
  } else {
    budgetScore = budgetRatio * (15 / 0.7);
  }

  // Step 4: Reputation score (0–20 pts)
  const repNorm = Math.min((reputation || 0) / 100, 1);
  const repScore = repNorm * 20;

  // Step 5: Timeline score (0–15 pts)
  let timeScore = 8;
  if (timeline_days && timeline_days > 0) {
    if (timeline_days >= 30 && timeline_days <= 365) timeScore = 15;
    else if (timeline_days < 30) timeScore = 7;
    else timeScore = 10;
  }

  const totalScore = Math.round((fairRateScore + budgetScore + repScore + timeScore) * 100) / 100;

  return {
    ai_score: totalScore,
    breakdown: {
      fair_rate_score: Math.round(fairRateScore * 100) / 100,
      budget_proximity_score: Math.round(budgetScore * 100) / 100,
      reputation_score: Math.round(repScore * 100) / 100,
      timeline_score: Math.round(timeScore * 100) / 100,
    },
    prediction: prediction.success ? {
      estimated_fair_cost: prediction.total_estimated_cost,
      confidence: prediction.confidence,
      reasoning: prediction.reasoning,
      rate_range: prediction.rate_range,
    } : null,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   triageComplaint — Gemini-based severity classification
   ═══════════════════════════════════════════════════════════════════ */
async function triageComplaint(description) {
  try {
    const model = getModel();
    const prompt = `You are a complaint triage officer for an Indian government public project oversight platform.

Classify the severity of this complaint. Consider financial impact, safety risk, and urgency.

Complaint: "${description}"

Respond ONLY in this JSON format (no markdown):
{"severity": "low|medium|high|critical", "reason": "<one line justification>"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const parsed = JSON.parse(cleaned);
    const validSeverities = ["low", "medium", "high", "critical"];
    return validSeverities.includes(parsed.severity) ? parsed.severity : "medium";
  } catch {
    // Fallback to keyword heuristic
    const critical = ["fraud", "bribery", "corruption", "fake", "forgery", "embezzlement"];
    const high = ["delay", "overcharge", "substandard", "unsafe", "violation"];
    const d = description.toLowerCase();
    if (critical.some(w => d.includes(w))) return "critical";
    if (high.some(w => d.includes(w))) return "high";
    return "medium";
  }
}

/* ═══════════════════════════════════════════════════════════════════
   verifyKYC — Local heuristic (no LLM needed)
   ═══════════════════════════════════════════════════════════════════ */
function verifyKYC(kycData) {
  const issues = [];
  if (!kycData.id_number) issues.push("Missing ID number");
  if (!kycData.id_type) issues.push("Missing ID type");
  if (!kycData.business_registration) issues.push("Missing business registration");
  if (!kycData.pan_number) issues.push("Missing PAN number");
  return {
    valid: issues.length === 0,
    confidence: issues.length === 0 ? 0.95 : 0.3,
    issues,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   validateProof — Local heuristic (geo-match, freshness)
   ═══════════════════════════════════════════════════════════════════ */
function validateProof(proofFiles, expectedLocation) {
  const flags = [];
  for (const file of proofFiles) {
    if (file.geo && expectedLocation) {
      const dist = haversine(file.geo.lat, file.geo.lng, expectedLocation.lat, expectedLocation.lng);
      if (dist > 5) {
        flags.push(`File ${file.url} geo-location is ${dist.toFixed(1)}km from project site`);
      }
    }
    if (file.timestamp) {
      const age = (Date.now() - new Date(file.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      if (age > 7) {
        flags.push(`File ${file.url} is ${Math.round(age)} days old`);
      }
    }
  }
  return { valid: flags.length === 0, confidence: flags.length === 0 ? 0.9 : 0.5, flags };
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { predictLandRate, scoreBidWithAI, triageComplaint, verifyKYC, validateProof };
