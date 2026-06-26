---
title: Full Scope Coordination Ledger
type: ledger
date: 2026-06-25
status: active
---

# Full Scope Coordination Ledger

## 2026-06-26 Workshop Library Performance Browser-Proof Addendum

The `/workshop/library` performance pass has local browser timing evidence for
the entry route, tab subroutes, and template-editor subpage without reducing the
visible UX/UI.

Evidence:
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/evidence/library-route-transition-2026-06-26.json`: authenticated Workshop -> Library, 5 runs, median `341ms`, `0` failures, overlay rate `0.20`.
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/evidence/library-tab-transitions-2026-06-26.json`: authenticated Overview -> Components median `356ms`, Components -> Templates median `456ms`, Templates -> Overview median `398ms`, `0` failures.
- `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration/evidence/library-template-editor-transition-2026-06-26.json`: Templates browse -> Template Editor, 5 runs, median `1952ms`, `0` failures, overlay rate `0`, one RSC request per run, temporary fixture deleted.

Harness note: the template-editor browser proof used local dev-auth admin-db with
`WORKSHOP_LIBRARY_TEMPLATES_RPC_DISABLED=1`. The normal dev-auth admin-db path
can 404 a freshly seeded template because `library_templates_seed` is
`security invoker` and returns empty rows under a service-role bypass where
`auth.uid()` is null. The entry route and tab timing evidence used the normal
local dev-auth configuration. This is a local proof-harness limitation, not a
hosted/provider/production claim.

Fresh validation for the final library patch set passed:
- `bun run test:dom -- tests/vitest/library-tabs-layout.test.tsx tests/vitest/library-tab-a11y.test.tsx tests/vitest/library-components-cache.test.tsx tests/vitest/library-templates-cache.test.tsx tests/vitest/template-gallery.test.tsx tests/vitest/template-editor.test.tsx tests/vitest/component-library-helpers.test.ts tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx tests/vitest/route-transition-measure-script.test.ts tests/vitest/workshop-library-consolidation-ui.test.tsx` (`10 files / 94 tests`).
- Patch-scoped `bun run lint`, `bun run type-check`, `bun run build`, scoped `git diff --check`.
- `npx react-doctor@latest --verbose --scope changed` exited `0`; remaining 20 warnings are broader changed-branch debt outside the final library performance patch set.

## 2026-06-25 Remaining-Deferrals Execution Wave

The owner has now authorized implementation of prior `Deferred`,
`accepted defer`, and non-goal rows unless the current evidence shows an
explicit rejection, unsafe destructive action, paid/cross-provider action, or
externally blocked product decision. The active Codex goal and
`16_FULL_SCOPE_EXECUTION_GOAL.md` are the master execution objective for this
wave.

| Workstream | Owner | Scope | Dependencies | Current work | Findings | Decisions | Conflicts | Validation | Status |
|---|---|---|---|---|---|---|---|---|---|
| Requirements re-audit | `analyst` Wegener `019eff10-f870-72c1-a0ca-3c1456957b9e` | Current source-ID matrix for all prior deferrals/non-goals | Current source plans, ledgers, code evidence | Read-only lane complete | Source folders are not fully implemented; stale rows included `ESC-P3-19`, tree `F-23`, mobile drawer proof limits, broad undo, reducer extraction, numeric migration, and lazy/realtime | Use current source/code/provider evidence, not stale prior disposition alone | None | Requirement matrix returned | Complete |
| Architecture/integration | `architect` Hubble `019eff11-8d5f-7161-8636-cad9cabd7364` | Sequencing, shared-file ownership, integration risks | Requirements re-audit | Read-only lane complete | Remaining non-numeric product/proof items converge on already-dirty hot files; mobile drawer is proof/reconciliation only, not a broad parallel code lane | Serialize shared-file owners; numeric migration completed as a scoped data-only wave | Dirty worktree includes unrelated and prior estimate-sheet edits | Architecture lane returned | Complete |
| Data/provider | `ce-data-integrity-guardian` Franklin `019eff11-8e62-7e53-b01b-29a7e565e325` | Numeric `estimate_nodes.sort_order` migration, provider preflight, rollback/fix-forward | Current provider history + tree migration plan | Provider-applied via scoped SQL | Current schema/action/RPC path was integer-oriented; migration-list drift meant broad `db push` was unsafe. Scoped rollback dry run and apply for `20260625221500` succeeded. | No broad `supabase db push`; use scoped SQL plus history repair for this drifted provider state | Hosted migration drift still affects unrelated versions | Provider readback shows `numeric(20,4)`, preserved constraints/indexes, numeric overload, and history applied | Complete |
| UX/responsive | `designer` Banach `019eff11-8f9e-7242-88ac-cb4954a575dd` | Below-1024 drawer, focus/escape/return-focus, responsive proof | Current workspace/panel code | Drawer implementation slice complete; browser proof recovered in slice 10 | Dedicated right `Sources` drawer now has product-specific source/jsdom evidence and local Chromium proof at 1023px and 390px | Browser proof is local Chromium only; no production/manual/browser-matrix claim | `ResizableSidePanel` shared with project dashboard side panel tests | Focused DOM matrix passed; `e2e/estimate-sources-drawer.spec.ts --project=chromium` passed 2 tests | Complete |
| QA/UltraQA | `test-engineer` Avicenna `019eff11-9123-7320-a10f-ac10dc33cdd7` | Focused tests and adversarial scenario matrix for this wave | All implementation lanes | Read-only lane complete | Targeted DOM suites are enough for route parsing and source-level drawer wiring; browser proof required for real responsive claim | Use targeted suites before broad validate; record skipped browser proof risk | Known full validate reds/hangs remain unrelated baseline | QA matrix returned | Complete |
| Adversarial review | `critic` Mencius `019eff11-9289-7981-97d1-2a9449032625` | Scope/safety challenge before high-risk edits | Current goal + source/code evidence | Read-only lane complete | Broad all-deferrals bundle is unsafe; numeric migration, undo, reducer extraction, and lazy/realtime each need separate slices | Unsafe/ambiguous rows become evidence-backed blockers, not silent deferrals | None | Critic returned | Complete |

| Workstream | Owner | Scope | Dependencies | Current work | Findings | Decisions | Conflicts | Validation | Status |
|---|---|---|---|---|---|---|---|---|---|
| Lead coordination | lead | Integrate all lanes, preserve worktree safety, update ledgers, final claim | All lanes | Full-scope audit reconciled against source plans, code, tests, and provider state | The three source folders were not fully implemented at audit start; continuation slices now closed the safe non-rejected local implementation gaps through lazy subtree hydration and a concrete realtime-v2 tree contract | Claim implemented under the orchestration scope, with no production deploy/manual browser matrix/provider write claimed for the final local code slice | Dirty worktree includes unrelated active work; untouched | `git status --short --branch`; source docs; targeted tests; provider readback; lazy/realtime local matrix | Complete |
| Requirements audit | `explore` Russell `019efee2-5659-7b71-b197-b5c83ba5b2cc` | Identify all non-rejected source rows and stale ledger gaps | Source plans + orchestration docs | Parallel read-only audit complete | Real gaps were MOP-6/product slices plus provider drift; right mobile/reducer and tree lazy/realtime/delete-undo were open at audit time; later continuation slices closed right drawer/reducer and row/tree delete-specific Undo | Treat package deferrals as current scope decisions unless superseded by safe local implementation | Read-only | Coverage appendix/TODO/ledger comparison | Complete |
| Center implementation | `explore` Lorentz `019efee2-5757-7dd3-aa81-b9b15ea31cc5` + lead | Center content MOP-6/product/refactor gaps | Requirements audit | Implemented editable-total cost sort, account-backed column-width sync, destructive delete recovery copy, center row-delete post-success Undo, local component-image fallbacks, same-scope activity-history filter debounce, toast bottom-dock clearance, proposal preview unsaved-edits warning, pure helper/model extractions for M-21 through M-24, the M-21 row-handler/controller hook, the M-22 estimate-template insertion orchestration hook, the M-23 activity-history controller hook, and the M-24 proposal-preview controller hook | No center M-21 through M-24 controller extraction gap remains | Center row delete can now restore from persisted delete-event snapshots. Helper/model extraction plus M-21/M-22/M-23/M-24 hook extraction do not claim a general undo stack for every edit. | Shared `EstimateSheetContent.tsx`; edits serialized | `estimate-sheet-cost-inputs`, `estimate-sheet-user-preferences`, row-delete Undo matrix, bulk-delete failure tests, component-library helpers, version-control UI, toast, proposal preview, center extraction matrix 11 files / 102 tests, M-21 row-handler hook matrix 5 files / 112 tests, M-22 hook matrix 2 files / 34 tests, M-23 history hook matrix 5 files / 69 tests, M-24 proposal-preview hook matrix 2 files / 19 tests, type-check, provider readback | Complete |
| Right sidebar implementation | `explore` Arendt `019efee2-5869-7cf1-b0dd-8b0bbeac4672` + lead | Preferences, reducer/hooks, drawer, ordering, telemetry follow-through | Requirements audit | Implemented account-backed preferences, durable telemetry, hover prefetch dedupe, context-menu rename focus, the product-specific compact `Sources` drawer, reducer/hooks extraction, and automated active-tab profiler proof | Local preference fallback stays first-paint/offline path | Account sync, drawer source/jsdom proof, local giant-component warning closure, and active-tab render scoping are live; profiler proof is automated React Profiler evidence rather than a manual DevTools export | Shared component-library files; edits serialized | `component-library-ui`, lazy-load/source contract drawer tests, user-preferences, durable telemetry, active-tab Profiler harness, type-check, React Doctor changed-file check | Complete |
| Tree implementation | lead + data council | Undo, lazy/realtime, tree polish, numeric/sparse sort | Requirements/data audit | Implemented sparse create-sort step, numeric reorder preservation, provider-applied numeric `sort_order` migration, F-24 rename saving affordance, F-25 new-row scroll, F-26 append-as-child placement proof, tree/subtree post-success delete Undo, lazy subtree hydration, and concrete realtime-v2 tree collaboration contract | No unresolved tree-source implementation gap remains under this orchestration scope | Numeric migration used scoped SQL after rollback dry run and backup; tree delete Undo is delete-specific, not a general undo stack; realtime cursor/presence remains separate from the v2 tree branch contract | Shared tree/action/migration files | `estimate-node-reorder-action`, `estimate-tree-reorder`, migration static test, provider readback, tree polish matrix, tree Undo matrix 4 files / 82 tests, lazy/realtime local matrix 12 files / 52 tests, type-check | Complete |
| Data/provider council | `ce-data-integrity-guardian` Dirac `019efee2-5950-7d63-a834-207a75a002a2` + lead | Supabase migration strategy, provider proof, rollback/runbooks | Requirements audit | Applied scoped SQL for center/tree RPCs, telemetry, user preferences, helper grant hardening, numeric tree sort-order, center row-delete Undo, and tree/subtree delete Undo to project `ebxxqidacheyapmmzavr`; repaired nine local migration rows | Provider objects and target migration rows are green; unrelated migration-list drift remains outside this estimate-sheet slice | Use scoped direct SQL plus official `migration repair`; no broad `db push` | Supabase CLI temp-role auth intermittently throttled but recovered; MCP used for readback | Provider readback at `2026-06-25T13:44:09Z` plus numeric, row-undo, and tree-undo readbacks; `supabase migration list --linked` shows nine target rows aligned | Complete |
| QA/review | `test-engineer` Turing `019efee2-5a3b-7272-8203-137e27aa31b3` + lead | Code review, adversarial QA, completion audit | Implemented slices | Targeted regression matrix, TypeScript, diff check, provider proof, local code review, local Chromium drawer proof, row-delete Undo proof, tree-delete Undo proof, M-21/M-22/M-23/M-24 hook extraction proof, F-13 active-tab profiler proof, and lazy/realtime branch-hydration proof complete | No unresolved critical/high finding in touched source-folder slices; residual risk is unrelated migration drift and any future production/manual browser-matrix proof not claimed here | Most changed claims are source/DOM/provider-test provable; drawer real viewport/focus/overflow proof is local Chromium only, not production/manual proof | No production/browser-matrix claim | Prior continuation proof plus drawer Chromium proof 2 tests; center P3 polish matrix 4 files / 57 tests; row-delete Undo matrix 3 files / 49 tests; tree-delete Undo matrix 4 files / 82 tests; M-21 row-handler hook matrix 5 files / 112 tests; M-22 hook matrix 2 files / 34 tests; M-23 history hook matrix 5 files / 69 tests; M-24 proposal-preview hook matrix 2 files / 19 tests; F-13 Profiler/right-sidebar matrix 6 files / 118 tests; lazy/realtime local matrix 12 files / 52 tests; provider readback; `bun run type-check`; `git diff --check` | Complete |

## Full-Scope Audit Result

As of the 2026-06-26 continuation pass, the answer to "are the three source
folders fully implemented?" is **yes under the current orchestration scope**.
The safe non-rejected gaps found in the audit were either implemented in this
branch or already implemented by the earlier MOP-0 through MOP-5 work. This
continuation additionally implemented
tree `F-23` route-param parsing through `useParams` and reclassified the shared
compact side-panel drawer as source/jsdom-proved, then implemented the
product-specific compact `Sources` drawer with source/jsdom proof and local
Chromium viewport/focus/overflow proof at 1023px and 390px.
Tree non-launch polish is now closed: F-24 keeps inline rename visible while
saving, F-25 scrolls new rows into view, and F-26 is documented/proved as
append-as-child placement. Center P3 polish is also closed for local SVG
component-image fallbacks, same-scope activity-history filter debounce, toast
bottom-dock clearance, and proposal preview unsaved-edits warning. Pure
helper/model extraction for center M-21 through M-24 is implemented and
covered, M-21 row-handler/controller orchestration is now extracted into a
dedicated hook, M-22 estimate-template insertion orchestration is now extracted
into a dedicated hook, and M-24 proposal-preview controller orchestration is now
extracted into a dedicated hook; M-23 activity-history controller orchestration
is now extracted into a dedicated hook. The final local tree slice implemented
lazy subtree payloads, bounded branch fetches, per-node hydration state,
expand-time hydration for partial / over-limit terminal nodes, and a concrete
realtime-v2 tree collaboration event contract.

Provider status for this slice is green: migrations `20260625183000`,
`20260625193000`, `20260625203000`, `20260625213000`, `20260625214500`, and
`20260625220000` are present locally and recorded remotely on project
`ebxxqidacheyapmmzavr`; readback shows the target tables/RPC helper grants/RLS
match the intended locked-down state. Migration `20260625221500` is also now
present locally and recorded remotely; readback shows `estimate_nodes.sort_order`
as `numeric(20,4)`, tab-aware unique constraints/indexes preserved, no integer
create-node overload, and the numeric create-node overload available. Migration
`20260626013000` is also present locally and recorded remotely; readback shows
`restore_deleted_estimate_rows_with_history` is authenticated-executable,
anon-denied, and `SECURITY DEFINER`. Migration `20260626023000` is also present
locally and recorded remotely; readback shows
`restore_deleted_estimate_nodes_with_history` is authenticated-executable,
anon-denied, and `SECURITY DEFINER`, and the `estimate_node_snapshot` helper is
not exposed to anon or authenticated roles.
