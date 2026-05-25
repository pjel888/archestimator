import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

const COMPONENT_ATTACHMENT_BUCKET = "component-attachments";
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const EXTENSION_BY_MIME_TYPE = new Map([
  ["application/pdf", "pdf"],
  ["application/vnd.ms-excel", "xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function readMagicMime(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 5
    && bytes[0] === 0x25
    && bytes[1] === 0x50
    && bytes[2] === 0x44
    && bytes[3] === 0x46
    && bytes[4] === 0x2d
  ) {
    return "application/pdf";
  }

  if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  if (
    bytes.length >= 8
    && bytes[0] === 0xd0
    && bytes[1] === 0xcf
    && bytes[2] === 0x11
    && bytes[3] === 0xe0
    && bytes[4] === 0xa1
    && bytes[5] === 0xb1
    && bytes[6] === 0x1a
    && bytes[7] === 0xe1
  ) {
    return "application/vnd.ms-excel";
  }

  return null;
}

function safeUploadName(name: string) {
  const stem = name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return stem || "component-attachment";
}

async function createStorageSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceRoleKey) {
    return createClient<Database>(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          "X-Client-Info": "archestimator-component-attachment-upload",
        },
      },
    });
  }

  return createSupabaseServerClient();
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
    return jsonError("Attachment upload is too large. Choose a PDF or Excel file under 20 MB.", 413);
  }

  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return jsonError("Attachment file is required.");
  if (!ALLOWED_MIME_TYPES.has(file.type)) return jsonError("Use a PDF, XLS, or XLSX attachment.");
  if (file.size <= 0) return jsonError("Attachment file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) return jsonError("Attachment upload is too large. Choose a PDF or Excel file under 20 MB.", 413);

  const sourceBuffer = Buffer.from(await file.arrayBuffer());
  const magicMime = readMagicMime(sourceBuffer.subarray(0, 16));
  if (!magicMime || magicMime !== file.type) {
    return jsonError("The uploaded file does not look like a supported attachment.");
  }

  const extension = EXTENSION_BY_MIME_TYPE.get(magicMime);
  if (!extension) return jsonError("Use a PDF, XLS, or XLSX attachment.");

  const supabase = await createStorageSupabaseClient();
  const path = `${workspace.id}/${currentUser.userId}/${safeUploadName(file.name)}-${randomUUID()}.${extension}`;

  try {
    const { error } = await supabase.storage.from(COMPONENT_ATTACHMENT_BUCKET).upload(path, sourceBuffer, {
      contentType: magicMime,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw new Error(error.message);

    return NextResponse.json({
      bucket: COMPONENT_ATTACHMENT_BUCKET,
      path,
      fileName: file.name,
      contentType: magicMime,
      sizeBytes: file.size,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? `Could not store attachment: ${error.message}` : "Could not store attachment.", 500);
  }
}
