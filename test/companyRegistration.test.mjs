import assert from "node:assert/strict";
import test from "node:test";
import { createCompanyRequest, registerCompanyAccount } from "../server/lib/companyRegistration.js";

const payload = { fullName: "شركة اختبار", email: "owner@example.com", password: "password123", phone: null, companyName: "نمو تجريبي", companyType: "general", website: null, description: null, documentUrl: null };

test("completes a valid company registration through auth, profile, and activation request", async () => {
  const calls = [];
  const client = {
    auth: { admin: { async createUser(input) { calls.push(["createUser", input]); return { data: { user: { id: "auth-1" } }, error: null }; }, async deleteUser() { calls.push(["deleteUser"]); } } },
    from(table) {
      if (table === "users") return {
        select() { return { eq() { return { async maybeSingle() { return { data: null, error: null }; } }; } }; },
        async upsert(values, options) { calls.push(["upsert", values, options]); return { error: null }; }
      };
      if (table === "tenants") return { insert(values) { calls.push(["insertTenant", values]); return { select() { return { async single() { return { data: { id: "tenant-1", status: "pending" }, error: null }; } }; } }; } };
      return { insert(values) { calls.push(["insertRequest", values]); return { select() { return { async single() { return { data: { id: "request-1", status: "pending" }, error: null }; } }; } }; } };
    }
  };

  const result = await registerCompanyAccount(client, payload);
  assert.deepEqual(result, { kind: "success", request: { id: "request-1", status: "pending" } });
  assert.equal(calls[0][0], "createUser");
  assert.deepEqual(calls.find(([name]) => name === "insertTenant")[1], { name: "نمو تجريبي", status: "pending" });
  assert.equal(calls.find(([name]) => name === "upsert")[1].auth_user_id, "auth-1");
  assert.equal(calls.find(([name]) => name === "upsert")[1].tenant_id, "tenant-1");
  assert.equal(calls.find(([name]) => name === "insertRequest")[1].company_name, "نمو تجريبي");
  assert.equal(calls.some(([name]) => name === "deleteUser"), false);
});

test("sends only required request fields when the optional company details are blank", async () => {
  const calls = [];
  const client = {
    from(table) {
      assert.equal(table, "company_requests");
      return {
        insert(values) {
          calls.push(values);
          return { select() { return { async single() { return { data: { id: "request-2", status: "pending" }, error: null }; } }; } };
        }
      };
    }
  };

  const request = await createCompanyRequest(client, {
    authUserId: "auth-2",
    payload: { ...payload, phone: null, website: "", description: null, documentUrl: null }
  });

  assert.deepEqual(request, { id: "request-2", status: "pending" });
  assert.deepEqual(calls[0], {
    auth_user_id: "auth-2",
    full_name: "شركة اختبار",
    email: "owner@example.com",
    company_name: "نمو تجريبي",
    company_type: "general",
    status: "pending"
  });
});

test("retries with the core request fields when an optional column is missing in Supabase", async () => {
  const attempts = [];
  const client = {
    from(table) {
      assert.equal(table, "company_requests");
      return {
        insert(values) {
          attempts.push(values);
          return {
            select() {
              return {
                async single() {
                  if (attempts.length === 1) {
                    return { data: null, error: { code: "PGRST204", message: "Could not find the 'phone' column" } };
                  }
                  return { data: { id: "request-3", status: "pending" }, error: null };
                }
              };
            }
          };
        }
      };
    }
  };

  const request = await createCompanyRequest(client, {
    authUserId: "auth-3",
    payload: { ...payload, phone: "0500000000", website: "https://example.com", description: "مكتب عقاري", documentUrl: null }
  });

  assert.deepEqual(request, { id: "request-3", status: "pending" });
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].phone, "0500000000");
  assert.equal(attempts[0].website, "https://example.com");
  assert.equal(attempts[1].phone, undefined);
  assert.equal(attempts[1].website, undefined);
});

test("rolls back a provisional tenant without masking the original registration failure", async () => {
  const calls = [];
  const profileError = new Error("profile-save-failed");
  const client = {
    auth: {
      admin: {
        async createUser() { return { data: { user: { id: "auth-rollback" } }, error: null }; },
        async deleteUser(id) { calls.push(["deleteUser", id]); }
      }
    },
    from(table) {
      if (table === "users") {
        return {
          select() { return { eq() { return { async maybeSingle() { return { data: null, error: null }; } }; } }; },
          async upsert() { return { error: profileError }; }
        };
      }
      if (table === "tenants") {
        return {
          insert() { return { select() { return { async single() { return { data: { id: "tenant-rollback" }, error: null }; } }; } }; },
          delete() {
            calls.push(["deleteTenant"]);
            return { async eq(column, value) { calls.push(["tenantEq", column, value]); return { error: null }; } };
          }
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }
  };

  await assert.rejects(() => registerCompanyAccount(client, payload), profileError);
  assert.deepEqual(calls, [
    ["deleteTenant"],
    ["tenantEq", "id", "tenant-rollback"],
    ["deleteUser", "auth-rollback"]
  ]);
});
