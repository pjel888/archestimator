# 05 — UX, UI, and Accessibility Plan

## Scope note

This plan is an **auth security hardening** pack. It makes **minimal UI changes**:
the auth flows (Google OAuth, magic link) and the login page are **unchanged in
behavior**. The only user-visible effects are:

1. **Phase 1 (SEC-1):** Transparent to users — magic-link tokens are hashed at
   rest; the email, link, and sign-in experience are identical.
2. **Phase 3 (SEC-5):** If a user exceeds the rate limit, they see a "too many
   attempts, try again later" message. Existing rate-limit UI patterns apply.
3. **Phase 4 (SEC-6):** Enforced CSP has no user-visible effect unless it blocks
   a script (which the canary catches pre-rollout).

Therefore this document focuses on **preserving** the existing UX/a11y of the
auth flows, not designing new ones.

## Primary user journeys (unchanged — must be preserved)

### Journey 1: Anonymous → authenticated via magic link
1. User lands on `/` (public landing page).
2. Clicks "Sign in" → `/login`.
3. Enters email → magic-link Server Action → email sent.
4. Clicks link in email → `/api/auth/magic-link/verify` → session cookie set.
5. Redirected to `/workshop` (or `?next=` destination).
6. If closed-beta not allowed → `/access-required`.
7. If terms not accepted → `/workshop/terms`.

**States to preserve:** loading (sending email), success (email sent toast),
error (email failed), rate-limited (phase 3), closed-beta-denied, terms-required.

### Journey 2: Anonymous → authenticated via Google OAuth
1. User on `/login` clicks "Sign in with Google".
2. Google consent screen → callback → session → `/workshop`.

**States to preserve:** redirect to Google, state-mismatch cleanup → clean login
(`Clear-Site-Data`), closed-beta-denied.

### Journey 3: Authenticated user navigates to protected page
- Middleware allows (cookie present) → workshop layout re-checks session → renders.

## Accessibility considerations (unchanged — verify preserved)

| Concern | Current state | Plan impact |
|---|---|---|
| Login form keyboard operability | `<form action={serverAction}>` — native form semantics | None (unchanged) |
| Focus management on redirect | Next.js redirect handles focus | None |
| Screen-reader announcements | Toast/error regions on login | None (phase 3 rate-limit message must be announced — verify existing toast is aria-live) |
| Color contrast | Existing login UI | None |
| Reduced motion | n/a (no auth animations) | None |

**Phase 3 note:** when implementing the rate-limit message, ensure it uses the
existing toast/aria-live pattern so screen readers announce it. This is a minor
implementation detail, not a design change.

## UX regressions to watch

- **Phase 1:** None expected (transparent). Verify magic-link email still renders
  correctly (HTML escaping unchanged).
- **Phase 3:** Rate limit must not lock out legitimate users during normal use.
  Thresholds (10/min for magic-link) should be generous for single-user flows;
  monitor post-deploy.
- **Phase 4:** CSP must not break the login page or workshop. Canary-gated.

## Design-system reuse

- No new UI primitives needed.
- Rate-limit error reuses existing toast/error UI.
- No `DESIGN.md` conflict (auth UI is alpha-stage but untouched).

## Conclusion

UX/a11y impact is minimal by design — this is a security hardening pack that
preserves existing auth UX. The only actionable item is ensuring phase 3's
rate-limit message is accessible (existing toast pattern).
