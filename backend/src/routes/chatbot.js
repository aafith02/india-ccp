const router = require("express").Router();
const { Tender, Contract, Milestone, Payment, State } = require("../models");
const { Op } = require("sequelize");

/**
 * Simple fact-based chatbot endpoint.
 * Accepts a question, parses intent, returns project facts from DB.
 * No complaint filing, no write actions.
 */
router.post("/ask", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "question required" });

    const q = question.toLowerCase();

    // ─── Intent: project / tender status ───
    if (q.includes("status") || q.includes("project") || q.includes("tender")) {
      const keyword = extractKeyword(question);
      if (keyword) {
        const tender = await Tender.findOne({
          where: { title: { [Op.iLike]: `%${keyword}%` } },
          attributes: { exclude: ["budget_hidden"] },
          include: [
            { model: State, attributes: ["name"] },
            { model: Contract, include: [{ model: Milestone, attributes: ["title", "status", "amount"] }] },
          ],
        });
        if (tender) {
          return res.json({
            answer: `Project "${tender.title}" in ${tender.State?.name || "unknown state"} is currently **${tender.status}**.`,
            data: tender,
          });
        }
        return res.json({ answer: `I couldn't find a project matching "${keyword}". Try the exact project name.` });
      }
    }

    // ─── Intent: payment info ───
    if (q.includes("payment") || q.includes("released") || q.includes("fund")) {
      const keyword = extractKeyword(question);
      if (keyword) {
        const tender = await Tender.findOne({
          where: { title: { [Op.iLike]: `%${keyword}%` } },
          include: [{
            model: Contract,
            include: [{ model: Milestone, include: [Payment] }],
          }],
        });
        if (tender?.Contract) {
          const released = tender.Contract.Milestones
            ?.filter(m => m.Payment?.status === "released")
            .reduce((sum, m) => sum + parseFloat(m.Payment.amount), 0) || 0;
          return res.json({
            answer: `Total released for "${tender.title}": ₹${released.toLocaleString("en-IN")}`,
            data: { total_released: released },
          });
        }
      }
    }

    // ─── Intent: how to report ───
    if (q.includes("report") || q.includes("complaint") || q.includes("issue")) {
      return res.json({
        answer: "To report an issue, please use the **Report an Issue** form on the Community Portal. You'll need to provide a description and optionally attach evidence.",
      });
    }

    // ─── Intent: open tenders ───
    if (q.includes("open") || q.includes("available") || q.includes("bid")) {
      const openTenders = await Tender.findAll({
        where: { status: "open" },
        attributes: ["id", "title", "location", "bid_deadline"],
        include: [{ model: State, attributes: ["name"] }],
        limit: 10,
        order: [["bid_deadline", "ASC"]],
      });
      return res.json({
        answer: `There are ${openTenders.length} open tenders right now.`,
        data: openTenders,
      });
    }

    // ─── Fallback ───
    return res.json({
      answer: "I can help with project status, payment info, and open tenders. Try asking: \"What is the status of [project name]?\"",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* Helper: extract the most likely keyword/project name from the question */
function extractKeyword(text) {
  // Remove common question words, return remaining noun phrase
  const stopWords = ["what", "is", "the", "status", "of", "project", "tender", "payment", "for", "how", "much", "has", "been", "released", "tell", "me", "about", "show", "find", "latest", "last", "recent"];
  const words = text.replace(/[?.,!]/g, "").split(/\s+/).filter(w => !stopWords.includes(w.toLowerCase()));
  return words.join(" ").trim() || null;
}

module.exports = router;
