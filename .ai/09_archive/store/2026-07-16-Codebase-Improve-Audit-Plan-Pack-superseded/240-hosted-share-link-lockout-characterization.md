# Plan UNIT-015: Hosted characterization test for share-link / password-lockout survival

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- src/lib/publication/public-repository.ts`.

## Status
- **Priority:** P1 · **Effort:** M · **Risk:** HIGH (value — this is the BETA P0 gate) · **Depends on:** — · **Category:** tests
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** TEST_TASK — but only against **staging/hosted** D1, and only with explicit owner authorization for the run (AUTH-B2). Tagged out of the default gate.

## Why this matters
The highest-risk pre-beta failure mode — shared-link brute-force, password-lockout bypass, token enumeration — has **local-contract** tests but no hosted/run-time characterization. `public-repository.ts:394` (`checkRecordedRateLimit`) rate-limits against `security_rate_limit_events`; roadmap BETA P0 #5/#7c/#8 explicitly call "survives restart" and "lockout persistence against staging" **unproven**. The durable behavior depends on that table being applied to the hosted DB and surviving worker restarts. This is the textbook characterization-tests-first gate.

## Current state
- `src/lib/publication/public-repository.ts:394` — `checkRecordedRateLimit` + 6 call sites (`:455-:592`) implementing durable rate limiting against `security_rate_limit_events`.
- Local-contract tests exist for the rate-limit math; nothing asserts hosted/restart survival or enumeration bounding.

## Commands
| Purpose | Command | Expected |
|--------|---------|----------|
| Typecheck | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| Characterization (TEST_TASK, staging) | `bun run test:staging-share-link-lockout` (new) | lockout survives restart; enumeration bounded |

## Scope
**In scope:** a new characterization test (e.g. `tests/staging/share-link-lockout.characterization.test.ts`); a tagged runner script excluded from `test:dom`/`test`.
**Out of scope:** changing the rate-limit implementation. The local-contract tests. Production data.

## Steps
### Step 1 — Define the invariants to characterize
(a) After N failed attempts on a publication token, further attempts are locked out for the window; (b) the lockout **survives a worker restart** (events persist in `security_rate_limit_events` on hosted D1); (c) token enumeration is bounded — distinct tokens each get their own counter and cannot be enumerated to bypass; (d) a correct password/owner action still succeeds after lockout clears.
### Step 2 — Write the characterization harness
`tests/staging/share-link-lockout.characterization.test.ts` targets staging D1 (not local mocks). It performs the attempts, triggers/awaits a worker restart (per the deploy harness), re-attempts, and asserts (a)-(d). Tag it (`@staging`/config exclude) so `bun run test:dom` never runs it.
### Step 3 — Add the tagged runner
A `test:staging-share-link-lockout` script + config that runs only this test, gated on an env var confirming staging target. Document that it requires AUTH-B2 authorization.
### Step 4 — Run (TEST_TASK, owner-authorized)
Execute against staging. Capture the run artifact (counts, timings, restart proof) as evidence.
**Verify:** `bun run type-check` + `bun run lint` exit 0; the characterization passes against staging.

## Done criteria
- [ ] `bun run type-check` exit 0 · `bun run lint` exit 0
- [ ] Characterization test asserts (a)-(d) and is excluded from the default gate
- [ ] Staging run (TEST_TASK + AUTH-B2 authorized) passes; artifact captured
- [ ] `bun run test:dom` does not run this test
- [ ] `plan-pack.json` / `README.md` / `LOOP_LEDGER.md` updated

## STOP conditions
- Staging D1 does not have `security_rate_limit_events` applied yet — that is a prerequisite deploy step; STOP and surface it (it may itself be a BETA P0 gap).
- The test is flaky against staging (timing/restart) — tighten assertions to behavior (lockout holds), not exact timing; do not disable.
- Owner does not authorize AUTH-B2 — defer the run; the test artifact can land without executing.

## Maintenance notes
- This test is the BETA P0 sign-off evidence for rate-limiting durability; run it before each release that touches publication/share/auth.
- If the rate-limit storage moves (e.g. to a Durable Object), update the restart-survival assertion accordingly.
- Pair with UNIT-014's characterization philosophy: lock behavior before any future refactor of `public-repository.ts`.
