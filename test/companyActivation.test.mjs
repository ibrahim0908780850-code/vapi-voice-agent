import assert from "node:assert/strict";
import test from "node:test";
import { activateCompanyTenant } from "../server/lib/companyActivation.js";

test("activates the provisional tenant assigned during company registration", async () => {
  const calls = [];
  const client = {
    from(table) {
      if (table === "users") {
        return {
          select() {
            return { eq() { return { async maybeSingle() { return { data: { tenant_id: "pending-tenant" }, error: null }; } }; } };
          }
        };
      }

      assert.equal(table, "tenants");
      return {
        update(values) {
          calls.push(["update", values]);
          return { eq(column, value) { calls.push(["eq", column, value]); return { select() { return { async single() { return { data: { id: value, ...values }, error: null }; } }; } }; } };
        },
        insert() {
          throw new Error("A provisional tenant should be activated instead of creating a duplicate");
        }
      };
    }
  };

  const tenant = await activateCompanyTenant(client, {
    auth_user_id: "auth-owner",
    company_name: "شركة ناصر العقارات",
    website: null
  });

  assert.equal(tenant.id, "pending-tenant");
  assert.deepEqual(calls[0], ["update", { name: "شركة ناصر العقارات", website: null, status: "active" }]);
  assert.deepEqual(calls[1], ["eq", "id", "pending-tenant"]);
});
