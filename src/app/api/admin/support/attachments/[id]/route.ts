import { gateAdminApiGet, NO_STORE_HEADERS } from "@/lib/admin/require-admin";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { contentDispositionAttachment } from "@/lib/email/support-email-attachments";
import { getSupportAttachmentForAdminInD1 } from "@/lib/repositories/support-conversations-repository";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

type R2ObjectLike = {
  body: ReadableStream | null;
  httpMetadata?: { contentType?: string };
};

type R2BucketLike = {
  get(key: string): Promise<R2ObjectLike | null>;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await gateAdminApiGet();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return Response.json({ error: "Invalid attachment ID." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const db = await getCloudflareD1Database();
  if (!db) {
    return Response.json({ error: "Something went wrong. Try again in a moment." }, { status: 503, headers: NO_STORE_HEADERS });
  }

  const attachment = await getSupportAttachmentForAdminInD1(db, id);
  if (!attachment) {
    return Response.json({ error: "Attachment not found." }, { status: 404, headers: NO_STORE_HEADERS });
  }

  if (attachment.storage_status !== "stored") {
    return Response.json(
      { error: "Attachment is not available for download.", status: attachment.storage_status },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  let r2: R2BucketLike | null = null;
  try {
    const cf = (await getCloudflareContext({ async: true })) as { env?: { ARCH_UPLOADS_R2?: R2BucketLike } };
    r2 = cf.env?.ARCH_UPLOADS_R2 ?? null;
  } catch {
    r2 = null;
  }

  if (!r2) {
    return Response.json({ error: "Attachment storage unavailable." }, { status: 503, headers: NO_STORE_HEADERS });
  }

  const object = await r2.get(attachment.r2_key);
  if (!object?.body) {
    return Response.json({ error: "Attachment object missing." }, { status: 404, headers: NO_STORE_HEADERS });
  }

  return new Response(object.body, {
    status: 200,
    headers: {
      ...NO_STORE_HEADERS,
      "Content-Type": attachment.content_type || object.httpMetadata?.contentType || "application/octet-stream",
      "Content-Disposition": contentDispositionAttachment(attachment.filename),
      "X-Content-Type-Options": "nosniff",
      "Content-Length": String(attachment.size_bytes),
    },
  });
}
