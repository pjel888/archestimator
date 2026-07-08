# 16 - Requirements Traceability Matrix

| Requirement | Plan Units | Evidence Required |
|---|---|---|
| REQ-F01 route skeleton and no fallback flicker | U0.3, U1.1 | route benchmark, browser spec |
| REQ-F02 support 5,000 rows / 1,500 nodes | U0.1, U0.2, U4.1, U4.2 | DOM census, browser proof |
| REQ-F03 row edit updates without full recompute | U2.1, U2.2, U3.1 | selector/totals tests, render probes |
| REQ-F04 responsive search/filter/group | U3.2 | browser profile, long-task evidence |
| REQ-F05 stable expand/collapse | U1.3, U4.1 | browser virtualization regression |
| REQ-F06 dedupe subtree loading | U1.3 | network-call count test |
| REQ-F07 scalable row moves | U3.3, U5.1 | DOM/browser move scenario |
| REQ-F08 entity rollback | U5.1, U5.3 | mutation failure/concurrency tests |
| REQ-F09 cursor isolation | U0.2, U5.3 | existing cursor isolation plus large fixture |
| REQ-F10 materialization outside hot path | U3.1, U4.2 | render probe tests |
| REQ-F11 over-limit UX | U0.1, U0.2 | over-limit fixture test |
| REQ-F12 fail-closed permissions | U1.1, U0.4 | authz tests, D1 proof denial |
| REQ-P01 INP target | U0.3 | browser INP-style metrics |
| REQ-P02 long-task budget | U0.3, U3.2 | Chrome trace/PerformanceObserver artifact |
| REQ-P03 mounted row budget | U0.2, U4.2 | DOM markers |
| REQ-P04 mounted branch budget | U0.2, U4.1 | DOM markers |
| REQ-P05 edit p95 | U0.3, U3.1 | browser profile |
| REQ-P06 scroll p95 | U0.3, U4.2 | browser profile |
| REQ-P07 route medians | U0.3, U1.1 | route benchmark/readiness |
| REQ-P08 D1 query count | U0.4, U1.1 | D1 query proof |
| REQ-P09 D1 rows read | U0.4, U1.2 | D1 query proof |
| REQ-P10 memory duplication | U2.1, U4.2 | browser memory/profile note |
| REQ-R01 deterministic tests | U0.1 | fixture test |
| REQ-R02 no sleep-masked flakes | U0.2, U0.3 | review plus flake evidence |
| REQ-R03 unauthorized fail-closed | U1.1, U0.4 | denial tests |
| REQ-R04 hosted cleanup fail-closed | U0.4, U6.2 | hosted proof test |
| REQ-R05 feature flag rollback | U2.3, U6.3 | flag tests/runbook |
| REQ-D01 proven indexes | U0.4, U1.2 | EXPLAIN and rows_read |
| REQ-D02 redacted proof data | U0.4, U6.2 | redaction tests |
| REQ-D03 exhaustive query keys | U1.3, U2.3 | query key tests/review |
| REQ-D04 graph preserves structure | U2.1, U2.2 | selector parity tests |
| REQ-T01 fixtures | U0.1 | fixture unit tests |
| REQ-T02 selector parity | U2.2 | selector tests |
| REQ-T03 large DOM virtualization | U0.2 | DOM tests |
| REQ-T04 large edit budgets | U0.2, U3.1 | perf tests |
| REQ-T05 browser e2e perf | U0.3 | Playwright artifact |
| REQ-T06 D1 query budget | U0.4 | proof JSON/MD |
| REQ-T07 existing perf suite | all phases | existing focused suite |
| REQ-T08 React Doctor | React phases | `bun run doctor -- --verbose` |
| REQ-DOC01 evidence update | all phases | evidence docs |
| REQ-DOC02 skipped validation notes | all phases | final phase report |
| REQ-DOC03 proof class distinction | U6.1, U6.2 | readiness review |

## Component Interoperability (see doc 22)

| Requirement | Plan Units | Evidence Required |
|---|---|---|
| REQ-CI-01 modal create+edit modes | Phase 0.5 | browser interop spec (CI-QA-01..03) |
| REQ-CI-02 edit suppresses duplicate warning | Phase 0.5 | vitest (existing) + browser proof |
| REQ-CI-03 image URL normalization | Phase 0.5 | vitest (existing) + browser proof (CI-QA-11) |
| REQ-CI-04 edit-mode image endpoint routing | Phase 0.5 | browser proof (CI-QA-05, CI-QA-08) |
| REQ-CI-05 variant persistence | Phase 0.5 | vitest (existing) + browser proof (CI-QA-09) |
| REQ-CI-06 project fan-out (server + client) | Phase 0.5, U2.1, U3.1 | browser proof (CI-QA-06, CI-QA-14) + graph index proof |
| REQ-CI-07 variant pill routing | Phase 0.5 | browser proof (CI-QA-04, CI-QA-10) |
| REQ-CI-08 source snapshot null tolerance | Phase 0.5 | vitest (existing) |
| REQ-CI-09 explicit type check before mutation | Phase 0.5 | code review + unit test |
| REQ-CI-10 client fan-out O(1) at scale | U2.1, U3.1 | graph index parity test + stress proof (CI-QA-16) |
| REQ-CI-11 surfaces correct at stress | Phase 0.5, U4.x | browser stress proof (CI-QA-14..16) |
| REQ-CI-12 create vs edit write to different tables | Phase 0.5 | code review + integration test |
| REQ-CI-13 EditComponentDrawer distinct surface | Phase 0.5 | code review |
| REQ-CI-14 linkState flip on library edit | Phase 0.5 | integration test (CI-QA-03) |
| REQ-CI-15 restore-deleted D1 limitation documented | docs 22, 25 | delete UX review + doc audit |
| REQ-CI-16 promote updates linkage | Phase 0.5 | integration test (CI-QA-13) |

## CRUD And Data Integrity (see docs 25, 26)

| Requirement | Plan Units | Evidence Required |
|---|---|---|
| REQ-CRUD-01 authz gate on every write | all write phases | authz tests (existing 17) |
| REQ-CRUD-02 entity-scoped rollback | U5.1, U5.3 | mutation failure/concurrency tests |
| REQ-CRUD-03 row_revision conflict guard | all row phases | conflict tests (existing) |
| REQ-CRUD-04 template stale-snapshot guard | Phase 0.5 | template insert tests (existing) |
| REQ-CRUD-05 bulk delete all-or-nothing ≤100 | Phase 0.5 | bulk delete tests (existing) |
| REQ-CRUD-06 realtime broadcast contract | Phase 0.5 | broadcast tests (existing 4) |
| REQ-CRUD-07 optimistic node id resolution | Phase 0.5 | tree tests (existing) |
| REQ-CRUD-08 P6 single-node model | all node phases | P6 tests (existing) |

