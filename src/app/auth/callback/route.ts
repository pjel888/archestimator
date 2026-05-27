import { NextResponse, type NextRequest } from "next/server";

import { recordAccountSecurityEvent } from "@/lib/auth/account-audit";
import { resolvePostAuthDestination } from "@/lib/auth/account-setup";
import { mapAuthErrorToCode } from "@/lib/auth/error-mapping";
import {
  buildLoginRedirectUrl,
  resolveAuthOrigin,
  sanitizeNextPath,
} from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = resolveAuthOrigin({
    requestOrigin: request.headers.get("origin"),
    requestUrl: request.url,
  });
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const auditRequest = {
    requestId: request.headers.get("x-request-id") ?? request.headers.get("x-vercel-id"),
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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    await recordAccountSecurityEvent({
      eventType: "auth_callback_failed",
      ...auditRequest,
      metadata: {
        public_error_code: "callback_exchange_failed",
        safe_next: next,
      },
    });
    return NextResponse.redirect(
      buildLoginRedirectUrl({
        origin,
        code: mapAuthErrorToCode({
          fallbackCode: "callback_exchange_failed",
          rawError: error.message,
        }),
        next,
      }),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await recordAccountSecurityEvent({
    eventType: "auth_callback_succeeded",
    userId: user?.id ?? null,
    ...auditRequest,
    metadata: {
      safe_next: next,
    },
  });

  const destination = resolvePostAuthDestination(next);
  return NextResponse.redirect(new URL(destination, origin));
}
