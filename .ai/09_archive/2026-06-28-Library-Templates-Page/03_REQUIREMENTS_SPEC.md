# Requirements Spec

## Product Requirements

| ID | Requirement | Priority | Acceptance |
| --- | --- | --- | --- |
| REQ-001 | Preserve Library IA. | P0 | `/workshop/library/templates` remains under the Library parent layout and page-level Library tabs. |
| REQ-002 | Keep browse and edit route identities explicit. | P0 | `/workshop/library/templates/[templateId]` remains the full editor route unless integrated editing is intentionally selected and documented. |
| REQ-003 | Use estimate-family workspace grammar. | P0 | Desktop route uses left rail, dominant center, and right dock with compact glass rhythm. |
| REQ-004 | Replace sheet tree with template inventory. | P0 | Left rail contains searchable template categories and rows, not estimate nodes. |
| REQ-005 | Remove nested Templates dock. | P0 | The right dock on template-focused routes exposes no `Templates` tab and cannot restore it from stored prefs. |
| REQ-006 | Right dock exposes exactly Library and Project. | P0 | Visible dock tabs are exactly `Library` and `Project`; `Project` is visible in v1 and has a project selector or intentional unavailable state before scoped data loads. |
| REQ-007 | Keep center dominant. | P0 | Center selected-template surface is wider and visually primary; right dock cannot permanently squeeze it below usable width. |
| REQ-008 | Gate edit affordances by capability. | P0 | Viewers can browse/preview but cannot see misleading mutation affordances; server authz remains defense in depth. |
| REQ-009 | Preserve template copy semantics. | P0 | Inserting templates into estimates or templates copies snapshots; source template is not mutated by insert. |
| REQ-010 | Lazy-load heavy dock data. | P1 | Source dock data does not block first paint and does not load before user intent unless explicitly budgeted. |
| REQ-011 | Avoid project-source ambiguity. | P1 | Project tab behavior is specified before implementation: visible tab, project selector when possible, unavailable state when no authorized project exists, scoped data after selection. |
| REQ-012 | Support keyboard-equivalent actions. | P1 | Move, insert, open, rename, duplicate, and delete have non-drag/non-hover paths. |
| REQ-013 | Preserve route transition performance. | P1 | Route changes do not add unnecessary RSC bursts, overlay transitions, or broad refetches. |
| REQ-014 | Preserve cache partitioning. | P1 | Template/library query caches remain partitioned by user/workspace/project as applicable. |
| REQ-015 | Define mobile policy. | P1 | Mobile/tablet do not squeeze three panes; use desktop notice, drawers, or read-only preview. |
| REQ-016 | Keep implementation small and extractable. | P2 | Avoid expanding existing giant components without planned seams and tests. |

## Non-Goals

- Do not add new dependencies.
- Do not redesign the Library parent shell.
- Do not merge estimate and template mutation models silently.
- Do not add a `Templates` right-dock tab to template-focused routes.
- Do not change Supabase schema in the first UI transition unless the integrated editor track is selected.
- Do not claim visual/browser proof from this planning-only pass.

## User-Facing Acceptance Summary

The completed implementation should feel like the estimate editor's family member: same professional density, same left/center/right mental model, but with templates as the object being managed and no recursive Templates dock.

## Success And Guardrail Metrics

| Metric | Target | Guardrail |
| --- | --- | --- |
| Workbench route clarity | Users can identify Library parent tabs, template inventory, selected-template center, and Library/Project source dock without entering the full editor. | No `Templates` tab appears inside the template-focused right dock. |
| Estimate route preservation | Existing estimate routes keep their current three-tab source dock. | Estimate route tests must still prove `Library`, `Project`, and `Templates` where project sources are enabled. |
| Data integrity | Template insert/copy operations keep snapshot semantics. | No source template mutation during insert; no new schema/RPC change in conservative track. |
| Performance | Source dock datasets are lazy and hidden trees do not render work. | No first-paint dependency on component/project source datasets. |
| Accessibility | Core actions have keyboard/menu paths and truthful permission states. | No drag-only required action; no misleading editor controls for viewers. |
