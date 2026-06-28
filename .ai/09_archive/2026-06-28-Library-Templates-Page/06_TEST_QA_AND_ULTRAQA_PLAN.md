# Test, QA, And UltraQA Plan

## Verification Policy

Use targeted DOM/Vitest checks first. Add Playwright only when the implementation changes real navigation, authenticated provider insertion, mobile drawer/focus behavior, or route-transition performance.

## Required Test Matrix

| ID | Area | Existing Tests | New Or Extended Tests | Assertions |
| --- | --- | --- | --- | --- |
| TEST-001 | Library route state | `library-tabs-layout.test.tsx`, `library-templates-cache.test.tsx` | `library-templates-workbench-transition.test.tsx` | route keeps Library tabs; warm templates cache survives; user/workspace cache partition remains intact. |
| TEST-002 | Right dock tabs | `component-library-ui.test.tsx`, `estimate-right-sidebar-active-tab-renders.test.tsx` | `estimate-right-sidebar-visible-tabs.test.tsx` | visible tabs clamp to `Library`, `Project`; `Templates` is absent; stored `templates` pref is ignored. |
| TEST-003 | Template browse/workbench | `template-gallery.test.tsx` | extend or add `template-workbench-center.test.tsx` | no selection, category selected, template selected, empty, loading, status, and destructive states render correctly. |
| TEST-004 | Template editor gating | `template-editor.test.tsx`, `template-editor-actions-authz.test.ts` | extend both | viewer sees read-only UI; server actions still deny viewer before mutation. |
| TEST-005 | Project tab scope | project/source tests as applicable | new project-tab scope test | Project tab is visible; no active project shows selector/unavailable state; selected project loads only project-scoped data; no unauthorized project data appears. |
| TEST-006 | Insert flow | `library-template-insert-picker.test.tsx`, `estimate-template-drop-zones.test.tsx`, `workshop-template-insert-smoke.spec.ts` | extend only if route-launched insert changes | insert called once; no duplicate replay on back/forward; resolver failure keeps dialog open. |
| TEST-007 | Accessibility | `library-tabs-layout.test.tsx`, `resizable-side-panel-a11y.test.tsx` | add DOM a11y assertions | tab/tabpanel linkage, labels, focus return, error announcement, Escape layering. |
| TEST-008 | Performance | `estimate-right-sidebar-active-tab-renders.test.tsx`, `route-transition-measure-script.test.ts` | extend only if routing/dock load changes | inactive trees render `0`; no unnecessary RSC burst; overlay count remains `0` for measured scenario. |

Detailed proof-contract rows live in `12_IMPLEMENTATION_UNITS_AND_PROOF_CONTRACT.md`. Those rows are authoritative for fixture/input, assertion, command, red/green expectation, and cleanup/skip rules.

## UltraQA Matrix

| Scenario | Expected Outcome |
| --- | --- |
| Stored right-sidebar pref is `templates`, route allows only `components` and `project`. | Active tab clamps to `components`; no template tree work renders. |
| User A warms templates cache, User B/workspace B opens route. | No leaked templates; query keys partition by user/workspace. |
| Viewer opens template workbench. | Browse and preview work; edit/delete/move/add affordances are hidden or disabled with truthful copy. |
| Project tab opened with no project scope. | Visible tab opens intentional selector/unavailable state; no empty misleading project tree. |
| Client tampers selected project id or stale project is removed. | Server read denies or returns unavailable/error state; no unauthorized project data appears. |
| Template insert target estimate deleted after picker opens. | Resolver fails cleanly; insert action not called; dialog remains recoverable. |
| Template contains group children and row-owning nodes. | Copy semantics preserve structure and row order. |
| Drag/drop unavailable or user uses keyboard. | Menu or explicit controls provide equivalent move/insert behavior. |
| Mobile viewport hits route. | Three-pane UI is not squeezed; desktop notice/drawers/read-only policy activates. |
| Back/forward after insert. | No duplicate insert or stale success replay. |
| Search/filter on browse route then estimate sidebar opens. | State does not pollute estimate sidebar unless intentionally shared. |

## Browser-Proof Gate

Skip browser proof for class/layout/copy-only implementation. Require gated Playwright when any of these are true:

- Real route transition behavior changes.
- Authenticated provider insertion/RPC path changes.
- Mobile drawer or focus behavior changes.
- Route-transition performance is claimed.
- Visual comparison or implemented UI QA is explicitly requested.

Candidate gated specs:

- `e2e/workshop-template-insert-smoke.spec.ts`
- `e2e/route-transition-performance.spec.ts`
- `e2e/estimate-sources-drawer.spec.ts`

## Design QA Gate

Future implemented UI should run a design QA pass against the target route and estimate editor comparator:

- Confirm left rail width, center dominance, right dock width, glass surface rhythm, typography, radii, and tab semantics.
- Inspect no-selection, selected, loading, error, read-only, and project-tab-unavailable states.
- Confirm `Templates` does not appear in the right dock.
- Confirm no nested cards, marketing hero styling, decorative motifs, or palette drift.
