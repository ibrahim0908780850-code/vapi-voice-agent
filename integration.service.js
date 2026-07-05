import axios from "axios";
import { getSupabase } from "../config/supabase.js";
import { integrationQueue } from "../queues/integration.queue.js";

/**
 * 🚀 ROUTE EVENT (QUEUE VERSION)
 * يدخل أي event إلى النظام بشكل async
 */
export async function routeEvent(tenant_id, eventType, payload) {
  try {
    // 1. إضافة الحدث إلى الـ Queue
    await integrationQueue.add(
      "process-integration",
      {
        tenant_id,
        eventType,
        payload
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000
        }
      }
    );

    console.log("📦 Event queued successfully:", {
      tenant_id,
      eventType
    });

  } catch (err) {
    console.error("❌ Queue Error:", err.message);
  }
}