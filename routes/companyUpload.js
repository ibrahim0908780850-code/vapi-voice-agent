import express from "express";
import multer from "multer";
import { supabaseAdmin } from "../scr/config/supabase-admin.js";
import { authenticateRequest, requireTenantIdentity } from "../server/lib/requestAuth.js";
import {
  createMulterFileFilter,
  createSafeStoragePath,
  sendUploadError,
  UPLOAD_POLICIES,
  validateUploadedFile
} from "../server/lib/uploadSecurity.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_POLICIES.document.maxBytes, files: 1, fields: 10 },
  fileFilter: createMulterFileFilter("document")
});

function uploadSingleDocument(req, res, next) {
  return upload.single("file")(req, res, (error) => error ? sendUploadError(res, error) : next());
}

router.post("/upload-document", authenticateRequest, requireTenantIdentity, uploadSingleDocument, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "FILE_REQUIRED" });

    const validation = validateUploadedFile(req.file, "document");
    if (!validation.ok) return sendUploadError(res, { code: validation.code });

    const filePath = createSafeStoragePath({
      tenantId: req.tenantId,
      namespace: "company-documents",
      extension: validation.extension
    });

    const { data, error } = await supabaseAdmin.storage
      .from("company-documents")
      .upload(filePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

    if (error) {
      console.error("Company document storage error", error.message);
      return res.status(500).json({ error: "UPLOAD_FAILED" });
    }

    return res.json({ success: true, path: data.path });
  } catch (error) {
    console.error("Company document upload error", error.message);
    return res.status(500).json({ error: "UPLOAD_FAILED" });
  }
});

export default router;
