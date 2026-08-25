import express from "express";
import multer from "multer";
import { getSupabase } from "../config/supabase.js";
import { authenticateRequest, rejectTenantMismatch, requireTenantIdentity } from "../../server/lib/requestAuth.js";
import { createMulterFileFilter, sendUploadError, UPLOAD_POLICIES, validateUploadedFile } from "../../server/lib/uploadSecurity.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_POLICIES.knowledge.maxBytes, files: 1, fields: 10 },
  fileFilter: createMulterFileFilter("knowledge")
});

// 📌 رفع ملف شركة
router.post("/upload", authenticateRequest, requireTenantIdentity, rejectTenantMismatch, (req, res, next) => upload.single("file")(req, res, (error) => error ? sendUploadError(res, error) : next()), async (req, res) => {
  const validation = validateUploadedFile(req.file, "knowledge");
  if (!validation.ok) return sendUploadError(res, { code: validation.code });
  const tenant_id = req.tenantId;
  const supabase = getSupabase(tenant_id);

  const fileContent = req.file.buffer.toString("utf-8");

  const { data, error } = await supabase
    .from("ai_knowledge_base")
    .insert({
      tenant_id,
      type: "file",
      title: req.file.originalname.replace(/[\\/\0]/g, "-").slice(0, 160),
      content: fileContent
    });

  if (error) {
    console.error("AI knowledge upload failed", error.message);
    return res.status(500).json({ error: "knowledge_upload_failed" });
  }

  res.json({ success: true, data });
});

export default router;
