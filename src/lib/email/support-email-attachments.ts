/**
 * Inbound support attachment safety helpers (Worker + server safe).
 */

const DANGEROUS_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "cpl",
  "dll",
  "js",
  "jse",
  "mjs",
  "vbs",
  "vbe",
  "wsf",
  "wsh",
  "ps1",
  "scr",
  "msi",
  "msp",
  "hta",
  "jar",
  "apk",
  "iso",
  "img",
  "dmg",
  "svg",
  "html",
  "htm",
  "xhtml",
  "shtml",
]);

const DANGEROUS_CONTENT_TYPES = new Set([
  "application/javascript",
  "application/x-javascript",
  "text/javascript",
  "text/html",
  "application/xhtml+xml",
  "image/svg+xml",
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-executable",
]);

export type AttachmentDecision = {
  blocked: boolean;
  reason: string | null;
  sanitizedFilename: string;
  safeContentType: string;
};

export function sanitizeAttachmentFilename(raw: string | null | undefined, fallback = "attachment.bin") {
  const base = (raw ?? fallback).split(/[/\\]/).pop()?.trim() || fallback;
  const withoutControls = base.replace(/[\u0000-\u001f\u007f]/g, "").replace(/[<>:"|?*]/g, "_");
  const collapsed = withoutControls.replace(/\s+/g, " ").trim() || fallback;
  return collapsed.slice(0, 180);
}

function fileExtension(filename: string) {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1]! : "";
}

export function classifyInboundAttachment(input: {
  filename: string | null | undefined;
  contentType: string | null | undefined;
}): AttachmentDecision {
  const sanitizedFilename = sanitizeAttachmentFilename(input.filename);
  const ext = fileExtension(sanitizedFilename);
  const contentType = (input.contentType ?? "application/octet-stream").split(";")[0]!.trim().toLowerCase() || "application/octet-stream";

  if (DANGEROUS_EXTENSIONS.has(ext) || DANGEROUS_CONTENT_TYPES.has(contentType)) {
    return {
      blocked: true,
      reason: "active_or_executable_content",
      sanitizedFilename,
      safeContentType: "application/octet-stream",
    };
  }

  return {
    blocked: false,
    reason: null,
    sanitizedFilename,
    safeContentType: contentType || "application/octet-stream",
  };
}

export function buildSupportAttachmentR2Key(input: {
  conversationId: string;
  messageId: string;
  attachmentId: string;
  filename: string;
}) {
  const safeName = sanitizeAttachmentFilename(input.filename);
  return `support-email/${input.conversationId}/${input.messageId}/${input.attachmentId}/${safeName}`;
}

export async function sha256Hex(bytes: ArrayBuffer | Uint8Array) {
  const buffer: ArrayBuffer =
    bytes instanceof ArrayBuffer
      ? bytes
      : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function contentDispositionAttachment(filename: string) {
  const sanitized = sanitizeAttachmentFilename(filename);
  const ascii = sanitized.replace(/[^\x20-\x7e]/g, "_");
  const encoded = encodeURIComponent(sanitized);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
