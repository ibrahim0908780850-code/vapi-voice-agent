import assert from "node:assert/strict";
import test from "node:test";
import { rejectTenantMismatch, requirePlatformOwner } from "../server/lib/requestAuth.js";
import { resolvePublishedWebsiteTenant, resourceBelongsToTenant, websiteBelongsToTenant } from "../server/lib/resourceAuthorization.js";
import { sendUploadError } from "../server/lib/uploadSecurity.js";

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(statusCode) { this.statusCode = statusCode; return this; },
    json(body) { this.body = body; return this; }
  };
}

test("rejects a body tenant_id that differs from the authenticated tenant", () => {
  const req = { tenantId: "tenant-a", body: { tenant_id: "tenant-b" } };
  const res = createResponse();
  let nextCalled = false;
  rejectTenantMismatch(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { error: "TENANT_ACCESS_DENIED" });
});

test("permits a request when its tenant body field matches the authenticated tenant", () => {
  const req = { tenantId: "tenant-a", body: { tenant_id: "tenant-a" } };
  const res = createResponse();
  let nextCalled = false;
  rejectTenantMismatch(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});

test("blocks a tenant user from platform-only order administration", () => {
  const res = createResponse();
  let nextCalled = false;
  requirePlatformOwner({ auth: { id: "user-a", email: "user@example.com", role: "owner" } }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { error: "PLATFORM_ACCESS_REQUIRED" });
});

test("rejects an image upload when the selected website belongs to another tenant", async () => {
  const client = {
    from() { return this; },
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: null, error: null })
  };
  assert.equal(await websiteBelongsToTenant(client, "website-b", "tenant-a"), false);
});

test("does not authorize CRM resources that belong to another tenant", async () => {
  const client = {
    from() { return this; },
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: null, error: null })
  };
  assert.equal(await resourceBelongsToTenant(client, "leads", "lead-b", "tenant-a"), false);
});

test("does not bind a public lead to an unpublished or foreign website", async () => {
  const client = {
    from() { return this; },
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: null, error: null })
  };
  assert.equal(await resolvePublishedWebsiteTenant(client, "tenant-a", "website-b"), null);
});

test("maps Multer file size and file count errors to safe client responses", () => {
  const tooLarge = createResponse();
  const tooMany = createResponse();
  sendUploadError(tooLarge, { code: "LIMIT_FILE_SIZE" });
  sendUploadError(tooMany, { code: "LIMIT_UNEXPECTED_FILE" });
  assert.deepEqual({ status: tooLarge.statusCode, body: tooLarge.body }, { status: 413, body: { error: "FILE_TOO_LARGE" } });
  assert.deepEqual({ status: tooMany.statusCode, body: tooMany.body }, { status: 400, body: { error: "TOO_MANY_FILES" } });
});
