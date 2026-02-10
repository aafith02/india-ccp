/**
 * AI Scoring Service — placeholder implementations.
 * Replace with real ML models or external API calls in production.
 */

/**
 * Verify uploaded KYC documents.
 * Returns { valid: boolean, confidence: number, issues: string[] }
 */
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

/**
 * Validate milestone proof files (geo-match, freshness, file integrity).
 * Returns { valid: boolean, confidence: number, flags: string[] }
 */
function validateProof(proofFiles, expectedLocation) {
  const flags = [];

  for (const file of proofFiles) {
    // Check geo proximity (within ~5 km)
    if (file.geo && expectedLocation) {
      const dist = haversine(file.geo.lat, file.geo.lng, expectedLocation.lat, expectedLocation.lng);
      if (dist > 5) {
        flags.push(`File ${file.url} geo-location is ${dist.toFixed(1)}km from project site`);
      }
    }

    // Check timestamp freshness (within 7 days)
    if (file.timestamp) {
      const age = (Date.now() - new Date(file.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      if (age > 7) {
        flags.push(`File ${file.url} is ${Math.round(age)} days old`);
      }
    }
  }

  return {
    valid: flags.length === 0,
    confidence: flags.length === 0 ? 0.9 : 0.5,
    flags,
  };
}

/**
 * Triage complaint severity using keyword heuristics.
 */
function triageComplaint(description) {
  const critical = ["fraud", "bribery", "corruption", "fake", "forgery", "embezzlement"];
  const high = ["delay", "overcharge", "substandard", "unsafe", "violation"];
  const d = description.toLowerCase();

  if (critical.some(w => d.includes(w))) return "critical";
  if (high.some(w => d.includes(w))) return "high";
  return "medium";
}

/* ─── Helpers ─── */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { verifyKYC, validateProof, triageComplaint };
