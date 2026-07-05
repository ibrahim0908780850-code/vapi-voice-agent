import { Worker } from "bullmq";
import { redis } from "../config/redis.js";
import { getSupabase } from "../config/supabase.js";

import { handleIntegration } from "../integrations/integration.dispatcher.js";

const worker = new Worker(
  "integration-queue",
  async (job) => {
    const { tenant_id, eventType, payload } = job.data;

    const supabase = getSupabase();

    // جلب integrations
    const { data: integrations } = await supabase
      .from("integrations")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("active", true);

    if (!integrations) return;

    // تنفيذ الإرسال
    for (const integration of integrations) {
      await handleIntegration(integration, eventType, payload);
    }

    console.log("🚀 Job processed:", eventType);
  },
  {
    connection: redis
  }
);

console.log("⚡ Integration Worker Running...");