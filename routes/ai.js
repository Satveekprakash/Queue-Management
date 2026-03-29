const express = require("express");
const router = express.Router();
const { classifyMessage } = require("../services/pythonAiService");
const Queue = require("../models/queue");
const calculateExpectedTime = require("../services/calculateExpectedTime");
const rateLimit = require("express-rate-limit");

// Rate limit
const patientLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
});

const ASSISTANT_NUMBER = "+91 98765 43210";

// GET AI page
router.get("/chat", (req, res) => {
  res.render("chat-ai.ejs");
});

// POST AI route
router.post("/test-ai", patientLimiter, async (req, res) => {
  try {
    const message = req.body?.message?.trim();
    const rawToken = req.body?.tokenNumber?.trim();
    const tokenNumber = rawToken ? Number(rawToken) : null;

    console.log("[AI ROUTE HIT]", req.body);

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    // Step 1: AI classify
    const aiResult = await classifyMessage(message);
    console.log("[AI ROUTE] aiResult:", aiResult);

    const intent = aiResult.intent;
    let reply = "";

    // Step 2: General / static replies
    switch (intent) {
      case "CHECK_CLINIC_TIMING":
        reply = "Clinic timing is 7:00. Please arrive a little early.";
        return res.json({ userMessage: message, aiIntent: intent, reply });

      case "MOTIVATION":
        reply = "You’re doing well. Please stay calm — your turn will come soon and we’re here to help you.";
        return res.json({ userMessage: message, aiIntent: intent, reply });

      case "THANKS":
        reply = "You’re welcome 😊";
        return res.json({ userMessage: message, aiIntent: intent, reply });

      case "HELP":
        reply = "You can ask me about your token, patients ahead, waiting time, and clinic timing.";
        return res.json({ userMessage: message, aiIntent: intent, reply });

      case "OUT_OF_SCOPE":
        reply = `I can mainly help with queue-related questions. For more help, please contact our assistant at ${ASSISTANT_NUMBER}.`;
        return res.json({ userMessage: message, aiIntent: intent, reply });
    }

    // Step 3: Queue-related intents need token number
    const queueIntents = [
      "CHECK_TOKEN",
      "CHECK_PATIENTS_AHEAD",
      "CHECK_WAIT_TIME"
    ];

    if (queueIntents.includes(intent) && (!tokenNumber || isNaN(tokenNumber))) {
      return res.status(400).json({
        userMessage: message,
        aiIntent: intent,
        reply: "Please provide your token number so I can check your queue status."
      });
    }

    // Step 4: Find patient
    const currentPatient = await Queue.findOne({
      tokenNumber: tokenNumber,
      status: "waiting"
    }).lean();

    if (!currentPatient) {
      return res.json({
        userMessage: message,
        aiIntent: intent,
        reply: `No active waiting token found for token number ${tokenNumber}. For help, please contact our assistant at ${ASSISTANT_NUMBER}.`
      });
    }

    // Step 5: Count patients ahead
    const patientsAhead = await Queue.countDocuments({
      status: "waiting",
      tokenNumber: { $lt: currentPatient.tokenNumber }
    });

    // Step 6: Calculate expected time
    const expectedTime = calculateExpectedTime(patientsAhead);

    // Step 7: Build queue reply
    switch (intent) {
      case "CHECK_TOKEN":
        reply = `Your current token number is ${currentPatient.tokenNumber}.`;
        break;

      case "CHECK_PATIENTS_AHEAD":
        reply = `There are ${patientsAhead} patients ahead of you.`;
        break;

      case "CHECK_WAIT_TIME":
        reply = `Your token is ${currentPatient.tokenNumber}. There are ${patientsAhead} patients ahead of you. Your expected turn time is around ${expectedTime}.`;
        break;

      default:
        reply = `For more help, please contact our assistant at ${ASSISTANT_NUMBER}.`;
    }

    return res.json({
      userMessage: message,
      aiIntent: intent,
      patient: currentPatient.patientName,
      tokenNumber,
      reply
    });

  } catch (error) {
    console.error("[AI ROUTE ERROR]", error.message);
    return res.status(500).json({
      error: "Something went wrong in /test-ai"
    });
  }
});

module.exports = router;