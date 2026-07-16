# Plan UNIT-006: Contract test — every non-GET API route references an auth primitive

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- src/lib/auth/request-proxy.ts`. Plus `git ls-files 'src/app/api/**/route.ts' | wc -l` to confirm the route count baseline.

## Status
- **Priority:** P2 · **Effort:** S · **Risk:** LOW · **Depends on:** — · **Category:** security/dx
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** the deliverable *is* a test; verify it passes today and fails on a synthetic ungated route.

## Why this matters
`/api/*` is exempt from auth middleware (`request-proxy.ts:162-168`) — idiomatic Next.js, but it means a new route handler that forgets the per-handler `require*` call is **silently open**, with no second layer or test. The repo has ~60 route handlers; the discipline is currently good (verified during the security audit), but the failure mode is asymmetric (miss = unauthenticated endpoint). This test is the cheap safety net for future authors.

## Current state
- `src/lib/auth/request-proxy.ts:162-168` — paths matching `.` / `/_next` / `/api` bypass to `NextResponse.next` with no cookie/session/origin check.
- Auth is enforced inside each handler via `requireCurrentUserContext` / `requireAdminContext` / `gateAdminApiMutation` / Bearer secrets (`isAuthorized`) / `assertSameOriginPublicPost`.
- Intentionally-public intake routes exist (e.g. `/api/compliance/privacy-requests`, `/api/share/[token]/password`).

## Commands
| Purpose | Command | Expected |
|--------|---------|----------|
| Typecheck | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| New contract test | `bun run test:dom -- tests/vitest/api-route-auth-contract.test.ts` | passes today |

## Scope
**In scope:** a new vitest test `tests/vitest/api-route-auth-contract.test.ts`; an explicit allowlist of intentionally-public routes.
**Out of scope:** any route handler source change (unless the test finds a real gap — then flag, don't silently fix). Middleware behavior.

## Steps
### Step 1 — Enumerate route handlers + auth primitives
Glob `src/app/api/**/route.ts`. Define the allow-listed auth symbols: `requireCurrentUserContext`, `requireAdminContext`, `gateAdminApi*`, `assertSameOriginPublicPost`, `isAuthorized`/`isAuthorizedBearer`, `getCurrentUserContext`, or a `CRON_SECRET`/proof-router delegation.
### Step 2 — Write the contract test
For each route file, parse exports; for each `POST`/`PUT`/`PATCH`/`DELETE` handler, assert the file's source references one of the auth primitives (string scan of the module source), **unless** the route path is in the explicit public-intake allowlist. The test fails if a state-changing handler is neither gated nor allowlisted.
### Step 3 — Seed the allowlist
Populate the allowlist with the known public intake routes (audit them first to confirm they are intentionally public). Document the allowlist in the test header.
**Verify:** `bun run test:dom -- tests/vitest/api-route-auth-contract.test.ts` passes today; temporarily add a synthetic ungated POST handler → test fails; remove it → passes.

## Done criteria
- [ ] `bun run type-check` exit 0 · [ ] `bun run lint` exit 0
- [ ] Contract test passes against current `src/app/api/**`
- [ ] Contract test fails on a synthetic ungated state-changing handler (verified)
- [ ] Public-intake allowlist is explicit and documented
- [ ] `plan-pack.json` / `README.md` / `LOOP_LEDGER.md` updated

## STOP conditions
- The test finds a *real* ungated state-changing route today — STOP and surface it as a security finding (don't quietly add it to the allowlist).
- A route gates auth via a pattern the symbol scan can't detect — extend the allowlist/primitive set and note the pattern; don't weaken the test.

## Maintenance notes
- New state-changing API routes must reference an auth primitive or join the allowlist — the test enforces it.
- If the auth primitive set changes (e.g. UNIT-003's `isAuthorizedBearer`), update the test's allowlist.
