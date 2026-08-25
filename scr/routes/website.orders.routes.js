import express from "express";
import { getSupabase as defaultGetSupabase } from "../config/supabase.js";
import { authenticateRequest, requirePlatformOwner } from "../../server/lib/requestAuth.js";

const VALID_STATUSES = new Set(["pending", "reviewing", "approved", "building", "completed", "failed"]);

export function createWebsiteOrdersRouter({ getClient = defaultGetSupabase } = {}) {
  const router = express.Router();

  router.post("/create", async (req, res) => {
    try {
      const { customer_name, company_name, email, phone, industry_type, template_id, meta } = req.body || {};
      if (!customer_name || !company_name || !industry_type) return res.status(400).json({ success: false, error: "missing_data" });
      const { data, error } = await getClient().from("website_orders").insert({
        customer_name: String(customer_name).slice(0, 160),
        company_name: String(company_name).slice(0, 160),
        email: String(email || "").slice(0, 320),
        phone: String(phone || "").slice(0, 80),
        industry_type: String(industry_type).slice(0, 120),
        template_id: template_id || null,
        status: "pending",
        meta: meta || {}
      }).select().single();
      if (error) throw error;
      return res.json({ success: true, message: "Website request created", order: data });
    } catch (error) {
      console.error("Website order create error", error.message);
      return res.status(500).json({ success: false, error: "website_order_create_failed" });
    }
  });

  router.use(authenticateRequest, requirePlatformOwner);

  router.get("/", async (_req, res) => {
    try {
      const { data, error } = await getClient().from("website_orders")
        .select("*, website_templates(name, category)").order("created_at", { ascending: false });
      if (error) throw error;
      return res.json({ success: true, orders: data });
    } catch (error) {
      console.error("Website orders list error", error.message);
      return res.status(500).json({ success: false, error: "website_orders_list_failed" });
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const { data, error } = await getClient().from("website_orders")
        .select("*, website_templates(*)").eq("id", req.params.id).maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, error: "order_not_found" });
      return res.json({ success: true, order: data });
    } catch (error) {
      console.error("Website order read error", error.message);
      return res.status(500).json({ success: false, error: "website_order_read_failed" });
    }
  });

  async function updateOrder(req, res, changes, message) {
    try {
      const { data, error } = await getClient().from("website_orders")
        .update(changes).eq("id", req.params.id).select().maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, error: "order_not_found" });
      return res.json({ success: true, ...(message ? { message } : {}), order: data });
    } catch (error) {
      console.error("Website order update error", error.message);
      return res.status(500).json({ success: false, error: "website_order_update_failed" });
    }
  }

  router.patch("/:id/status", (req, res) => {
    const { status } = req.body || {};
    if (!VALID_STATUSES.has(status)) return res.status(400).json({ success: false, error: "invalid_status" });
    return updateOrder(req, res, { status });
  });

  router.patch("/:id/template", (req, res) => {
    const { template_id } = req.body || {};
    if (!template_id) return res.status(400).json({ success: false, error: "template_required" });
    return updateOrder(req, res, { template_id, status: "approved" });
  });

  router.post("/:id/approve", (req, res) => updateOrder(req, res, { status: "approved" }, "Order approved"));

  return router;
}

export default createWebsiteOrdersRouter();
