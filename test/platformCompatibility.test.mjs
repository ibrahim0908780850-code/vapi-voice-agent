import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "platform-compatibility-test-secret";
process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SECRET_KEY ||= "test-supabase-key";
const express = (await import("express")).default;
const { createPlatformRouter } = await import("../scr/routes/platform.js");

function platformToken() {
  return jwt.sign({ id: "platform-owner", role: "platform_owner", email: "platform@example.com" }, process.env.JWT_SECRET);
}

function successfulClient() {
  const request = { id: "request-a", auth_user_id: "auth-user-a", company_name: "شركة الاختبار", company_type: "real_estate", status: "pending" };
  return {
    from(table) {
      return {
        select() { return this; },
        eq() { return this; },
        single: async () => ({ data: table === "company_requests" ? request : null, error: null }),
        update() { return this; },
        insert: async () => ({ error: null })
      };
    }
  };
}

test("original /platform approval endpoint remains compatible with the canonical approval flow", async () => {
  const app = express();
  app.use(express.json());
  app.use("/platform", createPlatformRouter({ client: successfulClient(), activateTenant: async () => ({ id: "tenant-a" }) }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/platform/company-requests/request-a/approve`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${platformToken()}` }
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, message: "تم تفعيل الشركة بنجاح", tenant_id: "tenant-a" });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
