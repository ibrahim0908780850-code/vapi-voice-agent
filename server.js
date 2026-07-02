import express from "express";
import webhookRoutes from "./routes/webhook.js";
import leadsRoutes from "./routes/leads.js";
import crmRoutes from "./routes/crm.js";
import healthRoutes from "./routes/health.js";

const app = express();

app.use(express.json({ limit: "2mb" }));

// =========================
// ROUTES
// =========================
app.use("/webhook", webhookRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/crm", crmRoutes);
app.use("/", healthRoutes);

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 SALIH AI CRM Server running on port", PORT);
});