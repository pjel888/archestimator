import { getCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import {
  assertSupportSameOrigin,
  SUPPORT_NO_STORE_HEADERS,
  supportJsonError,
} from "@/lib/support/http";
import {
  abandonUserSupportIntake,
  SupportAbandonError,
} from "@/lib/support/intake-abandon";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ clientMessageId: string }> },
) {
  const originError = assertSupportSameOrigin(request);
  if (originError) return originError;
  const user = await getCurrentUserContext();
  if (!user) return supportJsonError("Authentication required.", 401);
  const database = await getCloudflareD1Database();
  if (!database) return supportJsonError("Support storage unavailable.", 503);

  try {
    const result = await abandonUserSupportIntake({
      clientMessageId: (await context.params).clientMessageId,
      database,
      userId: user.userId,
    });
    return Response.json(result, { headers: SUPPORT_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof SupportAbandonError) return supportJsonError(error.message, error.status);
    return supportJsonError("Support intake could not be abandoned.", 503);
  }
}
