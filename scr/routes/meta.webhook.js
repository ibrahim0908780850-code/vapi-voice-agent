import express from "express";
import { handleEvent } from "../handlers/integration.handler.js";
import { resolveTenant } from "../utils/resolveTenant.js";
import { claimWebhookEvent } from "../../server/lib/requestControls.js";
import { requireConfiguredWebhookSecret, verifyMetaSignature } from "../../server/lib/webhookSecurity.js";

const router = express.Router();

router.get("/webhook", (req, res) => {
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!requireConfiguredWebhookSecret(verifyToken)) return res.sendStatus(503);
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  return mode === "subscribe" && token === verifyToken ? res.status(200).send(challenge) : res.sendStatus(403);
});

router.post("/webhook", async (req, res) => {
  try {
    const appSecret = process.env.META_APP_SECRET;
    if (!requireConfiguredWebhookSecret(appSecret)) return res.sendStatus(503);
    if (!verifyMetaSignature(req.rawBody, req.get("x-hub-signature-256"), appSecret)) return res.sendStatus(401);

    const body = req.body || {};
    const entry = body.entry?.[0];
    const messaging = entry?.messaging?.[0];
    if (!messaging) return res.sendStatus(200);

    const eventId = messaging.message?.mid || messaging.postback?.mid || `${entry?.id || "unknown"}:${messaging.timestamp || "unknown"}`;
    const claimed = await claimWebhookEvent({ provider: "meta", eventId, rawBody: req.rawBody?.toString("utf8") });
    if (!claimed) return res.sendStatus(200);

    const tenant_id = await resolveTenant(req);
    const channel = entry.id?.includes("instagram") ? "instagram" : "messenger";
    await handleEvent({
      tenant_id,
      channel,
      eventType: "message_received",
      payload: { user_id: messaging.sender?.id || "", message: messaging.message?.text || "" }
    });
    return res.sendStatus(200);
  } catch (error) {
    console.error("Meta webhook error", error.message);
    return res.sendStatus(500);
  }
});

export default router;
