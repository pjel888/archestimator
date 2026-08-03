import "server-only";

import { checkRecordedDurableRateLimit } from "@/lib/security/durable-rate-limits";

const AUTH_CALLBACK_AUDIT_SCOPE = "auth_callback_audit";

function getCallbackClientIp(request: Request) {
  return request.headers.get("cf-connecting-ip")?.trim() || "unattributed";
}

export async function shouldRecordAuthCallbackAuditEvent(
  request: Request,
  eventType: "auth_callback_legacy_disabled" | "auth_callback_missing_code",
) {
  try {
    const result = await checkRecordedDurableRateLimit({
      scope: AUTH_CALLBACK_AUDIT_SCOPE,
      keyParts: [getCallbackClientIp(request)],
      metadata: { eventType },
      windows: [
        { seconds: 60, limit: 30, message: () => "Auth callback audit limit reached." },
        { seconds: 60 * 60, limit: 300, message: () => "Auth callback audit limit reached." },
      ],
    });
    return result.allowed;
  } catch {
    return false;
  }
}
