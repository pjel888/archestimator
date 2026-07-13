# Plan Pack — Cost Library Data Governance and Source Trust

Date: 2026-07-07
Plan folder: `.ai/03_plans/2026-07-07-cost-library-data-governance-and-source-trust/`
Plan profile: `exhaustive`
Plan status: **`CONDITIONALLY READY`** (named slices may proceed; see below)
Verification mode: `emulated` (caps overall readiness at 97; see `17`)
Overall readiness: **95/100** (post Improve-Plan audit + repair; see `17`/`20`)
Authoritative execution guide: **`11_IMPLEMENTATION_PLAN.md`**

> **Improve-Plan pass complete (2026-07-07).** The pack was audited against the directive, re-verified against current `main`, and repaired. Drift found + fixed: migration renumbered `0037`→`0038` (the `0037` slot was taken the same day), D1 table citation corrected (`0028` not `0026`), schema gap G2 scoped D1-only (Supabase already has the columns), and migration-tree convention disambiguated. Directive-required artifacts added: route cache contract (`06`), Attack Surface Inventory (`08`), action-level a11y proof matrix (`05`), D1/Cloudflare per-resource budget (`09`), proof-contract rows (`12`), directive-schema traceability matrix (`16`). Audit trail in `20_AUDIT_AND_REVISION_LOG.md`.

## What this is

A planning-only pack to make Archestimator's cost library **trustworthy, reviewable, and honestly surfaced** in estimating workflows before first users — governing source provenance, draft/review workflow, trust labels, stale data, import/export safety, and estimate impact. **No application code, tests, migrations, or provider state are changed by this pack.**

## Status and named-slice guidance

**`CONDITIONALLY READY`.** Overall readiness 96/100 (emulated cap 97). The package is blocked from `IMPLEMENTATION-READY` by (a) `verification_mode: emulated` (no native independent verifier available at planning time) and (b) external owner decisions `OPEN-1` (seed/backfill mode), `OPEN-2` (currency/region), `OPEN-3` (confidence taxonomy), `OPEN-5` (reviewer role).

**May proceed to implementation now (no external blocker):**
- **P0** (`TASK-001..004`) discovery + types + flag + authz — under `OPEN-5` assumption
- **P1** (`TASK-005..008`) D1 migration `0038` + repository projection — under `OPEN-1` Mode A default
- **P2** (`TASK-009..014`) review actions + origin — under `OPEN-5`
- **P3** (`TASK-015..019`) trust-model wiring — under `OPEN-3` free-text fallback
- **P4** (`TASK-020..022`) stale propagation

**Gated by owner decisions:**
- **P5** import data shape (`OPEN-6`, resolved CSV-first by `DEC-5` — safe to start)
- **P6** region/version UI (`OPEN-2`)
- Full `origin='owner-accepted'` semantics (`OPEN-1`)

To lift to `IMPLEMENTATION-READY`: resolve `OPEN-1` + `OPEN-5`, complete `TASK-001` D1 discovery, and obtain independent/owner acceptance of the package.

## Implementation start

Start at **`11_IMPLEMENTATION_PLAN.md`**, Phase 0. Follow the phase dependency graph:

```
P0 -> P1 -> {P2, P3} -> P4 -> P5 -> P6 -> P7
```

## Documents in this pack

| Doc | Purpose |
|---|---|
| `00_AGENT_COORDINATION.md` | Master `/goal`, ledger, skills, open decisions, autopilot/loop contract |
| `01_EXECUTIVE_SUMMARY.md` | Problem, target state, findings, decisions, phases, scores |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Brief, scope, non-goals, source authority |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Evidence backbone — files, symbols, gaps |
| `04_REQUIREMENTS_SPECIFICATION.md` | `REQ-1..16` + shadow-path matrices |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | Journeys, states, a11y, browser-proof decision |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Current/target arch, data flow, boundaries |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | Migration blueprint, API contracts, access-path matrix |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Threat model, denial tests |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Budgets, evaluators, failure modes |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Direct/transitive impact, affected tests |
| `11_IMPLEMENTATION_PLAN.md` | **Authoritative execution guide — phases, tasks, blueprints** |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test execution matrix, commands |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Flag, gates, rollback, runbooks |
| `14_RISK_REGISTER.md` | `RISK-1..15` |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | `DEC-1..6`, assumptions, `OPEN-1..6` |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Full traceability |
| `17_FINAL_READINESS_REVIEW.md` | Verifier audit, scores, caps |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Cross-cutting production decisions |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research, cycles, UltraQA matrix, evaluator contract |
| `20_AUDIT_AND_REVISION_LOG.md` | Improve-Plan audit: inventory, scorecard, adversarial findings, drift repairs |

## Requirement/task/test traceability

- Requirements: `04` (`REQ-1..16`).
- Traceability matrix: `16`.
- Tasks: `11` (`TASK-001..038`), each referencing requirement IDs.
- Tests: `12` execution matrix + `19` adversarial matrix.

## Blocked decisions table

| ID | Decision | Owner | Unblocks |
|---|---|---|---|
| `OPEN-1` | Seed/import authoritative cost data + backfill Mode A/B | Philip | full accept-state semantics |
| `OPEN-2` | Currency/region model | Philip | P6 region/version UI |
| `OPEN-3` | Confidence taxonomy (enum vs free text) | Philip | P3 chip semantics |
| `OPEN-5` | Reviewer role boundary | Philip | P0/P2 authz naming |
| `OPEN-6` | Import format priority | Philip | P5 ordering (resolved CSV-first by `DEC-5`) |

(`OPEN-4` stale mechanism resolved by `DEC-4`.)

## Stale-plan revalidation checklist

Before implementing, the implementation AI must re-verify (repo may have moved):
1. `git status` + re-read every file this pack names in `10`/`11`.
2. Confirm `migrations/0038` slot is still free (no concurrent agent took it after this pack was written; `0037` was taken on 2026-07-07 by `0037_remove_preloaded_component_categories.sql`); renumber if needed.
3. Confirm `actions.ts`, `source-trust-model.ts`, `d1-access.ts`, `component-library-repository.ts`, `estimate-repository` paths/symbols still match (`03`).
4. Re-confirm the dual-persistence gap (grep `accept_cost_library_cost_entry` in `actions.ts` = 0).
5. Re-confirm `source-changed` is still read-not-written (grep write sites).
6. Re-check `current-state.md` for any cost-library or migration changes since 2026-07-07.
7. Confirm `bun run` scripts in `12` still exist and read known-red commands.

## Commands/checks before the first edit

- `git status` (confirm clean working tree or isolated scope)
- `bun run type-check`
- `rg "accept_cost_library_cost_entry" src/` (expect 0 in actions.ts)
- `rg "link_state\s*=|linkState\s*=" src/lib/estimates src/lib/component-library` (confirm write sites)
- `ls migrations/ | tail` (confirm 0038 free)

## Files explicitly off-limits (this is planning-only)

All files outside `.ai/03_plans/2026-07-07-cost-library-data-governance-and-source-trust/`. Specifically: no `src/`, `tests/`, `migrations/`, `supabase/`, `package.json`, `wrangler.jsonc`, or provider-state changes result from this pack.

## Files and systems intentionally unaffected

- Better Auth, Durable Objects, Queues/Cron, Cloudflare Email, R2 attachment routes, estimate pricing math, proposal `.xlsx` format, Supabase runtime (reference only).

## External proof required before production rollout

- Local D1 migration apply clean (`wrangler d1 migrations apply --local`).
- D1 CHECK-on-ALTER discovery result (`TASK-001`).
- Preview route verify + readiness + perf evaluators (`cf:verify-preview-routes`, `cf:check-readiness`, `09` evaluators).
- Remote D1 readback after migration apply.
- Hosted route perf baseline + within-budget proof.
- Adversarial matrix (`19`) all-green.
- Owner acceptance of `OPEN-1,2,3,5`.

## Archive policy

Do not archive automatically. Archive only after full implementation lands, all gates in `13` pass, and owner confirms. Named completed slices may be archived independently (P0–P4 vs P5–P6).

## One-line summary

Port the durable Supabase cost-library trust-governance contract onto the active D1 + Next.js path, wire the existing trust model/chips/gate to real review state, close the dead `source-changed` stale-propagation branch via computed-on-read, and add safe CSV/JSON import/export — without inventing authoritative cost data and with all owner decisions marked.
