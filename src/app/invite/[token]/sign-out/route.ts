import { NextResponse } from "next/server";

import { isAllowedInviteOrigin } from "@/lib/collaboration/invite-origin";
import { createCloudflareBetterAuthForRequest } from "@/lib/auth/cloudflare-better-auth-runtime";

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

export async function POST(request: Request, { params }: InviteRouteContext) {
  return signOutAndReturn(request, { params });
}

async function signOutAndReturn(request: Request, { params }: InviteRouteContext) {
  const { token } = await params;
  const rawToken = decodeInviteRouteToken(token);
  if (!isAllowedInviteOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const signOutRequestHeaders = new Headers(request.headers);
  signOutRequestHeaders.set("origin", new URL(request.url).origin);
  const signOutRequest = new Request(new URL("/api/auth/sign-out", request.url), {
    method: "POST",
    headers: signOutRequestHeaders,
  });
  const auth = await createCloudflareBetterAuthForRequest(signOutRequest);
  if (auth) await auth.handler(signOutRequest);

  const response = NextResponse.redirect(new URL(`/invite/${encodeURIComponent(rawToken)}`, request.url));
  response.cookies.set("better-auth.session_token", "", { maxAge: 0, path: "/" });
  response.cookies.set("__Secure-better-auth.session_token", "", { maxAge: 0, path: "/" });
  return response;
}
