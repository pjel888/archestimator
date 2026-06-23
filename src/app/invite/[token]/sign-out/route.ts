import { NextResponse } from "next/server";

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

export async function POST(request: Request, { params }: InviteRouteContext) {
  return signOutAndReturn(request, { params });
}

async function signOutAndReturn(request: Request, { params }: InviteRouteContext) {
  const { token } = await params;
  const rawToken = decodeInviteRouteToken(token);
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL(`/invite/${encodeURIComponent(rawToken)}`, request.url));
}
