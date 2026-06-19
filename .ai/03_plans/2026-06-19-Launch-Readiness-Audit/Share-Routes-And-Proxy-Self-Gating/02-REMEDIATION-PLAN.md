# 02 — Remediation Plan: Share Routes & Proxy /api Self-Gating

> Phase-2 gap pack of the 2026-06-19 Launch-Readiness audit. Adversarially verified against
> live source + Supabase reads on 2026-06-19. **Launch-blocker count for this surface: 0.**
> Every finding below is hardening / owner-decision; none gate wider/external exposure.

## Verdict summary (adversarial pass)

| Finding | Prior sev / LB | Verified verdict | Final sev / LB |
|---|---|---|---|
| SHARE-PROXY-01 proxy `/api` short-circuit safe (POSITIVE) | info / false | **confirmed** | info / false |
| SHARE-PROXY-02 `session` route uncapped | low / false | **confirmed** | low / false |
| SHARE-PROXY-03 `activity` exposes public comment bodies w/o recipient session | low / false | **confirmed (accepted design)** | low / false |
| SHARE-PROXY-04 comment stored-XSS mitigated (POSITIVE) | info / false | **confirmed** | info / false |
| SHARE-PROXY-05 password lockout durable-backed (POSITIVE) | info / false | **confirmed** | info / false |
| SHARE-PROXY-06 session cookie scope/flags/TTL/signing sound (POSITIVE) | info / false | **confirmed** | info / false |
| SHARE-PROXY-07 reusable-sources / aec-classification no risk (POSITIVE) | info / false | **confirmed** | info / false |

No severity inflation found; no finding refuted. The prior auditor was conservative and accurate.

## Priority 0 — Launch blockers

**None.** The two seams the coverage critic flagged (proxy `/api` short-circuit;
4 share routes) are closed. Every `/api/**/route.ts` self-gates (enumeration re-verified, 16
routes). Share-route controls (same-origin/CSRF, password gate, signed recipient session,
durable rate-limits, write+render XSS mitigation, 256-bit tokens) are present and correct.

## Priority 1 — Recommended hardening (pre- or post-launch, owner's call)

### R1 — Add a durable rate-limit to the `session` POST route (SHARE-PROXY-02)
- **Severity:** low · **not a launch blocker** (256-bit recipient tokens make brute-force
  infeasible; this is consistency + resource-abuse hardening).
- **File:** `src/app/api/share/[token]/session/route.ts` (POST handler, after the same-origin
  check at line 39 and before `verifySharedLinkRecipientToken` at line 70).
- **How:** Reuse the existing durable limiter pattern. The cleanest reuse is
  `checkProjectPublicationActivityRateLimit({ token, request })` (already imported/used by the
  `activity` route at `activity/route.ts:23,87`), or add a sibling
  `checkSharedLinkSessionRateLimit` in `src/lib/publication/public-repository.ts` that writes to
  the already-existing `security_rate_limit_events` table (confirmed present in DB). Suggested
  budget: ~30/min per IP+token, mirroring `activity`. On `!allowed` return 429 with
  `Retry-After`, matching `activity/route.ts:88-96`.
- **RLS/authorization notes:** none — the limiter uses the publication service client and the
  durable `security_rate_limit_events` table (service-role write), same as the other share
  limiters. No new table, no RLS change.
- **Risk:** very low (additive guard on a POST that already same-origin + password gates).
- **Effort:** S.
- **Cross-domain deps:** rate-limit store internals are domain 4/9 (Observability/API-Routes);
  this only reuses their existing limiter, no new infra.

### R2 — CI/test invariant: every `api/**/route.ts` self-gates (SHARE-PROXY-01 durability)
- **Severity:** info · **not a launch blocker** (today all 16 routes self-gate; this prevents a
  *future* unguarded route silently riding the proxy `/api` short-circuit).
- **File:** new test, e.g. `tests/vitest/api-route-self-gating.test.ts`.
- **How:** glob `src/app/api/**/route.ts`, read each, assert it either (a) imports/uses a known
  guard symbol (`requireCurrentUserContext` / `getCurrentUserContext` / `getAiRequestUserContext`
  / `getUserContext`), or (b) is on a documented public-by-design allowlist that carries its own
  control: `api/health` (no data), `api/webhooks/resend` (svix signature via
  `verifyResendWebhookPayload` + `RESEND_WEBHOOK_SECRET`), and the `api/share/[token]/**` family
  (token + same-origin/password/session/rate-limit controls). Fail the test if a new route
  matches neither bucket. This is a static-text invariant — it cannot prove runtime auth, only
  that a guard symbol is referenced (see 03 proof gate).
- **Risk:** none (test-only).
- **Effort:** S.
- **Cross-domain deps:** overlaps the API-Routes pack (domain 4); coordinate to avoid a duplicate
  invariant if that pack adds one.

## Priority 2 — Owner decision (no code change unless rejected)

### R3 — Confirm `activity` public-comment read scope is intended (SHARE-PROXY-03)
- **Severity:** low · **not a launch blocker** · **accepted design per 2026-06-01 OWASP
  shared-link surface + current-state 2026-06-03/06-04 notes.**
- **Verified mechanics:** `activity/route.ts:156-160` selects `is_internal=false` comments via
  the **service-role** publication client (`createPublicationServiceClient()`, line 108 — RLS is
  bypassed, so the share link + optional password are the *only* access control). The recipient
  session at lines 144-154 only gates the recipient-scoped `responses`/`events` (lines 161-174),
  NOT the non-internal comment bodies. By contrast `comment` GET requires a verified recipient
  session. Author identity is reduced to display-name/"Client" (`activity/route.ts:218`),
  `author_email` is selected internally but never emitted in the view model
  (`toPublicActivityViewModel` at :60-78 omits it), and internal comments are filtered at write
  (`is_internal=false` query) and again at compose (`:252` drops `visibility==="internal"`).
- **Owner decision:** Is it intentional that any link-holder (with password if set) but WITHOUT a
  recipient session can read all non-internal comment bodies through `/activity`? This is the
  documented "public shared-link activity" design. If **accepted** → record in decisions.md, no
  code change. If **rejected** → gate the comments query behind `verifiedRecipientId`
  (mirror the responses/events conditional at `activity/route.ts:161-174`); effort M, low risk,
  but changes the product behavior of the public activity feed for non-recipient viewers.
- **Cross-domain deps:** OWASP shared-link surface (2026-06-01) — this is a re-evidence of that
  accepted design, not a new exposure.

## Priority 3 — Optional, low value

### R4 — LRU/size cap on the in-memory password-lockout Map (SHARE-PROXY-05)
- **Severity:** info · not a launch blocker. The durable layer
  (`checkProjectPublicationPasswordRateLimit` at `password/route.ts:46`,
  `recordProjectPublicationPasswordFailure` at `:87`, backed by `security_rate_limit_events`) is
  the real backstop and survives serverless restarts; the in-memory Map in `security.ts` is a
  complementary fast-path. Only relevant if instance lifetime grows materially. Effort S.

## What needs NO change (re-verified positive)
- Proxy `/api` short-circuit (`src/proxy.ts:56`): all 16 routes self-gate. **Safe.**
- AI routes: flag-gated (`ARCHESTIMATOR_AI_ENABLED` default **false**, `feature-flags.ts:13`)
  AND user-context gated (403 on non-supabase / missing workspace; `ai/ask/handler.ts:122-126`,
  `ai/package-builder/handler.ts:198-201`).
- Comment stored-XSS: write-side strip+truncate (`comment/route.ts:74-91`) + render-side React
  text node (zero `dangerouslySetInnerHTML` in `src/components/share` / `src/app/share`).
- Session cookie: HttpOnly, SameSite=Lax, Secure-in-prod, 24h, HMAC-signed binding, credential
  version derived from password hash (invalidates on password change). `_ok` companion holds only
  `"1"` (`session/route.ts:84-90`).
- reusable-sources: every export `requireCurrentUserContext()` first, RLS-scoped user clients
  (`actions.ts:67,81,110,297,364,402`). aec-classification: pure static lookup.

## Validation gate (when any R is implemented)
`bun run build` plus:
`bunx vitest run tests/vitest/project-publication-*.test.* tests/vitest/auth-proxy.test.ts tests/vitest/security-findings-contracts.test.ts --maxWorkers=1`.
`bun run validate` is KNOWN-RED on main — do not gate on it.
