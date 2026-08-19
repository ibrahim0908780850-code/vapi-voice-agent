import assert from "node:assert/strict";
import test from "node:test";
import { upsertCompanyOwnerProfile } from "../server/lib/companyProfile.js";

test("prepares an owner profile for a valid registration without duplicate inserts", async () => {
  const calls = [];
  const client = {
    from(table) {
      assert.equal(table, "users");
      return {
        async upsert(values, options) {
          calls.push({ values, options });
          return { error: null };
        }
      };
    }
  };

  await upsertCompanyOwnerProfile(client, "auth-user-id", "owner@example.com");
  assert.deepEqual(calls, [{
    values: { auth_user_id: "auth-user-id", email: "owner@example.com", role: "owner", tenant_id: null },
    options: { onConflict: "auth_user_id" }
  }]);
});
