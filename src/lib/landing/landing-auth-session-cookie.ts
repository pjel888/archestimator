// Display-only Better Auth session cookie presence helpers for public marketing
// CTAs. Protected routes still run fail-closed server-side session validation.

export const LANDING_AUTH_HINT_PATH = "/api/landing/auth-hint";

export const BETTER_AUTH_SESSION_COOKIE_PATTERN = /^(__Secure-)?better-auth\.session_token$/;

export type LandingAuthCookie = {
  name: string;
  value: string;
};

export function hasBetterAuthSessionCookie(cookies: readonly LandingAuthCookie[]): boolean {
  return cookies.some(
    (cookie) => BETTER_AUTH_SESSION_COOKIE_PATTERN.test(cookie.name) && Boolean(cookie.value),
  );
}
