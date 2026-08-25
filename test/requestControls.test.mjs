import assert from "node:assert/strict";
import test from "node:test";
import { claimWebhookEvent, clearRequestControlMemoryForTest, createRateLimiter } from "../server/lib/requestControls.js";

function response() {
  return {
    headers: {}, statusCode: null, body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(statusCode) { this.statusCode = statusCode; return this; },
    json(body) { this.body = body; return this; }
  };
}

test("returns 429 only after the configured endpoint-specific limit is exceeded", async () => {
  clearRequestControlMemoryForTest();
  const limiter = createRateLimiter({ name: "test-limit", windowMs: 60_000, max: 2, key: () => "client-a" }, { redis: null });
  for (let count = 0; count < 2; count += 1) {
    const res = response();
    let continued = false;
    await limiter({}, res, () => { continued = true; });
    assert.equal(continued, true);
    assert.equal(res.headers["RateLimit-Remaining"], String(1 - count));
  }
  const denied = response();
  await limiter({}, denied, () => assert.fail("next must not run after rate limit"));
  assert.equal(denied.statusCode, 429);
  assert.deepEqual(denied.body, { error: "RATE_LIMITED", message: "تم تجاوز الحد المؤقت للطلبات." });
});

test("claims a webhook only once for the same provider event", async () => {
  clearRequestControlMemoryForTest();
  const first = await claimWebhookEvent({ provider: "meta", eventId: "event-1", rawBody: "{}", redis: null });
  const second = await claimWebhookEvent({ provider: "meta", eventId: "event-1", rawBody: "{}", redis: null });
  assert.equal(first, true);
  assert.equal(second, false);
});
