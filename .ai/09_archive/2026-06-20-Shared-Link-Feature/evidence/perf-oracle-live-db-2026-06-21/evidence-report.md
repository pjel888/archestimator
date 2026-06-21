# Live DB Performance Evidence Report

**Generated:** 2026-06-21T13:29:25.656Z
**Mode:** linked
**Proof boundary:** linked-provider

**MIGRATION GUARDRAIL REMINDER:** Live evidence is required before any index migration or RPC rewrite proposal.

## Repo-static artifacts

- Query inventory: `.ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-oracle-live-db-2026-06-21/query-inventory.md`
- Query/index audit: `.ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-oracle-live-db-2026-06-21/query-index-audit.md`

## Live evidence target

- Target: linked Supabase project ebxxqidacheyapmmzavr
- Available: yes
- Artifacts: `.ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-oracle-live-db-2026-06-21/live-evidence.sql`, `.ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-oracle-live-db-2026-06-21/live-evidence-raw.json`

## Prerequisite errors

None.

## What this evidence proves

| Boundary | Meaning |
| --- | --- |
| repo-static | Source-only inventory; no runtime behavior, no provider metrics. |
| linked-provider | Read-only SQL ran against a linked Supabase project. |
| local-only | Read-only SQL ran against a local Postgres instance. |
| manual-proof-pending | Live SQL was generated but not executed; human/provider run required. |

## Next steps

- Review live-evidence-raw.json for high-cost queries and missing indexes.
- Capture EXPLAIN plans for specific queries identified in the repo inventory before proposing indexes.
- Validate candidate indexes on a representative staging copy before writing migrations.

## Non-goals enforced

- No index migration was created.
- No RPC rewrite was created.
- No provider secret or connection string was printed.
