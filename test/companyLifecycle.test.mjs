import assert from "node:assert/strict";
import test from "node:test";
import { registerCompanyAccount } from "../server/lib/companyRegistration.js";
import { listCompanyRequests } from "../server/lib/companyRequests.js";
import { activateCompanyTenant } from "../server/lib/companyActivation.js";
import { authenticateLogin } from "../server/lib/loginService.js";

test("runs company registration, platform approval, and next-login dashboard routing end to end", async () => {
  const state = { profile: null, tenant: null, requests: [] };
  const client = {
    auth: {
      admin: {
        async createUser() { return { data: { user: { id: "auth-lifecycle" } }, error: null }; },
        async deleteUser() { return { error: null }; }
      },
      async signInWithPassword() { return { data: { user: { id: "auth-lifecycle" } }, error: null }; }
    },
    from(table) {
      if (table === "users") {
        return {
          select() {
            return {
              eq(column, value) {
                return {
                  async maybeSingle() {
                    if (!state.profile) return { data: null, error: null };
                    const matches = column === "email" ? state.profile.email === value : state.profile.auth_user_id === value;
                    return { data: matches ? state.profile : null, error: null };
                  }
                };
              }
            };
          },
          async upsert(values) { state.profile = { id: "profile-lifecycle", ...values }; return { error: null }; },
          update(values) {
            return {
              async eq() { state.profile = { ...state.profile, ...values }; return { error: null }; }
            };
          }
        };
      }
      if (table === "tenants") {
        return {
          insert(values) {
            state.tenant = { id: "tenant-lifecycle", ...values };
            return { select() { return { async single() { return { data: state.tenant, error: null }; } }; } };
          },
          update(values) {
            return {
              eq() {
                state.tenant = { ...state.tenant, ...values };
                return { select() { return { async single() { return { data: state.tenant, error: null }; } }; } };
              }
            };
          },
          select() {
            return { eq() { return { async maybeSingle() { return { data: state.tenant, error: null }; } }; } };
          }
        };
      }
      assert.equal(table, "company_requests");
      return {
        insert(values) {
          const request = { id: "request-lifecycle", ...values };
          state.requests.push(request);
          return { select() { return { async single() { return { data: request, error: null }; } }; } };
        },
        select() {
          return { order() { return { data: state.requests, error: null }; } };
        }
      };
    }
  };

  const payload = {
    fullName: "مالك الشركة",
    email: "company@example.com",
    password: "valid-password",
    phone: null,
    companyName: "شركة دورة الاختبار",
    companyType: "general",
    website: null,
    description: null,
    documentUrl: null
  };

  const registration = await registerCompanyAccount(client, payload);
  assert.equal(registration.kind, "success");
  assert.equal(state.tenant.status, "pending");
  assert.equal((await listCompanyRequests(client))[0].status, "pending");

  const activeTenant = await activateCompanyTenant(client, registration.request);
  assert.equal(activeTenant.status, "active");

  const login = await authenticateLogin(client, { email: payload.email, password: payload.password }, (claims) => JSON.stringify(claims));
  assert.equal(login.status, 200);
  assert.equal(login.body.next_step, "dashboard");
  assert.equal(login.body.user.tenant_id, "tenant-lifecycle");
});
