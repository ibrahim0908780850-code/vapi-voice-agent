import express from "express";
import { getSupabase } from "../config/supabase.js";
import { authenticateRequest, rejectTenantMismatch, requireTenantIdentity } from "../../server/lib/requestAuth.js";
import { websiteBelongsToTenant } from "../../server/lib/resourceAuthorization.js";

const router = express.Router();

router.post("/save", authenticateRequest, requireTenantIdentity, rejectTenantMismatch, async (req, res) => {
  try {
    const { website_id, primary_color, secondary_color, font, logo, favicon, theme, layout } = req.body || {};
    const tenant_id = req.tenantId;
    const supabase = getSupabase();
    if (website_id && !(await websiteBelongsToTenant(supabase, website_id, tenant_id))) {
      return res.status(404).json({ success: false, error: "website_not_found" });
    }

    const { data, error } = await supabase.from("website_design_settings").upsert({
      tenant_id,
      website_id,
      primary_color: primary_color || "#2563eb",
      secondary_color: secondary_color || "#1e293b",
      font: font || "Cairo",
      logo: logo || null,
      favicon: favicon || null,
      theme: theme || "modern",
      layout: layout || "default",
      updated_at: new Date()
    }, { onConflict: "tenant_id" }).select().single();
    if (error) throw error;
    return res.json({ success: true, settings: data });
  } catch (error) {
    console.error("Website design save error", error.message);
    return res.status(500).json({ success: false, error: "website_design_save_failed" });
  }
});

router.get("/:tenant_id", authenticateRequest, requireTenantIdentity, async (req, res) => {
  try {
    if (req.params.tenant_id !== req.tenantId) return res.status(404).json({ success: false, error: "website_design_not_found" });
    const { data, error } = await getSupabase().from("website_design_settings").select("*").eq("tenant_id", req.tenantId).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: "website_design_not_found" });
    return res.json({ success: true, settings: data });
  } catch (error) {
    console.error("Website design read error", error.message);
    return res.status(500).json({ success: false, error: "website_design_read_failed" });
  }
});

export default router;
