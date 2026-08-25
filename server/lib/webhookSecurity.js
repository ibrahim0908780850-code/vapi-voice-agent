import crypto from "crypto";

function safeCompare(received, expected) {
  if (typeof received !== "string" || typeof expected !== "string") return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function verifyMetaSignature(rawBody, signature, appSecret) {
  if (!rawBody || !appSecret || !signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  return safeCompare(signature, expected);
}

export function verifyBearerWebhookSecret(authorization, legacySecret, expectedSecret) {
  if (!expectedSecret) return false;
  const bearer = typeof authorization === "string" ? authorization.replace(/^Bearer\s+/i, "") : "";
  return safeCompare(bearer, expectedSecret) || safeCompare(legacySecret, expectedSecret);
}

export function verifyTwilioSignature({ signature, authToken, url, params = {} }) {
  if (!signature || !authToken || !url) return false;
  const canonical = Object.keys(params).sort().reduce((value, key) => `${value}${key}${params[key] ?? ""}`, url);
  const expected = crypto.createHmac("sha1", authToken).update(canonical).digest("base64");
  return safeCompare(signature, expected);
}

function sendGridPublicKey(publicKey) {
  if (!publicKey) return null;
  const key = String(publicKey).replace(/\\n/g, "\n").trim();
  if (key.includes("BEGIN PUBLIC KEY")) return key;
  try {
    return crypto.createPublicKey({ key: Buffer.from(key, "base64"), format: "der", type: "spki" });
  } catch {
    return null;
  }
}

export function verifySendGridEventSignature({ rawBody, signature, timestamp, publicKey }) {
  const key = sendGridPublicKey(publicKey);
  if (!key || !rawBody || !signature || !timestamp) return false;
  try {
    return crypto.verify("sha256", Buffer.concat([Buffer.from(String(timestamp)), Buffer.from(rawBody)]), key, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

export function requireConfiguredWebhookSecret(secret) {
  return process.env.NODE_ENV !== "production" || Boolean(secret);
}
