# Plan UNIT-017: Extract shared `access-security` from the two public-repository.ts

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- src/lib/client-portal/public-repository.ts src/lib/client-portal/public-session-handler.ts src/lib/publication/public-repository.ts src/lib/publication/security.ts`.

## Status
- **Priority:** P3 · **Effort:** M · **Risk:** MED · **Depends on:** — · **Category:** tech-debt (security-adjacent)
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** TEST_PROPOSAL (parity test: extracted helpers identical to in-repo originals)

## Why this matters
Two files named `public-repository.ts` (`client-portal/` 295 LOC and `publication/` 1,320 LOC) share the publication-token/password primitives (`hashPublicationToken`, `isPublicationTokenShape`, `readPublicationTokenHashSecret`, `verifyPublicationPassword` from `publication/security`). Worse, `client-portal/public-session-handler.ts:10` reaches **across layers** to import `checkClientPortalSessionStartRateLimit` *from* `publication/public-repository.ts:394` — the client-portal layer depends on the publication layer's private rate-limit internals. High divergence risk on the next share-link/password change.

## Current state
- `src/lib/client-portal/public-repository.ts` (295 LOC) + `src/lib/publication/public-repository.ts` (1,320 LOC).
- Shared primitives imported from `src/lib/publication/security.ts`.
- `src/lib/client-portal/public-session-handler.ts:10` → `publication/public-repository.ts:394` (cross-layer rate-limit import).

## Commands
| Purpose | Command | Expected |
|--------|---------|----------|
| Typecheck | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| Existing suites | `bun run test:dom -- tests/vitest/publication- tests/vitest/client-portal-` (if authorized) | green |

## Scope
**In scope:** new `src/lib/publication/access-security.ts` (token + password + rate-limit primitives); both `public-repository.ts` + `public-session-handler.ts` importing from it; rename one repo to disambiguate (the 1,320-LOC one is really "publication issuance + access").
**Out of scope:** changing token/password/rate-limit *behavior* (byte-identical). The bearer-link model.

## Steps
### Step 1 — Extract `access-security.ts`
Move/consolidate `hashPublicationToken`, `isPublicationTokenShape`, `readPublicationTokenHashSecret`, `verifyPublicationPassword`, and the rate-limit primitive (`checkRecordedRateLimit`/`checkClientPortalSessionStartRateLimit`) into `src/lib/publication/access-security.ts`. Re-export from the original locations for compatibility.
### Step 2 — Break the cross-layer import
Point `client-portal/public-session-handler.ts:10` at `access-security.ts`, not `publication/public-repository.ts:394`. The client-portal layer no longer depends on publication's private internals.
### Step 3 — Rename to disambiguate
Rename the 1,320-LOC `publication/public-repository.ts` to something intent-revealing (e.g. `publication-issuance-repository.ts`) — or document why both keep the name. Update importers.
### Step 4 — (TEST_PROPOSAL) parity test
Assert the extracted helpers produce byte-identical outputs to the originals (token hash, password verify, rate-limit decision) for a fixture; run the existing publication + client-portal auth suites.
**Verify:** `bun run type-check` + `bun run lint` exit 0; no cross-layer private import remains (`rg "publication/public-repository" src/lib/client-portal` → 0).

## Done criteria
- [ ] `bun run type-check` exit 0 · `bun run lint` exit 0
- [ ] `access-security.ts` holds the shared primitives; both layers import from it
- [ ] No client-portal → publication-private import remains
- [ ] Parity test: extracted helpers identical to originals (if authorized)
- [ ] Existing publication + client-portal auth suites green (if authorized)
- [ ] `plan-pack.json` / `README.md` / `LOOP_LEDGER.md` updated

## STOP conditions
- A primitive's behavior differs subtly between the two layers (e.g. different secret read) — do not silently unify; parameterize or surface the difference to the owner.
- The rename breaks an importer outside `src/lib` (e.g. a test or config) — update it in the same change.

## Maintenance notes
- Future share-link/password work edits `access-security.ts` once; both layers stay in sync.
- The cross-layer-import anti-pattern should not return — a lint rule (optional) could enforce client-portal not importing publication internals.
