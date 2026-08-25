import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import jwt from "jsonwebtoken";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SECRET_KEY ||= "test-supabase-key";
process.env.JWT_SECRET = "dashboard-compatibility-test-secret";

const express = (await import("express")).default;
const dashboardRoutes = (await import("../scr/routes/dashboard.api.js")).default;

test("both original dashboard agent paths are registered and require authentication", async () => {
  const app = express();
  app.use("/api/dashboard", dashboardRoutes);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    for (const path of ["/api/dashboard/ai-agent", "/api/dashboard/agent"]) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`);
      assert.equal(response.status, 401);
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("dashboard agent alias returns the original frontend success payload for an authenticated tenant", async () => {
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith("https://example.supabase.co/")) {
      if (url.includes("/auth/v1/user")) {
        throw new Error("dashboard compatibility must not require a Supabase access token");
      }
      assert.match(url, /ai_agents/);
      return new Response(JSON.stringify([{ id: "agent-a", name: "SALIH Agent", status: "active" }]), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
    return nativeFetch(input, init);
  };

  const app = express();
  app.use("/api/dashboard", dashboardRoutes);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const token = jwt.sign({ id: "user-a", auth_user_id: "auth-user-a", tenant_id: "tenant-a", role: "owner" }, process.env.JWT_SECRET);
  try {
    const response = await nativeFetch(`http://127.0.0.1:${port}/api/dashboard/agent`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [{ id: "agent-a", name: "SALIH Agent", status: "active" }]);
  } finally {
    globalThis.fetch = nativeFetch;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
