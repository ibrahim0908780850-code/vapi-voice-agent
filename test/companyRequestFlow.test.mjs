import assert from "node:assert/strict";
import test from "node:test";
import { registerCompanyAccount } from "../server/lib/companyRegistration.js";
import { listCompanyRequests } from "../server/lib/companyRequests.js";

test("makes a submitted company request available to the platform request list", async () => {
  const requests = [];
  const client = {
    auth: {
      admin: {
        async createUser() {
          return { data: { user: { id: "auth-company-owner" } }, error: null };
        },
        async deleteUser() {}
      }
    },
    from(table) {
      if (table === "users") {
        return {
          select() {
            return { eq() { return { async maybeSingle() { return { data: null, error: null }; } }; } };
          },
          async upsert() {
            return { error: null };
          }
        };
      }

      assert.equal(table, "company_requests");
      return {
        insert(values) {
          const request = { id: "request-visible-in-platform", ...values };
          requests.push(request);
          return { select() { return { async single() { return { data: request, error: null }; } }; } };
        },
        select() {
          return {
            order() {
              return { data: requests, error: null };
            }
          };
        }
      };
    }
  };

  await registerCompanyAccount(client, {
    fullName: "ناصر العقارات",
    email: "owner@example.com",
    password: "password123",
    phone: "0500000000",
    companyName: "شركة ناصر العقارات",
    companyType: "real_estate",
    website: "",
    description: "",
    documentUrl: null
  });

  const platformRequests = await listCompanyRequests(client);
  assert.equal(platformRequests.length, 1);
  assert.equal(platformRequests[0].id, "request-visible-in-platform");
  assert.equal(platformRequests[0].status, "pending");
  assert.equal(platformRequests[0].company_name, "شركة ناصر العقارات");
});
