# 08 — Security, Privacy, and Threat Model

> ⚠️ **This document corrects a P0 error in the original pack.** The first-draft plan (and its SEC-1 / Phase 2 Option A) wrongly described the workshop layout as a "backstop" behind middleware. That is **factually wrong and unsafe**. Verified against current source: **the workshop layout is the sole production auth+terms verifier.** Any Phase 2 change that Suspense-defers or pre-renders content before the gate completes would expose workshop content to unauthenticated or terms-pending users.

## Corrected auth/terms gate mechanics (verified from source)

| Claim | Evidence |
|---|---|
| The protected-route gate requires BOTH `x-archestimator-auth-verified` AND `x-archestimator-terms-accepted` headers | `src/lib/auth/protected-route-gate.ts:30-36` |
| Those gate headers are set **ONLY** in the dev-auth-bypass branch | `src/lib/auth/request-proxy.ts:183-197` (line 195 sets `{authVerified:true,termsAccepted:true}`), **never** on the prod path |
| In production, an authenticated protected request sets **no gate headers** | `request-proxy.ts:243-248` — `hasBetterAuthCookie && isProtected` → `createRequestPathResponse(request)` with no headers |
| Therefore `isProtectedRouteGateSatisfied()` returns **false on every production `/workshop/*` request** | gate requires headers that are never present in prod |
| Therefore `workshop/layout.tsx` always falls through to `getCurrentUserContext()` (real session verify) + `getCurrentUserTermsAcceptanceStatus()` | `src/app/workshop/layout.tsx:23-37` |
| Middleware does **zero terms verification** in production; its session check is cookie-*presence* only (`hasBetterAuthSessionCookie`), not session validity | `request-proxy.ts:227-235` |

**Conclusion: In production, `workshop/layout.tsx` IS the auth+terms verifier — not a backstop.** This is the load-bearing security fact for the entire plan.

## Assets, actors, entry points, trust boundaries

- **Assets:** workshop pages (estimates, projects, library, proposals, publisher, settings) and the user/workspace data they render; the sidebar favorites/notifications data; the terms-gated surface.
- **Actors:** authenticated+terms-accepted user (authorized); authenticated terms-pending user (must be redirected to terms); unauthenticated user (must redirect to `/login`); an attacker probing direct URLs / replaying cookies / tampering with the layout gate.
- **Entry points:** any `/workshop/*` URL (client nav, direct URL, refresh, back/forward via bfcache); Server Actions / Route Handlers invoked from workshop pages (out of scope to change).
- **Trust boundaries:** (1) edge/middleware (cookie-presence fast-path + login redirect); (2) RSC layout (the real session + terms verification); (3) client (must NEVER receive workshop content without the layout gate having passed).

## Threat model for the proposed change

| ID | Threat | Scenario | Current control | Post-change risk | Required mitigation |
|---|---|---|---|---|---|
| SEC-T1 | **Pre-render content exposure to unauthenticated user** | Phase 2 "render shell first, gate later" or Suspense-defer `getCurrentUserContext()` → an RSC payload or HTML chunk for workshop content is produced before the gate decision completes | Today: gate runs synchronously in layout BEFORE `return children` (line 23-37) — no content can render until verified | If the gate is deferred, content (or even the chrome that wraps it) could stream to an unauth user | **The gate decision (`getCurrentUserContext` + terms check) MUST complete and must `redirect()` BEFORE any workshop content/chrome renders.** Chrome rendering may be added to the layout ONLY after the gate has passed — gate logic stays first, chrome follows. |
| SEC-T2 | **Terms-pending user sees workshop content** | Same deferral, terms branch | Today: `redirect(buildTermsAcceptanceRedirectPath(...))` at `layout.tsx:35-37` before `return children` | Same as SEC-T1 | Same: terms check stays synchronous and before chrome/children |
| SEC-T3 | **Cookie-presence bypass** | Attacker has a malformed/expired cookie; middleware fast-paths through; layout gate must still catch it | Layout calls `getCurrentUserContext()` which does real session validation | Unchanged if gate stays first | **Do not weaken** `getCurrentUserContext` placement. Document that middleware is a latency optimization, not a security boundary. |
| SEC-T4 | **Sidebar data leak via loading shell** | `StaticWorkshopLoadingShell` currently renders `MainSidebar` with empty favorites — no user data in the skeleton | Empty fallback is safe | Must remain empty in the content-only skeleton after Phase 1 | Phase 1: content skeletons must NOT embed server-fetched user data |
| SEC-T5 | **bfcache restore shows stale authenticated content after logout** | User logs out in another tab, back/forward restores a bfcached workshop page | `BfcacheHandler` + `RealtimeAuthBridge` reconcile session state on `pageshow` | Unchanged | Preserve `BfcacheHandler`/`RealtimeAuthBridge`; no change to their behavior (see 09) |

## Security requirement SEC-1 (corrected)

**Statement:** The auth+terms gate MUST remain the first synchronous operation in `workshop/layout.tsx`, executing its `redirect()` calls BEFORE any workshop chrome or content renders. The gate logic (lines 18-39) is the **sole production verifier** and MUST NOT be Suspense-deferred, moved behind chrome rendering, or demoted to a backstop. Moving chrome INTO the layout is permitted ONLY if it renders AFTER the existing gate decision returns `children` (i.e., gate-passes → wrap children in `<WorkshopShell>`).

**Consequence for Phase 2:** The original Phase 2 (RC-2 "unblock the layout") options A and B are **withdrawn as written** — they are unsafe. RC-2 (the blocking behavior from uncached `headers()`/DB reads) is reclassified: it is **acceptable and intentional** because those reads ARE the security gate. The latency they impose is the cost of correct auth. See `11_IMPLEMENTATION_PLAN.md` Phase 2 (rewritten).

**Acceptance criteria (objective, testable):**
1. Unauthenticated GET `/workshop/proposals` (no cookie) → 307/redirect to `/login?next=/workshop/proposals`; **no workshop HTML/content** in response body. (denial test)
2. Terms-pending authenticated GET `/workshop/proposals` → redirect to terms route; no workshop content. (denial test)
3. Code inspection: in `workshop/layout.tsx`, every `redirect()` call precedes any `<WorkshopShell>`/JSX render; no `await` for chrome precedes the gate reads. (static gate)
4. Dev-auth-bypass still passes the gate via headers (unchanged). (denial test)

## Privacy
- No PII change. Content skeletons must remain data-free (SEC-T4).
- No logging change. Existing redaction rules unchanged.
- Out of scope: data retention/export/delete (no data model touched).

## What is NOT in scope
- Changing the auth provider, session cookie mechanics, or `getCurrentUserContext` internals.
- Adding a real verified-session header at the edge (a possible future hardening, but not required for this fix and out of scope).
- Middleware logic changes (`request-proxy.ts`).

## Credential material taxonomy
Not applicable: this plan does not create, rotate, or expose any credential material (no tokens, shares, invites, sessions introduced). The gate consumes the existing Better Auth session via `getCurrentUserContext()`, unchanged.
