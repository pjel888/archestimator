# 12 — Test And Validation Strategy

## Testing philosophy (proportional)

This is data-layer performance work. The lightest proof that actually proves each claim:

- **Authorization parity (T-P2-01):** unit + property-style parity tests — automatable, high-value.
- **Index coverage (P1):** `EXPLAIN QUERY PLAN` assertions — local then hosted.
- **Query-count budgets (P2/P3):** proof scripts against fixtures — the declared evaluator.
- **Cache invalidation (T-P2-03):** unit test.
- **Proof-route security (P4):** unit tests for auth + PII redaction.
- **Browser/Playwright:** intentionally skipped (no browser-only claim — per `05` and AGENTS.md speed guardrail).

## Test Execution Matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| PERF-002 | (proof scripts, not unit) | proof | new (P3) | 10× fixture manifest | `bun run cf:d1-*-proof` | JSON `passed:true`, p95 ≤ budget | none | impl agent |
| PERF-004 (G1/G2) | `tests/vitest/migration-0037.test.ts` | unit (sqlite apply) | new | temp sqlite3 | `bunx vitest run tests/vitest/migration-0037.test.ts` | indexes present; EXPLAIN uses index | none | impl agent |
| PERF-004 (G3/G4) | `tests/vitest/migration-0038.test.ts` | unit | new | temp sqlite3 | `bunx vitest run tests/vitest/migration-0038.test.ts` | indexes present | none | impl agent |
| PERF-006 (TEST-SEC-01) | `tests/vitest/d1-access-batch-parity.test.ts` | unit + property | new | role-matrix fixture | `bunx vitest run tests/vitest/d1-access-batch-parity.test.ts` | batched === looped across ≥20 random sets per role | none | impl agent |
| PERF-006 (TEST-SEC-04) | `tests/vitest/d1-access-cross-workspace-deny.test.ts` | unit | new | two-workspace fixture | `bunx vitest run tests/vitest/d1-access-cross-workspace-deny.test.ts` | workspace A user denied workspace B estimates | none | impl agent |
| PERF-006 (query count) | `tests/vitest/estimates-page-query-count.test.ts` | unit | new | projects with 5/20/50 estimates | `bunx vitest run tests/vitest/estimates-page-query-count.test.ts` | query count flat (≤6) | none | impl agent |
| PERF-002 (LIMITs) | repository tests (extend) | unit | extend | cap+1 rows | `bunx vitest run tests/vitest/<repo>.test.ts` | only cap rows returned | none | impl agent |
| PERF-004 G5 / cache | `tests/vitest/category-cache-invalidation.test.ts` | unit | new | category write | `bunx vitest run tests/vitest/category-cache-invalidation.test.ts` | cache cleared on write | none | impl agent |
| PERF-007 (helper) | `tests/unit/d1-query-budget.test.ts` | unit | new | known arrays | `bunx vitest run tests/unit/d1-query-budget.test.ts` | percentile/measureSurface correct | none | impl agent |
| PERF-007 (inventory) | `tests/unit/build-performance-query-inventory.test.ts` | unit | new | repo map | `bunx vitest run tests/unit/build-performance-query-inventory.test.ts` | all 12 repos in output | none | impl agent |
| TEST-SEC-02 (PII) | `tests/vitest/d1-performance-proof-router.test.ts` | unit | new | fixture ids | `bunx vitest run tests/vitest/d1-performance-proof-router.test.ts` | no `@` outside fixture domains in JSON | none | impl agent |
| TEST-SEC-03 (auth) | (same file) | unit | new | missing/wrong secret | (same) | 401 without valid `CRON_SECRET` | none | impl agent |

## Adversarial scenario matrix (UltraQA-style, directive 4A)

For runtime/data behavior. IDs map to risk register where relevant.

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|
| ADV-01 | workspace A user | batched capability check returns workspace B estimate | two-workspace fixture, A user calls HP-5 path | TEST-SEC-04 | denied (empty for B ids) | planned | test green | fixture teardown |
| ADV-02 | privileged user | batched check widens access vs looped | role matrix + randomized estimate sets | TEST-SEC-01 | set equality, ≥20 cases | planned | test green | none |
| ADV-03 | unauthenticated | proof route returns data without secret | curl without/wrong Bearer | TEST-SEC-03 | 401 | planned | test green | none |
| ADV-04 | operator | proof JSON leaks PII | run proof, grep for `@` | TEST-SEC-02 | no real-domain `@` | planned | test green | none |
| ADV-05 | first user | empty workspace (zero projects) | fresh workspace | HP-1/HP-2 proof at 1× empty tier | p95 ≤ budget, no error | planned | proof green | fixture |
| ADV-06 | first user | heavy workspace (10×) | 10× fixture | HP-1 proof at 10× | p95 ≤ budget | planned | proof green | fixture |
| ADV-07 | admin | category edited while cache warm | edit category | TEST cache invalidation | next read fresh | planned | test green | none |
| ADV-08 | attacker | SQL injection via estimateIds | malicious id string | parity test with `' OR 1=1 --` id | parameterized; no leak | planned | test green | none |
| ADV-09 | operator | D1 unavailable during proof | hosted proof against degraded D1 | release gate | proof fails closed (red), blocks release | planned | gate red | none |
| ADV-10 | first user | LIMIT truncates real list at 10×+1 | fixture at cap+1 | repository test | cap returned, no crash | planned | test green | fixture |
| ADV-11 | concurrent agents | two agents edit `d1-access.ts` | n/a (planning) | coordination ledger | first-writer-wins | n/a | ledger | none |
| ADV-12 | flaky CI | local proof p95 spikes | 5-run nearest-rank | CI rerun | stable on rerun | planned | CI green | none |

## Validation commands (verified against repo — not invented)

- `bun run type-check` (exists)
- `bun run cf:d1-runtime-proof` (exists; P4 extends)
- `bun run dbidx:audit-repo` (exists)
- `bun run cf:d1-component-library-proof` (exists; precedent for P3)
- `bunx vitest run <path>` (vitest is the test runner)
- `wrangler d1 execute ARCH_DB --local --command "EXPLAIN QUERY PLAN …"` (existing wrangler)

No invented thresholds. Budget numbers in `09` derive from existing `hostedBudgetMs` precedent + 10× volume assumption (A1, marked `assumption`).

## Known-red / skipped-validation ledger

None at planning time. The one deferred proof is the hosted subrequest capture (T-P4-02 DISCOVERY), recorded with its fallback (D1-call counting) — not a skipped validation, a named alternative path.

## A requirement is not ready if its validation is only "manual QA"

Every requirement maps to either a proof script (automated) or an EXPLAIN/unit test (automated). No requirement relies on manual QA alone. The hosted proof is operator-run but produces machine-checkable JSON (pass/fail by budget assertion), not subjective QA.
