# 05 — Security Hardening Analysis

The audit found **no exploitable vulnerability**. This doc records the verified-strong posture, the hardening findings promoted to units, and the accepted tradeoffs (so they are not re-flagged).

## Verified-strong posture (direct inspection)

| Surface | Finding | Evidence |
|---------|---------|----------|
| AuthN/AuthZ | Consistent gating; no IDOR | `requireCurrentUserContext`, `assertProjectPublicationManager`, `managerActor`; `publisher-discussion-hardening.test.ts` proves cross-project denial |
| SQL | All `?`-bound; no injection | incl. new `removal-claims.ts` (`workspace_id`+`actor_user_id` scoped, `json_each(?)` CTEs) |
| XSS | No sink | 5 `dangerouslySetInnerHTML` sites are JSON-LD `stringify` + one static recovery script |
| CSRF | Centralized | `assertSameOriginPublicPost` on every public state-changing handler |
| Cookies | Hardened | HttpOnly + SameSite=Lax + Secure(prod) (`request-proxy.ts:150-152`) |
| Crypto | Strong primitives | `timingSafeEqual`, AES-256-GCM, HMAC-scrypt where it matters most |
| Secrets | None committed | `.env.local` gitignored; `bun audit` = `{}` |
| Uploads | Object-key scoped + traversal guards | keys scoped `workspaceId/userId/...` |

## Hardening findings → units

### SEC-01 / UNIT-003 — timing-unsafe Bearer compare
- **Issue:** internal cron routes (`upload-cleanup`, `upload-scan`, `upload-runtime`) authorize with `authHeader === \`Bearer ${secret}\`` via `some()` — a timing side-channel on the `CRON_SECRET` that authorizes system-wide upload **deletion** and scanning.
- **Realistic severity:** defense-in-depth. The `some()` short-circuit + network jitter make byte-by-byte recovery impractical, but the asset behind it is high-value.
- **Fix:** one `constantTimeBearer(request, secrets)` helper using `timingSafeEqual` over equal-length buffers (length-mismatch early-return), called from all three routes + a unit test. Effort S, risk LOW. (Rotate `CRON_SECRET` as hygiene if exposure is ever suspected — no value was found.)

### SEC-02 / UNIT-006 — API route auth contract test
- **Issue:** `/api/*` is exempt from auth middleware (`request-proxy.ts:162-168`) — idiomatic Next.js, but a new route that forgets `require*` is silently open with no second layer or test.
- **Fix:** a vitest glob test over `src/app/api/**/route.ts` asserting each `POST/PUT/PATCH/DELETE` handler references an allow-listed auth primitive; allowlist the intentionally-public intake routes. Effort S, risk LOW. The test passes today (all routes gate correctly) and is the safety net for future authors.

### SEC-03 / UNIT-009 — publication password floor + stale doc
- **Issue:** `MIN_PUBLICATION_PASSWORD_LENGTH = 4` (`security.ts:134`) is below any entropy threshold; combined with the per-token rate limit it is defensible, but 4-char passwords on confidential client proposals remain brute-forceable within a large window. Separately, the prior "BLK-01 server gap remains" note is **stale** — the server-side gate exists (`actions.ts:896,969,1053`); the server API has no `passwordRequired` concept, so the original threat is largely moot.
- **Fix:** raise the floor (e.g. 8) or add a basic character-class check; add a server test rejecting a short password on create + republish; correct the stale note. Existing hashes verify unchanged. Effort S, risk LOW.

### SEC-04 / UNIT-015 — hosted share-link lockout characterization (BETA P0)
- **Issue:** the highest-risk pre-beta failure mode (shared-link brute-force, password-lockout bypass, token enumeration) has **local-contract** tests but no hosted/run-time characterization. `public-repository.ts:394` rate-limits against `security_rate_limit_events`; roadmap BETA P0 #5/#7c/#8 call "survives restart" and "lockout persistence against staging" **unproven**.
- **Fix:** a staging-D1 characterization test asserting lockout survives a worker restart and enumeration is bounded, tagged out of the default gate. Effort M, risk HIGH (value) — this *is* the BETA gate.

### SEC-05 / UNIT-017 — public-repository access-security extract
- **Issue:** two `public-repository.ts` share token/password/rate-limit primitives, and `client-portal/public-session-handler.ts:10` reaches **across layers** into `publication/public-repository.ts:394`'s private rate-limit internals. High divergence risk on the next share-link/password change.
- **Fix:** extract `src/lib/publication/access-security.ts` (token + password + rate-limit primitives) both layers import; rename one repo to disambiguate. Keep crypto byte-identical. Effort M, risk MED.

## CSP posture (BY-DESIGN, not a unit)

`/share/**` enforced CSP and `/workshop/**` Report-Only both still carry `script-src 'unsafe-inline' 'unsafe-eval'` (`next.config.ts:20-47`). This is a **deliberately recorded P11 tradeoff**: the enforced `/share` policy is "kept identical" to Report-Only (additive, 0 execution-flow impact), and workshop enforcement is deferred pending a per-request nonce pipeline. Not a defect. If hardening is later wanted: nonce pipeline → drop the two `unsafe-*` tokens on `/share` and `/workshop`; add a CSP-violation reporter. Recorded; no unit unless the owner asks.

## Accepted tradeoffs (do not re-flag)

- **Bearer publication token in URL** — established model; `Referrer-Policy: no-referrer` mitigates the active leak vector; 32-byte token.
- **D1 has no RLS** — app-level scoping via better-auth email binding; defense-in-depth only.
- **dev-auth-bypass env gate** — `NODE_ENV !== "production"`-gated; off in prod by construction. (Optional hardening: fail-fast if the bypass flag is set in prod — noted, not a unit.)
- **`assigneeUserId` not workspace-checked** — display/filter only, grants no privilege (documented DEFERRED).
