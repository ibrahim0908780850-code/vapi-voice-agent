import express from "express";
import * as cheerio from "cheerio";
import { getSupabase } from "../config/supabase.js";
import { authenticateRequest, rejectTenantMismatch, requireTenantIdentity } from "../../server/lib/requestAuth.js";
import { fetchSafeWebsite, SafeUrlError } from "../../server/lib/safeWebsiteFetch.js";

const router = express.Router();
const KNOWLEDGE_CHUNK_SIZE = 3000;
const MAX_KNOWLEDGE_CHUNKS = 200;

router.post("/ingest", authenticateRequest, requireTenantIdentity, rejectTenantMismatch, async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ success: false, error: "missing_data" });

    const tenant_id = req.tenantId;
    const supabase = getSupabase(tenant_id);
    const { finalUrl, html } = await fetchSafeWebsite(url);
    const websiteUrl = new URL(finalUrl);

    const $ = cheerio.load(html);
    $("script, style, noscript, nav, footer").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();
    if (!text) return res.status(400).json({ success: false, error: "empty_content" });

    const chunks = [];
    for (let index = 0; index < text.length; index += KNOWLEDGE_CHUNK_SIZE) {
      if (chunks.length >= MAX_KNOWLEDGE_CHUNKS) {
        return res.status(413).json({ success: false, error: "website_content_too_large" });
      }
      chunks.push(text.substring(index, index + KNOWLEDGE_CHUNK_SIZE));
    }

    const records = chunks.map((chunk, index) => ({
      tenant_id,
      title: `Website Knowledge ${index + 1}`,
      category: "website",
      content: chunk,
      metadata: {
        source: "website",
        url: websiteUrl.href,
        domain: websiteUrl.hostname,
        chunk: index + 1
      }
    }));

    const { data, error } = await supabase.from("ai_knowledge_base").insert(records).select();
    if (error) throw error;

    const { error: updateError } = await supabase
      .from("company_settings")
      .update({ website: websiteUrl.href })
      .eq("tenant_id", tenant_id);
    if (updateError) throw updateError;

    return res.json({ success: true, message: "Website indexed successfully", chunks: data.length });
  } catch (error) {
    console.error("Website ingestion error", error.message);
    if (error instanceof SafeUrlError) {
      const status = ["INVALID_URL", "UNSAFE_URL", "UNSAFE_REDIRECT"].includes(error.code) ? 400 : 502;
      return res.status(status).json({ success: false, error: error.code });
    }
    return res.status(500).json({ success: false, error: "website_ingestion_failed" });
  }
});

export default router;
