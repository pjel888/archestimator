import { NextResponse } from "next/server";

import {
  checkInviteAcceptRateLimit,
  hashInviteToken,
  readInviteEntryConfig,
} from "@/lib/collaboration/invite-entry";
import { isAllowedInviteOrigin } from "@/lib/collaboration/invite-origin";
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
