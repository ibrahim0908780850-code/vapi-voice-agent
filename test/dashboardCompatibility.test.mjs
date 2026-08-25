import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";

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
