import { getCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import {
  SUPPORT_NO_STORE_HEADERS,
  supportJsonError,
} from "@/lib/support/http";
import { getSupportRuntimeBindings } from "@/lib/support/runtime";
import {
  readSupportAttachmentForActor,
  SupportReadError,
} from "@/lib/support/user-read-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await getCurrentUserContext();
  if (!actor) return supportJsonError("Authentication required.", 401);
  const database = await getCloudflareD1Database();
  if (!database) return supportJsonError("Support storage unavailable.", 503);

  try {
    const attachment = await readSupportAttachmentForActor({
      actor,
      attachmentId: (await context.params).id,
      database,
    });
    const r2 = (await getSupportRuntimeBindings()).ARCH_UPLOADS_R2;
    if (!r2) return supportJsonError("Attachment storage unavailable.", 503);
    const object = await r2.get(attachment.r2_key);
    if (!object) return supportJsonError("Attachment not found.", 404);
    const body = object.body
      ?? (object.arrayBuffer ? new Uint8Array(await object.arrayBuffer()) : null);
    if (!body) return supportJsonError("Attachment not found.", 404);
    return new Response(body as BodyInit, {
      headers: {
        ...SUPPORT_NO_STORE_HEADERS,
        "Content-Disposition": "inline; filename=\"support-screenshot.webp\"",
        "Content-Length": String(attachment.size_bytes),
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof SupportReadError) return supportJsonError(error.message, error.status);
    return supportJsonError("Attachment could not be read.", 503);
  }
}
