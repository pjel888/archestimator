import { NextResponse } from "next/server";

import {
  checkInviteAcceptRateLimit,
  hashInviteToken,
  readInviteEntryConfig,
} from "@/lib/collaboration/invite-entry";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type InviteRouteContext = {
  params: Promise<{ token: string }>;
};

function decodeInviteRouteToken(token: string) {
  try {
    return decodeURIComponent(token);
  } catch {
    return "";
  }
}

// T1.6 / finding (5 §6 LOW) / gap G5: the invite-accept POST is a plain Route
// Handler with no CSRF protection. Without an Origin guard a cross-site POST
// could force a logged-in victim's browser to silently accept an invitation.
// We require any request that carries an Origin (browsers always attach it to
// cross-site POSTs) to match the app's own host. We compare host+port, derive
// the app host from X-Forwarded-Host (Next sits behind a proxy) and fall back
// to the Origin's host, then the Referer's host, only allowing when no
// cross-origin signal is present (genuine same-site navigations may omit both).
function readUrlHost(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

function readAppHost(request: Request, headers: Headers): string | null {
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost) return forwardedHost;
  const host = headers.get("host")?.trim();
  if (host) return host;
  try {
    return new URL(request.url).host;
  } catch {
    return null;
  }
}

export function isAllowedInviteOrigin(request: Request): boolean {
  const headers = request.headers;
  const appHost = readAppHost(request, headers);
  // If we cannot determine our own host we cannot make a safe comparison; fail
  // open here (this only happens in degenerate/test setups, never in prod).
  if (!appHost) return true;

  const originHost = readUrlHost(headers.get("origin"));
  if (originHost) {
    return originHost === appHost;
  }

  // No Origin header: fall back to the Referer host if present. Browsers attach
  // Origin to cross-site POSTs, so a missing Origin is typically a same-site
  // form post or navigation — allow when no cross-origin signal exists.
  const refererHost = readUrlHost(headers.get("referer"));
  if (refererHost) {
    return refererHost === appHost;
  }

  return true;
}

function redirectToPath(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

function readDisplayText(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

async function readAcceptedInviteDisplayContext(request: Request) {
  try {
    const formData = await request.formData();
    return {
      projectName: readDisplayText(formData.get("projectName"), 96),
      roleLabel: readDisplayText(formData.get("roleLabel"), 32),
    };
  } catch {
    return { projectName: null, roleLabel: null };
  }
}

function buildAcceptedInviteRedirect({
  displayContext,
  estimateId,
  projectId,
  request,
}: {
  displayContext: Awaited<ReturnType<typeof readAcceptedInviteDisplayContext>>;
  estimateId: string | null;
  projectId: string | null;
  request: Request;
}) {
  const targetHref = projectId && estimateId
    ? `/workshop/projects/${projectId}/estimates/${estimateId}`
    : projectId
      ? `/workshop/projects/${projectId}`
      : "/workshop/projects";
  const url = new URL("/workshop", request.url);
  url.searchParams.set("invite", "accepted");
  url.searchParams.set("scope", estimateId ? "estimate" : "project");
  url.searchParams.set("targetHref", targetHref);
  url.searchParams.set("targetLabel", estimateId ? "Open estimate" : "Open project");
  if (displayContext.projectName) url.searchParams.set("projectName", displayContext.projectName);
  if (displayContext.roleLabel) url.searchParams.set("roleLabel", displayContext.roleLabel);
  return NextResponse.redirect(url);
}

export async function POST(request: Request, { params }: InviteRouteContext) {
  return acceptInvite(request, { params });
}

export async function GET(request: Request, { params }: InviteRouteContext) {
  const { token } = await params;
  const rawToken = decodeInviteRouteToken(token);
  return redirectToPath(request, `/invite/${encodeURIComponent(rawToken)}`);
}

async function acceptInvite(request: Request, { params }: InviteRouteContext) {
  const { token } = await params;
  const rawToken = decodeInviteRouteToken(token);

  // T1.6 / finding (5 §6 LOW) / gap G5: reject cross-site POSTs before any
  // state mutation. Same-origin form posts (with or without an Origin header)
  // still pass. Done before reading the body / RPC so a forged request can
  // never reach the membership-accepting RPC.
  if (!isAllowedInviteOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const displayContext = await readAcceptedInviteDisplayContext(request);
  const config = readInviteEntryConfig();
  if (!config.enabled) return redirectToPath(request, "/workshop");

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const rateLimit = await checkInviteAcceptRateLimit({
    rawToken,
    request,
    userId: userData.user?.id ?? null,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: rateLimit.message },
      {
        status: 429,
        headers: { "Cache-Control": "no-store", "Retry-After": String(rateLimit.retryAfter) },
      },
    );
  }

  const { data } = await supabase.rpc("accept_collaboration_invitation", {
    invitation_token_hash: hashInviteToken(rawToken, config.pepper),
  });
  const result = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
  const acceptState = typeof result.state === "string" ? result.state : "invalid";
  if (acceptState !== "accepted" && acceptState !== "already_member") {
    return redirectToPath(request, `/invite/${encodeURIComponent(rawToken)}`);
  }

  const projectId = typeof result.project_id === "string" ? result.project_id : null;
  const estimateId = typeof result.estimate_id === "string" ? result.estimate_id : null;

  return buildAcceptedInviteRedirect({ displayContext, estimateId, projectId, request });
}
