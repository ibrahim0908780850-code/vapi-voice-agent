import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import test from "node:test";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SECRET_KEY ||= "test-supabase-key";
const { publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
process.env.SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY = publicKey.export({ type: "spki", format: "pem" });

const express = (await import("express")).default;
const emailWebhookRoutes = (await import("../scr/routes/email.webhook.js")).default;

test("SendGrid webhook route rejects an unsigned request before tenant lookup or data writes", async () => {
  const app = express();
  app.use(express.json({ verify: (req, _res, buffer) => { req.rawBody = buffer; } }));
  app.use("/email", emailWebhookRoutes);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/email/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([{ event: "delivered", email: "customer@example.com" }])
    });
    assert.equal(response.status, 401);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
