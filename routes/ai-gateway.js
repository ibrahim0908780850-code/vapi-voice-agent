import express from "express";
import crypto from "crypto";
import { getSupabase } from "../config/supabase.js";
import { generateAIResponse } from "../ai/brain.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const toolCallId =
    req.body?.message?.toolCalls?.[0]?.id ||
    crypto.randomUUID();

  try {
    // =========================
    // 1. TENANT RESOLUTION (مهم جدًا)
    // =========================
    const tenant_id =
      req.body?.message?.assistantId ||
      req.headers["x-tenant-id"] ||
      "default_tenant";

    const supabase = getSupabase(tenant_id);

    // =========================
    // 2. EXTRACT USER DATA
    // =========================
    const phone =
      req.body?.message?.customer?.phone || "unknown";

    const userMessage =
      req.body?.message?.text || "";

    // =========================
    // 3. GET OR CREATE LEAD
    // =========================
    const { data: lead } = await supabase
      .from("leads")
      .upsert(
        {
          tenant_id,
          phone,
          source: "ai_gateway"
        },
        {
          onConflict: "phone,tenant_id"
        }
      )
      .select()
      .single();

    // =========================
    // 4. AI RESPONSE
    // =========================
    const aiReply = await generateAIResponse(
      tenant_id,
      userMessage
    );

    // =========================
    // 5. SAVE MESSAGE
    // =========================
    await supabase.from("messages").insert({
      tenant_id,
      lead_id: lead?.id,
      phone,
      message: userMessage,
      ai_response: aiReply,
      source: "ai_gateway"
    });

    // =========================
    // 6. UPDATE LEAD INTELLIGENCE
    // =========================
    await supabase
      .from("leads")
      .update({
        last_activity: new Date(),
        stage: "warm"
      })
      .eq("id", lead?.id);

    // =========================
    // 7. CRM ACTIVITY LOG
    // =========================
    await supabase.from("crm_activities").insert({
      tenant_id,
      lead_id: lead?.id,
      action: "ai_message",
      note: userMessage
    });

    // =========================
    // 8. RESPONSE
    // =========================
    return res.json({
      results: [
        {
          toolCallId,
          result: JSON.stringify({
            success: true,
            reply: aiReply,
            lead_id: lead?.id,
            tenant_id
          })
        }
      ]
    });

  } catch (err) {
    console.error("AI GATEWAY ERROR:", err);

    return res.json({
      results: [
        {
          toolCallId,
          result: JSON.stringify({
            error: "gateway_error"
          })
        }
      ]
    });
  }
});

export default router;