import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import { getSupabase } from "../config/supabase.js";

const router = express.Router();

router.post("/ingest", async (req, res) => {
  const { url, tenant_id } = req.body;
  const supabase = getSupabase(tenant_id);

  const html = await axios.get(url).then(r => r.data);
  const $ = cheerio.load(html);

  const text = $("body").text().replace(/\s+/g, " ").slice(0, 5000);

  const { data, error } = await supabase
    .from("ai_knowledge_base")
    .insert({
      tenant_id,
      type: "website",
      title: url,
      content: text
    });

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    success: true,
    message: "Website ingested",
    data
  });
});

export default router;