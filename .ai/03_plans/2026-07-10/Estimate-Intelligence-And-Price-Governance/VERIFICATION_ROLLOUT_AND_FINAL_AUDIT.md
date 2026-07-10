# Verification, Rollout, And Final Audit

## Applicability Gates

| Frontier gate | Applicable | Initial criterion state | Why | Required proof |
|---|---|---|---|---|
| GATE-UX-01 | yes | FAIL | New cockpit, risk table, filters, responsive and accessible interactions | Focused DOM/a11y plus browser-only navigation/reflow proof |
| GATE-NEXT-01 | yes | FAIL | App Router Data route, server/client DTO, URL state, cache/invalidation | Installed Next 16 docs read, type/lint/build, route contract tests |
| GATE-CONTRACT-01 | yes | FAIL | New exported domain/DTO/filter contracts | Consumer map, runtime parsing, compatibility tests |
| GATE-DATA-01 | yes | FAIL | D1 columns, policy table, repository queries | Clean local apply/replay, constraints, authz, query budget, fix-forward |
| GATE-SEC-01 | no | N/A | No auth/session/public credential contract changes | Existing authorization predicate is still tested under DATA/VERIFY gates |
| GATE-VERIFY-01 | yes | FAIL | New behavior, migration, failure and readiness claims | Red-first tests, adversarial matrix, error-handling gate |
| GATE-PERF-01 | yes | FAIL | Row-cardinality query and evaluation path | 5k measured evaluator and 50k truncation reasoning |
| GATE-OPS-01 | yes | FAIL | Staged release and health telemetry contract | Rollout/fix-forward, redacted signals, evidence freshness |
| GATE-CLEAN-01 | yes | FAIL | Capability extraction and duplicated-rule removal | Characterization before extraction, caller scan, no unrelated cleanup |
| GATE-AGENT-01 | no | N/A | No prompt/agent/runtime contract changes | Plan-pack validator only |

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
| TEST-002 | Clean local D1, apply migration, read legacy row, create/edit typed project, replay migration, denial cases | Missing columns/actions/policy table | Null-safe legacy read, exact round-trip, replay green, cross-workspace denial | `.ai/99_scratch/estimate-intelligence-unit-002.md` | Delete temp DB; fix migration forward |
| TEST-003 | Producer-to-D1 fixtures for recorded/inherited/synthesized/missing origin plus a legacy unmarked row; workspace/category policies with valid/invalid/missing values; library and health adapters | Origin lost after fallback, legacy origin falsely inferred, fixed constants, or classification divergence | Exact persisted origin round-trip, legacy remains missing, override/default/fallback and cross-consumer parity | UNIT-002/003 receipts | Delete fixture rows; reopen schema/domain unit |
| TEST-004 | Repository fixture with healthy/risky/mixed/truncated estimates and unauthorized project | No health DTO | Correct compact DTO, effective budget source, no unauthorized IDs | UNIT-004/007 receipts | Reset fixture DB; reopen UNIT-004 |
| TEST-005 | Route-state round-trip and DOM selection/clear/back behavior | Unknown filters or no row link | Canonical URL repair and exact row result count | UNIT-005/007 receipts | Clear URL state; reopen UNIT-005 |
| TEST-006 | Explicit same-estimate baseline event plus current high-water range; exercise same-timestamp ordering, missing/partial range, duplicate/late event, deleted-row tombstone, cross-estimate ID, and high-water drift | No executable baseline contract or fabricated decomposition | Exact reconciled delta for complete evidence; deterministic unavailable for incomplete/unstable/cross-estimate evidence; no named-version UI or mutation | UNIT-006 receipt | No persistent state; reopen UNIT-006 |
| TEST-007 | 5,000-row measured query/evaluation/payload fixture and 50,000-row truncation evaluator | No budget or unbounded payload | Budgets below thresholds and deterministic truncation | `.ai/99_scratch/estimate-intelligence-performance.json` plus receipt | Delete temp DB/report after digest; optimize UNIT-004 |
| TEST-008 | DOM a11y tests for keyboard, names, live result count, empty/error/mixed/truncated; targeted browser route/focus/reflow | Missing semantics/state | All DOM assertions and named browser claims pass | UNIT-005/007 receipt | Stop dev server/browser; keep gap failing if unavailable |
| TEST-009 | Existing project-data/chart/library golden suites plus static duplicate-rule scan | Existing regressions or duplicated formulas | Existing outputs unchanged and one health-policy owner | UNIT-007/final receipt | Revert extraction only; reopen UNIT-007 |
| TEST-010 | Full targeted matrix, typecheck, lint, error handling, local migration, Cloudflare build, diff and final trace audit | Any failed command/orphan/stale receipt | All commands exit zero; traceability complete | `.ai/99_scratch/estimate-intelligence-final-audit.md` | Reopen earliest causal unit |

## Adversarial Matrix

The tests must cover:

- explicit origin producer values persisted before fallback, a plausible legacy
  source/date with no marker that remains missing, and public snapshot output
  that does not expose the internal origin field;

- nil project, no estimates, no rows, missing policy, missing budget, invalid date;
- negative/NaN/infinite analytical input rejected at server boundary;
- threshold boundary at exactly stale/very-stale day and one instant beyond;
- category override deletion and cache invalidation;
- cross-workspace project/policy read and write denial;
- 5,001+ rows and continuation cursor tampering;
- mixed currency and unsupported currency code;
- stale client policy revision during mutation/revalidation;
- duplicate policy submission/idempotent retry;
- explicit baseline selection, same-timestamp stable-ID ordering, missing event
  range, partial before/after facts, duplicate/late event, deleted row with and
  without tombstone, cross-estimate boundary, changed high-water mark, and proof
  that no named-version compare/restore surface is introduced;
- D1 timeout/error and client retry without a false healthy fallback;
- keyboard-only filter/clear/back flow, 200% zoom/reflow, reduced motion;
- logs/errors containing no project name, row copy, raw amount list, actor, or URL
  token.

Prompt-injection text placed in row description is treated as inert customer data
and never copied into logs, rule IDs, commands, or operator guidance.

## Performance And Reliability Budgets

| Surface | Fixture | Budget | Evaluator | Rollback trigger |
|---|---|---|---|---|
| Pure health evaluation | 5,000 normalized rows, fixed clock | p95 under 50 ms over 20 warm samples on recorded local environment | dedicated benchmark test | p95 exceeds 75 ms or grows worse than linear |
| Repository fact load | 5,000 rows, 50 categories, 100 suppliers | no more than 5 D1 statements after auth/project resolution; no per-row query | D1 mock/query counter and local explain | query count increases or full unindexed policy scan appears |
| Summary payload | 5,000 rows, 10 issue classes | under 200 KB before compression; row detail paginated at 100 IDs | serialized byte count | payload exceeds 250 KB |
| Client render | 10 KPI/risk groups and 100 visible details | no more than 100 detail rows mounted; stable layout | DOM profiler/render counter | unbounded mount or interaction regression |
| 50k reasoning | synthetic facts | summary still deterministic; details truncated/paginated; no memory-proportional copy beyond normalized facts | static/evaluator proof | process memory exceeds recorded 2x 5k scaling without explanation |

Performance evidence records hardware/runtime, Node/Bun version, fixture hash,
samples, p50/p95/max, query count, payload bytes, diff hash, and timestamp.

## Error And Observability Contract

- Repository failures use existing structured error helpers and request IDs.
- Emit operation name, duration bucket, selected estimate count, evaluated row
  count, issue count by stable rule ID, policy revision, truncation flag, and
  success/failure class.
- Do not log row IDs in bulk, raw amounts, row descriptions, project/client names,
  URLs, or user identifiers.
- UI error state offers retry and never displays a cached `healthy` grade after a
  failed refresh.
- `validate:error-handling` is mandatory because repository/actions are touched.

## Verification Commands

Run narrow checks immediately after each unit, then this final sequence:

```bash
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

## Rollout And Fix-Forward

### Stage 0 - Compatibility dark path

- Ship additive nullable columns, policy table, pure engine, and repository tests
  without changing the default Data UI.
- Compare current library classification to the canonical evaluator in tests.
- Go only if migration/read compatibility and policy fallback are green.

### Stage 1 - Internal cockpit

- Enable cockpit for local/internal cohort through an existing operational flag
  if one is already established; otherwise use a server-side constant scoped to
  the route and remove it after proof rather than adding infrastructure.
- Monitor structured failures, truncation, and evaluation duration.
- Go only if no total/chart regressions and query budgets pass.

### Stage 2 - Beta cohort

- Expose health/drill-through; revision capability may remain visibly unavailable
  when history evidence is insufficient.
- Validate warning usefulness with support feedback without logging raw estimate
  content.
- Go only if false-positive/false-negative fixture review is accepted by the
  product test matrix and support has a recovery path.

### Stage 3 - Default

- Remove temporary flag/dead branch after evidence freshness review.
- Production/provider release requires its own deployment and D1 migration proof;
  local completion does not set `release_status=READY`.

Rollback is compatibility-first: disable UI consumption, keep additive columns
and table, preserve writes, and fix forward. Do not attempt destructive D1 column
removal as an incident response. If policy causes reclassification, pin reads to
the 90/180 fallback while retaining rows for repair.

## Final Audit Checklist

The independent verifier must answer each with evidence:

1. Every original BETA-P1-01/02/03/08 requirement maps to a passing criterion.
2. BETA-P1-10 extraction changed only touched analytics capabilities.
3. No output-parity or Publisher-owned identity/funnel work entered the diff.
4. Activity History files were not edited without a recorded lease and post-edit
   compatibility proof.
5. Existing provenance/source/date/confidence/history features were preserved.
6. One policy evaluator owns freshness; no stray 90/180 health constants remain
   outside fallback/config tests.
7. One health engine owns rule severity and grading; UI contains no duplicate
   formulas.
8. Typed project fields are null-safe, validated, authorized, and correctly
   selected in every active repository path.
9. Migration number/order, constraints, replay, and fix-forward are proven.
10. Every KPI/risk has exact drill-through or an explicit non-actionable rationale.
11. Mixed, empty, truncated, unavailable, error, and unauthorized states are
    distinguishable.
12. Revision deltas reconcile or expose residual/unavailable state.
13. Query, payload, render, and pure-evaluation budgets pass on recorded fixtures.
14. Logs/errors are structured and redacted.
15. All evidence receipts are fresh against current diff/config hashes.
16. No temp database, server, browser, fixture row, lease, or scratch proof remains
    active after its digest is recorded.
17. Manifest links/hashes/statuses reflect actual evidence and `next_unit` is
    cleared only when no ready/in-progress work remains.

Any negative answer reopens its earliest causal unit and blocks implementation
completion.
