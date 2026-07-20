# Unit 009 — Closed-Beta Gate Not In Middleware (WEAKENED → LATENT/LOW)

**Finding:** F-09 · **Original severity:** HIGH · **Re-verdict (2026-07-19):** **WEAKENED → LATENT** · **Status:** TODO (P4)

> **Re-verification:** Closed beta is **currently OFF** — `.env.local:17` and `.env.example:54`
> both set `CLOSED_BETA_ACCESS_ENABLED=false`; `isClosedBetaAccessEnabled` is a strict `=== "true"`
> check, and when disabled `getClosedBetaAccessForEmail` returns `{allowed:true, status:"disabled"}`.
> So even routes calling `getCurrentUserContext` wouldn't block today. The middleware cookie-check
> "bypass" is dormant. The code-level concern (beta runs only inside `getCurrentUserContext`, not
> middleware) is real and would bite the day beta is flipped on, but it is **not a live bypass
> now.** Priority dropped to P4/hardening. Recommend fixing it **before** re-enabling closed beta.

**Finding:** F-09 · **Severity:** HIGH · **Priority:** P2 · **Effort:** M · **Risk:** MED
**Requirement:** `REQ-009` · **Status:** TODO · **Depends on:** — · **Test:** NOT_REQUIRED

## Problem

The middleware treats any request carrying a `better-auth.session_token` cookie as
authenticated for `/workshop` / `/admin` and lets it through **without checking
closed-beta status**. The beta gate runs later inside `getCurrentUserContext()`,
which redirects on denial. Every API route that does **not** call
`requireCurrentUserContext()` / `getCurrentUserContext()` therefore skips the
closed-beta check entirely. A signed-in user whose beta access was just revoked can
still hit any workshop API route that authenticates via a different path, and any
future route whose author assumes "middleware already gated beta" silently bypasses
it.

## Evidence

`src/lib/auth/request-proxy.ts:227-249` (the middleware path):
```ts
const hasBetterAuthCookie = hasBetterAuthSessionCookie(request);
if (isProtected && !hasBetterAuthCookie) { /* redirect to login */ }

if (hasBetterAuthCookie && isProtected) {
  // ... createRequestPathResponse(request);  ← no beta check
}
```

`grep` confirms `isClosedBetaAccessEnabled` / `getClosedBetaAccessForEmail` are
**never referenced from `request-proxy.ts`**. The beta check lives only in
`src/lib/auth/session.ts:65-73` inside `getCurrentUserContext`.

## Fix Direction (per `DEC-004` — centralize, don't scatter)

Pick one central chokepoint so forgetting it cannot bypass the gate:

**Option A (recommended) — enforce in middleware via a lightweight D1 lookup:**
- After the `hasBetterAuthCookie && isProtected` check, resolve the session email
  and run `getClosedBetaAccessForEmail`. If beta is enabled and the user is not
  `allowed`, redirect to `/access-required` (or the existing denial destination).
- This makes the gate unavoidable for every matched route.
- Keep the `getCurrentUserContext` check as defense-in-depth, but the middleware
  becomes the authoritative gate.

**Option B — single shared handler wrapper:**
- Export a `withClosedBetaGate(handler)` wrapper that every workshop/admin route
  handler must use. Less safe than A (relies on discipline) but cheaper if the D1
  lookup in middleware is a perf concern.

Prefer A unless the per-request D1 lookup is measurably expensive; the lookup is
already cached (`closed-beta-d1-store`).

### Owned paths
- `src/lib/auth/request-proxy.ts`
- `src/lib/auth/closed-beta-access.ts`, `closed-beta-d1-store.ts` (read context)
- `src/lib/auth/session.ts` (defense-in-depth, keep)

### Prohibited
- Do not remove the `getCurrentUserContext` beta check (keep as defense-in-depth).
- Do not add beta flags to the client/cookie; the server D1 row is the truth.
- Do not gate public routes (landing, share, client-portal, login).

## Acceptance Evidence

- `AC-001`: a request with a valid session cookie but a revoked beta row is
  redirected/denied at the middleware (option A) or every workshop handler is
  wrapped (option B).
- `AC-002`: an active-beta user is unaffected.

## Recovery

If the middleware D1 lookup causes measurable latency, fall back to Option B
(wrapper) and cache the beta row per request via `getCurrentUserContext`.

## Notes

This unit should land **before** 015/016/017 (invite hardening) so the auth
surface is stable when those ship.
