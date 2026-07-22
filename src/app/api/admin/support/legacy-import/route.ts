import { gateAdminApiMutation } from "@/lib/admin/require-admin";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { readBoundedJsonBody } from "@/lib/http/read-bounded-body";
import {
  assertSupportSameOrigin,
  SUPPORT_NO_STORE_HEADERS,
  supportJsonError,
} from "@/lib/support/http";
import {
  LegacySupportImportError,
  runLegacySupportImport,
  type LegacyImportMode,
} from "@/lib/support/legacy-import-service";

export const dynamic = "force-dynamic";

type LegacyImportRequest = {
  cursor?: unknown;
  limit?: unknown;
  mode?: unknown;
};

export async function POST(request: Request) {
  const originError = assertSupportSameOrigin(request);
  if (originError) return originError;
  const gate = await gateAdminApiMutation(request);
  if (!gate.ok) return gate.response;
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return supportJsonError("Expected a JSON legacy import request.", 415);
  }
  const body = await readBoundedJsonBody<LegacyImportRequest>(request, 16_384);
  if (!body.ok) return supportJsonError(body.error, body.status);
  if (body.value.mode !== "dry-run" && body.value.mode !== "apply") {
    return supportJsonError("mode must be dry-run or apply.", 400);
  }
  if (body.value.cursor !== undefined && body.value.cursor !== null && typeof body.value.cursor !== "string") {
    return supportJsonError("cursor must be text.", 400);
  }
  if (body.value.limit !== undefined && body.value.limit !== null && typeof body.value.limit !== "number") {
    return supportJsonError("limit must be a number.", 400);
  }
  const database = await getCloudflareD1Database();
  if (!database) return supportJsonError("Support storage unavailable.", 503);

  try {
    const result = await runLegacySupportImport({
      cursor: body.value.cursor as string | null | undefined,
      database,
      limit: body.value.limit as number | null | undefined,
      mode: body.value.mode as LegacyImportMode,
    });
    return Response.json(result, { headers: SUPPORT_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof LegacySupportImportError) return supportJsonError(error.message, error.status);
    return supportJsonError("Legacy feedback import could not run.", 503);
  }
}
