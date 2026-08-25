import express from "express";
import { handleEvent as defaultHandleEvent } from "../handlers/integration.handler.js";
import { resolveTenant as defaultResolveTenant } from "../utils/resolveTenant.js";
import { claimWebhookEvent as defaultClaimWebhookEvent } from "../../server/lib/requestControls.js";
import { requireConfiguredWebhookSecret, verifySendGridEventSignature } from "../../server/lib/webhookSecurity.js";

export function createEmailWebhookRouter({
  handleEvent = defaultHandleEvent,
  resolveTenant = defaultResolveTenant,
  claimWebhookEvent = defaultClaimWebhookEvent
} = {}) {
  const router = express.Router();

  router.post("/webhook", async (req, res) => {
    try {
      const publicKey = process.env.SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY;
      if (!requireConfiguredWebhookSecret(publicKey)) return res.sendStatus(503);
      if (!verifySendGridEventSignature({
        rawBody: req.rawBody,
        signature: req.get("x-twilio-email-event-webhook-signature"),
        timestamp: req.get("x-twilio-email-event-webhook-timestamp"),
        publicKey
      })) return res.sendStatus(401);

      const body = req.body || {};
      const event = Array.isArray(body) ? body[0] || {} : body;
      const eventId = event.event_id || event.sg_event_id || event.id || event.message_id || event.headers?.["message-id"];
      const claimed = await claimWebhookEvent({ provider: "sendgrid", eventId, rawBody: req.rawBody?.toString("utf8") });
      if (!claimed) return res.sendStatus(200);

      const tenant_id = await resolveTenant({
        ...req,
        body: { ...event, to: event.to || event.recipient || event.email || body.to || body.recipient }
      });
      await handleEvent({
        tenant_id,
        channel: "email",
        eventType: "email_received",
        payload: {
          from: event.from || "",
          to: event.to || event.recipient || event.email || "",
          subject: event.subject || "",
          message: event.text || event.html || event.message || ""
        }
      });
      return res.sendStatus(200);
    } catch (error) {
      console.error("Email webhook error", error.message);
      return res.sendStatus(500);
    }
  });

  return router;
}

export default createEmailWebhookRouter();
