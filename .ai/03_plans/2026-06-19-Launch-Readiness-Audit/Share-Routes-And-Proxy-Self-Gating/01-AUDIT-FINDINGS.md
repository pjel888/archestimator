# 01 — Audit Findings: Share Routes & Proxy /api Self-Gating

Phase-2 gap pack. Files read deeply (full): all 8 `/api/share/[token]/*` routes, all 8 other
`/api/**/route.ts`, `src/proxy.ts`, `src/lib/publication/security.ts`,
`src/lib/publication/public-repository.ts` (share/rate-limit/comment sections),
`src/lib/reusable-sources/actions.ts`, `src/lib/aec-classification/disciplines.ts`,
`src/components/share/SharePageComments.tsx`.

## Scope & coverage

- **Share routes (A):** all 4 critic-named routes evidenced individually, plus the other 4 share
  routes (`route.ts`, `decision`, `events`, `unsubscribe`) for completeness.
- **Proxy /api self-gating (B):** all 16 `/api/**/route.ts` enumerated; each classified
  authed-self-gate / public-with-own-guard. **No route lacks a guard.**
- **(C):** `reusable-sources` server actions all `requireCurrentUserContext()` + RLS-scoped
  clients; `aec-classification` is a pure static lookup table. No launch risk.

## Proxy /api self-gating enumeration (B)

`src/proxy.ts:56` short-circuits any path starting `/api` (also any path with `.` or `/_next`)
BEFORE the Supabase auth gate. `proxy.ts` is the Next 16 file-convention replacement for
`middleware.ts` (no import needed; state confirms hosted gating is live). So every API route
must self-gate:

| Route | Guard | Verdict |
|---|---|---|
| `api/health` | none — intentional liveness JSON, no data | PUBLIC OK |
| `api/webhooks/resend` | `RESEND_WEBHOOK_SECRET` + `verifyResendWebhookPayload` (svix sig) | OK |
| `api/ai/ask` | flag + `getAiRequestUserContext()`→`getUser()`; 403 if authMode!=supabase | OK |
| `api/ai/package-builder` | flag + `getUserContext()`; 403 if !supabase/!workspaceId | OK |
| `api/component-library/attachments` | `requireCurrentUserContext()` | OK |
| `api/component-library/images` | `requireCurrentUserContext()` | OK |
| `api/projects/images` | `getCurrentUserContext()` null→404; workspace match check | OK |
| `api/projects/.../export/proposal.xlsx` | `getCurrentUserContext()` null→401 (fail-closed) | OK |
| `api/share/[token]` (GET) | share token + password-cookie gate | PUBLIC-GUARDED OK |
| `api/share/[token]/password` | CSRF same-origin + durable + in-mem lockout | OK |
| `api/share/[token]/session` | same-origin + password gate + recipient-token verify | OK (see SHARE-PROXY-02) |
| `api/share/[token]/comment` | session cookie + CSRF + sanitize + rate-limit | OK |
| `api/share/[token]/activity` | same-origin + password gate + rate-limit | OK (see SHARE-PROXY-03) |
| `api/share/[token]/decision` | session cookie + CSRF + rate-limit | OK |
| `api/share/[token]/events` | CSRF same-origin + allow-listed eventType + rate-limit | OK |
| `api/share/[token]/unsubscribe` | GET interstitial only; POST same-origin + token | OK |

**Result: zero unguarded API routes. The proxy /api short-circuit is SAFE.** This is the
primary positive finding and the resolution of SEC-20260601-3P-003's residual concern.

## Reconciliation table

| Prior pack / finding | This pass |
|---|---|
| 2026-06-01-security-owasp 14-shared-link-publication-surface | covered-by — this pass re-evidences the 4 routes; no new exploit found beyond accepted design |
| 2026-06-01-security-owasp 11-api-security-owasp-api-top10 | covered-by — all API routes self-gate |
| 2026-06-01-security-owasp 03-authentication (SEC-20260601-3P-003 proxy /api bypass) | covered-by — short-circuit verified safe via per-route self-gating |
| API-Routes pack (deferred these 4 routes) | partial — this pack closes the deferred detail |
| Auth pack (proxy seam) | covered-by — proxy.ts is Next 16 convention, wiring verified |

## Findings

### SHARE-PROXY-01 — Proxy `/api/*` short-circuit is safe: every API route self-gates (POSITIVE)
- **Severity:** info · **launch_blocker:** false
- **Evidence:** `src/proxy.ts:56`; enumeration table above (all 16 routes).
- **Impact:** Closes the coverage-critic's central worry. No route relies on the (absent) proxy
  auth for `/api`. The two public-by-design routes (`health`, `webhooks/resend`) carry their own
  guard (no data / svix signature).
- **Recommendation:** Record as covered. Add a lightweight CI/test invariant (enumerate
  `api/**/route.ts`, assert each imports an auth/guard symbol) to prevent a future unguarded
  route regressing the short-circuit. Effort S.
- **existing_plan_overlap:** covered-by:2026-06-01-security-owasp/03-authentication

### SHARE-PROXY-02 — Share `session` route has no rate-limit on recipient-token verification
- **Severity:** low · **launch_blocker:** false
- **Evidence:** `src/app/api/share/[token]/session/route.ts:38-101` — no `check*RateLimit` call;
  `verifySharedLinkRecipientToken` (`public-repository.ts:751`) matches `recipient_token_hash`
  by HMAC-SHA256 equality. Recipient tokens are `createPublicationToken()` = 32 random bytes
  (256-bit), so guessing is computationally infeasible; the DB lookup is indexed/constant-shape.
- **Impact:** Unlike `password/comment/decision/activity`, `session` POST is uncapped. With
  256-bit tokens this is not a brute-force vector, but it is the only share-write route with no
  request cap (mild resource/abuse asymmetry, and inconsistent with the rest of the surface).
- **Recommendation:** Add a durable per-IP+token rate-limit (reuse `checkRecordedRateLimit`,
  e.g. 30/min) mirroring `activity`. Effort S. Not a launch blocker (entropy carries the
  security; this is hardening/consistency).
- **existing_plan_overlap:** partial:API-Routes (route was deferred)

### SHARE-PROXY-03 — Anonymous viewer reads other clients' public comment bodies via `activity` without a recipient session
- **Severity:** low · **launch_blocker:** false
- **Evidence:** `src/app/api/share/[token]/activity/route.ts:156-160` selects
  `is_internal=false` comments and returns them WITHOUT requiring a verified recipient session
  (only the password gate at :125-137 applies). By contrast the `comment` GET requires a valid
  recipient session (`comment/route.ts:158-168`). Responses/events are correctly recipient-scoped
  (:161-174). Author identity is reduced to display-name/"Client" (`activity-helpers` +
  `toPublicActivityViewModel`), `author_email` is never emitted, and the activity formatter
  redacts inline emails (`activity-formatters.ts:33,80`).
- **Impact:** Any party holding the share link (and password, if set) can read all non-internal
  comment bodies via `/activity`, even with no recipient session — a wider read surface than the
  `/comment` GET. This is the documented design ("public shared-link activity"; comments are
  "visible to the project team", per `SharePageComments.tsx` and current-state 2026-06-04/06-03
  notes): non-internal comments are intended as a shared public discussion. Risk is bounded
  because the link/password is the access control and internal comments are filtered.
- **Recommendation:** Owner decision: this is accepted design, but confirm it is intentional that
  a non-recipient link-holder can read client comment bodies. If undesired, gate `activity`
  comment inclusion behind a verified recipient session (mirroring `/comment` GET). Effort M.
  Not a launch blocker — matches prior owner-accepted design.
- **existing_plan_overlap:** covered-by:2026-06-01-security-owasp/14-shared-link-publication-surface

### SHARE-PROXY-04 — Stored-XSS in comment body is mitigated on both write and render (POSITIVE)
- **Severity:** info · **launch_blocker:** false
- **Evidence:** Write side strips `<script>/<style>`/all tags + decodes a fixed entity set and
  truncates to 1000 chars (`comment/route.ts:74-91`). Render side: `SharePageComments.tsx` shows
  the body as a React text node (auto-escaped); `rg dangerouslySetInnerHTML` over
  `src/components/share` + `src/app/share` = zero hits. Public comment load
  (`public-repository.ts:859-885`) does not emit `author_email`.
- **Impact:** No stored-XSS path found in the comment surface.
- **Recommendation:** None. Keep the no-`dangerouslySetInnerHTML` invariant on share components.
- **existing_plan_overlap:** none

### SHARE-PROXY-05 — Password lockout in-memory store is per-instance, but a DB-durable limit is the real backstop (POSITIVE / note)
- **Severity:** info · **launch_blocker:** false
- **Evidence:** `security.ts:512-589` is an in-memory Map (resets on serverless cold start /
  per-instance), but `password/route.ts:46-66` ALSO calls
  `checkProjectPublicationPasswordRateLimit` (durable, `security_rate_limit_events`, 5/15min per
  IP+token — `public-repository.ts:460-471`) and `recordProjectPublicationPasswordFailure`
  (durable). The effective failure cap is `Math.max(durable, in-mem)` (:88). Verify is scrypt +
  constant-time compare; passwords normalized NFC+trim before hash/verify (:121-159).
- **Impact:** Brute-force protection survives serverless restarts via the durable layer; the
  in-memory layer is a complementary fast-path, not the sole control. No gap.
- **Recommendation:** None required. (Optional: the in-memory store is unbounded — add an LRU cap
  if instance lifetime grows; effort S, low priority.)
- **existing_plan_overlap:** covered-by:2026-06-01-security-owasp/14-shared-link-publication-surface

### SHARE-PROXY-06 — Session cookie issuance is correctly scoped/flagged/signed/TTL'd (POSITIVE)
- **Severity:** info · **launch_blocker:** false
- **Evidence:** `getSharedLinkSessionCookieParts` (`security.ts:473-501`): HttpOnly, SameSite=Lax,
  Secure in production, Max-Age 86400 (24h), HMAC-SHA256 signed payload binding
  `publicationId + credentialVersion + tokenDigest + recipientId`; verify checks signature
  (constant-time), expiry, and binding (:445-461). `credentialVersion` is derived from the
  password hash (:179-182), so changing/clearing the password invalidates old sessions. The
  client-visible `_ok` companion cookie is non-HttpOnly but carries only `"1"` (no secret,
  `session/route.ts:84-90`).
- **Impact:** Cookie design is sound; no scope/flag/TTL/signing defect found.
- **Recommendation:** None.
- **existing_plan_overlap:** covered-by:2026-06-01-security-owasp/14-shared-link-publication-surface

### SHARE-PROXY-07 — `reusable-sources` and `aec-classification` carry no launch risk (POSITIVE)
- **Severity:** info · **launch_blocker:** false
- **Evidence:** Every exported server action in `reusable-sources/actions.ts` begins with
  `requireCurrentUserContext()` (lines 67,81,110,297,364), filters out `pending-invite` access,
  uses RLS-scoped user clients (never service-role), validates UUIDs (:374), and escapes ILIKE
  wildcards (:105). `aec-classification/disciplines.ts` is a pure static type/lookup table — no
  I/O, no auth surface.
- **Impact:** No injection, authz, or data-exposure risk in these libs.
- **Recommendation:** None.
- **existing_plan_overlap:** none

## Net

The two seams the critic flagged are **closed with no launch-blocker**. The proxy `/api`
short-circuit is safe (every route self-gates). The 4 share routes are individually evidenced:
their controls (CSR/same-origin, password gate, signed recipient session, durable rate-limits,
write+render XSS mitigation) are present and correct. Two low/owner-decision items remain
(SHARE-PROXY-02 session rate-limit consistency; SHARE-PROXY-03 activity comment-read scope) plus
one optional hardening (in-memory store LRU cap). None block wider/external exposure.
