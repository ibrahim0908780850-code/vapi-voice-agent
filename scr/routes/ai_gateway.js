import express from "express";
import crypto from "crypto";

import { getSupabase } from "../config/supabase.js";
import { generateAIResponse } from "../ai/brain.js";
import { getLeadMemory } from "../../ai/memory.js";
import { buildAIContext } from "../../ai/build_context.js";
import { analyzeDeal } from "../ai/deal-intelligence.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const toolCallId =
    req.body?.message?.toolCalls?.[0]?.id ||
    crypto.randomUUID();

  try {
    // =========================
    // TENANT
    // =========================
    const tenant_id =
      req.body?.message?.assistantId ||
      req.headers["x-tenant-id"] ||
      "default_tenant";

    const supabase = getSupabase(tenant_id);

    // =========================
    // USER DATA
    // =========================
    const phone =
      req.body?.message?.customer?.phone || "unknown";

    const userMessage =
      req.body?.message?.text || "";

    // =========================
    // GET OR CREATE LEAD
    // =========================
    const { data: lead, error: leadError } =
      await supabase
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

    if (leadError) throw leadError;

    // =========================
    // LOAD MEMORY
    // =========================
    const memory = await getLeadMemory(tenant_id, phone);

    const tenantContext = buildAIContext(memory);

    // =========================
    // AI RESPONSE
    // =========================
    const aiReply = await generateAIResponse({
      tenant_id,
      message: userMessage,
      tenantContext
    });

    // =========================
    // SAVE MESSAGE
    // =========================
    await supabase.from("messages").insert({
      tenant_id,
      lead_id: lead.id,
      phone,
      message: userMessage,
      ai_response: aiReply,
      source: "ai_gateway"
    });

    // =========================
    // UPDATE LEAD
    // =========================
    await supabase
      .from("leads")
      .update({
        last_activity: new Date().toISOString(),
        stage: "warm"
      })
      .eq("id", lead.id);

    // =========================
    // CRM LOG
    // =========================
    await supabase.from("crm_activities").insert({
      tenant_id,
      lead_id: lead.id,
      action: "ai_message",
      note: userMessage
    });

    // =========================
    // LOAD HISTORY
    // =========================
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("lead_id", lead.id);

    const { data: calls } = await supabase
      .from("calls")
      .select("*")
      .eq("lead_id", lead.id);

    const { data: appointments } = await supabase
      .from("appointments")
      .select("*")
      .eq("lead_id", lead.id);

    const { data: activities } = await supabase
      .from("crm_activities")
      .select("*")
      .eq("lead_id", lead.id);

    // =========================
    // DEAL INTELLIGENCE
    // =========================
    const dealResult = await analyzeDeal({
      lead,
      messages: messages || [],
      calls: calls || [],
      appointments: appointments || [],
      activities: activities || []
    });

    // =========================
    // CREATE / UPDATE DEAL
    // =========================
    if (dealResult.score >= 70) {
      const { data: existingDeal } = await supabase
        .from("deals")
        .select("*")
        .eq("lead_id", lead.id)
        .single();

      if (!existingDeal) {
        await supabase.from("deals").insert({
          tenant_id,
          lead_id: lead.id,
          title: `Deal - ${phone}`,
          stage: "qualified",
          probability: dealResult.score,
          value: dealResult.expectedValue,
          status: "open"
        });
      } else {
        await supabase
          .from("deals")
          .update({
            probability: dealResult.score,
            value: dealResult.expectedValue,
            stage: dealResult.stage
          })
          .eq("id", existingDeal.id);
      }
    }

    // =========================
    // RESPONSE
    // =========================
    return res.json({
      results: [
        {
          toolCallId,
          result: JSON.stringify({
            success: true,
            reply: aiReply,
            lead_id: lead.id,
            tenant_id,
            deal_score: dealResult.score,
            deal_stage: dealResult.stage
          })
        }
      ]
    });

  } catch (err) {
    console.error(err);

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