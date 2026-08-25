import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { verifyBearerWebhookSecret, verifyMetaSignature, verifySendGridEventSignature, verifyTwilioSignature } from "../server/lib/webhookSecurity.js";

test("verifies the official Meta SHA-256 signature over the unparsed body", () => {
  const rawBody = Buffer.from('{"entry":[]}');
  const secret = "meta-secret";
  const signature = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  assert.equal(verifyMetaSignature(rawBody, signature, secret), true);
  assert.equal(verifyMetaSignature(rawBody, "sha256=bad", secret), false);
});

test("supports configured Vapi bearer credentials and legacy X-Vapi-Secret", () => {
  assert.equal(verifyBearerWebhookSecret("Bearer vapi-secret", undefined, "vapi-secret"), true);
  assert.equal(verifyBearerWebhookSecret(undefined, "vapi-secret", "vapi-secret"), true);
  assert.equal(verifyBearerWebhookSecret("Bearer wrong", undefined, "vapi-secret"), false);
});

test("verifies Twilio signed form payloads without trusting the client body", () => {
  const authToken = "twilio-token";
  const url = "https://api.example.com/whatsapp";
  const params = { Body: "hello", From: "whatsapp:+10000000000", To: "whatsapp:+20000000000" };
  const canonical = `${url}BodyhelloFromwhatsapp:+10000000000Towhatsapp:+20000000000`;
  const signature = crypto.createHmac("sha1", authToken).update(canonical).digest("base64");
  assert.equal(verifyTwilioSignature({ signature, authToken, url, params }), true);
  assert.equal(verifyTwilioSignature({ signature, authToken, url, params: { ...params, Body: "tampered" } }), false);
});

test("verifies SendGrid Event Webhook ECDSA signatures over timestamp plus raw body", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const rawBody = Buffer.from('[{"event":"delivered"}]');
  const timestamp = "1724580000";
  const signature = crypto.sign("sha256", Buffer.concat([Buffer.from(timestamp), rawBody]), privateKey).toString("base64");
  const publicPem = publicKey.export({ type: "spki", format: "pem" });
  assert.equal(verifySendGridEventSignature({ rawBody, signature, timestamp, publicKey: publicPem }), true);
  assert.equal(verifySendGridEventSignature({ rawBody: Buffer.from("tampered"), signature, timestamp, publicKey: publicPem }), false);
});
