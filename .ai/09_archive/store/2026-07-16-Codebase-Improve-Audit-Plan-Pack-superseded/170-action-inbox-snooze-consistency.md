# Plan UNIT-008: Action-inbox — project expired snoozes as `open`; reject missing `snoozeUntil`

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- src/lib/admin/action-inbox-repository.ts`.

## Status
- **Priority:** P2 · **Effort:** S · **Risk:** LOW · **Depends on:** — · **Category:** bug
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** TEST_PROPOSAL (unit test over the list projection + snooze validation)

## Why this matters
`listOpenActionItems` selects `WHERE status='open' OR (status='snoozed' AND snooze_until <= ?)` (`action-inbox-repository.ts:161-162`) and returns the rows as-is — so an expired-snooze item is returned in the "open" list while its `status` column still reads `'snoozed'`. The only thing that transitions it back to `'open'` is the `CASE` in the upsert (lines 98-112), which runs only when `deriveActionItemsFromSources` reconciles. Between reconciles (or if it fails — it swallows errors at `:144-147`), the `/admin/today` view shows an actionable item with a stale "snoozed" badge. Separately, `mutateStatus` snoozes "until now" if `snoozeUntil` is missing (`:193`) — a latent footgun that creates the exact inconsistent state.

## Current state
- `src/lib/admin/action-inbox-repository.ts:150-174` — `listOpenActionItems` SQL + return.
- `:98-112` — derive upsert `CASE` reopens expired snoozes (runs only on reconcile).
- `:186-194` — snooze branch binds `snoozeUntil ?? now`; wrapper `snoozeActionItemInD1` (`:222`) always passes a value today.

## Commands
| Purpose | Command | Expected |
|--------|---------|----------|
| Typecheck | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| (TEST_PROPOSAL) unit test | `bun run test:dom -- tests/vitest/action-inbox-snooze.test.ts` (if authorized) | pass |

## Scope
**In scope:** `src/lib/admin/action-inbox-repository.ts` only.
**Out of scope:** the derive reconcile cadence. The `/admin/today` UI component (consume the projected status; no UI change required if it reads `status`).

## Steps
### Step 1 — Project expired snoozes as `open` on read
In `listOpenActionItems`, map returned rows so that a row with `status==='snoozed' && snooze_until <= now` is projected as `status:'open', snooze_until:null` in the returned `AdminActionItemRow`. (Optionally also do a write-before-read `UPDATE … SET status='open', snooze_until=NULL WHERE status='snoozed' AND snooze_until <= ?` to persist the transition — choose projection-only for the smaller change, or persist for consistency; document the choice.)
### Step 2 — Require `snoozeUntil` in the snooze path
Tighten `mutateStatus`'s snooze branch to require a non-null `snoozeUntil` that is strictly in the future; throw `PublisherDiscussionError`-style (or the repo's equivalent) on missing/past values instead of defaulting to `now`. The exported wrapper already supplies it; this is defensive.
### Step 3 — (TEST_PROPOSAL) unit test
`tests/vitest/action-inbox-snooze.test.ts`: a snoozed row past `snooze_until` is returned by `listOpenActionItems` projected as `open`; a future snooze stays `snoozed`; `snoozeActionItemInD1(id, undefined)` throws.
**Verify:** `bun run type-check` + `bun run lint` exit 0.

## Done criteria
- [ ] `bun run type-check` exit 0 · [ ] `bun run lint` exit 0
- [ ] Expired-snooze items project as `open` in `listOpenActionItems`
- [ ] Snooze path rejects missing/past `snoozeUntil`
- [ ] Unit test passes (if authorized)
- [ ] No files outside scope modified
- [ ] `plan-pack.json` / `README.md` / `LOOP_LEDGER.md` updated

## STOP conditions
- The `/admin/today` UI relies on the literal `'snoozed'` status for expired items (unlikely) — coordinate the projection with the consumer.
- Persisting the transition on read conflicts with the derive reconcile's `CASE` — prefer projection-only to avoid a write race.

## Maintenance notes
- If derive reconcile moves to a write-before-read transition, the projection becomes redundant but harmless.
- New action-item statuses must update both the list projection and the derive `CASE`.
