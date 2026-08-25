import express from "express";
import { getSupabase as defaultGetSupabase } from "../config/supabase.js";
import { authenticateRequest, rejectTenantMismatch, requireTenantIdentity } from "../../server/lib/requestAuth.js";
import { websiteBelongsToTenant } from "../../server/lib/resourceAuthorization.js";

export function createWebsiteRouter({ getClient = defaultGetSupabase } = {}) {
  const router = express.Router();

  router.post("/create", authenticateRequest, requireTenantIdentity, rejectTenantMismatch, async (req, res) => {
    try {
      const { template_id, slug } = req.body || {};
      if (!template_id) return res.status(400).json({ success: false, error: "missing_data" });
      const tenant_id = req.tenantId;
      const supabase = getClient();
      const { data: existing, error: existingError } = await supabase.from("websites").select("*").eq("tenant_id", tenant_id).maybeSingle();
      if (existingError) throw existingError;
      if (existing) return res.json({ success: true, message: "Website already exists", website: existing });

      const websiteSlug = String(slug || `company-${Date.now()}`).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 120);
      const { data: website, error: websiteError } = await supabase.from("websites")
        .insert({ tenant_id, template_id, slug: websiteSlug, status: "draft" }).select().single();
      if (websiteError) throw websiteError;
      const { error: contentError } = await supabase.from("website_content").insert({
        tenant_id, hero_title: "Welcome To Your Website", hero_description: "Your AI powered business website", services: {}, faq: {}, contact_info: {}
      });
      if (contentError) throw contentError;
      const { error: designError } = await supabase.from("website_design_settings").insert({
        tenant_id, primary_color: "#2563eb", secondary_color: "#1e293b", font: "Cairo"
      });
      if (designError) throw designError;
      const { error: pagesError } = await supabase.from("website_pages").insert([
        { tenant_id, page_name: "Home", slug: "/", content: {} }, { tenant_id, page_name: "About", slug: "about", content: {} },
        { tenant_id, page_name: "Services", slug: "services", content: {} }, { tenant_id, page_name: "Contact", slug: "contact", content: {} }
      ]);
      if (pagesError) throw pagesError;
      return res.json({ success: true, website });
    } catch (error) {
      console.error("Website create error", error.message);
      return res.status(500).json({ success: false, error: "website_create_failed" });
    }
  });

  router.get("/:tenant_id", authenticateRequest, requireTenantIdentity, async (req, res) => {
    try {
      if (req.params.tenant_id !== req.tenantId) return res.status(404).json({ success: false, error: "website_not_found" });
      const { data, error } = await getClient().from("websites")
        .select("*, website_templates(*)").eq("tenant_id", req.tenantId).maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, error: "website_not_found" });
      return res.json({ success: true, website: data });
    } catch (error) {
      console.error("Website read error", error.message);
      return res.status(500).json({ success: false, error: "website_read_failed" });
    }
  });

  async function updateWebsite(req, res, changes) {
    try {
      const tenant_id = req.tenantId;
      const supabase = getClient();
      if (!(await websiteBelongsToTenant(supabase, req.params.id, tenant_id))) return res.status(404).json({ success: false, error: "website_not_found" });
      const { data, error } = await supabase.from("websites")
        .update(changes).eq("id", req.params.id).eq("tenant_id", tenant_id).select().single();
      if (error) throw error;
      return res.json({ success: true, website: data });
    } catch (error) {
      console.error("Website update error", error.message);
      return res.status(500).json({ success: false, error: "website_update_failed" });
    }
  }

  router.put("/:id/template", authenticateRequest, requireTenantIdentity, async (req, res) => {
    if (!req.body?.template_id) return res.status(400).json({ success: false, error: "template_required" });
    return updateWebsite(req, res, { template_id: req.body.template_id });
  });
  router.put("/:id/publish", authenticateRequest, requireTenantIdentity, (req, res) => updateWebsite(req, res, { status: "published" }));
  return router;
}

export default createWebsiteRouter();
