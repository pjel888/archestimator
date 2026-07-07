# 12 — Test And Validation Strategy

## Testing philosophy (proportional)

This is data-layer performance work. The lightest proof that actually proves each claim:

- **Authorization parity (T-P2-01):** unit + property-style parity tests — automatable, high-value.
- **Index coverage (P1):** `EXPLAIN QUERY PLAN` assertions — local then hosted.
- **Query-count budgets (P2/P3):** proof scripts against fixtures — the declared evaluator.
- **Cache invalidation (T-P2-03):** unit test.
- **Proof-route security (P4):** unit tests for auth + PII redaction.
- **Browser/Playwright:** intentionally skipped (no browser-only claim — per `05` and AGENTS.md speed guardrail).

## Test Execution Matrix (proof-contract rows, directive Phase 3 §11 format)

Each row: `Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule`.

| Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule |
|---|---|---|---|---|---|---|---|---|---|
| PROOF-001 | PERF-004, PERF-011 | T-P1-01 (G1/G2 indexes) | migration (sqlite apply) | temp sqlite3 DB | indexes present; EXPLAIN uses index, no TEMP B-TREE | `tests/vitest/migration-0037.test.ts` | `bunx vitest run tests/vitest/migration-0037.test.ts` | red before migration applied; green after | temp DB torn down per test |
| PROOF-002 | PERF-004, PERF-011 | T-P1-02 (G3/G4 indexes) | migration (sqlite apply) | temp sqlite3 DB | indexes present; G3 EXPLAIN shows `publication_recipient` index; G4 shows `estimate` index | `tests/vitest/migration-0038.test.ts` | `bunx vitest run tests/vitest/migration-0038.test.ts` | red before; green after | temp DB torn down |
| PROOF-003 (TEST-SEC-01) | PERF-006 | T-P2-01 (batched capability) | unit + property | role-matrix fixture: ≥20 randomized estimate-id sets per role mixing allowed/denied | `canEditEstimateSetInD1` result === set of ids where `canEditEstimateInD1` returns true, for every randomized case | `tests/vitest/d1-access-batch-parity.test.ts` | `bunx vitest run tests/vitest/d1-access-batch-parity.test.ts` | red if any drift; green on exact parity | none (pure function) |
| PROOF-004 (TEST-SEC-04) | PERF-006 | T-P2-01 (cross-workspace) | unit | two-workspace fixture; workspace A user | batched path returns empty for workspace B estimate IDs | `tests/vitest/d1-access-cross-workspace-deny.test.ts` | `bunx vitest run tests/vitest/d1-access-cross-workspace-deny.test.ts` | red if any B id returned; green if empty | none |
| PROOF-005 | PERF-006 | T-P2-01 (query count) | unit | projects with 5, 20, 50 estimates | HP-5 D1 statement count flat (≤6) regardless of N | `tests/vitest/estimates-page-query-count.test.ts` | `bunx vitest run tests/vitest/estimates-page-query-count.test.ts` | red if count grows with N (pre-fix); green if flat (post-fix) | none |
| PROOF-006 | PERF-002, PERF-011 | T-P2-02 (LIMITs) | unit | fixture with cap+1 rows per repo | only `cap` rows returned; no error | extend each `tests/vitest/<repo>.test.ts` | `bunx vitest run tests/vitest/<repo>.test.ts` | red if >cap returned; green if exactly cap | none |
| PROOF-007 | PERF-004 (G5), PERF-011 | T-P2-03 (category cache) | unit | category write action | cache cleared on write; next read fresh | `tests/vitest/category-cache-invalidation.test.ts` | `bunx vitest run tests/vitest/category-cache-invalidation.test.ts` | red if stale; green if fresh post-write | none |
| PROOF-008 | PERF-007 | T-P0-01 (budget helper) | unit | known arrays (percentile correctness); measureSurface shape | `percentile([1..100], 95)` correct; `BUDGET_RESULT` well-formed | `tests/unit/d1-query-budget.test.ts` | `bunx vitest run tests/unit/d1-query-budget.test.ts` | red on wrong percentile; green on correct | none |
| PROOF-009 | PERF-001, PERF-007 | T-P0-02 (inventory) | unit | repo map fixture | output contains all 12 D1-backed repos | `tests/unit/build-performance-query-inventory.test.ts` | `bunx vitest run tests/unit/build-performance-query-inventory.test.ts` | red if any repo missing; green if all 12 present | none |
| PROOF-010 (TEST-SEC-02) | PERF-007 | T-P4-01 (proof route PII) | unit | fixture IDs (synthetic) | JSON contains no `@` outside fixture domains; no `display_name`/`email` keys | `tests/vitest/d1-performance-proof-router.test.ts` | `bunx vitest run tests/vitest/d1-performance-proof-router.test.ts` | red if PII present; green if redacted | none |
| PROOF-011 (TEST-SEC-03) | PERF-007 | T-P4-01 (proof route auth) | unit | missing Bearer / wrong secret | 401 without valid `CRON_SECRET`; 200 with | (same file as PROOF-010) | (same command) | red if 200 without secret; green if 401 | none |
| PROOF-012 | PERF-002, PERF-003, PERF-007, PERF-011 | T-P3-01…08 (8 repo proofs) | proof (local sqlite3) | 1×/10× fixture manifest | `passed:true`; `plannedQueries ≤ queryBudget`; `localP95Ms ≤ budget` | `scripts/generate-cloudflare-d1-{repo}-proof.ts` output JSON | `bun run cf:d1-{repo}-proof` | red if any budget exceeded; green if all pass | fixture manifest regenerable |
| PROOF-013 | PERF-002, PERF-003, PERF-007, PERF-011 | T-P4-01/02/03 (hosted proof) | proof (hosted D1) | hosted fixture (server-side) | `hostedP95Ms ≤ budget`; `subrequestCount ≤ budget`; **`rowsRead/req ≤ budget`**; EXPLAIN shows expected indexes | `cf:d1-runtime-proof` output JSON | `bun run cf:d1-runtime-proof` | red if any hosted budget exceeded; green if all pass | release-gate (not CI); needs CRON_SECRET |
| PROOF-014 | PERF-011 | T-P5-01 (CI EXPLAIN gate) | CI | every hot-path query | no hot-path query's EXPLAIN shows `SCAN` (full scan) | `.github/workflows/ci.yml` job | CI run on PR | red if any SCAN; green if all index-probes | advisory mode if flaky (RISK-12) |

**Testing-strategy layer classification (directive §11):**
- Unit: PROOF-001…011 (vitest).
- Migration: PROOF-001, PROOF-002.
- Repository/database: PROOF-003…007.
- Contract: PROOF-010, PROOF-011 (proof-route shape/auth).
- Performance: PROOF-012 (local), PROOF-013 (hosted).
- Security: PROOF-003, PROOF-004, PROOF-010, PROOF-011.
- CI: PROOF-014.
- E2E/browser: **intentionally skipped** (no browser-only claim — see `05`).
- Manual QA: **none** (every claim has an automated proof).

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
