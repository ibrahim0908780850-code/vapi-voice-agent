import { randomUUID } from "crypto";
import path from "path";

export const UPLOAD_POLICIES = {
  document: {
    maxBytes: 10 * 1024 * 1024,
    allowed: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]
    }
  },
  image: {
    maxBytes: 5 * 1024 * 1024,
    allowed: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"]
    }
  },
  knowledge: {
    maxBytes: 2 * 1024 * 1024,
    allowed: {
      "text/plain": [".txt"],
      "text/markdown": [".md", ".markdown"],
      "text/csv": [".csv"],
      "application/json": [".json"]
    }
  }
};

function normalizedExtension(filename) {
  if (typeof filename !== "string" || filename.includes("\0")) return "";
  return path.extname(filename).toLowerCase();
}

export function validateUploadMetadata(file, policyName) {
  const policy = UPLOAD_POLICIES[policyName];
  const extension = normalizedExtension(file?.originalname);
  const allowedExtensions = policy?.allowed?.[file?.mimetype];
  if (!policy || !extension || !allowedExtensions?.includes(extension)) {
    return { ok: false, code: "UNSUPPORTED_FILE_TYPE" };
  }
  return { ok: true, extension, policy };
}

function startsWith(buffer, bytes) {
  return Buffer.isBuffer(buffer) && buffer.length >= bytes.length && bytes.every((byte, index) => buffer[index] === byte);
}

export function hasExpectedFileSignature(file, extension) {
  const buffer = file?.buffer;
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return false;
  if (extension === ".pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (extension === ".doc") return startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0]);
  if (extension === ".docx") return startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]);
  if ([".jpg", ".jpeg"].includes(extension)) return startsWith(buffer, [0xff, 0xd8, 0xff]);
  if (extension === ".png") return startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (extension === ".webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if ([".txt", ".md", ".markdown", ".csv", ".json"].includes(extension)) return !buffer.includes(0);
  return false;
}

export function validateUploadedFile(file, policyName) {
  const metadata = validateUploadMetadata(file, policyName);
  if (!metadata.ok) return metadata;
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > metadata.policy.maxBytes) {
    return { ok: false, code: "FILE_SIZE_INVALID" };
  }
  if (!hasExpectedFileSignature(file, metadata.extension)) {
    return { ok: false, code: "FILE_CONTENT_INVALID" };
  }
  return metadata;
}

export function createSafeStoragePath({ tenantId, namespace, extension }) {
  const safeTenantId = String(tenantId || "").trim();
  const safeNamespace = String(namespace || "").trim().replace(/[^a-z0-9_-]/gi, "");
  if (!safeTenantId || !safeNamespace || !/^\.[a-z0-9]+$/i.test(extension || "")) {
    throw new Error("invalid_storage_path_input");
  }
  return `${safeTenantId}/${safeNamespace}/${randomUUID()}${extension.toLowerCase()}`;
}

export function createMulterFileFilter(policyName) {
  return (_req, file, callback) => {
    const validation = validateUploadMetadata(file, policyName);
    if (!validation.ok) {
      const error = new Error(validation.code);
      error.code = validation.code;
      return callback(error);
    }
    return callback(null, true);
  };
}

export function sendUploadError(res, error) {
  const code = error?.code;
  if (code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "FILE_TOO_LARGE" });
  if (code === "LIMIT_FILE_COUNT" || code === "LIMIT_UNEXPECTED_FILE") return res.status(400).json({ error: "TOO_MANY_FILES" });
  if (["UNSUPPORTED_FILE_TYPE", "FILE_CONTENT_INVALID", "FILE_SIZE_INVALID"].includes(code)) {
    return res.status(400).json({ error: code });
  }
  return res.status(400).json({ error: "UPLOAD_REJECTED" });
}
