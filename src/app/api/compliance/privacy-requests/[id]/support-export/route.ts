import { getCurrentUserContext } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/roles";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import {
  getPrivacyRequestById,
  getSupportPrivacyExportByRequestId,
} from "@/lib/compliance/privacy-request-repository";
import { getSupportUploadsR2 } from "@/lib/email/support-outbound-attachments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
  "X-Content-Type-Options": "nosniff",
} as const;

function notFound() {
  return Response.json({ error: "Privacy export not found." }, { status: 404, headers: NO_STORE_HEADERS });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentUserContext();
  if (!session) {
    return Response.json({ error: "Authentication required." }, { status: 401, headers: NO_STORE_HEADERS });
  }
  const { id } = await context.params;
  const database = await getCloudflareD1Database();
  if (!database) {
    return Response.json({ error: "Privacy export is temporarily unavailable." }, { status: 503, headers: NO_STORE_HEADERS });
  }

  const [request, artifact] = await Promise.all([
    getPrivacyRequestById(id, database),
    getSupportPrivacyExportByRequestId(id, database),
  ]);
  if (
    !request
    || !artifact
    || request.status !== "completed"
    || !request.subject_verified_at
    || artifact.status !== "ready"
    || !artifact.r2_key
  ) {
    return notFound();
  }
  const admin = isPlatformAdmin(session);
  if (!admin && request.requester_user_id !== session.userId) return notFound();
  if (artifact.expires_at <= new Date().toISOString()) return notFound();

  const r2 = await getSupportUploadsR2();
  if (!r2) {
    return Response.json({ error: "Privacy export is temporarily unavailable." }, { status: 503, headers: NO_STORE_HEADERS });
  }
  const object = await r2.get(artifact.r2_key);
  if (!object?.body) return notFound();

  const safeRequestId = request.id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  const responseHeaders: Record<string, string> = {
    ...NO_STORE_HEADERS,
    "Content-Type": "application/x-tar",
    "Content-Disposition": `attachment; filename="archestimator-support-${safeRequestId}.tar"`,
  };
  const sizeBytes = artifact.size_bytes ?? object.size;
  if (typeof sizeBytes === "number") responseHeaders["Content-Length"] = String(sizeBytes);
  return new Response(object.body as BodyInit, {
    status: 200,
    headers: responseHeaders,
  });
}
