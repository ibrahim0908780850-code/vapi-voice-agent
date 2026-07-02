import express from "express";
import { supabase } from "../config/supabase.js";

const router = express.Router();

router.post("/note", async (req, res) => {
  const { lead_id, note } = req.body;

  const { error } = await supabase.from("crm_activities").insert({
    lead_id,
    action: "note",
    note
  });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

export default router;