import { cookies } from "next/headers";

// Display-only hint for public marketing pages: an existing Better Auth session
// cookie toggles CTA copy ("Open workshop" vs "Sign in"). Protected routes still
// run their own fail-closed server-side validation before granting access.
const BETTER_AUTH_SESSION_COOKIE_PATTERN = /^(__Secure-)?better-auth\.session_token$/;

export async function getLandingAuthState() {
  try {
    const cookieStore = await cookies();
    return cookieStore.getAll().some((cookie) => BETTER_AUTH_SESSION_COOKIE_PATTERN.test(cookie.name) && Boolean(cookie.value));
  } catch {
    return false;
  }
}
