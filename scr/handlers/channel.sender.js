import axios from "axios";

/**
 * 📡 META (Messenger + Instagram)
 */
export async function sendMetaMessage({ user_id, message }) {
  try {
    const PAGE_ACCESS_TOKEN = process.env.META_PAGE_TOKEN;

    await axios.post(
      `https://graph.facebook.com/v19.0/me/messages`,
      {
        recipient: { id: user_id },
        message: { text: message }
      },
      {
        params: {
          access_token: PAGE_ACCESS_TOKEN
        }
      }
    );

    console.log("📩 Meta message sent");
  } catch (err) {
    console.error("❌ Meta send error:", err.message);
  }
}

/**
 * 📧 EMAIL (SendGrid example)
 */
export async function sendEmailMessage({ email, message }) {
  try {
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

    await axios.post(
      "https://api.sendgrid.com/v3/mail/send",
      {
        personalizations: [
          {
            to: [{ email }]
          }
        ],
        from: { email: "no-reply@salih.ai" },
        subject: "رد من وكيل صالح العقاري",
        content: [
          {
            type: "text/plain",
            value: message
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("📧 Email sent");
  } catch (err) {
    console.error("❌ Email send error:", err.message);
  }
}

/**
 * 📲 WHATSAPP (Twilio or existing handler)
 * إذا عندك sendWhatsAppAutopilot خليها تستخدم هنا لاحقاً
 */
export async function sendWhatsAppMessage({ to, message }) {
  try {
    console.log("📲 WhatsApp send (hook ready):", to, message);

    // هنا تربط Twilio أو WhatsApp Cloud API لاحقاً
  } catch (err) {
    console.error("❌ WhatsApp send error:", err.message);
  }
}