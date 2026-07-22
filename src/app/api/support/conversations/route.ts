import { getCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import {
  SupportIntakeServiceError,
  writeUserSupportMessage,
} from "@/lib/support/intake-service";
import {
  assertSupportSameOrigin,
  SUPPORT_NO_STORE_HEADERS,
  supportJsonError,
} from "@/lib/support/http";
import {
  listUserSupportConversations,
  SupportReadError,
} from "@/lib/support/user-read-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUserContext();
  if (!user) return supportJsonError("Authentication required.", 401);
  const database = await getCloudflareD1Database();
  if (!database) return supportJsonError("Support storage unavailable.", 503);

  try {
    const url = new URL(request.url);
    const result = await listUserSupportConversations({
      cursor: url.searchParams.get("cursor"),
      database,
      limit: url.searchParams.get("limit"),
      userId: user.userId,
    });
    return Response.json(result, { headers: SUPPORT_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof SupportReadError) return supportJsonError(error.message, error.status);
    return supportJsonError("Support requests could not be read.", 503);
  }
}

export async function POST(request: Request) {
  const originError = assertSupportSameOrigin(request);
  if (originError) return originError;
  const user = await getCurrentUserContext();
  if (!user) return supportJsonError("Authentication required.", 401);
  const database = await getCloudflareD1Database();
  if (!database) return supportJsonError("Support storage unavailable.", 503);

  try {
    const outcome = await writeUserSupportMessage({ database, kind: "new", request, user });
    if (outcome.status === 202) {
      return Response.json(
        { pending: true },
        {
          status: 202,
          headers: { ...SUPPORT_NO_STORE_HEADERS, "Retry-After": String(outcome.retryAfter) },
        },
      );
    }
    return Response.json(outcome.data, { status: outcome.status, headers: SUPPORT_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof SupportIntakeServiceError) {
      return supportJsonError(
        error.message,
        error.status,
        error.retryAfter ? { "Retry-After": String(error.retryAfter) } : undefined,
      );
    }
    return supportJsonError("Support request could not be saved.", 503);
  }
}
