import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import jwt from "jsonwebtoken";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SECRET_KEY ||= "test-supabase-key";
process.env.JWT_SECRET = "route-authorization-test-secret";
process.env.PLATFORM_OWNER_EMAIL = "platform@example.com";

const express = (await import("express")).default;
const websiteRoutes = (await import("../scr/routes/website.routes.js")).default;
const { createWebsiteContentRouter } = await import("../scr/routes/website_content.routes.js");
const { createWebsiteOrdersRouter } = await import("../scr/routes/website.orders.routes.js");

function tokenForTenant(tenant_id = "tenant-a") {
  return jwt.sign({ id: "user-a", auth_user_id: "auth-a", email: "tenant@example.com", role: "owner", tenant_id }, process.env.JWT_SECRET);
}

function platformToken() {
  return jwt.sign({ id: "platform-user", auth_user_id: "auth-platform", email: "platform@example.com", role: "platform_owner" }, process.env.JWT_SECRET);
}

async function withServer(run, { getClient, contentClient } = {}) {
  const app = express();
  app.use(express.json());
  app.use("/website", websiteRoutes);
  app.use("/content", createWebsiteContentRouter({ getClient: contentClient }));
  app.use("/orders", createWebsiteOrdersRouter({ getClient }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function request(baseUrl, path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: response.status, body: await response.json() };
}

test("website management rejects requests without a JWT before database access", async () => {
  await withServer(async (baseUrl) => {
    const response = await request(baseUrl, "/website/create", { method: "POST", body: { template_id: "template-a" } });
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: "AUTH_TOKEN_REQUIRED" });
  });
});

test("website management rejects a tenant_id body spoof at the HTTP boundary", async () => {
  await withServer(async (baseUrl) => {
    const response = await request(baseUrl, "/website/create", {
      method: "POST",
      token: tokenForTenant("tenant-a"),
      body: { tenant_id: "tenant-b", template_id: "template-a" }
    });
    assert.equal(response.status, 403);
    assert.deepEqual(response.body, { error: "TENANT_ACCESS_DENIED" });
  });
});

test("website content hides another tenant at the HTTP boundary", async () => {
  await withServer(async (baseUrl) => {
    const response = await request(baseUrl, "/content/tenant-b", { token: tokenForTenant("tenant-a") });
    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { success: false, error: "website_content_not_found" });
  });
});

test("website order administration rejects a non-platform authenticated user", async () => {
  await withServer(async (baseUrl) => {
    const response = await request(baseUrl, "/orders", { token: tokenForTenant("tenant-a") });
    assert.equal(response.status, 403);
    assert.deepEqual(response.body, { error: "PLATFORM_ACCESS_REQUIRED" });
  });
});

test("website order administration preserves a successful response for an authenticated platform owner", async () => {
  const client = {
    from() { return this; },
    select() { return this; },
    order: async () => ({ data: [], error: null })
  };
  await withServer(async (baseUrl) => {
    const response = await request(baseUrl, "/orders", { token: platformToken() });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { success: true, orders: [] });
  }, { getClient: () => client });
});

test("website content preserves a successful response for its authenticated tenant", async () => {
  const content = { tenant_id: "tenant-a", hero_title: "عنوان الموقع" };
  const client = {
    from() { return this; },
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: content, error: null })
  };
  await withServer(async (baseUrl) => {
    const response = await request(baseUrl, "/content/tenant-a", { token: tokenForTenant("tenant-a") });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { success: true, content });
  }, { contentClient: () => client });
});
