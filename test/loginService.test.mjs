import assert from "node:assert/strict";
import test from "node:test";
import { authenticateLogin } from "../server/lib/loginService.js";

function clientFor(user, { tenantStatus = "active", requestStatus = null } = {}) {
  return {
    auth: { async signInWithPassword() { return { data: { user: { id: "auth-1" } }, error: null }; } },
    from(table) {
      const query = {
        select(columns) {
          return {
            eq() {
              if (table === "company_requests") return { order() { return { limit() { return { async maybeSingle() { return { data: requestStatus ? { status: requestStatus } : null, error: null }; } }; } }; } };
              return { async maybeSingle() { return { data: columns === "id, auth_user_id" ? { id: "profile-1", auth_user_id: "auth-1" } : table === "users" ? user : table === "tenants" ? { status: tenantStatus } : null, error: null }; } };
            }
          };
        }
      };
      return query;
    }
  };
}

const credentials = { email: "owner@example.com", password: "password123" };
const baseUser = { id: "user-1", auth_user_id: "auth-1", email: "owner@example.com", tenant_id: null, role: "owner", is_platform_owner: false };

test("returns platform for a platform owner", async () => {
  const result = await authenticateLogin(clientFor({ ...baseUser, role: "platform_owner", is_platform_owner: true }), credentials, () => "test-token");
  assert.equal(result.status, 200); assert.equal(result.body.next_step, "platform");
});

test("returns company dashboard for an active company owner", async () => {
  const result = await authenticateLogin(clientFor({ ...baseUser, tenant_id: "tenant-1" }), credentials, () => "test-token");
  assert.equal(result.status, 200); assert.equal(result.body.next_step, "dashboard");
});

test("returns pending when the linked company is still pending activation", async () => {
  const user = { ...baseUser, tenant_id: "pending-tenant" };
  const result = await authenticateLogin(clientFor(user, { tenantStatus: "pending", requestStatus: "rejected" }), credentials, () => "test-token");
  assert.equal(result.status, 200); assert.equal(result.body.next_step, "pending");
});

test("returns company creation for an account without a company", async () => {
  const result = await authenticateLogin(clientFor(baseUser), credentials, () => "test-token");
  assert.equal(result.status, 200); assert.equal(result.body.next_step, "create_company");
});
