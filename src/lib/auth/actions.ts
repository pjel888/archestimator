"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { recordAccountSecurityEvent } from "@/lib/auth/account-audit";
import { mapAuthErrorToCode } from "@/lib/auth/error-mapping";
import {
  buildLoginRedirectUrl,
  LOGIN_PATH,
  resolveAuthOrigin,
  sanitizeNextPath,
} from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getRequestMetadata() {
  const headersList = await headers();
  const requestHost = headersList.get("host");
  const forwardedProto = headersList.get("x-forwarded-proto");
  const requestUrl = requestHost
    ? `${forwardedProto ?? (requestHost.startsWith("localhost") ? "http" : "https")}://${requestHost}${LOGIN_PATH}`
    : null;

  return {
    origin: resolveAuthOrigin({
      requestOrigin: headersList.get("origin"),
      requestUrl,
    }),
    requestId: headersList.get("x-request-id") ?? headersList.get("x-vercel-id"),
    ipAddress: headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headersList.get("user-agent"),
  };
}

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = sanitizeNextPath(formData.get("next"));

  if (!email) {
    const request = await getRequestMetadata();
    redirect(
      buildLoginRedirectUrl({
        origin: request.origin,
        code: "email_required",
        next,
      }).toString(),
    );
  }

  const request = await getRequestMetadata();
  const origin = request.origin;
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect(
      buildLoginRedirectUrl({
        origin,
        code: mapAuthErrorToCode({
          fallbackCode: "auth_request_failed",
          rawError: error.message,
        }),
        next,
      }).toString(),
    );
  }

  await recordAccountSecurityEvent({
    eventType: "auth_email_link_requested",
    requestId: request.requestId,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
    metadata: {
      method: "email_link",
      redirect_to: `${origin}/auth/callback`,
      safe_next: next,
    },
  });

  redirect(`${LOGIN_PATH}?sent=1&next=${encodeURIComponent(next)}`);
}

export async function signInWithGoogle(formData: FormData) {
  const next = sanitizeNextPath(formData.get("next"));
  const request = await getRequestMetadata();
  const origin = request.origin;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    redirect(
      buildLoginRedirectUrl({
        origin,
        code: mapAuthErrorToCode({
          fallbackCode: "google_request_failed",
          rawError: error?.message,
        }),
        next,
      }).toString(),
    );
  }

  await recordAccountSecurityEvent({
    eventType: "auth_google_started",
    requestId: request.requestId,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
    metadata: {
      provider: "google",
      redirect_to: `${origin}/auth/callback`,
      safe_next: next,
    },
  });

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
