import assert from "node:assert/strict";
import test from "node:test";
import { resolveDevelopmentTenantHeader } from "../scr/utils/developmentTenantHeader.js";

function withEnvironment(values, action) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  try { return action(); }
  finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("does not trust x-tenant-id outside explicit local development", () => {
  withEnvironment({ NODE_ENV: "production", ALLOW_UNSAFE_TENANT_HEADER: "true" }, () => {
    assert.equal(resolveDevelopmentTenantHeader({ headers: { "x-tenant-id": "tenant-a" } }), null);
  });
  withEnvironment({ NODE_ENV: "development", ALLOW_UNSAFE_TENANT_HEADER: "false" }, () => {
    assert.equal(resolveDevelopmentTenantHeader({ headers: { "x-tenant-id": "tenant-a" } }), null);
  });
});

test("allows the tenant header only with explicit local development opt-in", () => {
  withEnvironment({ NODE_ENV: "development", ALLOW_UNSAFE_TENANT_HEADER: "true" }, () => {
    assert.equal(resolveDevelopmentTenantHeader({ headers: { "x-tenant-id": " tenant-a " } }), "tenant-a");
  });
});
