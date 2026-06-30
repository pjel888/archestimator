import { NextResponse, type NextRequest } from "next/server";

import { recordAccountSecurityEvent } from "@/lib/auth/account-audit";
import {
  buildLoginRedirectUrl,
  resolveAuthOrigin,
  sanitizeNextPath,
} from "@/lib/auth/redirects";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = resolveAuthOrigin({
    requestOrigin: request.headers.get("origin"),
    requestUrl: request.url,
  });
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const auditRequest = {
    requestId: request.headers.get("x-request-id") ?? request.headers.get("cf-ray"),
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };

  if (!code) {
    await recordAccountSecurityEvent({
      eventType: "auth_callback_missing_code",
      ...auditRequest,
      metadata: {
        public_error_code: "callback_missing_code",
        safe_next: next,
      },
    });
    return NextResponse.redirect(
      buildLoginRedirectUrl({
        origin,
        code: "callback_missing_code",
        next,
      }),
    );
  }

  await recordAccountSecurityEvent({
    eventType: "auth_callback_legacy_disabled",
    ...auditRequest,
    metadata: {
      public_error_code: "callback_exchange_failed",
      safe_next: next,
    },
  });

  return NextResponse.redirect(
    buildLoginRedirectUrl({
      origin,
      code: "callback_exchange_failed",
      next,
    }),
  );
}
