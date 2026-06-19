# Live DB Performance Evidence Report

**Generated:** 2026-06-19T03:31:54.373Z
**Mode:** static
**Proof boundary:** repo-static

**MIGRATION GUARDRAIL ACTIVE:** This evidence is not sufficient to create index migrations or RPC rewrites.

## Repo-static artifacts

- Query inventory: `.ai/08_prompts/kimi/1st-Pass-Completed__06-live-db-performance-evidence-workflow/sample-evidence/query-inventory.md`
- Query/index audit: `.ai/08_prompts/kimi/1st-Pass-Completed__06-live-db-performance-evidence-workflow/sample-evidence/query-index-audit.md`

## Live evidence target

- Target: none
- Available: no
- Artifacts: none

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

- Re-run with --mode linked --run-sql against a staging Supabase project when credentials/linking are available.
- Re-run with --mode local --run-sql when a representative local Postgres seed database is ready.
- Do not author index migrations until live EXPLAIN and row-count evidence exist.

## Non-goals enforced

- No index migration was created.
- No RPC rewrite was created.
- No provider secret or connection string was printed.
