import { NextResponse } from "next/server";

import { LOGIN_PATH } from "@/lib/auth/redirects";
import {
  checkInviteContinueRateLimit,
} from "@/lib/collaboration/invite-entry";
import {
  PENDING_INVITE_COOKIE,
  PENDING_INVITE_MAX_AGE_SECONDS,
  createPendingInviteBridge,
} from "@/lib/collaboration/pending-invite";

type InviteRouteContext = {
  params: Promise<{ token: string }>;
};

const PENDING_INVITE_ACCEPT_PATH = "/workshop/pending-invite";

function decodeInviteRouteToken(token: string) {
  try {
    return decodeURIComponent(token);
  } catch {
    return "";
  }
}

function redirectToInvite(request: Request, rawToken: string) {
  return NextResponse.redirect(new URL(`/invite/${encodeURIComponent(rawToken)}`, request.url));
}

export async function POST(request: Request, { params }: InviteRouteContext) {
  return continueToAuth(request, { params });
}

export async function GET(request: Request, { params }: InviteRouteContext) {
  return continueToAuth(request, { params });
}

async function continueToAuth(request: Request, { params }: InviteRouteContext) {
  const { token } = await params;
  const rawToken = decodeInviteRouteToken(token);

  const rateLimit = await checkInviteContinueRateLimit({ rawToken, request });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: rateLimit.message },
      {
        status: 429,
        headers: { "Cache-Control": "no-store", "Retry-After": String(rateLimit.retryAfter) },
      },
    );
  }

  let bridge: ReturnType<typeof createPendingInviteBridge>;
  try {
    bridge = createPendingInviteBridge(rawToken);
  } catch {
    return redirectToInvite(request, rawToken);
  }

  const response = NextResponse.redirect(
    new URL(`${LOGIN_PATH}?next=${encodeURIComponent(PENDING_INVITE_ACCEPT_PATH)}`, request.url),
  );
  response.cookies.set(PENDING_INVITE_COOKIE, bridge.cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: PENDING_INVITE_MAX_AGE_SECONDS,
    path: "/",
  });
  return response;
}
