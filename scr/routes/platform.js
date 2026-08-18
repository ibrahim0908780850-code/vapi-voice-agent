import express from "express";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../config/supabase-admin.js";

const router = express.Router();

function platformAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) return res.status(401).json({ error: "missing_token" });

    const token = authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "platform_owner" && decoded.is_platform_owner !== true) {
      return res.status(403).json({ error: "not_allowed" });
    }

    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

router.get("/company-requests", platformAuth, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("company_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json({ success: true, requests: data || [] });
  } catch (error) {
    console.error("PLATFORM REQUESTS ERROR:", error);
    return res.status(500).json({
      error: "company_requests_fetch_failed",
      message: "تعذر تحميل طلبات الشركات حالياً"
    });
  }
});

router.post("/create-company", platformAuth, async (req, res) => {
  const requestId = req.body?.request_id;
  if (!requestId) return res.status(400).json({ error: "request_id_required" });

  try {
    const { data: request, error: requestError } = await supabaseAdmin
      .from("company_requests")
      .select("*")
      .eq("id", requestId)
      .single();
    if (requestError || !request) return res.status(404).json({ error: "request_not_found" });
    if (request.status === "approved") return res.status(400).json({ error: "already_approved" });

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .insert({ name: request.company_name, website: request.website || null, status: "active" })
      .select()
      .single();
    if (tenantError) throw tenantError;

    const { error: userError } = await supabaseAdmin
      .from("users")
      .update({ tenant_id: tenant.id, role: "owner", is_platform_owner: false })
      .eq("auth_user_id", request.auth_user_id);
    if (userError) throw userError;

    const { error: settingsError } = await supabaseAdmin
      .from("company_settings")
      .insert({ tenant_id: tenant.id, company_name: request.company_name, industry_type: request.company_type || "general" });
    if (settingsError) throw settingsError;

    const { error: agentError } = await supabaseAdmin
      .from("ai_agents")
      .insert({ tenant_id: tenant.id, name: "NexaFlow AI Agent", status: "active", model: "gemini" });
    if (agentError) throw agentError;

    const { error: updateError } = await supabaseAdmin
      .from("company_requests")
      .update({ status: "approved", approved_by: req.user.id, approved_at: new Date() })
      .eq("id", requestId);
    if (updateError) throw updateError;

    return res.json({ success: true, message: "تم تفعيل الشركة بنجاح", tenant_id: tenant.id });
  } catch (error) {
    console.error("APPROVE COMPANY ERROR:", error);
    return res.status(500).json({
      error: "company_activation_failed",
      message: "تعذر تفعيل الشركة حالياً"
    });
  }
});

router.patch("/company-requests/:id/reject", platformAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from("company_requests")
      .update({ status: "rejected", rejected_by: req.user.id, rejected_at: new Date() })
      .eq("id", req.params.id);
    if (error) throw error;
    return res.json({ success: true, message: "تم رفض طلب الشركة" });
  } catch (error) {
    console.error("REJECT COMPANY ERROR:", error);
    return res.status(500).json({
      error: "company_request_reject_failed",
      message: "تعذر رفض طلب الشركة حالياً"
    });
  }
});

export default router;
