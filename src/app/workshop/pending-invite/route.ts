import { NextResponse, type NextRequest } from "next/server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { checkInviteAcceptTokenHashRateLimit } from "@/lib/collaboration/invite-entry";
import { isAllowedInviteOrigin } from "@/lib/collaboration/invite-origin";
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

function escapeHtmlAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function createPendingInviteConfirmationHtml() {
  const action = escapeHtmlAttribute("/workshop/pending-invite");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Accept invitation</title>
  </head>
  <body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;background:#f7f7f5;color:#1f1f1d;">
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px;">
      <section aria-live="polite" style="width:min(420px,100%);border:1px solid #dfddd6;background:#fff;padding:16px;">
        <p style="margin:0;font-size:12px;font-weight:500;line-height:16px;">Join shared work</p>
        <p style="margin:4px 0 0;font-size:10px;line-height:16px;color:#6f6c63;">Confirm before access is added to your account.</p>
        <form method="post" action="${action}" style="margin-top:12px;">
          <button type="submit" style="border:1px solid #1f1f1d;background:#1f1f1d;color:#fff;padding:7px 10px;font:inherit;font-size:10px;cursor:pointer;">Accept invite</button>
        </form>
      </section>
    </main>
  </body>
</html>`;
}

export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get(PENDING_INVITE_COOKIE)?.value ?? null;
  const bridge = readPendingInviteBridge(cookieValue);
  if (!bridge) {
    const response = NextResponse.redirect(createWorkshopRedirect(request, { kind: "unavailable", reason: "invalid" }));
    clearPendingInviteCookie(response);
    return response;
  }

  return new NextResponse(createPendingInviteConfirmationHtml(), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isAllowedInviteOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const cookieValue = request.cookies.get(PENDING_INVITE_COOKIE)?.value ?? null;
  const bridge = readPendingInviteBridge(cookieValue);
  if (!bridge) {
    const response = NextResponse.redirect(createWorkshopRedirect(request, { kind: "unavailable", reason: "invalid" }));
    clearPendingInviteCookie(response);
    return response;
  }

  const currentUser = await requireCurrentUserContext();
  const rateLimit = await checkInviteAcceptTokenHashRateLimit({
    invitationTokenHash: bridge.tokenHash,
    request,
    userId: currentUser.userId,
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

  const banner = await acceptPendingInviteBridge(bridge, currentUser);
  const response = NextResponse.redirect(createWorkshopRedirect(request, banner));
  if (banner.kind !== "wrong-account") clearPendingInviteCookie(response);
  return response;
}
