# 10 — Requirements Traceability

## 1. User requirements

| ID | Requirement | Plan response | Unit |
|---|---|---|---|
| UR-001 | Re-architect overengineered plan | cancel old authority; product-first replacement | all |
| UR-002 | Check partly implemented code | current route, modes, content, rows, query, repository, patches audited | 01/02 |
| UR-003 | Efficient and fast AI implementation | one-symptom loop, WIP limit, evidence/test budgets | 04 |
| UR-004 | Performant React code | state isolation, structural sharing, index, incremental totals | 05/001–003 |
| UR-005 | Bug-free behavior | explicit invariants, rollback, risk-based focused tests | 07/09 |
| UR-006 | No overengineering | no dependency/framework/modes/fingerprint/evidence platform | all |
| UR-007 | No overtesting | maximum focused tests, final single browser scenario | 07 |
| UR-008 | Research best tactics | official React/Next/TanStack/Chrome sources | 03/11 |
| UR-009 | Tailor to estimate sheet | exact current files and hot paths | 02/05/implementation |
| UR-010 | New Markdown plan pack ZIP | this pack | deliverable |

## 2. Technical requirements

| ID | Requirement | Source evidence | Implementation |
|---|---|---|---|
| TR-001 | Fix 4,000 unrelated fan-out inspections | current jsdom baseline | UNIT-001 |
| TR-002 | Avoid repeated full-tree rollback | current rollback reducer | UNIT-001 |
| TR-003 | Preserve shared/local patch semantics | patch allowlist/current mutation behavior | UNIT-001 |
| TR-004 | Remove full draft object clone per keystroke | `updateEditableRowValue` | UNIT-002 |
| TR-005 | Remove full-tree totals per keystroke | `computeNodeTotals` dependency | UNIT-002 |
| TR-006 | Unrelated rows do not rerender | table comparator/broad props | UNIT-002 |
| TR-007 | Immediate totals remain correct | product behavior | UNIT-002 |
| TR-008 | Closed move dialog does zero option work | current unconditional derivation | UNIT-003 |
| TR-009 | Unopened library does zero catalogue work | current root derivation | UNIT-003 |
| TR-010 | Selected path/code use one index | duplicate recursive traversal | UNIT-003 |
| TR-011 | Search input remains responsive | React deferred rendering guidance | UNIT-003 |
| TR-012 | Keep current virtualization | existing row/branch virtualizers | default |
| TR-013 | Route work is measurement-gated | current D1 fast-path stub + Server-Timing | UNIT-005 |
| TR-014 | Remove inert modes | current all-off mode framework | UNIT-004 |
| TR-015 | Remove framework scripts/tests | package/current commit inventory | UNIT-004 |
| TR-016 | Keep server tree in Query | current query architecture/TanStack structural sharing | architecture |
| TR-017 | High-frequency UI state is narrowly stored | repo performance protocol | UNIT-002 |
| TR-018 | No React Compiler rollout | repo protocol says off | non-goal |
| TR-019 | No new dependency | owner efficiency constraint | all |
| TR-020 | No generated evidence | old-pack failure analysis | all |

## 3. Current code to unit mapping

| File | 001 | 002 | 003 | 004 | Conditional |
|---|---:|---:|---:|---:|---:|
| `estimate-row-tree-patch.ts` | X | — | — | — | — |
| `use-estimate-row-mutations.ts` | X | X | — | — | — |
| new `estimate-tree-index.ts` | X | X | X | — | — |
| `EstimateSheetContent.tsx` | — | X | X | — | — |
| `editable-row-model.ts` | — | X | — | — | — |
| `row-table.tsx` | — | X | X | — | X virtualization |
| editing store/provider | — | X | — | — | — |
| estimate route page | — | — | — | X | X route |
| `EstimateWorkspaceClient.tsx` | — | — | — | X | — |
| performance modes/context | — | — | — | delete | — |
| workspace repository | — | — | — | — | X route |
| virtual branch list | — | — | — | — | X virtualization |
| scripts/tests/config | — | — | — | delete/simplify | — |

## 4. Research rule mapping

| Official tactic | Archestimator adaptation |
|---|---|
| React Profiler measures selected subtrees | profile sheet/table/row only |
| memo is an optimization, not correctness | fix subscription boundary first |
| measure loops over thousands | time/count full-tree derivations |
| avoid unnecessary Effects | explicit store/query reconciliation |
| external store subscription | per-estimate high-frequency drafts |
| Query structural sharing | path-clone exact tree branches |
| Query `select` | subscribe to narrow server subsets when useful |
| virtualization mounts visible content | keep; don't confuse with derivation optimization |
| controlled input cannot transition | synchronous row drafts |
| deferred value for slow secondary UI | optional deferred search |
| smallest client boundary/lazy loading | preserve dynamic panels; remove mode provider |
| runtime Performance panel | one focused authorized trace |
| INP measures interaction responsiveness | input→paint primary metric |

## 5. Acceptance traceability

| Acceptance | Evidence type |
|---|---|
| nonmatching fan-out 0 | deterministic work count |
| exact shared rows patched | pure behavior test |
| rollback exact | pure/integration test |
| full totals calls per keystroke 0 | render/function probe |
| unrelated row renders 0 | render probe |
| input target | browser event→paint |
| totals parity | pure full-vs-incremental invariant |
| closed surfaces do no work | source + work count |
| mode framework gone | import/package search |
| net simplification | diff stats |
| route/virtualization skipped correctly | recorded activation decision |
