import assert from "node:assert/strict";
import test from "node:test";
import { resolveLoginNextStep } from "../server/lib/loginNextStep.js";

test("sends platform owner to platform", () => {
  assert.equal(resolveLoginNextStep({ user: { role: "platform_owner" } }).nextStep, "platform");
});

test("sends active company owner to company dashboard", () => {
  assert.equal(resolveLoginNextStep({ user: { role: "owner", tenant_id: "tenant-1" }, tenantStatus: "active" }).nextStep, "dashboard");
});

test("sends account without a company to creation guidance", () => {
  assert.deepEqual(resolveLoginNextStep({ user: { role: "owner", tenant_id: null } }), {
    nextStep: "create_company",
    message: "لديك حساب، لكن لا توجد شركة مرتبطة به",
    companyStatus: "none"
  });
});
