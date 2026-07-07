# 19 — Research, Review, and QA Evidence

## Research questions and sources

This is a codebase-grounded planning pack. The "research" is repository archaeology + Cloudflare/D1/R2 semantics, not external market research. Validator-gated per the autoresearch contract.

| # | Question | Primary source | Finding | Decision it shaped |
|---|---|---|---|---|
| R1 | Does the Worker enable D1 FK enforcement? | `rg "foreign_keys\|PRAGMA" src/ migrations/` | **No** (empty) | The headline P0 (ORPH-015); Track A/B split; DATA-002 readback |
| R2 | Is `database.batch()` atomic? | D1 docs + `src/lib/projects/actions.ts:294` | Yes, single implicit txn | ASSUMP-001; O-1 only fails if FK off |
| R3 | Is `IMAGES` an object store? | `src/lib/uploads/server-image-processing.ts:109-117` | No, transform-only → R2 | Out-of-scope confirmation |
| R4 | Is there any production workspace/user delete? | `rg "DELETE FROM workspaces\|DELETE FROM \"user\"\|deleteWorkspace"` | Only proof/test routers | ASSUMP-003; OPEN-DEC-002 |
| R5 | Do existing tests detect orphans? | `rg "orphan\|dangling\|referential\|foreign_key_violation"` in `tests/`,`scripts/` | No | Greenfield tooling; DATA-001 harness |
| R6 | Is R2 `list()` metered? | Cloudflare R2 pricing (Class B ops) | Yes | PERF-002 cap; `20` worksheet |
| R7 | Are the declared retention classes all implemented? | `src/lib/compliance/retention-core.ts:79-143` | 7 of 14; `uploads_orphaned`/`sessions_expired` unimplemented | DB-CHG-004; OPEN-DEC-003 |
| R8 | Does any path set `upload_assets.status='deleted'`? | `rg` in `src/` | No | ORPH-012; cleanup job finds nothing today |

**Current official vs community:** R2/D1 semantics sourced from official Cloudflare docs (retrieval-first per AGENTS.md Cloudflare skill guidance). No community convention relied upon.

**Searched for but not found:** an existing `cf:orphan*`/`cf:integrity*` script — confirmed absent. A full-schema D1 test harness — confirmed absent.

**Validation rubric:** each finding is sourced to a file:line or an official doc; inferences (ASSUMP-007/008) are labeled and have validation tasks.

## Skills and workflows used or unavailable

- Used: `archestimator-plan-pack` (structure), `cloudflare`/`cloudflare-one-migrations` (D1 semantics), `supabase-postgres-best-practices` (FK contrast only), `durable-objects` (boundary). Read for context; no Supabase mutation.
- Not invoked (proportional): GitNexus MCP impact tools — no symbol edits in a planning task; `rg` + targeted reads were cheaper per AGENTS.md graph policy.
- Unavailable: native independent verifier lane → `emulated`, cap applied.
- Not applicable: `playwright`/browser QA (no browser-only claim), Supermemory (no local server configured; `.ai/` is canonical).

## Specialist workstream outputs (summary pointers)

| Workstream | Output location |
|---|---|
| Product strategy | `01`, `02` |
| Codebase architecture | `03`, `06`, `10` |
| UX/a11y | `05` |
| Frontend components | n/a (no UI) — reason in `05`/`18` |
| Backend/API | `06`, `07` |
| Data/database/integrity | `03`, `07`, `15` (ASSUMP) |
| Security/privacy | `08` |
| Performance/reliability | `09` |
| Testing/QA | `12` (matrix), this file (adversarial) |
| Rollout/ops | `13` |
| Blast radius | `10` |
| Adversarial | below |
| Final verifier | `17` |

## Critique-and-revision cycle summaries

See `17` §"Critique-and-revision cycle log." 3 meaningful cycles; cap not exceeded. Residual findings are external (OPEN-DEC-001/002) or low-value.

## UltraQA-style adversarial scenario matrix

**Dynamic adversarial QA applies to the future implementation, not this planning pack.** Justification: this is `planning-only` per PROMPT.md; there is no runtime behavior to adversarially test yet. The matrix below specifies what the future implementation must pass (also in `12`).

| ID | Model | Scenario | Expected signal | Status |
|---|---|---|---|---|
| AQ-1 | operator | empty-DB dry-run | 0 orphans, exit 0 | specified |
| AQ-2 | operator | 1M-row dry-run | paginated, ≤ budget | specified |
| AQ-3 | attacker w/ report | secret scan | 0 hits | specified (TEST-003) |
| AQ-4 | operator | repair w/o token | refused | specified |
| AQ-5 | operator | tampered report | schema-mismatch refused | specified |
| AQ-6 | operator | double repair | 2nd no-op | specified |
| AQ-7 | network | R2-list mid-failure | partial + gap | specified |
| AQ-8 | operator | cost cap hit | abort + partial | specified |
| AQ-9 | bug | detection writes | abort + error | specified (TEST-002) |
| AQ-10 | concurrency | dual repair | idempotent | specified |
| AQ-11 | drift | manifest misses edge | snapshot fails | specified |
| AQ-12 | malformed | bad flag | hard error | specified |

Hostile/edge cases from the directive considered: malformed input (AQ-12), missing/empty (AQ-1), oversized (AQ-2), unauthorized (AQ-4), cross-tenant (n/a — operator tool, global by design with per-finding workspace scoping), stale state (the report is the state; re-run idempotent — AQ-6), duplicate (AQ-6), race (AQ-10), third-party failure (AQ-7), cache staleness (n/a — no cache), rollback after partial success (REL-001), misleading success output (exit-code contract in `05`), dirty worktree (AGENTS.md shared-worktree discipline in `11`).

## Performance evaluator contract

See `09`. Two evaluators: detection dry-run (wall-clock ≤60s) and R2 reconciliation (cost ≤ cap). Both name fixture size, runs, regression threshold, rollback trigger, evidence artifact.

## Independent final verifier evidence

`verification_mode: emulated`. The verifier pass is documented in `17` with the requirement-by-requirement audit, the score table, and the explicit cap. No independent native verifier was available in-session.

## Explicit validation gaps

1. **ASSUMP-007 (index coverage):** `0031_performance_indexes_additive.sql` coverage of ref columns is assumed but unverified. Phase 2 PERF-001 EXPLAIN gate validates it.
2. **ASSUMP-008 (38 migrations apply in `node:sqlite`):** proven for 1 migration; 38 is Phase 1 work.
3. **Hosted D1 FK readback path:** the exact mechanism to readback `PRAGMA foreign_keys` from the hosted binding is documented conceptually; the hosted adapter implementation will confirm.
4. **Production orphan counts:** unknown until the first preview/prod dry-run. This is expected (the audit's purpose is to find them), not a defect.

None of these gaps block the implementation-ready core (Phases 1–5, 7, 9). They are labeled and tasked.
