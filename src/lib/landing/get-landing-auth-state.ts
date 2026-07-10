import { cookies } from "next/headers";

import { hasBetterAuthSessionCookie } from "@/lib/landing/landing-auth-session-cookie";

export {
  BETTER_AUTH_SESSION_COOKIE_PATTERN,
  LANDING_AUTH_HINT_PATH,
  hasBetterAuthSessionCookie,
} from "@/lib/landing/landing-auth-session-cookie";

// Display-only hint for public marketing pages: an existing Better Auth session
// cookie toggles CTA copy ("Open workshop" vs "Sign in"). Protected routes still
// run their own fail-closed server-side validation before granting access.
export async function getLandingAuthState() {
  try {
    const cookieStore = await cookies();
    return hasBetterAuthSessionCookie(cookieStore.getAll());
  } catch {
    return false;
  }
}
