import assert from "node:assert/strict";
import test from "node:test";
import { registerCompanyAccount } from "../server/lib/companyRegistration.js";

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
      return { insert(values) { calls.push(["insertRequest", values]); return { select() { return { async single() { return { data: { id: "request-1", status: "pending" }, error: null }; } }; } }; } };
    }
  };

  const result = await registerCompanyAccount(client, payload);
  assert.deepEqual(result, { kind: "success", request: { id: "request-1", status: "pending" } });
  assert.equal(calls[0][0], "createUser");
  assert.equal(calls.find(([name]) => name === "upsert")[1].auth_user_id, "auth-1");
  assert.equal(calls.find(([name]) => name === "insertRequest")[1].company_name, "نمو تجريبي");
  assert.equal(calls.some(([name]) => name === "deleteUser"), false);
});
