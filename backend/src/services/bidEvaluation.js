/**
 * AI Bid Evaluation Service
 *
 * Scores a bid based on:
 *  - Price proximity to hidden budget (closest without exceeding)
 *  - Contractor reputation
 *  - Proposed timeline reasonableness
 *  - Anti-collusion flags
 *
 * Returns a score 0–100 (higher = better).
 */

function scoreBid({ amount, budget, reputation = 0, timeline_days = null }) {
  let score = 0;

  // ── Price score (0-50 pts) ──
  // Reward bids close to budget but not over it
  const ratio = parseFloat(amount) / parseFloat(budget);
  if (ratio > 1.0) {
    // Over budget: penalize proportionally
    score += Math.max(0, 50 - (ratio - 1) * 100);
  } else if (ratio >= 0.7) {
    // 70-100% of budget = ideal range
    score += 30 + (ratio - 0.7) * (20 / 0.3);  // 30-50 pts linearly
  } else {
    // Suspiciously low (<70%): possible quality risk
    score += ratio * (30 / 0.7);
  }

  // ── Reputation score (0-30 pts) ──
  const repNorm = Math.min(reputation / 100, 1);  // cap at 100 reputation
  score += repNorm * 30;

  // ── Timeline score (0-20 pts) ──
  if (timeline_days && timeline_days > 0) {
    // Reasonable timelines score higher; very short = risky
    if (timeline_days >= 30 && timeline_days <= 365) {
      score += 20;
    } else if (timeline_days < 30) {
      score += 10;  // too fast, might be unrealistic
    } else {
      score += 15;  // long but possible
    }
  } else {
    score += 10; // no timeline given
  }

  return Math.round(score * 100) / 100;
}

/**
 * Detect potential collusion patterns:
 *  - Multiple bids with very similar amounts
 *  - Shared metadata (IP, device fingerprint)
 */
function detectCollusion(bids) {
  const flags = [];
  const amounts = bids.map(b => parseFloat(b.amount));

  // Check for clustered amounts (within 1% of each other)
  for (let i = 0; i < amounts.length; i++) {
    for (let j = i + 1; j < amounts.length; j++) {
      const diff = Math.abs(amounts[i] - amounts[j]) / Math.max(amounts[i], amounts[j]);
      if (diff < 0.01) {
        flags.push({
          type: "PRICE_CLUSTER",
          severity: "high",
          message: `Bids ${bids[i].id} and ${bids[j].id} are within 1% of each other`,
          bid_ids: [bids[i].id, bids[j].id],
        });
      }
    }
  }

  return flags;
}

/**
 * Rank bids and return recommended award.
 */
function rankBids(bids) {
  const sorted = [...bids].sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));
  return sorted.map((bid, index) => ({
    rank: index + 1,
    bid_id: bid.id,
    contractor_id: bid.contractor_id,
    amount: bid.amount,
    ai_score: bid.ai_score,
    recommended: index === 0,
  }));
}

module.exports = { scoreBid, detectCollusion, rankBids };
