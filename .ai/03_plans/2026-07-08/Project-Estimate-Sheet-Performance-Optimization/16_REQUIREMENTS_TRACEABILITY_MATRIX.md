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

