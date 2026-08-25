import express from "express";
import { getSupabase as defaultGetSupabase } from "../config/supabase.js";
import { authenticateRequest, rejectTenantMismatch, requireTenantIdentity } from "../../server/lib/requestAuth.js";
import { websiteBelongsToTenant } from "../../server/lib/resourceAuthorization.js";

export function createWebsiteContentRouter({ getClient = defaultGetSupabase } = {}) {
  const router = express.Router();

  router.post("/save", authenticateRequest, requireTenantIdentity, rejectTenantMismatch, async (req, res) => {
    try {
      const { website_id, hero_title, hero_description, about_text, services, faq, contact_info, seo } = req.body || {};
      const tenant_id = req.tenantId;
      const supabase = getClient();
      if (website_id && !(await websiteBelongsToTenant(supabase, website_id, tenant_id))) {
        return res.status(404).json({ success: false, error: "website_not_found" });
      }

      const { data, error } = await supabase.from("website_content").upsert({
        tenant_id, website_id, hero_title, hero_description, about_text,
        services: services || {}, faq: faq || {}, contact_info: contact_info || {}, seo: seo || {}, updated_at: new Date()
      }, { onConflict: "tenant_id" }).select().single();
      if (error) throw error;
      return res.json({ success: true, content: data });
    } catch (error) {
      console.error("Website content save error", error.message);
      return res.status(500).json({ success: false, error: "website_content_save_failed" });
    }
  });

  router.get("/:tenant_id", authenticateRequest, requireTenantIdentity, async (req, res) => {
    try {
      if (req.params.tenant_id !== req.tenantId) return res.status(404).json({ success: false, error: "website_content_not_found" });
      const { data, error } = await getClient().from("website_content")
        .select("*").eq("tenant_id", req.tenantId).maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, error: "website_content_not_found" });
      return res.json({ success: true, content: data });
    } catch (error) {
      console.error("Website content read error", error.message);
      return res.status(500).json({ success: false, error: "website_content_read_failed" });
    }
  });

  return router;
}

export default createWebsiteContentRouter();
