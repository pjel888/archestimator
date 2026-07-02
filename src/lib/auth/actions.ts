"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { recordAccountSecurityEvent } from "@/lib/auth/account-audit";
import { resolvePostAuthDestination } from "@/lib/auth/account-setup";
import { mapAuthErrorToCode } from "@/lib/auth/error-mapping";
import {
  buildLoginRedirectUrl,
  LOGIN_PATH,
  resolveAuthOrigin,
  sanitizeNextPath,
} from "@/lib/auth/redirects";
import { requireAuth } from "@/lib/auth/session";
import { clearBetterAuthOAuthStateCookies, forwardSetCookieHeaders } from "@/lib/auth/set-cookie-forwarding";

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
    requestId: headersList.get("x-request-id") ?? headersList.get("cf-ray"),
    ipAddress: headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headersList.get("user-agent"),
  };
}

async function createBetterAuthActionRequest({
  body,
  method,
  origin,
  path,
}: {
  body?: unknown;
  method: "GET" | "POST";
  origin: string;
  path: string;
}) {
  const requestHeaders = new Headers(await headers());
  requestHeaders.set("origin", origin);
  if (body !== undefined) requestHeaders.set("content-type", "application/json");

  return new Request(`${origin}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function readResponseJson(response: Response) {
  try {
    return await response.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

function responseErrorMessage(response: Response, body: Record<string, unknown> | null) {
  const message = body?.message ?? body?.error;
  return typeof message === "string" && message.trim() ? message : response.statusText;
}

function buildOAuthErrorCallbackUrl(origin: string, next: string) {
  const url = new URL(LOGIN_PATH, origin);
  url.searchParams.set("next", next);
  return url.toString();
}

async function createBetterAuthForAction(origin: string) {
  const { createCloudflareBetterAuthForRequest } = await import("@/lib/auth/cloudflare-better-auth-runtime");
  const request = await createBetterAuthActionRequest({
    method: "GET",
    origin,
    path: "/api/auth/get-session",
  });
  return createCloudflareBetterAuthForRequest(request);
}

async function clearBetterAuthSessionCookies() {
  const cookieStore = await cookies();
  const options = { maxAge: 0, path: "/" };
  cookieStore.set("better-auth.session_token", "", options);
  cookieStore.set("__Secure-better-auth.session_token", "", options);
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
  const auth = await createBetterAuthForAction(origin);
  if (!auth) {
    redirect(
      buildLoginRedirectUrl({
        origin,
        code: "auth_request_failed",
        next,
      }).toString(),
    );
  }

  const callbackURL = resolvePostAuthDestination(next);
  const signInResponse = await auth.handler(await createBetterAuthActionRequest({
    method: "POST",
    origin,
    path: "/api/auth/sign-in/magic-link",
    body: {
      email,
      callbackURL,
      errorCallbackURL: buildLoginRedirectUrl({ origin, code: "callback_exchange_failed", next }).toString(),
    },
  }));
  const signInBody = await readResponseJson(signInResponse);

  if (!signInResponse.ok) {
    redirect(
      buildLoginRedirectUrl({
        origin,
        code: mapAuthErrorToCode({
          fallbackCode: "auth_request_failed",
          rawError: responseErrorMessage(signInResponse, signInBody),
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
      method: "better_auth_magic_link",
      redirect_to: `${origin}/api/auth/magic-link/verify`,
      safe_next: next,
    },
  });

  redirect(`${LOGIN_PATH}?sent=1&next=${encodeURIComponent(next)}`);
}

export async function signInWithGoogle(formData: FormData) {
  const next = sanitizeNextPath(formData.get("next"));
  const request = await getRequestMetadata();
  const origin = request.origin;
  const auth = await createBetterAuthForAction(origin);
  if (!auth) {
    redirect(
      buildLoginRedirectUrl({
        origin,
        code: "google_request_failed",
        next,
      }).toString(),
    );
  }

  const signInResponse = await auth.handler(await createBetterAuthActionRequest({
    method: "POST",
    origin,
    path: "/api/auth/sign-in/social",
    body: {
      provider: "google",
      callbackURL: resolvePostAuthDestination(next),
      errorCallbackURL: buildOAuthErrorCallbackUrl(origin, next),
      requestSignUp: true,
    },
  }));
  const signInBody = await readResponseJson(signInResponse);
  const redirectUrl = typeof signInBody?.url === "string" ? signInBody.url : null;

  if (!signInResponse.ok || !redirectUrl) {
    redirect(
      buildLoginRedirectUrl({
        origin,
        code: mapAuthErrorToCode({
          fallbackCode: "google_request_failed",
          rawError: responseErrorMessage(signInResponse, signInBody),
        }),
        next,
      }).toString(),
    );
  }
  await clearBetterAuthOAuthStateCookies(origin);
  await forwardSetCookieHeaders(signInResponse.headers);

  await recordAccountSecurityEvent({
    eventType: "auth_google_started",
    requestId: request.requestId,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
    metadata: {
      provider: "better_auth_google",
      redirect_to: `${origin}/api/auth/callback/google`,
      safe_next: next,
    },
  });

  redirect(redirectUrl);
}

export async function signOut() {
  await requireAuth();
  const request = await getRequestMetadata();
  const auth = await createBetterAuthForAction(request.origin);
  if (auth) {
    await auth.handler(await createBetterAuthActionRequest({
      method: "POST",
      origin: request.origin,
      path: "/api/auth/sign-out",
    }));
  }
  await clearBetterAuthSessionCookies();
  redirect("/login");
}
