# Verification, Rollout, And Final Audit

## Applicability Gates

| Frontier gate | Applicable | Initial criterion state | Why | Required proof |
|---|---|---|---|---|
| GATE-UX-01 | yes | FAIL | New cockpit, risk table, filters, responsive and accessible interactions | Focused DOM/a11y plus browser-only navigation/reflow proof |
| GATE-NEXT-01 | yes | FAIL | App Router Data route, server/client DTO, URL state, cache/invalidation | Installed Next 16 docs read, type/lint/build, route contract tests |
| GATE-CONTRACT-01 | yes | FAIL | New exported domain/DTO/filter contracts | Consumer map, runtime parsing, compatibility tests |
| GATE-DATA-01 | yes | FAIL | D1 columns, policy table, repository queries | Clean local apply/replay, constraints, authz, query budget, fix-forward |
| GATE-SEC-01 | yes | FAIL | New workspace/project/row policy reads and actor matrix extend authorization-sensitive data paths | Cross-workspace/project/row denial, server-derived actor identity, bounded DTO, and safe error/log tests |
| GATE-VERIFY-01 | yes | FAIL | New behavior, migration, failure and readiness claims | Red-first tests, adversarial matrix, error-handling gate |
| GATE-PERF-01 | yes | FAIL | Row-cardinality query and evaluation path | 5k measured evaluator and 50k truncation reasoning |
| GATE-OPS-01 | yes | FAIL | Staged release and health telemetry contract | Rollout/fix-forward, redacted signals, evidence freshness |
| GATE-CLEAN-01 | yes | FAIL | Capability extraction and duplicated-rule removal | Characterization before extraction, caller scan, no unrelated cleanup |
| GATE-AGENT-01 | no | N/A | No prompt/agent/runtime contract changes | Plan-pack validator only |

Agent-assisted planning and review do not change an agent/prompt/runtime contract,
so `GATE-AGENT-01` remains `N/A` unless execution changes that contract.

Manifest gates summarize these applicability checks:

- GATE-001: domain/data/contract integrity;
- GATE-002: UX/drill-through/accessibility;
- GATE-003: performance/reliability/observability;
- GATE-004: regression/build/migration proof;
- GATE-005: rollout, cleanup, and final audit.

## Test And Evidence Matrix

| Test ID | Setup and procedure | Expected failing signal before implementation | Expected pass signal | Evidence destination | Cleanup/failure response |
|---|---|---|---|---|---|
| TEST-001 | Fixed-clock health fixture with recorded, inherited, synthesized-fallback, and missing provenance; run pure rule tests twice | Missing module/types, absent issues, or fallback falsely counted as provenance | Stable grade/issues/counts/totals; synthesized fallback is `provenance-missing` and never fresh/verified | `.ai/99_scratch/estimate-intelligence-unit-003.md` | No external state; reopen UNIT-003 |
| TEST-002 | `tests/vitest/estimate-intelligence-migration.test.ts`: clean temp D1, apply 0055, read legacy row, create/edit typed project, replay twice, invalid-value scan and denial cases | Missing columns/actions/policy/fact tables or non-idempotent replay | Null-safe legacy read, exact round-trip, fact constraints/indexes, double replay green, cross-workspace denial | `.ai/99_scratch/estimate-intelligence-unit-002.md` | Delete temp DB; fix migration forward |
| TEST-003 | `tests/vitest/estimate-row-provenance-producers.test.ts`: exercise library insert, estimate/tab copy, subtree restore, unsupported row restore, template author/copy, reusable-source copy, every AI row/template/package path, synthetic proof writers, direct seed classification, and a legacy null; run policy parity | Origin lost/invented, unclassified writer, or fixed-policy divergence | Exact creation/preservation behavior on every product path; unsupported restore unavailable; non-product writers explicit; legacy remains missing; policy parity | UNIT-002/003 receipts | Delete fixture rows; reopen schema/domain unit |
| TEST-004 | `tests/vitest/project-data-health-repository.test.ts` and `tests/vitest/project-data-health-query-budget.test.ts`: authorized healthy/risky/mixed/truncated fixtures, unauthorized project, query counter, payload bytes, and `EXPLAIN QUERY PLAN` | No health DTO or unbounded/per-row query | Correct compact DTO, effective budget source, no unauthorized IDs, <=5 statements, named index use, bounded payload | UNIT-004/007 receipts | Reset fixture DB; reopen UNIT-004 |
| TEST-005 | Route-state round-trip and DOM selection/clear/back behavior | Unknown filters or no row link | Canonical URL repair and exact row result count | UNIT-005/007 receipts | Clear URL state; reopen UNIT-005 |
| TEST-006 | `tests/vitest/estimate-revision-fact-producers.test.ts` plus `tests/vitest/estimate-revision-intelligence.test.ts`: prove forward adjustment/template/package/row facts, atomic completeness, same-estimate baseline/high-water ordering, legacy/partial/gap/late/duplicate/tombstone/cross-estimate/drift cases | Missing producer fact or fabricated decomposition | Exact reconciled delta for complete evidence; deterministic typed unavailable for every incomplete/legacy/unstable range; no named-version UI | UNIT-006 receipt | Delete temp DB; reopen UNIT-006 |
| TEST-007 | `scripts/benchmark-estimate-health.ts`, `tests/vitest/estimate-health-benchmark.test.ts`, and query-budget test evaluate 5,000/50,000 rows over 20 warm samples | No executable budget or unbounded payload/RSS | p50/p95/max, delta/peak RSS, payload/query facts, artifact digest, and deterministic truncation satisfy budgets | `.ai/99_scratch/estimate-intelligence-performance.json` plus receipt | Delete temp DB/report after digest; optimize UNIT-004 |
| TEST-008 | DOM a11y tests for keyboard, names, live result count, empty/error/mixed/truncated; targeted browser route/focus/reflow | Missing semantics/state | All DOM assertions and named browser claims pass | UNIT-005/007 receipt | Stop dev server/browser; keep gap failing if unavailable |
| TEST-009 | Existing project-data/chart/library golden suites plus static duplicate-rule scan | Existing regressions or duplicated formulas | Existing outputs unchanged and one health-policy owner | UNIT-007/final receipt | Revert extraction only; reopen UNIT-007 |
| TEST-010 | Full targeted matrix, typecheck, lint, error handling, local migration, Cloudflare build, diff and final trace audit | Any failed command/orphan/stale receipt | All commands exit zero; traceability complete | `.ai/99_scratch/estimate-intelligence-final-audit.md` | Reopen earliest causal unit |

## Supporting Review Artifacts

- `TEST_AND_ADVERSARIAL_QA.md` expands negative paths, fixture topology,
  red-first signals, maker/checker separation, and receipt freshness.
- `PERFORMANCE_RELIABILITY_AND_OBSERVABILITY.md` owns measured budgets,
  deterministic/truncation/retry behavior, structured signals, and triage.
- `PRICE_POLICY_DATA_AND_MIGRATION_PLAN.md`,
  `REPOSITORY_DTO_AUTHORIZATION_AND_QUERY_CONTRACTS.md`,
  `COCKPIT_UX_DRILL_THROUGH_AND_ACCESSIBILITY.md`, and
  `ACTIVITY_REVISION_INTEGRATION_CONTRACT.md` hold boundary-specific denial and
  failure matrices.

These supporting documents are not evidence. This file documents stable
TEST/GATE IDs, their planning baseline, and the completion index; current live
status remains solely in `plan-pack.json`.

## Verification Commands

Run narrow checks immediately after each unit, then this final sequence:

```bash
bunx vitest run \
  tests/vitest/estimate-row-provenance-producers.test.ts \
  tests/vitest/estimate-revision-fact-producers.test.ts
bunx vitest run tests/vitest/estimate-intelligence-migration.test.ts
bunx vitest run \
  tests/vitest/project-data-health-repository.test.ts \
  tests/vitest/project-data-health-query-budget.test.ts
ESTIMATE_HEALTH_BENCHMARK_ROWS=5000,50000 \
ESTIMATE_HEALTH_BENCHMARK_SAMPLES=20 \
OUTPUT_FILE=.ai/99_scratch/estimate-intelligence-performance.json \
  bun scripts/benchmark-estimate-health.ts
bunx vitest run tests/vitest/estimate-health-benchmark.test.ts
bunx vitest run \
  tests/vitest/estimate-health-rules.test.ts \
  tests/vitest/estimate-price-policy.test.ts \
  tests/vitest/project-data-health-repository.test.ts \
  tests/vitest/project-data-health-route-state.test.ts \
  tests/vitest/estimate-revision-intelligence.test.ts \
  tests/vitest/library-source-trust.test.ts \
  tests/vitest/project-data-repository.test.ts \
  tests/vitest/project-charts-golden-master.test.ts
bun run type-check
bun run lint
bun run validate:error-handling
bunx wrangler d1 migrations apply ARCH_DB --local
bunx wrangler d1 migrations apply ARCH_DB --local
bun run cf:build
git diff --check -- \
  migrations src tests/vitest \
  .ai/03_plans/2026-07-10/Estimate-Intelligence-And-Price-Governance
bun run validate:plan-pack -- \
  .ai/03_plans/2026-07-10/Estimate-Intelligence-And-Price-Governance
```

Expected signal: every command exits zero; the migration replay reports no new
pending migration after the first apply; no broad lint/type/build failure is
silently classified as unrelated without source evidence.

The final audit must also emit `BETA-P1-10-ESTIMATE-RECEIPT-v1`. It binds the
caller map (`ProjectDataClient`, `CostComparisonBoard`, health and revision
capabilities), pre-change characterization commands/results, the bounded
extract-or-retain decision, exact changed files and hashes, focused and
regression tests, pack/source/diff hashes, and independent verifier identity and
result. Missing, stale, incomplete, or self-authored-only receipt evidence keeps
the Program contributor row red.

## Rollout And Final Audit Index

`ROLLOUT_FIX_FORWARD_AND_COMPLETION_GATE.md` is the independent staged rollout,
compatibility fix-forward, cross-pack receipt, local-versus-hosted boundary,
final audit, and completion handback. Any negative answer there reopens its
earliest causal unit and blocks completion.
