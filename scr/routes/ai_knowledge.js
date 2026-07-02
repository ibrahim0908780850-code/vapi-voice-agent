import express from "express";
import multer from "multer";
import { getSupabase } from "../config/supabase.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 📌 رفع ملف شركة
router.post("/upload", upload.single("file"), async (req, res) => {
  const tenant_id = req.body.tenant_id;
  const supabase = getSupabase(tenant_id);

  const fileContent = req.file.buffer.toString("utf-8");

  const { data, error } = await supabase
    .from("ai_knowledge_base")
    .insert({
      tenant_id,
      type: "file",
      title: req.file.originalname,
      content: fileContent
    });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true, data });
});

export default router;