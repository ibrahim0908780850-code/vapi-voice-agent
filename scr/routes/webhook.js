import express from "express";
import { getSupabase } from "../config/supabase.js";
import crypto from "crypto";

const router = express.Router();

router.post("/", async (req, res) => {
  const toolCallId =
    req.body?.message?.toolCalls?.[0]?.id || crypto.randomUUID();

  // 👇 أهم خطوة: تحديد الشركة
  const tenant_id =
    req.body?.message?.assistantId || "default_tenant";

  const supabase = getSupabase(tenant_id);

  const phone = req.body?.message?.customer?.phone || "unknown";

  const { data, error } = await supabase
    .from("leads")
    .upsert(
      {
        tenant_id,
        phone,
        stage: "new",
        status: "new"
      },
      { onConflict: "phone,tenant_id" }
    )
    .select();

  if (error) {
    return res.json({
      results: [
        {
          toolCallId,
          result: JSON.stringify({ error: "db_error" })
        }
      ]
    });
  }

  return res.json({
    results: [
      {
        toolCallId,
        result: JSON.stringify({
          success: true,
          tenant_id,
          lead_id: data?.[0]?.id
        })
      }
    ]
  });
});

export default router;