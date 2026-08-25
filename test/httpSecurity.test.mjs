import assert from "node:assert/strict";
import test from "node:test";
import { allowedOrigins, securityHeaders } from "../server/lib/httpSecurity.js";

test("keeps the deployed frontend in the CORS allow-list without allowing arbitrary origins", () => {
  const origins = allowedOrigins();
  assert.equal(origins.has("https://salih-ai-one.vercel.app"), true);
  assert.equal(origins.has("https://untrusted.example"), false);
});

test("sets API-safe hardening headers without injecting a page CSP", () => {
  const headers = {};
  let continued = false;
  securityHeaders({}, { setHeader(name, value) { headers[name] = value; } }, () => { continued = true; });
  assert.equal(continued, true);
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["Referrer-Policy"], "no-referrer");
  assert.equal(headers["Content-Security-Policy"], undefined);
});
