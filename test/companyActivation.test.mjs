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

test("activates a provisional tenant without website when the deployed schema lacks that column", async () => {
  const updates = [];
  const client = {
    from(table) {
      if (table === "users") {
        return { select() { return { eq() { return { async maybeSingle() { return { data: { tenant_id: "pending-no-website" }, error: null }; } }; } }; } };
      }
      assert.equal(table, "tenants");
      return {
        update(values) {
          updates.push(values);
          return {
            eq() {
              return {
                select() {
                  return {
                    async single() {
                      if (updates.length === 1) {
                        return { data: null, error: { code: "PGRST204", message: "Could not find the 'website' column of 'tenants' in the schema cache" } };
                      }
                      return { data: { id: "pending-no-website", ...values }, error: null };
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

  const tenant = await activateCompanyTenant(client, { auth_user_id: "auth-no-website", company_name: "شركة متوافقة", website: "https://example.com" });
  assert.deepEqual(updates, [
    { name: "شركة متوافقة", website: "https://example.com", status: "active" },
    { name: "شركة متوافقة", status: "active" }
  ]);
  assert.deepEqual(tenant, { id: "pending-no-website", name: "شركة متوافقة", status: "active" });
});
