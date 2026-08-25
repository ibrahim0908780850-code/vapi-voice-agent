import assert from "node:assert/strict";
import test from "node:test";
import { createSafeStoragePath, validateUploadedFile } from "../server/lib/uploadSecurity.js";

function pdfFile(overrides = {}) {
  return {
    originalname: "company-document.pdf",
    mimetype: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\nexample"),
    size: 16,
    ...overrides
  };
}

test("accepts a document only when extension, MIME type, size, and signature agree", () => {
  const valid = validateUploadedFile(pdfFile(), "document");
  assert.equal(valid.ok, true);
  assert.equal(valid.extension, ".pdf");
});

test("rejects executable extensions and MIME/signature spoofing", () => {
  assert.deepEqual(
    validateUploadedFile(pdfFile({ originalname: "document.pdf.exe" }), "document"),
    { ok: false, code: "UNSUPPORTED_FILE_TYPE" }
  );
  assert.deepEqual(
    validateUploadedFile(pdfFile({ buffer: Buffer.from("MZ executable"), size: 13 }), "document"),
    { ok: false, code: "FILE_CONTENT_INVALID" }
  );
});

test("generates storage object names without trusting a client filename", () => {
  const path = createSafeStoragePath({ tenantId: "tenant-a", namespace: "company-documents", extension: ".pdf" });
  assert.match(path, /^tenant-a\/company-documents\/[a-f0-9-]+\.pdf$/);
  assert.doesNotMatch(path.split("/").at(-1), /company-document|\.\./);
});
