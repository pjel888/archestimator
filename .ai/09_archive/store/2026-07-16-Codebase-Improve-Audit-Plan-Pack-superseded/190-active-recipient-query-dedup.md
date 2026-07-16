# Plan UNIT-010: De-duplicate the active-recipient query into one loader

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- src/lib/client-portal/public-repository.ts src/lib/client-portal/thread-repository.ts src/lib/client-portal/publisher-discussion-service.ts src/lib/client-portal/issue-builder.ts src/lib/client-portal/decision-service.ts`.

## Status
- **Priority:** P2 · **Effort:** S · **Risk:** MED · **Depends on:** — · **Category:** tech-debt (authz surface)
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** TEST_PROPOSAL (characterization test of the active set, pre-refactor)

## Why this matters
The active-recipient query (`SELECT … FROM client_portal_recipients WHERE portal_id = ? AND status = 'active' AND id IN (…)`) is re-implemented in 5–6 places (`client-portal/public-repository.ts` ×2, `thread-repository.ts:171`, `publisher-discussion-service.ts:125`, `issue-builder.ts`, `decision-service.ts`). When the "active" definition changes (soft-delete, `accepted` vs `active`), all must change in lockstep — a silent authorization-drift risk where a recipient is "active" in one path but not another.

## Current state
- Repeated SQL across the 5–6 sites (confirm exact lines at edit time via `rg -n "client_portal_recipients" src/lib/client-portal`).
- Each site scopes by `portal_id` + `status='active'` + an id list.
- **Convention/exemplar:** `src/lib/client-portal/*-repository.ts` parameter-injects `D1DatabaseLike` (the testable pattern noted in the architecture audit).

## Commands
| Purpose | Command | Expected |
|--------|---------|----------|
| Typecheck | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| (TEST_PROPOSAL) characterization | `bun run test:dom -- tests/vitest/client-portal-recipient-loader.test.ts` (if authorized) | pass |

## Scope
**In scope:** new `src/lib/client-portal/recipient-loader.ts` (`loadActiveRecipientsByIds(db, portalId, recipientIds)`); the 5–6 call sites switched to it.
**Out of scope:** changing the "active" definition. Any authorization logic beyond consolidating the read. Non-recipient queries.

## Steps
### Step 1 — (TEST_PROPOSAL) characterize the current active set
Before refactoring, capture the current active-recipient SQL's result for a fixture workspace (active, invited, removed, accepted recipients) as a characterization baseline. This proves the consolidation is behavior-preserving.
### Step 2 — Add the loader
`recipient-loader.ts` exports `loadActiveRecipientsByIds(db, portalId, recipientIds): Promise<RecipientRow[]>` with the canonical `status='active'` + `portal_id` + `IN(…)` query, parameter-injecting `db`.
### Step 3 — Switch the call sites
Replace each of the 5–6 inlined queries with the loader call. Preserve each caller's post-filtering/shape mapping.
### Step 4 — Verify behavior preservation
Re-run the characterization test against the consolidated loader → identical active set.
**Verify:** `bun run type-check` + `bun run lint` exit 0; `rg -n "FROM client_portal_recipients" src/lib/client-portal` returns only the loader.

## Done criteria
- [ ] `bun run type-check` exit 0 · [ ] `bun run lint` exit 0
- [ ] Exactly one active-recipient query remains (in `recipient-loader.ts`)
- [ ] Characterization test: consolidated loader returns the identical active set (if authorized)
- [ ] No files outside scope modified
- [ ] `plan-pack.json` / `README.md` / `LOOP_LEDGER.md` updated

## STOP conditions
- One site uses a subtly different "active" predicate (e.g. includes `accepted`) — do **not** silently unify; surface the difference to the owner (it may be intentional) and either align or parameterize the loader.
- A caller relies on column ordering/shape from its inline query — adapt the loader's return shape or map at the call site.

## Maintenance notes
- The "active recipient" definition now lives in one place — future changes (soft-delete, new statuses) edit the loader only.
- Pair this with a regression test so the active set can't drift silently.
