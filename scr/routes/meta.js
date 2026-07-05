import express from "express";
import { handleEvent } from "../../handlers/integration.handler.js";

const router = express.Router();

// =========================
// VERIFY META WEBHOOK
// =========================
router.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = "salih_meta_123";

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Meta Webhook Verified");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// =========================
// RECEIVE MESSAGES
// =========================
router.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    const entry = body.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (!messaging) return res.sendStatus(200);

    // =========================
    // Detect Channel
    // =========================
    const channel =
      entry.id?.includes("instagram") ? "instagram" : "messenger";

    const event = {
      tenant_id: "default",
      channel,
      eventType: "message_received",
      payload: {
        user_id: messaging.sender.id,
        message: messaging.message?.text || ""
      }
    };

    console.log("📩 Meta Event:", event);

    // =========================
    // SEND TO YOUR SYSTEM
    // =========================
    await handleEvent(event);

    return res.sendStatus(200);

  } catch (err) {
    console.error("❌ Meta Webhook Error:", err.message);
    return res.sendStatus(500);
  }
});

export default router;