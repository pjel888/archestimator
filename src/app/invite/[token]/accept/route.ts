import { NextResponse } from "next/server";

import {
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

function redirectToPath(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(request: Request, { params }: InviteRouteContext) {
  return acceptInvite(request, { params });
}

export async function GET(request: Request, { params }: InviteRouteContext) {
  return acceptInvite(request, { params });
}

async function acceptInvite(request: Request, { params }: InviteRouteContext) {
  const { token } = await params;
  const rawToken = decodeInviteRouteToken(token);
  const config = readInviteEntryConfig();
  if (!config.enabled) return redirectToPath(request, "/workshop");

  const supabase = await createSupabaseServerClient();
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

  if (projectId && estimateId) return redirectToPath(request, `/workshop/projects/${projectId}/estimates/${estimateId}`);
  if (projectId) return redirectToPath(request, `/workshop/projects/${projectId}`);
  return redirectToPath(request, "/workshop");
}
