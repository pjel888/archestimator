import { getCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { readBoundedJsonBody } from "@/lib/http/read-bounded-body";
import {
  assertSupportSameOrigin,
  SUPPORT_NO_STORE_HEADERS,
  supportJsonError,
} from "@/lib/support/http";
import {
  markUserSupportConversationReadThrough,
  SupportReadError,
} from "@/lib/support/user-read-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const originError = assertSupportSameOrigin(request);
  if (originError) return originError;
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return supportJsonError("Expected a JSON read receipt.", 415);
  }
  const user = await getCurrentUserContext();
  if (!user) return supportJsonError("Authentication required.", 401);
  const database = await getCloudflareD1Database();
  if (!database) return supportJsonError("Support storage unavailable.", 503);
  const body = await readBoundedJsonBody<{ throughMessageId?: unknown }>(request, 16_384);
  if (!body.ok) return supportJsonError(body.error, body.status);
  if (typeof body.value.throughMessageId !== "string") {
    return supportJsonError("throughMessageId is required.", 400);
  }

  try {
    const result = await markUserSupportConversationReadThrough({
      conversationId: (await context.params).id,
      database,
      throughMessageId: body.value.throughMessageId,
      user,
    });
    return Response.json(result, { headers: SUPPORT_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof SupportReadError) return supportJsonError(error.message, error.status);
    return supportJsonError("Support read receipt could not be saved.", 503);
  }
}
