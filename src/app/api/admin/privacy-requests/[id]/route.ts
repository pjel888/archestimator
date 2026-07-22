import { gateAdminApiMutation, NO_STORE_HEADERS } from "@/lib/admin/require-admin";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import {
  getPrivacyRequestById,
  verifyPrivacyRequestSubject,
} from "@/lib/compliance/privacy-request-repository";
import {
  executeSupportPrivacyRequest,
  SupportPrivacyFulfillmentError,
} from "@/lib/compliance/support-privacy-fulfillment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MutationBody = {
  action?: unknown;
  expectedRevision?: unknown;
  requesterUserId?: unknown;
};

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: NO_STORE_HEADERS });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await gateAdminApiMutation(request);
  if (!gate.ok) return gate.response;
  const payload = await request.json().catch(() => null) as MutationBody | null;
  if (!payload || !Number.isInteger(payload.expectedRevision) || Number(payload.expectedRevision) < 0) {
    return jsonError("A non-negative expectedRevision is required.", 400);
  }
  const { id } = await context.params;
  const database = await getCloudflareD1Database();
  if (!database) return jsonError("Privacy request storage unavailable.", 503);

  if (payload.action === "verify") {
    if (typeof payload.requesterUserId !== "string" || !payload.requesterUserId.trim()) {
      return jsonError("requesterUserId is required for verification.", 400);
    }
    const verified = await verifyPrivacyRequestSubject({
      adminUserId: gate.context.userId,
      dbOverride: database,
      expectedRevision: Number(payload.expectedRevision),
      privacyRequestId: id,
      requesterUserId: payload.requesterUserId,
    }).catch(() => null);
    if (!verified) return jsonError("Privacy request changed or could not be verified.", 409);
    return Response.json({ request: verified }, { headers: NO_STORE_HEADERS });
  }

  if (payload.action === "execute") {
    try {
      const executed = await executeSupportPrivacyRequest({
        database,
        expectedRevision: Number(payload.expectedRevision),
        privacyRequestId: id,
      });
      return Response.json({ request: executed }, { headers: NO_STORE_HEADERS });
    } catch (error) {
      if (error instanceof SupportPrivacyFulfillmentError) {
        return jsonError(error.code, error.status);
      }
      return jsonError("support_privacy_operation_failed", 500);
    }
  }

  if (payload.action === "refresh") {
    const current = await getPrivacyRequestById(id, database);
    return current
      ? Response.json({ request: current }, { headers: NO_STORE_HEADERS })
      : jsonError("Privacy request not found.", 404);
  }
  return jsonError("Invalid privacy request action.", 400);
}
