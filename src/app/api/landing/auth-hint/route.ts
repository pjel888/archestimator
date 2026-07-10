import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { hasBetterAuthSessionCookie } from "@/lib/landing/landing-auth-session-cookie";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
} as const;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const isLoggedIn = hasBetterAuthSessionCookie(cookieStore.getAll());
    return NextResponse.json({ isLoggedIn }, { headers: NO_STORE_HEADERS });
  } catch {
    // Fail closed: missing request scope or cookie access → logged-out CTA.
    return NextResponse.json({ isLoggedIn: false }, { headers: NO_STORE_HEADERS });
  }
}
