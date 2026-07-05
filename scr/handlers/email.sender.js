import axios from "axios";

/**
 * 📧 SEND EMAIL REPLY (SendGrid)
 */
export async function sendEmailReply({ to, subject, message }) {
  try {
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

    await axios.post(
      "https://api.sendgrid.com/v3/mail/send",
      {
        personalizations: [
          {
            to: [{ email: to }]
          }
        ],
        from: {
          email: "no-reply@salih.ai",
          name: "Salih AI"
        },
        subject: subject || "رد من وكيل صالح العقاري",
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

    console.log("📧 Email sent successfully");
  } catch (err) {
    console.error("❌ Email send error:", err.message);
  }
}