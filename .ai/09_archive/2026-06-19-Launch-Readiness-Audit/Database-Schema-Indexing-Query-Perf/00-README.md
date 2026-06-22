# Launch-Readiness Audit — DB Schema, Indexing & Query Performance

> Canonical status override: before implementing from this pack, read
> `../03-LAUNCH-GATE-DECISION-REGISTER.md` and `../08-IMPLEMENTATION-HANDOFF.md`.
> Pack-local blocker counts are historical/domain-scoped; the root register is authoritative
> for wider/external beta.

> **Deletable plan-pack header.** Part of the **2026-06-19 Launch-Readiness Audit**
> (sibling packs under `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/<Pack>/`). This pack is an
> **audit + remediation proposal**, not applied work. If Philip rejects it, delete the
> whole folder — nothing here is referenced by source or migrations.

## Owner job (exact)

Philip is taking Archestimator into **closed-beta** with no external users yet. This
pack answers one question for the database layer: **is the schema/index/query posture
safe to expose to closed-beta users, and what (if anything) must change first?** It
audits index coverage, unindexed FKs, RLS init-plan cost, wide selects, N+1 access
patterns, duplicate/unused indexes, seq-scan risk at scale, and `types.ts` drift —
against the **live** project `ebxxqidacheyapmmzavr` and the migration history.

## Routes / screens affected by the underlying queries

- `/workshop` (homebase summary RPC, project list, favorites, groups)
- `/workshop/projects` + project cards (recent work surface; live cards)
- Estimate editor / tree (`estimate_nodes`, `estimate_row_items` by `estimate_id`)
- Project charts (`project-charts-repository`, bucketed payload)
- Component library (`cost_library_items` + price/variant graph)
- Collaboration invites, shared-link / publication, AI audit surfaces

## Non-goals

- No DDL execution in this pack. No `CREATE/DROP INDEX`, no `ALTER`, no migration files.
- No RLS policy *correctness* rewrites (Domain 2 owns RLS/RPC security). This pack only
  flags the **performance** cost of unwrapped `auth.*()` predicates and hands the fix to D2.
- No server-side search / `pg_trgm` / `tsvector` / pgvector work (not a beta requirement).
- No app-code refactor of the homebase serial tail (Domain 8 owns data-fetch shape; the
  DB-side index support is noted here and cross-referenced).
- No re-derivation of the full audit method already written in the prior packs.

## Files expected to change during remediation (if approved)

- A single new additive migration under `supabase/migrations/` adding the read-hot FK
  indexes (`CREATE INDEX CONCURRENTLY`), authored only after EXPLAIN evidence.
- A second migration (separate, gated harder) dropping confirmed-redundant duplicate
  indexes, only after a longer `pg_stat_user_indexes` observation window.
- Possibly `src/lib/repositories/component-library-repository.ts` (bound the unbounded
  `cost_library_items` read) — coordinated with Domain 8 / Performance-Refactor Phase 4.
- No `types.ts` change required (it is in parity today).

## Validation gate

- `mcp__Supabase__get_advisors(performance)` re-run shows the targeted unindexed-FK
  lints cleared and **no new** `unused_index` regressions beyond the dropped set.
- `EXPLAIN ANALYZE` on each touched hot path shows index use, no unexpected seq scan.
- `bun run prove:*` (membership, charts, list-summaries) unchanged — no access change.
- `bun run validate` no **new** reds attributable to this pack (it is known-red on main
  for unrelated reasons — charts set-state-in-effect, export-preview design-lint).

## Deletion criteria (if Philip rejects)

Delete `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/Database-Schema-Indexing-Query-Perf/`.
No source, migration, or test imports anything here. Nothing else to unwind.

## Loop-surface selection

This is a HIGH-BLAST-RADIUS area (DB/index/RLS). Any *implementation* spun out of this
audit MUST run as a dated plan pack with a `LOOP_LEDGER.md` and a Codex review gate per
`AGENT_OPERATING_PROTOCOL.md`. **This pack itself is audit-only** — read-only on source,
write-only inside this folder.

## Durable-state path

Findings of record: `01-AUDIT-FINDINGS.md` (this folder). Cross-domain hand-offs are in
the structured output `cross_domain_notes`. Prior durable state this reconciles with:
`.ai/03_plans/database-indexing-and-query-performance/`,
`.ai/03_plans/2026-06-17-Performance-Refactor/14_PHASE_8_SUPABASE_DB_PLAN.md`,
`.ai/09_archive/2026-06-19-Workshop-Dashboard-Query-Batching/`.
