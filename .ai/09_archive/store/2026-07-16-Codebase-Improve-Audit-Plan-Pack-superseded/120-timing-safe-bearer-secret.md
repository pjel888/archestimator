# Plan UNIT-003: Timing-safe Bearer-secret compare on internal cron routes

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- src/app/api/internal/upload-cleanup/route.ts src/app/api/internal/upload-scan/route.ts src/app/api/internal/upload-runtime/route.ts`.

## Status
- **Priority:** P1 · **Effort:** S · **Risk:** LOW · **Depends on:** — · **Category:** security
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** TEST_PROPOSAL (unit test over the helper)

## Why this matters
Three internal cron routes authorize with `authHeader === \`Bearer ${secret}\`` via `some()` — a timing side-channel on the `CRON_SECRET` that authorizes system-wide upload **deletion** (`upload-cleanup`), AV scanning/content fetch (`upload-scan`), and runtime proof (`upload-runtime`). Realistic exploitability is gated by network jitter and the `some()` short-circuit, so this is defense-in-depth — but the asset is high-value and the fix is trivial.

## Current state
- `src/app/api/internal/upload-cleanup/route.ts:47` `isAuthorized(request, secrets)`, used at `:114`.
- `src/app/api/internal/upload-scan/route.ts:40`, used at `:90`.
- `src/app/api/internal/upload-runtime/route.ts:70`, used at `:203`.
- All three: `secrets.some((secret) => authHeader === \`Bearer ${secret}\`)`. `rg timingSafeEqual src/app/api/internal` → 0 hits.
- **Convention/exemplar:** the codebase already uses `timingSafeEqual` for token/password comparison in `src/lib/publication/security.ts` — match that style (constant-time over equal-length buffers, length-mismatch early-return).

## Commands
| Purpose | Command | Expected |
|--------|---------|----------|
| Typecheck | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| (TEST_PROPOSAL) unit test | `bun run test:dom -- tests/vitest/internal-bearer-auth.test.ts` (if authorized) | pass |

## Scope
**In scope:** a shared helper (e.g. `src/lib/auth/constant-time-bearer.ts`) + the three `isAuthorized` functions.
**Out of scope:** any change to which secrets are accepted, route behavior on success/failure, or the CRON trigger wiring. Rotation of `CRON_SECRET` is standard hygiene only if exposure is suspected (no value was found).

## Steps
### Step 1 — Add the helper
Create `src/lib/auth/constant-time-bearer.ts` exporting `isAuthorizedBearer(authHeader: string \| null, secrets: readonly string[]): boolean`. Implement: return `false` early on missing/short header; for each secret, compare the full `Bearer ${secret}` string using `crypto.timingSafeEqual` over equal-length `Buffer` copies; return `true` on first match. Reject on length mismatch before comparing (constant-time within equal-length, length-safe across).
### Step 2 — Switch the three routes
Replace each `isAuthorized` body with a call to the helper. Keep the function name/signature so call sites are unchanged.
### Step 3 — (TEST_PROPOSAL) unit test
`tests/vitest/internal-bearer-auth.test.ts`: correct secret accepted; wrong secret rejected; length-mismatch header rejected without throw; empty/null header rejected.
**Verify:** `bun run type-check` + `bun run lint` exit 0; a known-good `CRON_SECRET` still authorizes (manual or via the existing route contract).

## Done criteria
- [ ] `bun run type-check` exit 0 · [ ] `bun run lint` exit 0
- [ ] `rg -n "=== \`Bearer" src/app/api/internal` returns 0 matches
- [ ] Helper unit test passes (if authorized)
- [ ] No files outside scope modified
- [ ] `plan-pack.json` / `README.md` / `LOOP_LEDGER.md` updated

## STOP conditions
- A route accepts secrets via a different scheme than `Bearer <secret>` — STOP and report (helper must cover it).
- `timingSafeEqual` throws on a legitimate equal-length compare — buffer-length bug; fix before landing.

## Maintenance notes
- New CRON-secret-gated internal routes should use `isAuthorizedBearer`, not a fresh `===`.
- If multi-secret rotation grows, the helper already accepts a list.
