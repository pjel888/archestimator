# Database Indexing & Query Performance Strategy

**Date:** 2026-05-30
**Status:** Repo-only DBIDX-001 audit helper implemented on 2026-06-02. No indexes implemented. No migrations created.

## Purpose

Formal strategy for database indexing, query-plan validation, and Supabase performance readiness. Exists to guide future Codex/Ralph Loop agents through atomic indexing/audit cards without speculative DDL.

## Explicit Warnings

- This plan is **not evidence of implementation.**
- Do **not** create migrations until the audit and EXPLAIN phase is complete.
- Do **not** apply indexes directly to production.
- Do **not** treat candidate SQL in this plan as ready-to-run DDL.

## Reading Order

1. `00-executive-brief-and-scope.md` — Why we need indexing, what's in/out of scope
2. `01-current-query-and-index-inventory.md` — Read-only SQL for live introspection
3. `02-critical-user-flows-and-hotspots.md` — User flows mapped to query shapes
4. `03-index-strategy-and-prioritization.md` — P0–P4 prioritization lanes
5. `04-implementation-phases-and-goal-cards.md` — Atomic goal cards for Codex
6. `05-validation-protocol-explain-and-pg-stat-statements.md` — How to prove index value
7. `06-risk-rollback-and-maintenance.md` — What can go wrong and how to recover
8. `07-codebase-ai-implementation-prompts.md` — Future prompts for coding agents

## Relationship to Roadmap

| Phase | Lane | Scope |
|-------|------|-------|
| Audit & parity check | BETA P0 | Query/index inventory, migration parity, EXPLAIN protocol |
| Selected staging-tested indexes | BETA P1 | Critical path composite indexes with EXPLAIN evidence |
| Search/indexing expansion | ENTERPRISE MVP | pg_trgm/full-text strategy; long-term query observability |

## Success Definition

- Critical query flows have EXPLAIN evidence
- Candidate indexes are ranked by evidence
- Staging migration strategy exists with rollback plan
- No speculative index bloat
- No migration created without EXPLAIN before/after comparison

## Current Local Artifact

- `bun run dbidx:audit-repo`
- `.ai/09_archive/store/2026-06-02-CODEX-P0-DBIDX-001/repo-only-query-index-audit.md`

The local artifact covers the repo-derived query map and migration-derived index inventory. Live Supabase metrics are explicitly unavailable and not fabricated.

## Next Safe Action

Run `CODEX-P0-DBIDX-002` / `CODEX-P0-DBIDX-003` only after staging/read-only DB access is confirmed, or after an owner-approved local staging database with representative seed data is available.

Do not create a migration until DBIDX-001/002/003 are complete and Philip approves the candidate shortlist.
