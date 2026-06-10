import { cookies } from "next/headers";

// Display-only hint for public marketing pages: an existing Supabase auth
// cookie toggles CTA copy ("Open workshop" vs "Sign in"). It deliberately
// performs no Supabase auth round-trip — a stale cookie only changes copy,
// and protected routes still run their own fail-closed server-side user
// validation before granting access.
const SUPABASE_AUTH_COOKIE_PATTERN = /^sb-.+-auth-token/;

export async function getLandingAuthState() {
  try {
    const cookieStore = await cookies();
    return cookieStore.getAll().some((cookie) => SUPABASE_AUTH_COOKIE_PATTERN.test(cookie.name) && Boolean(cookie.value));
  } catch {
    return false;
  }
}
