# UNIT-015 — `collect-live-db-performance-evidence.ts` And 2 Other Scripts Still Reference Supabase/Postgres · PERF-DOC-001

**Finding:** PERF-DOC-001 · **Priority:** P3 · **Wave:** 4 (W4-3) · **Effort:** M · **Risk:** Low
**Roadmap item:** W4-3 · **Test decision:** `NOT_REQUIRED`
**local_implementation:** `NOT_STARTED` · **external_lifecycle:** `NOT_STARTED`

## Outcome

The performance-evidence scripts target D1/SQLite (via `wrangler d1 execute`
and `EXPLAIN QUERY PLAN`) instead of the provider-era Supabase/Postgres
tooling, and the stale `supabaseRoundTrips` trace field is renamed. Agents
following the script instructions run the correct commands and stop
hallucinating evidence.

## Affected surface

- `scripts/collect-live-db-performance-evidence.ts` — Modes section documents
  `linked` mode = `supabase db query --linked` and `local` mode = `psql`
  (K-08 confirmed)
- `scripts/audit-dbidx-repo.ts` — Postgres-era assumptions
- `scripts/explain-estimate-list-summaries.mjs` — provider-era commands
- `scripts/measure-workshop-dashboard-query-count.ts` — reads the
  `supabaseRoundTrips` field

## Dependencies

- None for the code/doc change.
- No AUTH_BOUNDARY items — scripts are SELECT-only catalog queries; the
  finding explicitly says "Do not run destructive D1 commands. SELECT-only
  catalog queries."

## Implementation intent

From PERF-DOC-001 "Recommendation" (do 1-3; 3 is optional):

1. **Replace `collect-live-db-performance-evidence.ts`** with a D1 equivalent
   that uses `wrangler d1 execute ARCH_DB --command --remote` for SELECT-only
   catalog/counts queries and `EXPLAIN QUERY PLAN` for plans. Apply the same
   D1-specific rewrite to `audit-dbidx-repo.ts` and
   `explain-estimate-list-summaries.mjs`.
2. **Rename the `supabaseRoundTrips` trace field** to `d1RoundTrips` (or
   `databaseRoundTrips`) and update emitters/consumers — including
   `measure-workshop-dashboard-query-count.ts` and any trace schema docs.
3. **(Optional)** mark the legacy scripts as deprecated or move them to a
   `legacy/` subdir if historical reference is wanted.

Constraints (from finding): SELECT-only catalog queries; do not run
destructive D1 commands.

## Expected evidence

Verification command from PERF-DOC-001 "Verification":

```
# New script runs successfully against local Wrangler D1
bun run scripts/collect-live-db-performance-evidence.ts   # (rewritten)
grep -rn 'supabase\|psql\|Postgres' scripts/                # returns zero hits
```

Evidence class: `NOT_REQUIRED` (diff showing D1 commands replacing
Supabase/psql commands, and `supabaseRoundTrips` renamed, is the decisive
non-test signal). A local run against Wrangler D1 is the cheapest decisive
confirmation.

## Completion signal

- All four scripts use `wrangler d1 execute` / `EXPLAIN QUERY PLAN`; no
  references to `supabase`, `psql`, or `Postgres` remain.
- `supabaseRoundTrips` is renamed to `d1RoundTrips` (or `databaseRoundTrips`)
  across emitters and consumers.
- The rewritten `collect-live-db-performance-evidence.ts` runs successfully
  against local Wrangler D1.

## Recovery path

Not required (Risk: Low). Restore the legacy scripts from git history if the
D1 rewrite produces incorrect evidence. The rename can be reverted
independently.
