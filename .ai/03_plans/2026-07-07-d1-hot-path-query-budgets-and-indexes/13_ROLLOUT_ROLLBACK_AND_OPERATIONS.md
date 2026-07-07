# 13 — Rollout, Rollback, And Operations

## Rollout shape

This is not a feature flag rollout; it is a sequence of additive, independently-landable changes. Each phase can merge independently once its exit criteria pass.

| Phase | Land shape | Merge gate |
|---|---|---|
| P0 | one new file + one wiring | type-check + unit |
| P1 | two additive migrations | local EXPLAIN + migration test |
| P2 | repository code + tests | denial-parity + query-count test |
| P3 | 8 new scripts + package.json | local proof green at 10× |
| P4 | router + verifier extension | hosted proof green |
| P5 | CI + release gate + runbook | CI green on docs PR; dry-run rollback |

## Rollout performance gates (directive 13)

| Route/action | Baseline metric | Target | Observability source | Release gate | Rollback trigger |
|---|---|---|---|---|---|
| HP-1 `/workshop` | current hosted p95 (measure pre-P1) | p95 ≤ 400ms @ 10× | `cf:d1-runtime-proof` JSON | hosted proof green before beta | hosted p95 > 550ms (p99) post-deploy |
| HP-2 `/workshop/projects` | current | ≤ 350ms @ 10× | same | same | > 480ms p99 |
| HP-5 `/workshop/.../estimates` | current (`4 + N` queries) | ≤ 250ms @ 10×, ≤6 queries | same + query-count assertion | N+1 parity green | query count > 6 |
| HP-7 `/workshop/proposals` | current | ≤ 200ms @ 10× | same | G3 index EXPLAIN green | regression |
| All HP | subrequest count | ≤ budget in `09` | `cf:d1-runtime-proof` subrequest column | all surfaces ≤ budget | any surface > budget |

- **Blocks merge:** local proof red (CI).
- **Blocks closed-beta rollout:** hosted proof red for any HP surface; denial-parity test red; PII-redaction test red.
- **Blocks production rollout:** all of the above + subrequest gate + hosted EXPLAIN gate.
- **Comparison window:** 2 release windows of hosted proof before declaring the budget contract stable.
- **Minimum sample size:** 20 hosted runs per surface (matches existing `MIN_P95_RUNS=20`).
- **Metric owner:** implementation agent (this plan's executor), then Philip for sign-off.

## Rollback procedures

### P1 (indexes) rollback
- `DROP INDEX IF EXISTS idx_estimate_favorites_user_created;` (and the other 3) via a new migration `0039_rollback_*` or direct `wrangler d1 execute ARCH_DB --remote --command "..."`.
- Reads fall back to implicit UNIQUE indexes; no data loss.
- Trigger: hosted EXPLAIN shows a write-path regression OR a read-path p95 regression attributed to the index.

### P2 (N+1 fix) rollback
- Revert `estimates/page.tsx:103-109` to the `Promise.all(...)` loop. `canEditEstimateInD1` still exists (the fix is additive). One-line revert.
- Trigger: denial-parity test fails in production evidence (should not happen — test gates merge).

### P2 (LIMITs) rollback
- Raise the limit constant to a very large number (effectively unbounded). No migration.
- Trigger: user reports truncation at sub-10× volume.

### P2 (category cache) rollback
- Set `CATEGORY_CACHE_TTL_MS = 0` (always miss) or remove the cache wrapper. No migration.
- Trigger: stale-category bug report.

### P3/P4 (proof) rollback
- Proof failures block release but do not affect user routes. "Rollback" = fix the proof; no user impact.

### P5 (CI gate) rollback
- Make the CI job advisory (exit 0) temporarily if a proof is flaky; track in `19` as a known-red.

## Monitoring / observability (proportional)

- No new runtime metrics (observability pack owns that).
- The proof JSON+MD artifacts under `.ai/.../evidence/` are the durable evidence trail.
- Post-deploy verification: run `cf:d1-runtime-proof` against production after each phase's hosted deploy; compare p95/query-count to the previous window.

## Data repair

None needed. All changes are additive (indexes) or read-path (LIMITs, batching, cache). No data mutation.

## Backward compatibility

- Migrations are additive; old code path works without them (just slower).
- The batched capability check (`T-P2-01`) is semantically identical to the loop (denial-parity proven).
- Proof route extension is additive (old surfaces remain).

## Operational support

- Runbook: this document is the runbook for the budget contract.
- Support: a budget-regression CI failure is a developer action, not an ops page.
- Incident response: if a production route exceeds budget, the rollback triggers above apply; the daily D1 backup + `cf:d1-restore-rehearsal` is the recovery path for any migration-related issue.

## Post-release verification

Two release windows of hosted proof green before declaring the contract stable and archiving the plan (per README archive policy).
