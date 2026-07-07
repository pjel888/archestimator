# 16 — Requirements Traceability Matrix

Every requirement maps to source, task(s), code area, acceptance criterion, validation, test, rollout check, status. No requirement untraced. Every task maps to ≥1 requirement.

| Requirement ID | Source | User outcome | Implementation phase / task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|
| PERF-001 (map flows→queries) | PROMPT s1; `brief`+`repo evidence` | every HP mapped | (planning only) `03` §2 | docs | AC-PERF-001-1/2 | doc review | n/a | Done |
| PERF-002 (p95/p99 budgets) | PROMPT s2; `brief`+`derived` | canonical budget table | P0 T-P0-01; P5 T-P5-02 | `09`, `scripts/lib/d1-query-budget.ts` | AC-PERF-002-1/2/3 | proof scripts assert | release gate hosted p95 | Done (planning); P0/P5 pending impl |
| PERF-003 (subrequest budgets) | PROMPT s2; `brief`+`repo evidence` | subrequest budget + capture | P4 T-P4-02 | `09`, router | AC-PERF-003-1/2/3 | T-P4-02 DISCOVERY + assertion | subrequest ≤ budget | Done (planning); P4 pending impl |
| PERF-004 (required indexes) | PROMPT s3; `brief`+`repo evidence` | 5 gaps closed | P1 T-P1-01/02; P2 T-P2-03 (G5) | `07` blueprints, `migrations/0037`,`0038` | AC-PERF-004-1/2/3/4 | migration tests + hosted EXPLAIN (T-P4-03) | hosted EXPLAIN gate | Done (planning); P1/P2 pending impl |
| PERF-005 (fixture sizes) | PROMPT s4; `brief` | 1×/10×/100× tiers | P3 T-P3-00 | `12`, `scripts/seed-performance-test-data.ts` | AC-PERF-005-1/2/3 | manifest shape test | n/a | Done (planning); P3 pending impl |
| PERF-006 (N+1 risks) | PROMPT s5; `brief`+`repo evidence` | HP-5 N+1 killed | P2 T-P2-01 | `estimates/page.tsx`, `d1-access.ts` | AC-PERF-006-1/2/3 | TEST-SEC-01/04, query-count test | query count ≤6 | Done (planning); P2 pending impl |
| PERF-007 (local+hosted proof) | PROMPT s6; `brief` | 8 repo proofs + hosted real-fn proof | P0 T-P0-01; P3 T-P3-01…08; P4 T-P4-01 | 8 new scripts, router, verifier | AC-PERF-007-1/2/3/4 | proof green local + hosted | CI + release gate | Done (planning); P3/P4 pending impl |
| PERF-008 (no paid features) | PROMPT constraint; `brief`+`repo evidence` | no paid add-ons | (cross-cutting) all phases | `15` rejected list | AC-PERF-008-1/2 | migration/wrangler diff review | n/a | Done |
| PERF-009 (scope: D1 only) | PROMPT; `brief` | no UX/DO/R2/authz-rule changes | (cross-cutting) | `02` non-goals | AC-PERF-009-1/2 | scope review | n/a | Done |
| PERF-010 (stop condition) | PROMPT; `brief` | executor can implement+prove | all phases | `11`, `12`, `17` | AC-PERF-010-1/2/3 | final verifier | n/a | Done |

## Performance-sensitive requirements — additional mapping (directive 12)

| Requirement | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| PERF-002 (HP-1) | current hosted p95 | ≤400ms @10× p95 | `cf:d1-runtime-proof` | p95>400ms | hosted p95>550ms p99 |
| PERF-002 (HP-5) | `4+N` queries | ≤6 queries | query-count test + proof | >6 queries | revert T-P2-01 |
| PERF-003 | no subrequest budget | ≤ budget `09` | router subrequest column | >budget | investigate; fallback to D1-count proxy |
| PERF-004 (G1-G4) | FULL/TEMP B-TREE scan | index-used EXPLAIN | local + hosted EXPLAIN | TEMP B-TREE reappears | DROP index; investigate |
| PERF-006 | N+1 (4+N) | ≤6 | TEST-SEC-01 + query-count test | parity fail or count>6 | revert to loop |

## Task → requirement reverse map (every task traces to ≥1 requirement)

| Task | Requirement(s) |
|---|---|
| T-P0-01 | PERF-002, PERF-007 |
| T-P0-02 | PERF-001, PERF-007 |
| T-P1-01 | PERF-004 |
| T-P1-02 | PERF-004 |
| T-P2-01 | PERF-006 |
| T-P2-02 | PERF-002 |
| T-P2-03 | PERF-004 (G5), PERF-002 |
| T-P2-04 | PERF-002 (optional, gated) |
| T-P3-00 | PERF-005 |
| T-P3-01…08 | PERF-007 |
| T-P4-01 | PERF-007 |
| T-P4-02 | PERF-003 |
| T-P4-03 | PERF-004 |
| T-P5-01 | PERF-007 |
| T-P5-02 | PERF-010 |

No requirement untraced. No orphan task.
