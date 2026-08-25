import express from "express";
import { handleEvent } from "../handlers/integration.handler.js";
import { resolveTenant } from "../utils/resolveTenant.js";
import { claimWebhookEvent } from "../../server/lib/requestControls.js";
import { requireConfiguredWebhookSecret, verifyBearerWebhookSecret } from "../../server/lib/webhookSecurity.js";

const router = express.Router();

router.post("/webhook", async (req, res) => {
  try {
    const secret = process.env.EMAIL_WEBHOOK_SECRET;
    if (!requireConfiguredWebhookSecret(secret)) return res.sendStatus(503);
    if (!verifyBearerWebhookSecret(req.get("authorization"), req.get("x-email-webhook-secret"), secret)) return res.sendStatus(401);

    const body = req.body || {};
    const eventId = body.event_id || body.id || body.message_id || body.headers?.["message-id"];
    const claimed = await claimWebhookEvent({ provider: "email", eventId, rawBody: req.rawBody?.toString("utf8") });
    if (!claimed) return res.sendStatus(200);

    const tenant_id = await resolveTenant(req);
    await handleEvent({
      tenant_id,
      channel: "email",
      eventType: "email_received",
      payload: {
        from: body.from || body.email || "",
        to: body.to || body.recipient || "",
        subject: body.subject || "",
        message: body.text || body.html || body.message || ""
      }
    });
    return res.sendStatus(200);
  } catch (error) {
    console.error("Email webhook error", error.message);
    return res.sendStatus(500);
  }
});

export default router;
