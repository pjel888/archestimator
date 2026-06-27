# Requirements Traceability Matrix

## Prompt-Schema Traceability Register

This register uses the active prompt's required schema. The older overview and detailed registers below remain useful implementation indexes, but this section is the verifier-facing trace schema.

| Source ID | Requirement | Source evidence | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|---|
| USER-BRIEF-001 | FR-ROW-001 / FR-ROW-003: row create/edit must feel non-blocking. | Active user goal and `EstimateSheetContent.tsx:953-973` routine save toast evidence. | `04`, `05`, `11`, `18` | IMP-02, IMP-04, IMP-08 | Immediate local row/cell update; no routine global success toast; failures local/actionable. | TEST-STATUS-001/002, TEST-QUEUE-001 | Alert fatigue, blocking workflow, draft loss | Planned | None |
| USER-BRIEF-002 | FR-ROW-006: content-to-tree row move must not freeze target-area reorder. | Reported target route plus row move evidence in `use-estimate-row-handlers.ts`, `EstimateSheetTree.tsx`, `estimate-row-tree-move.ts`. | `03`, `06`, `11`, `12`, `18` | IMP-01, IMP-11, IMP-12, IMP-13 | Source/target patch, returned-row reconciliation, no silent no-op, target sibling reorder works. | TEST-ROW-MOVE-001/003/004, TEST-CACHE-ROUTE-001 | Stale cache, frozen handles, wrong order | Planned | Browser proof future |
| DESIGN-001 | UX-STATE-001: all sheet states have explicit UI contracts. | Continuation UX review and active prompt state-matrix requirement. | `04`, `05`, `12`, `18` | IMP-04, IMP-08 | Loading/empty/success/partial/error/conflict/permission/offline/retry/timeout/cancel states mapped and tested. | TEST-UX-STATE-001 | Ambiguous recovery, hidden failure | Planned | None |
| DESIGN-002 | UX-DENSE-001 / UX-A11Y-ACTION-001: preserve dense grid and action-level accessibility. | `DESIGN.md`, row table source, continuation UX review. | `04`, `05`, `12`, `18` | IMP-04, IMP-11, IMP-13 | Stable row/table dimensions, no status occlusion, keyboard/focus/SR proof per action class. | TEST-UX-DENSE-001, TEST-A11Y-001 | UI drift, inaccessible operation | Planned | Browser visual proof scoped |
| NEXT-DOC-001 | DATA-CACHE-001 / React-Next boundary: route/cache behavior is explicit. | `package.json`, `next.config.ts`, `tsconfig.json`, Next local docs on Server/Client Components, Server Actions, caching, data security, and target route source. | `03`, `06`, `07`, `10`, `12` | IMP-08, IMP-11, IMP-18 | Server route owns auth/context; client boundary receives safe DTOs; mutation class selects client invalidation vs route/process-cache/revalidate path. | TEST-CACHE-ROUTE-001, type/lint import-boundary proof | Stale RSC route, bundle/server boundary drift | Planned | None |
| NEXT-DOC-002 | SEC-ACTION-001: Server Actions are direct-POST attack surfaces. | Next local mutating-data docs warn Server Functions are reachable by direct POST; `actions.ts` owns estimate mutations. | `04`, `07`, `08`, `11`, `12` | IMP-03A, IMP-14 | Every action has args, validation, authz, safe DTO, cache behavior, rate posture, and direct invocation test. | TEST-SEC-ACTION-001 | Privilege bypass, malformed mutation | Planned | None |
| SECURITY-001 | DATA-RPC-001 / SEC-HISTORY-001: DB/RLS hardening is an early gate. | Security plan release blockers and browser repository direct-write evidence. | `04`, `07`, `08`, `11`, `14` | IMP-03A, IMP-14, IMP-15 | Unauthorized direct RPC/read/write fails; direct browser row writes removed/gated/proven unreachable. | TEST-SEC-001, provider/RPC tests | Auth bypass, history leakage | Planned | Phase 0.5 gate |
| SECURITY-002 | SEC-PUBLIC-001 / SEC-DTO-001: public/share/export DTOs are minimized and token-scoped. | Publication/share/export source surfaces and continuation security review. | `04`, `07`, `08`, `11`, `12` | IMP-03A, IMP-16 | Public/export DTOs omit private source URLs/signed URLs/history fields; revoked/wrong tokens fail. | TEST-SEC-PUBLIC-001 | Client/private data leak | Planned | ACL precedence decision may affect actors |
| SECURITY-003 | SEC-ABUSE-001 / SEC-SECRETS-001: abuse and env exposure are bounded. | Active prompt security requirements, `next.config.ts` headers/env use, continuation security review. | `04`, `07`, `08`, `11`, `12`, `13` | IMP-03A, IMP-16A | Rate/backoff thresholds exist; service/storage/provider secrets remain server-only; no undocumented new env. | TEST-SEC-ABUSE-001, env inventory review | Cost spike, secret exposure | Planned | None |
| PERF-001 | PERF-TYPE-001 / PERF-DND-001 / PERF-DOM-001: lag-free claims are benchmarked. | Performance plan, existing perf tests, active prompt measurable performance requirement. | `09`, `11`, `12`, `19` | IMP-17 | Typing/totals/DnD/DOM budgets are pass/fail with fixture metadata. | BENCH-* contracts, TEST-PERF-* | Jank, inflated speed claim | Planned | Browser proof future |
| OPS-001 | REL-OFFLINE-001 / PERF-QUEUE-001: degraded/offline state is observable and recoverable. | User reliability requirement and coordinator architecture. | `06`, `09`, `11`, `12`, `13` | IMP-03, IMP-08, IMP-18 | Offline visible <=500ms; drafts persist; retry drains; queue age thresholds monitored. | TEST-QUEUE-003, BENCH-QUEUE-* | Lost work, duplicate commits | Planned | Offline reload scope remains decision |
| DOC-001 | DOC-EVIDENCE-001: evidence classes remain separated. | Active prompt and planning-only boundary proof. | `17`, `20`, `21` | IMP-00, IMP-20 | Local/browser/provider/production/manual proof distinguished; no fixed-product claim from docs. | Final verifier matrix | Unsupported completion claim | Planned | None |

| Requirement | Action IDs | Main Files | Future Tasks | Proof |
|---|---|---|---|---|
| FR-ROW-001 | ACT-ROW-001 | `drop-zones.tsx`, `use-estimate-row-handlers.ts`, `use-estimate-row-mutations.ts` | Phase 1 status + Phase 2 coordinator | DOM insert/failure retry |
| FR-ROW-002 | ACT-ROW-002, ACT-LIB-001 | `use-estimate-row-handlers.ts`, `actions.ts` | Phase 2 mutation IDs, Phase 4 RPC auth | Insert/server action tests |
| FR-ROW-003 | ACT-ROW-003, ACT-ROW-004, ACT-ROW-005 | `row-table.tsx`, `use-estimate-row-handlers.ts`, `use-estimate-row-mutations.ts` | Phase 2 coordinator | Stale/offline/perf tests |
| FR-ROW-004 | ACT-ROW-007, ACT-ROW-008 | `use-estimate-row-handlers.ts`, restore RPCs, activity history | Phase 1 durable recovery | Delete/restore DOM + RPC |
| FR-ROW-005 | ACT-ROW-009 | `row-table.tsx`, `estimate-row-tree-move.ts`, `actions.ts` | Phase 3 row move coordinator | Unit + e2e row reorder |
| FR-ROW-006 | ACT-ROW-010, ACT-ROW-011, ACT-TREE-006 | `EstimateSheetTree.tsx`, `EstimateSheetContent.tsx`, row handlers | Phase 3 content-to-tree fix | Regression e2e |
| FR-COMP-001 | ACT-COMP-001..006 | `cells.tsx`, row handlers, row mutations, actions | Phase 2 cross-row coordination, Phase 4 security | Component CRUD/stale tests |
| FR-TREE-001 | ACT-TREE-001..006 | `EstimateSheetTree.tsx`, tree actions/RPCs | Phase 1 tree status, Phase 3 sync | Tree DOM/e2e |
| FR-TAB-001 | ACT-TAB-001..005 | `EstimateTabStrip.tsx`, tab actions | Phase 1 destructive recovery, Phase 2 cache | Tab DOM/action tests |
| FR-SHEET-001 | ACT-SHEET-001 | `actions.ts`, sheet adjustment table/RPC | Phase 4 sheet adjustment RPC | Contract/cache tests |
| FR-RECOVERY-001 | ACT-RECOVERY-001 | mutation coordinator/status UI | Phase 2 | Offline/degraded e2e |
| FR-ACTION-001 | All ACT rows | `18_USER_ACTION_AND_PROOF_MATRIX.md` | Keep matrix current | Matrix review |
| UX-STATUS-001 | ACT-ROW-003, ACT-TREE-003 | `EstimateSheetContent.tsx`, `EstimateSheetTree.tsx` | Phase 1 | No routine toast tests |
| UX-STATUS-002 | Failed action rows | Status UI/coordinator | Phase 1/2 | Failure alert tests |
| UX-DND-001 | ACT-TAB-004, ACT-TREE-003, ACT-TREE-006, ACT-ROW-009..011, ACT-COMP-005, ACT-LIB-001, ACT-LIB-002 | Tree/table/dialog/pickers/library/template insertion | Phase 3 | Keyboard/touch proof |
| UX-FOCUS-001 | ACT-ROW-001, ACT-ROW-011, ACT-ROW-007 | Dialogs, row focus helpers | Phase 1/3 | Focus tests |
| UX-EMPTY-001 | ACT-ROUTE-002 | `EstimateSheetContent.tsx` | Phase 1 | Empty-state DOM |
| UX-DESTRUCTIVE-001 | Delete/clear/tab delete actions | Row/tree/tab/component surfaces | Phase 1 | Durable undo tests |
| UX-STATE-001 | All action/error/recovery rows | Status UI, coordinator, dialogs, route/empty states | Phase 1/2 | TEST-UX-STATE-001 |
| UX-DENSE-001 | ACT-PREF-001, ACT-FILTER-001, ACT-ROW-012, hot-path row actions | Row table, header, status UI, virtualization | Phase 1/5 | TEST-UX-DENSE-001 |
| UX-A11Y-ACTION-001 | All keyboard/dialog/destructive/DnD actions | Dialogs, toolbar, table, tree, tab strip | Phase 1/3 | TEST-A11Y-001 |
| UX-RESPONSIVE-001 | Touch/move/dialog actions | Dialogs, row controls, tree, tab strip | Phase 3 | Touch/manual proof |
| UX-VISUAL-QA-001 | Dense-table layout/status surfaces | Sheet layout, status UI, dialogs | Phase 5 | Scoped visual/browser proof |
| DATA-IDEMP-001 | Data-changing actions | Hooks/actions/RPCs | Phase 2/4 | Idempotency tests |
| DATA-RPC-001 | All RPC mutations | Supabase migrations | Phase 4 | Static + direct RPC tests |
| DATA-RPC-002 | Legacy direct writes | `estimate-repository.ts` | Phase 4 | Import/reachability tests |
| DATA-CACHE-001 | Data-changing actions | `actions.ts`, query hooks, workspace repo | Phase 2/4 | Mutation + reload tests |
| DATA-SNAPSHOT-001 | ACT-COMP-006 | `actions.ts`, snapshot/image utils | Phase 4 | Malicious snapshot tests |
| SEC-IMAGE-001 | ACT-COMP-006/private media | Image routes | Phase 4 | Unauthorized image tests |
| SEC-HISTORY-001 | History read | Event/version RLS | Phase 4 | RLS tests |
| SEC-CSRF-001 | Mutating routes | API routes/actions | Phase 4 | CSRF/same-origin tests |
| SEC-ACTION-001 | Server Action mutation entry points | `actions.ts`, callers | Phase 0.5/4 | TEST-SEC-ACTION-001 |
| SEC-PUBLIC-001 | Share/publication/proposal/export/comment/activity | public/share/export routes and models | Phase 0.5/4 | TEST-SEC-PUBLIC-001 |
| SEC-ABUSE-001 | RPC/action/upload/export/comment retries | action/route handlers and metrics | Phase 0.5/4 | TEST-SEC-ABUSE-001 |
| SEC-DTO-001 | Mutation/public/history/export DTOs | adapters, snapshots, export/public models | Phase 0.5/4 | DTO contract tests |
| SEC-SECRETS-001 | Env/server-only boundaries | env inventory, server-only modules | Phase 0.5/4 | Env/source/bundle proof |
| PERF-ROUTE-001 | ACT-ROUTE-001 | Route perf scripts/e2e | Phase 5 | Route readiness |
| PERF-TYPE-001 | ACT-ROW-003..005 | Perf tests, row table | Phase 5 | Typing/totals budgets |
| PERF-DND-001 | Row/tree DnD | Browser perf e2e | Phase 5 | Drag budgets |
| PERF-QUEUE-001 | ACT-RECOVERY-001 | Mutation coordinator tests | Phase 5 | Queue budget tests |
| PERF-DOM-001 | Large sheets | Virtualization tests | Phase 5 | Mounted row count |
| REL-OFFLINE-001 | ACT-RECOVERY-001 | Offline e2e | Phase 5 | Offline proof |
| DOC-SPEC-001 | Docs | `.ai/06_specs/*` | Phase 6 | Doc review |
| DOC-FLAG-001 | Flag | Feature flag inventory | Phase 2/6 | Inventory update |
| DOC-EVIDENCE-001 | Final reports | `.ai/10_state`, implementation log | Phase 6 | Evidence separation |

## Detailed Traceability Register

This register carries the planning prompt schema: requirement, source, user outcome, implementation phase, task IDs, code areas, acceptance criteria, test coverage, rollout check, and status.

| Requirement | Source | User Outcome | Phase | Task IDs | Code Areas | Acceptance Criteria | Test Coverage | Rollout Check | Status |
|---|---|---|---:|---|---|---|---|---|---|
| FR-ROW-001 | User complaint and ACT-ROW-001 | Add rows without waiting or noisy routine save toasts. | 0-2 | IMP-02, IMP-04, IMP-08 | `drop-zones.tsx`, row handlers, row mutations | Immediate row, focus lands, failure retry/delete, no global success toast | DOM insert/failure tests | Smoke blank row insert flag-on/off | Planned |
| FR-ROW-002 | ACT-ROW-002, ACT-LIB-001 | Insert library rows into intended area with trust/history preserved. | 2,4 | IMP-08, IMP-14, IMP-16 | row handlers, `actions.ts`, library helpers | Correct node/tab, trusted source, no stale overwrite | Server-action and reload tests | Library insert smoke | Planned |
| FR-ROW-003 | ACT-ROW-003..005 | Edit values at spreadsheet speed without data loss. | 0,2,5 | IMP-03, IMP-08, IMP-17 | `row-table.tsx`, cells, row mutations | Immediate local values/totals; stale server response suppressed | Stale response tests, typing/totals budgets | Target-route edit smoke | Planned |
| FR-ROW-004 | ACT-ROW-007..008 | Delete and restore rows durably. | 1 | IMP-06 | row handlers, activity history, restore RPCs | Optimistic delete, durable undo/recent restore, reload-safe recovery | Delete/restore DOM/RPC tests | Manual delete/restore smoke | Planned |
| FR-ROW-005 | ACT-ROW-009 | Reorder rows in the same area without lag. | 0,3,5 | IMP-01, IMP-11, IMP-17 | `row-table.tsx`, `estimate-row-tree-move.ts`, actions | Drop-to-DOM <= 100ms, persisted order reloads, handles stay live | Unit reorder, e2e reorder, DnD budget | Same-node reorder smoke | Planned |
| FR-ROW-006 | ACT-ROW-010, ACT-ROW-011, ACT-TREE-006 | Move rows across areas and keep target branch draggable. | 0,2,3 | IMP-01, IMP-09, IMP-11, IMP-12, IMP-13 | `EstimateSheetTree.tsx`, content component, row handlers, row mutations | Source/target patch, dense persisted rows, target sibling reorder works | Regression e2e, reconciliation tests | Content-to-tree then target reorder smoke | Planned |
| FR-COMP-001 | ACT-COMP-001..006 | Replace, clear, detach, promote, and move components safely. | 2,4 | IMP-10, IMP-16 | cells, handlers, row mutations, actions | Optimistic state, stale guard, rollback/failure UI, safe snapshots | Component CRUD/stale/security tests | Component action smoke | Planned |
| FR-TREE-001 | ACT-TREE-001..006 | Area operations do not corrupt sheet content. | 1,3 | IMP-05, IMP-11, IMP-12, IMP-13 | tree component, tree actions/RPCs | Tree and row caches stay synchronized; destructive actions recoverable | Tree CRUD/reorder tests | Tree add/rename/reorder/delete smoke | Planned |
| FR-TAB-001 | ACT-TAB-001..005 | Tabs can be managed without hiding or orphaning work. | 1,2 | IMP-06, IMP-08 | tab strip, tab actions | Keyboard-accessible actions, inline errors, selected node remains coherent | Tab DOM/action tests | Tab create/rename/reorder/delete smoke | Planned |
| FR-SHEET-001 | ACT-SHEET-001 | Sheet adjustments persist and totals stay authoritative. | 4 | IMP-14 | `actions.ts`, adjustment persistence | Revision-checked, idempotent, history policy recorded, cache fresh | Contract/cache tests | Adjustment edit/reload smoke | Planned |
| FR-RECOVERY-001 | ACT-RECOVERY-001 | Users keep working during slow/failing/offline persistence. | 0,2,5 | IMP-03, IMP-08, IMP-18 | coordinator, status UI, persistence actions | Draft remains, queue visible, retries drain, duplicates prevented | Offline/degraded e2e, queue tests | Network failure/retry smoke | Planned |
| FR-ACTION-001 | All ACT rows | Every action has proof ownership. | 6 | IMP-20 | `18_USER_ACTION_AND_PROOF_MATRIX.md`, implementation report | No action lacks optimistic/failure/undo/validation columns | Matrix review and verifier signoff | Release checklist matrix complete | Planned |
| UX-STATUS-001 | User complaint, ACT-ROW-003, ACT-TREE-003 | Routine saves feel quiet and non-blocking. | 0,1 | IMP-02, IMP-04, IMP-05 | content/tree save status | No routine global saving/saved toast; local/polite status only | No-toast DOM tests | Manual row/tree save smoke | Planned |
| UX-STATUS-002 | Failure recovery requirements | Failures are local, understandable, and actionable. | 1,2 | IMP-04, IMP-05, IMP-08 | status UI/coordinator | Row/node/action, reason, Retry, Revert/Delete when applicable | Failure-state DOM/a11y tests | Failure injection smoke | Planned |
| UX-DND-001 | ACT-TAB-004, ACT-TREE-003, ACT-TREE-006, ACT-ROW-009..011, ACT-COMP-005, ACT-LIB-001, ACT-LIB-002 | Drag/drop workflows have keyboard and touch alternatives. | 3 | IMP-11, IMP-13 | tab strip, tree, row table, Move row dialog, component picker, library/template insertion | Non-pointer path exists for tab reorder, tree reorder/move, row reorder/move, component move, library/template insert | Keyboard/touch proof | A11Y smoke before first-user rollout | Planned |
| UX-FOCUS-001 | ACT-ROW-001, ACT-ROW-007, ACT-ROW-011 | Focus stays predictable through create/move/undo/dialogs. | 1,3 | IMP-04, IMP-07, IMP-13 | dialogs, row focus helpers, virtualized table | Dialog focus, opener restoration, moved/created row focus when visible | Focus tests | Manual keyboard smoke | Planned |
| UX-EMPTY-001 | ACT-ROUTE-002 | Blank center states are recoverable. | 1 | IMP-07 | `EstimateSheetContent.tsx` | Select/Create Area actions shown when no selected node exists | Empty-state DOM test | Empty-tree smoke | Planned |
| UX-DESTRUCTIVE-001 | Row/tree/tab/component destructive actions | Destructive actions have durable recovery. | 1 | IMP-06 | row/tree/tab/component surfaces | Confirmation or durable undo/recent history; no toast-only recovery | Durable undo tests | Delete/recover smoke | Planned |
| DATA-IDEMP-001 | Data/API audit | Retries cannot create duplicate persisted effects. | 0,2,4 | IMP-03, IMP-08, IMP-14 | hooks, actions, RPCs, events | Every mutating action carries stable mutation ID or server key | Idempotency tests | Duplicate audit clean | Planned |
| DATA-RPC-001 | Security audit | Unauthorized direct RPC callers cannot mutate. | 4 | IMP-14 | Supabase RPCs/migrations | DB function enforces edit access internally | Direct RPC authz tests | Provider/local SQL proof | Planned |
| DATA-RPC-002 | Data audit | Production browser cannot bypass history/server-action paths. | 4 | IMP-15 | `estimate-repository.ts` | Direct writes removed, server-only, test-only, or unreachable from production UI | Import/reachability tests | Bundle/source proof | Planned |
| DATA-CACHE-001 | Architecture/data audit | Reload/navigation shows authoritative current sheet state. | 3,5 | IMP-12, IMP-18 | actions, row mutations, workspace repo | Shared finalizer invalidates correct keys and route cache only when needed | Mutation + reload tests | Route reload smoke | Planned |
| DATA-SNAPSHOT-001 | Security audit | Component snapshots do not persist unsafe payloads. | 4 | IMP-16 | actions, snapshot/image utils | URLs/keys/blob size allowlisted and bounded | Malicious snapshot tests | Component image/source smoke | Planned |
| SEC-IMAGE-001 | Security audit | Private media is only visible to authorized estimate users. | 4 | IMP-16 | image routes | Unauthorized users denied | Unauthorized image tests | Security smoke | Planned |
| SEC-HISTORY-001 | Security audit | History access matches estimate access. | 4 | IMP-14 | events/versions RLS | Project/estimate access enforced | RLS tests | History read smoke | Planned |
| SEC-CSRF-001 | Security audit | Cookie-auth mutation routes have explicit same-origin posture. | 4 | IMP-14 | mutating route handlers/actions | Expected protection documented and tested | CSRF/same-origin tests | Security checklist | Planned |
| PERF-ROUTE-001 | Current route readiness posture | Route remains fast enough for MVP entry. | 5 | IMP-17 | route perf scripts/e2e | Cold p95 <= 3500ms, normal <= 1000ms, warm/prefetch <= 750ms | Route readiness script | Route benchmark artifact | Planned |
| PERF-TYPE-001 | Performance lane | Typing/totals stay frame-safe. | 5 | IMP-17 | row table, cells, totals | Typing p95 <= 16ms at 500 rows and <= 32ms at capped 5000 rows; totals <= 50ms | Perf tests | Benchmark artifact | Planned |
| PERF-DND-001 | Performance lane | DnD hover/drop stay frame-safe. | 5 | IMP-17 | row/table/tree DnD | Hover p95 <= 16ms at 500 rows and <= 32ms at 5000; drop-to-DOM <= 100ms | Browser perf e2e | DnD benchmark artifact | Planned |
| PERF-QUEUE-001 | Reliability lane | Queue status escalates before user trust is lost. | 5 | IMP-18 | coordinator/status UI | Failure visible <= 500ms; local queue age <= 5s; degraded <= 15s | Queue budget tests | Monitoring query/dashboard | Planned |
| PERF-DOM-001 | Performance lane | Large sheets remain virtualized. | 5 | IMP-17 | `row-table.tsx` | Visible rows mount as viewport + overscan; capped sheet does not mount all rows | Mounted row count tests | Large fixture benchmark | Planned |
| REL-OFFLINE-001 | User reliability expectation | Offline/degraded work is recoverable. | 5 | IMP-18 | coordinator/status/persistence | Offline visible <= 500ms, draft persists, retry drains, duplicate success prevented | Offline e2e | Offline smoke | Planned |
| DOC-SPEC-001 | Blast/docs audit | Future agents do not follow stale specs. | 6 | IMP-19 | `.ai/06_specs/*` | Spec docs match implemented route/data/node behavior | Doc review | Documentation checklist | Planned |
| DOC-FLAG-001 | Rollout plan | Broad changes can be rolled out and disabled safely. | 6 | IMP-19 | feature flag inventory | Flag default, owner, rollout, rollback documented | Inventory review | Flag smoke | Planned |
| DOC-EVIDENCE-001 | Planning prompt | Completion claims match evidence class. | 6 | IMP-00, IMP-20 | implementation log, `current-state.md` | Local/browser/provider/production/manual proof separated | Final verifier signoff | Release readiness report | Planned |
