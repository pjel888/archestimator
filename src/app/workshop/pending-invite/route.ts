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

function escapeHtmlAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function createPendingInviteProgressHtml(targetUrl: URL) {
  const targetPath = `${targetUrl.pathname}${targetUrl.search}`;
  const targetScriptValue = JSON.stringify(targetPath).replaceAll("<", "\\u003c");
  const targetAttributeValue = escapeHtmlAttribute(targetPath);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="0;url=${targetAttributeValue}" />
    <title>Accepting invite</title>
    <script>window.location.replace(${targetScriptValue});</script>
  </head>
  <body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;background:#f7f7f5;color:#1f1f1d;">
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px;">
      <section aria-live="polite" style="width:min(420px,100%);border:1px solid #dfddd6;background:#fff;padding:16px;">
        <p style="margin:0;font-size:12px;font-weight:500;line-height:16px;">Accepting invite</p>
        <p style="margin:4px 0 0;font-size:10px;line-height:16px;color:#6f6c63;">Setting up shared access...</p>
        <p style="margin:12px 0 0;font-size:10px;line-height:16px;"><a href="${targetAttributeValue}" style="color:#1f1f1d;">Continue to Workshop</a></p>
      </section>
    </main>
  </body>
</html>`;
}

export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get(PENDING_INVITE_COOKIE)?.value ?? null;
  const bridge = readPendingInviteBridge(cookieValue);
  const banner = bridge
    ? await acceptPendingInviteBridge(bridge)
    : { kind: "unavailable" as const, reason: "invalid" as const };

  const response = new NextResponse(createPendingInviteProgressHtml(createWorkshopRedirect(request, banner)), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
    },
  });
  if (banner.kind !== "wrong-account") clearPendingInviteCookie(response);
  return response;
}
