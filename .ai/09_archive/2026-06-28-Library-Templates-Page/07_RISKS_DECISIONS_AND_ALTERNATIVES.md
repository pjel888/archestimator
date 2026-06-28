# Risks, Decisions, And Alternatives

## Decisions

| ID | Decision | Rationale |
| --- | --- | --- |
| DEC-001 | Use "template workbench", not "estimate editor clone". | It accepts the useful workspace grammar while avoiding estimate-only parity claims. |
| DEC-002 | Preserve browse route and detail editor route distinction. | Current IA and docs already make this distinction; collapsing it raises data and UX risk. |
| DEC-003 | Hide `Templates` from right dock on template-focused routes. | A Templates dock inside the Templates route is recursive and confusing. |
| DEC-004 | Add configurable right-dock visible tabs. | Hardcoded tab arrays and stored prefs are the main implementation blockers. |
| DEC-005 | Project tab is required and scoped. | The requested right dock has exactly Library and Project; workspace-level templates route has no inherent active project, so Project starts with selector/unavailable state. |
| DEC-006 | Add UI edit capability props before stronger editor claims. | Server actions deny viewers, but UI should not show misleading controls. |
| DEC-007 | Keep browser proof gated. | Planning pass and static layout changes do not need slow browser proof; interaction/routing/provider changes do. |
| DEC-008 | Do not migrate DB/RLS/RPC for conservative track. | Existing template tables, RLS split, seed RPC, and action checks already satisfy this app-layer transition. |
| DEC-009 | Select the conservative track as the implementation scope. | It closes the user's visible IA/workspace request without funding full in-place editor integrity work. |

## Rejected Alternatives

| ID | Alternative | Rejected Because |
| --- | --- | --- |
| ALT-001 | Copy `EstimateWorkspaceClient` wholesale and swap the tree. | It imports estimate-specific context, tabs, edit capability, load limits, and right-sidebar assumptions. |
| ALT-002 | Leave the right dock as `Library / Project / Templates`. | Violates the user's requirement and creates Templates-inside-Templates IA. |
| ALT-003 | Show a blank Project tab on workspace-level route. | Misleading; there is no project context unless the user selects one. |
| ALT-004 | Merge browse and edit into one route immediately. | Requires integrity, permission, mobile, and performance work not present in the current browse route. |
| ALT-005 | Add new dependencies or a new editor framework. | Existing components and patterns already cover the needed shell, tree, sheet, and dock. |
| ALT-006 | Move browse state into a global store for parity. | Current reducer-local state is lower risk and sufficient absent a concrete cross-route persistence requirement. |
| ALT-007 | Defer or hide the Project tab. | Conflicts with the requested final tab set; implement a truthful selector/unavailable state instead. |
| ALT-008 | Make the implementer choose conservative vs integrated track at execution time. | That leaves a product decision open in an implementation-ready plan. Conservative is selected; integrated is deferred. |

## Risks

| ID | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| RISK-001 | Stored prefs resurrect hidden `Templates` tab. | High | Clamp active tab to `visibleTabs`; add route-scoped storage tests. |
| RISK-002 | Project tab has no data contract. | High | Add project selector/unavailable state; do not fetch project data before a valid project scope exists. |
| RISK-003 | Viewer sees edit affordances. | High | Add `canEditTemplate`; disable/hide controls; keep server authz tests. |
| RISK-004 | Multi-statement template mutations fail halfway. | High for integrated editor | Keep full editing in detail route or add transaction-backed RPCs before expanding. |
| RISK-005 | Right dock loads heavy data before intent. | Medium | Preserve lazy request and perf tests for inactive tree renders. |
| RISK-006 | Center gets squeezed by dock. | Medium | Enforce desktop proportions and responsive fallback. |
| RISK-007 | Existing tests assert three tabs. | Medium | Update tests only where route-specific visible tab contract changes; preserve estimate route tests. |
| RISK-008 | Giant component grows further. | Medium | Extract visible-tab clamp/state helper and selected-template center surface instead of adding more branching inline. |

## Deferred Decisions

| ID | Decision | Owner/trigger | Impact |
| --- | --- | --- | --- |
| DEF-001 | Whether full structural editing should move into `/workshop/library/templates`. | Owner/product decision before any integrated-editor phase. | Out of scope for conservative implementation. |
| DEF-002 | Whether single-editor optimistic template editing is acceptable or revision/transaction work is required. | Architecture/product decision before stronger estimate-editor parity claims. | Blocks only integrated-editor parity, not conservative workbench transition. |
