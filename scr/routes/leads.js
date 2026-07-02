import express from "express";
import { getSupabase } from "../config/supabase.js";
import { extractTenant } from "../middleware/tenant.js";

const router = express.Router();

// GET LEADS (tenant isolated)
router.get("/", extractTenant, async (req, res) => {
  const supabase = getSupabase(req.tenant_id);

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("tenant_id", req.tenant_id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

// UPDATE STATUS
router.post("/status", extractTenant, async (req, res) => {
  const supabase = getSupabase(req.tenant_id);

  const { id, status } = req.body;

  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id)
    .eq("tenant_id", req.tenant_id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

export default router;