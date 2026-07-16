# Plan UNIT-013: Cap the component-library "load all" path (`isPartial` + keyset pagination)

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- src/lib/repositories/component-library-repository.ts`.

## Status
- **Priority:** P2 · **Effort:** M · **Risk:** LOW · **Depends on:** — · **Category:** perf
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** TEST_PROPOSAL (unit test asserting `isPartial` past the cap)

## Why this matters
`component-library-repository.ts:557-570` loads the whole library with `for (let offset = 0;; offset += PAGE_SIZE) { … LIMIT ? OFFSET ? … }` until exhausted. Growing `OFFSET` re-reads prior rows each page → `O(N²/PAGE)` row reads — and the entire library is loaded into memory. It is the `cost_library_items` analog of the documented BLK-02 unbounded-projects query. `isPartial` (`:1067`) is already plumbed but unused by this path.

## Current state
- `src/lib/repositories/component-library-repository.ts:557-570` — the unbounded `for(;;)` OFFSET loop accumulating `rows`.
- `:1067` — `isPartial` field exists on the result shape.
- Callers may pass `itemLimit` (mitigated path); the unbounded branch is reachable.

## Commands
| Purpose | Command | Expected |
|--------|---------|----------|
| Typecheck | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| (TEST_PROPOSAL) unit test | `bun run test:dom -- tests/vitest/component-library-load-cap.test.ts` (if authorized) | pass |

## Scope
**In scope:** `src/lib/repositories/component-library-repository.ts` (the load-all path).
**Out of scope:** the normalized item shape. Other repository methods. UI pagination wiring (the signal is returned; UI consumption is optional/separate).

## Steps
### Step 1 — Enforce a hard cap
Define `COMPONENT_LIBRARY_LOAD_MAX` (e.g. 2000 items; owner-confirmable). Stop paginating once the cap is reached and set `isPartial:true`. Surface `isPartial` to the caller (it already exists at `:1067`).
### Step 2 — Switch to keyset pagination
Replace growing-`OFFSET` with keyset pagination (`WHERE id > :lastId ORDER BY id LIMIT ?`), eliminating the re-read cost (`O(N)` instead of `O(N²/PAGE)`). Keep the same accumulation + cap.
### Step 3 — (TEST_PROPOSAL) unit test
`tests/vitest/component-library-load-cap.test.ts`: a fixture above the cap returns `isPartial:true` and the first cap rows (ordered); a fixture below returns all rows with `isPartial:false`.
**Verify:** `bun run type-check` + `bun run lint` exit 0.

## Done criteria
- [ ] `bun run type-check` exit 0 · [ ] `bun run lint` exit 0
- [ ] No growing-`OFFSET` loop remains; keyset pagination in place
- [ ] `isPartial` is set when the cap is hit
- [ ] Unit test passes (if authorized)
- [ ] No files outside scope modified
- [ ] `plan-pack.json` / `README.md` / `LOOP_LEDGER.md` updated

## STOP conditions
- Callers depend on exhaustive (uncapped) loading for correctness — confirm none do; if one does, raise the cap or gate the capping behind an opt-in rather than silently truncating.
- Keyset pagination breaks an expected ordering (callers rely on `updated_at DESC` not `id ASC`) — keyset on the same column the callers expect, or document the ordering change.

## Maintenance notes
- If true library-wide exhaustive loads are later needed (e.g. export), add an explicit unbounded method gated to those callers rather than reopening the default path.
- Pair with UNIT-005's batch guard philosophy: bounded is the default; unbounded is opt-in.
