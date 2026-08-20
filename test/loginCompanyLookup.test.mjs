import assert from "node:assert/strict";
import test from "node:test";
import { lookupCompanyAccess } from "../server/lib/loginCompanyLookup.js";

test("checks the linked company before reading company requests", async () => {
  const calls = [];
  const client = {
    from(table) {
      calls.push(table);
      if (table === "company_requests") throw new Error("Company requests must not be read while a tenant is linked");
      return { select() { return { eq() { return { async maybeSingle() { return { data: { status: "active" }, error: null }; } }; } }; } };
    }
  };

  const result = await lookupCompanyAccess(client, { tenant_id: "tenant-1", role: "owner", is_platform_owner: false }, "auth-1");
  assert.deepEqual(result, { tenantId: "tenant-1", tenantStatus: "active", requestStatus: null });
  assert.deepEqual(calls, ["tenants"]);
});

test("uses a pending linked company before any request status", async () => {
  const calls = [];
  const client = {
    from(table) {
      calls.push(table);
      if (table === "company_requests") throw new Error("A linked pending tenant must take precedence over requests");
      return { select() { return { eq() { return { async maybeSingle() { return { data: { status: "pending" }, error: null }; } }; } }; } };
    }
  };

  const result = await lookupCompanyAccess(client, { tenant_id: "tenant-pending", role: "owner", is_platform_owner: false }, "auth-pending");
  assert.deepEqual(result, { tenantId: "tenant-pending", tenantStatus: "pending", requestStatus: null });
  assert.deepEqual(calls, ["tenants"]);
});

test("checks the latest request only when the account has no linked company", async () => {
  const calls = [];
  const client = {
    from(table) {
      calls.push(table);
      assert.equal(table, "company_requests");
      return {
        select() {
          return { eq() { return { order() { return { limit() { return { async maybeSingle() { return { data: { status: "pending" }, error: null }; } }; } }; } }; } };
        }
      };
    }
  };

  const result = await lookupCompanyAccess(client, { tenant_id: null, role: "owner", is_platform_owner: false }, "auth-2");
  assert.deepEqual(result, { tenantId: null, tenantStatus: null, requestStatus: "pending" });
  assert.deepEqual(calls, ["company_requests"]);
});

test("falls back to request status when a legacy request table has no tenant_id column", async () => {
  const requestedColumns = [];
  const client = {
    from(table) {
      assert.equal(table, "company_requests");
      return {
        select(columns) {
          requestedColumns.push(columns);
          return {
            eq() {
              return {
                order() {
                  return {
                    limit() {
                      return {
                        async maybeSingle() {
                          if (requestedColumns.length === 1) {
                            return { data: null, error: { code: "PGRST204", message: "Could not find the 'tenant_id' column" } };
                          }
                          return { data: { status: "pending" }, error: null };
                        }
                      };
                    }
                  };
                }
              };
            }
          };
        }
      };
    }
  };

  const result = await lookupCompanyAccess(client, { tenant_id: null, role: "owner", is_platform_owner: false }, "auth-no-request-tenant");
  assert.deepEqual(result, { tenantId: null, tenantStatus: null, requestStatus: "pending" });
  assert.deepEqual(requestedColumns, ["status, tenant_id", "status"]);
});

test("does not query company data for a platform owner", async () => {
  const client = { from() { throw new Error("Platform owners do not require a company lookup"); } };
  const result = await lookupCompanyAccess(client, { tenant_id: null, role: "platform_owner", is_platform_owner: true }, "auth-platform");
  assert.deepEqual(result, { tenantId: null, tenantStatus: null, requestStatus: null });
});

test("repairs a historical approved request link and reads its active tenant", async () => {
  const calls = [];
  const client = {
    from(table) {
      calls.push(table);
      if (table === "company_requests") {
        return {
          select() {
            return {
              eq() {
                return {
                  order() {
                    return {
                      limit() {
                        return { async maybeSingle() { return { data: { status: "approved", tenant_id: "legacy-tenant" }, error: null }; } };
                      }
                    };
                  }
                };
              }
            };
          }
        };
      }
      if (table === "tenants") {
        return { select() { return { eq() { return { async maybeSingle() { return { data: { status: "active" }, error: null }; } }; } }; } };
      }
      assert.equal(table, "users");
      return { update(values) { assert.deepEqual(values, { tenant_id: "legacy-tenant" }); return { async eq(column, value) { assert.equal(column, "auth_user_id"); assert.equal(value, "auth-legacy"); return { error: null }; } }; } };
    }
  };

  const result = await lookupCompanyAccess(client, { tenant_id: null, role: "owner", is_platform_owner: false }, "auth-legacy");
  assert.deepEqual(result, { tenantId: "legacy-tenant", tenantStatus: "active", requestStatus: "approved" });
  assert.deepEqual(calls, ["company_requests", "tenants", "users"]);
});
