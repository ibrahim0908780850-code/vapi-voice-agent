import express from "express";
import { handleEvent } from "../handlers/integration.handler.js";

const router = express.Router();

/**
 * 📩 EMAIL WEBHOOK
 * يستقبل رسائل البريد من SendGrid / Resend / SES
 */
router.post("/webhook", async (req, res) => {
  try {
    const body = req.body || {};

    // =========================
    // بناء Event موحد للنظام
    // =========================
    const event = {
      tenant_id: body.tenant_id || "default",
      channel: "email",
      eventType: "email_received",
      payload: {
        from: body.from || body.email || "",
        to: body.to || "",
        subject: body.subject || "",
        message: body.text || body.html || body.message || ""
      }
    };

    console.log("📩 Email Event Received:", {
      from: event.payload.from,
      subject: event.payload.subject
    });

    // =========================
    // إرسال للنظام الموحد
    // =========================
    await handleEvent(event);

    return res.sendStatus(200);

  } catch (err) {
    console.error("❌ Email Webhook Error:", err.message);
    return res.sendStatus(500);
  }
});

export default router;