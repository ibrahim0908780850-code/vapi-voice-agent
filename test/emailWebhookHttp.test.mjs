import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import test from "node:test";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SECRET_KEY ||= "test-supabase-key";
const { publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
process.env.SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY = publicKey.export({ type: "spki", format: "pem" });

const express = (await import("express")).default;
const { createEmailWebhookRouter } = await import("../scr/routes/email.webhook.js");

function signSendGridPayload(rawBody, timestamp, privateKey) {
  return crypto.sign("sha256", Buffer.concat([Buffer.from(timestamp), rawBody]), privateKey).toString("base64");
}

test("SendGrid webhook route rejects an unsigned request before tenant lookup or data writes", async () => {
  const app = express();
  app.use(express.json({ verify: (req, _res, buffer) => { req.rawBody = buffer; } }));
  app.use("/email", createEmailWebhookRouter());
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

test("SendGrid webhook route accepts a valid signed batch and passes only trusted tenant context downstream", async () => {
  const { privateKey, publicKey: testPublicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  process.env.SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY = testPublicKey.export({ type: "spki", format: "pem" });
  const seen = { lookup: null, event: null };
  const app = express();
  app.use(express.json({ verify: (req, _res, buffer) => { req.rawBody = buffer; } }));
  app.use("/email", createEmailWebhookRouter({
    claimWebhookEvent: async () => true,
    resolveTenant: async (request) => { seen.lookup = request.body; return "tenant-a"; },
    handleEvent: async (event) => { seen.event = event; }
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const timestamp = "1724580000";
    const rawBody = Buffer.from('[{"sg_event_id":"event-1","email":"owner@example.com","event":"delivered"}]');
    const response = await fetch(`http://127.0.0.1:${port}/email/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-twilio-email-event-webhook-timestamp": timestamp,
        "x-twilio-email-event-webhook-signature": signSendGridPayload(rawBody, timestamp, privateKey)
      },
      body: rawBody
    });
    assert.equal(response.status, 200);
    assert.equal(seen.lookup.to, "owner@example.com");
    assert.equal(seen.event.tenant_id, "tenant-a");
    assert.equal(seen.event.payload.to, "owner@example.com");
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
