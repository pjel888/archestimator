# 16 - Requirements Traceability Matrix

> This is the legacy alias/test narrative. Stable normalized IDs, reciprocal sources, criteria, evidence, and `UNIT-*` links are authoritative in `IMPLEMENTATION_PLAN.md` and `plan-pack.json`.

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
| REQ-T08 React Doctor | React phases | `bun run doctor` |
| REQ-DOC01 evidence update | all phases | evidence docs |
| REQ-DOC02 skipped validation notes | all phases | final phase report |
| REQ-DOC03 proof class distinction | U6.1, U6.2 | readiness review |

## Component Interoperability (see doc 22)

Pass-3 update: every REQ-CI-* now maps to a named vitest test file (existing) or to a CI-QA scenario in the new browser spec. "Phase 0.5" entries below are scoped by CI-QA ID; see doc 22 § QA Matrix for the scenario-to-test mapping.

| Requirement | Existing vitest file (test count) | Browser scenario (Phase 0.5) | Plan Units | Evidence Required |
|---|---|---|---|---|
| REQ-CI-01 modal create+edit modes | `library-add-component-modal-a11y.test.tsx` (21), `workshop-library-consolidation-ui.test.tsx` (13) | CI-QA-01, CI-QA-03 | U0.5.1 | browser proof (CI-QA-01..03) |
| REQ-CI-02 edit suppresses duplicate warning | `library-add-component-modal-a11y.test.tsx` (covers `isEditing` gate) | CI-QA-03 | U0.5.1 | vitest (existing) + browser proof |
| REQ-CI-03 image URL normalization | `estimate-image-url.test.ts` (2) | CI-QA-11 | U0.5.1 | vitest (existing) + browser proof |
| REQ-CI-04 edit-mode image endpoint routing | (none yet — covered indirectly by `estimate-image-url.test.ts`) | CI-QA-05, CI-QA-08 | U0.5.1 + U0.5.3 | browser proof (CI-QA-05, CI-QA-08) + new `estimate-three-edit-surfaces.test.ts` |
| REQ-CI-05 variant persistence | `estimate-sheet-library-insert.test.tsx` (subset) | CI-QA-09 | U0.5.1 | vitest (existing) + browser proof |
| REQ-CI-06 project fan-out (server + client) | `estimate-sheet-library-insert.test.tsx` (subset) | CI-QA-06, CI-QA-14 | U2.1, U3.1, U0.5.2 | browser proof (CI-QA-06, CI-QA-14) + graph index proof + new `estimate-component-fan-out.test.ts` |
| REQ-CI-07 variant pill routing | `estimate-sheet-library-insert.test.tsx` (subset) | CI-QA-04, CI-QA-10 | U0.5.1 | browser proof (CI-QA-04, CI-QA-10) |
| REQ-CI-08 source snapshot null tolerance | (none — code review) | — | U0.5.3 | vitest (existing implicit) + new `estimate-link-state-transitions.test.ts` |
| REQ-CI-09 explicit type check before mutation | `estimate-sheet-actions-authz.test.ts` (17) | — | U0.5.3 | code review + unit test |
| REQ-CI-10 client fan-out O(1) at scale | (none — needs graph index) | CI-QA-14, CI-QA-16 | U2.1, U3.1 | graph index parity test + stress proof (CI-QA-14, CI-QA-16) |
| REQ-CI-11 surfaces correct at stress | (none — needs browser) | CI-QA-14..16 | U0.5.2, U4.x | browser stress proof |
| REQ-CI-12 create vs edit write to different tables | (none — needs new integration test) | — | U0.5.3 | new `estimate-three-edit-surfaces.test.ts` |
| REQ-CI-13 EditComponentDrawer distinct surface | (none — code review) | — | U0.5.3 | code review |
| REQ-CI-14 linkState flip on library edit | `estimate-sheet-version-control-actions.test.ts` (subset) | CI-QA-03 | U0.5.3 | new `estimate-link-state-transitions.test.ts` + CI-QA-03 |
| REQ-CI-15 restore-deleted D1 limitation documented | docs 22, 25 | CI-QA-17 | U0.5.1 | delete UX review + doc audit + CI-QA-17 |
| REQ-CI-16 promote updates linkage | (none — needs integration test) | CI-QA-13 | U0.5.3 | new integration test + CI-QA-13 |

Pass-3 takeaway: REQ-CI-04, REQ-CI-08, REQ-CI-12, REQ-CI-13, REQ-CI-14, REQ-CI-16 have NO direct named vitest test today. They are covered indirectly by adjacent suites but must be backfilled in U0.5.3 with explicit test names. This is the traceability gap that Phase 0.5 closes.

## CRUD And Data Integrity (see docs 25, 26)

| Requirement | Existing vitest file (test count) | Plan Units | Evidence Required |
|---|---|---|---|
| REQ-CRUD-01 authz gate on every write | `estimate-sheet-actions-authz.test.ts` (17) | all write phases | authz tests (existing 17) |
| REQ-CRUD-02 entity-scoped rollback | (none — needs U5.1) | U5.1, U5.3 | new mutation failure/concurrency tests |
| REQ-CRUD-03 row_revision conflict guard | `estimate-sheet-version-control-actions.test.ts` (subset), `estimate-sheet-library-insert.test.tsx` (subset) | all row phases | conflict tests (existing) |
| REQ-CRUD-04 template stale-snapshot guard | `estimate-sheet-library-insert.test.tsx` (subset) | Phase 0.5 | template insert tests (existing) |
| REQ-CRUD-05 bulk delete all-or-nothing <=100 | `estimate-sheet-bulk-row-delete-partial-failure.test.tsx` | Canonical `UNIT-001` characterization + `UNIT-009` mutation proof | existing test plus D1 atomicity proof |
| REQ-CRUD-06 realtime broadcast contract | `estimate-row-update-broadcast.test.ts` | Canonical `UNIT-001` characterization + `UNIT-009` concurrency proof | existing test plus concurrent revision proof |
| REQ-CRUD-07 optimistic node id resolution | `estimate-sheet-tree-dnd.test.tsx` (subset) | Canonical `UNIT-001` characterization + `UNIT-009` mutation proof | existing tree tests plus optimistic-id sequencing proof |
| REQ-CRUD-08 P6 single-node model | `estimate-template-drop-zones.test.tsx` ("direct insert INTO a row-owning area (P6)") | all node phases | P6 tests (existing) |

Pass-3 takeaway: REQ-CRUD-05 and REQ-CRUD-06 need explicit named tests. The plan asserts "existing" coverage but the traceability to specific test names must be confirmed during U0.5.3.
