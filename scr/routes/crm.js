import express from "express";
import { getSupabase } from "../config/supabase.js";
import { authenticateRequest, rejectTenantMismatch, requireTenantIdentity } from "../../server/lib/requestAuth.js";
import { resourceBelongsToTenant } from "../../server/lib/resourceAuthorization.js";

const router = express.Router();

router.post("/note", authenticateRequest, requireTenantIdentity, rejectTenantMismatch, async (req, res) => {
  try {
    const { lead_id, note } = req.body || {};
    if (!lead_id || typeof note !== "string" || !note.trim()) {
      return res.status(400).json({ error: "MISSING_REQUIRED_FIELDS" });
    }

    const tenant_id = req.tenantId;
    const supabase = getSupabase(tenant_id);
    if (!(await resourceBelongsToTenant(supabase, "leads", lead_id, tenant_id))) {
      return res.status(404).json({ error: "LEAD_NOT_FOUND" });
    }

    const { error } = await supabase.from("crm_activities").insert({
      tenant_id,
      lead_id,
      action: "note",
      note: note.trim().slice(0, 10_000),
      user_id: req.auth.id,
      entity_type: "lead",
      entity_id: lead_id
    });
    if (error) throw error;
    return res.json({ success: true });
  } catch (error) {
    console.error("CRM note error", error.message);
    return res.status(500).json({ error: "CRM_NOTE_CREATE_FAILED" });
  }
});

export default router;
