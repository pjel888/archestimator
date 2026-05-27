import { NextResponse, type NextRequest } from "next/server";

import {
  PENDING_INVITE_COOKIE,
  readPendingInviteBridge,
} from "@/lib/collaboration/pending-invite";
import { acceptPendingInviteBridge, type WorkshopInviteBannerState } from "@/lib/collaboration/workshop-pending-invite";

function clearPendingInviteCookie(response: NextResponse) {
  response.cookies.set(PENDING_INVITE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

function createWorkshopRedirect(request: NextRequest, banner: WorkshopInviteBannerState) {
  const url = new URL("/workshop", request.url);
  if (banner.kind === "accepted") {
    url.searchParams.set("invite", "accepted");
    url.searchParams.set("scope", banner.scope);
    url.searchParams.set("targetHref", banner.targetHref);
    url.searchParams.set("targetLabel", banner.targetLabel);
  } else if (banner.kind === "wrong-account") {
    url.searchParams.set("invite", "wrong-account");
    if (banner.invitedEmail) url.searchParams.set("email", banner.invitedEmail);
  } else if (banner.kind === "unavailable") {
    url.searchParams.set("invite", "unavailable");
    url.searchParams.set("reason", banner.reason);
  }
  return url;
}

export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get(PENDING_INVITE_COOKIE)?.value ?? null;
  const bridge = readPendingInviteBridge(cookieValue);
  const banner = bridge
    ? await acceptPendingInviteBridge(bridge)
    : { kind: "unavailable" as const, reason: "invalid" as const };

  const response = NextResponse.redirect(createWorkshopRedirect(request, banner));
  if (banner.kind !== "wrong-account") clearPendingInviteCookie(response);
  return response;
}
