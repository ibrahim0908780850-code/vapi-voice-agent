import express from "express";
import { supabase } from "../config/supabase.js";
import crypto from "crypto";

const router = express.Router();

router.post("/", async (req, res) => {
  const toolCallId =
    req.body?.message?.toolCalls?.[0]?.id || crypto.randomUUID();

  const phone = req.body?.message?.customer?.phone || "unknown";

  // 1. حفظ lead بسيط (سنطوره لاحقًا)
  const { data, error } = await supabase
    .from("leads")
    .upsert(
      {
        phone,
        stage: "new",
        status: "new"
      },
      { onConflict: "phone" }
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
          lead_id: data?.[0]?.id
        })
      }
    ]
  });
});

export default router;