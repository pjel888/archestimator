# UX/UI Information Hierarchy Self-Improvement Notes

Date: 2026-05-19
Trigger: Philip rejected the project-dashboard pass as poor UX/UI and asked Hermes to improve design skills and research information hierarchy.

## Research sources checked this session

- Nielsen Norman Group, `Visual Hierarchy in UX: Definition`, accessed 2026-05-19: https://www.nngroup.com/articles/visual-hierarchy-ux-definition/
- Material Design 3, `Layout`, accessed 2026-05-19: https://m3.material.io/foundations/layout/understanding-layout/overview
- Ant Design, `Data Display`, accessed 2026-05-19: https://ant.design/docs/spec/data-display/
- Apple Human Interface Guidelines, `Charting data`, accessed 2026-05-19: https://developer.apple.com/design/human-interface-guidelines/charting-data
- Existing local project skills reviewed: `philip-ux-ui-calibration`, `ui-density-hierarchy-audit`, `enterprise-saas-ui-ux`, `edtech-learning-ui-ux`, `archestimator-product-planning`.

## Core correction

A project-dashboard page must not be treated as a random card grid. It needs an information architecture that matches the user's job:

1. Identify the project.
2. Understand current estimate health and financial state.
3. See progress/revision/export/activity signals.
4. Edit project metadata without leaving the page.
5. Navigate intentionally to deeper estimate work only from the project shell/sidebar or a deliberately placed workflow action, not as a primary `+ Estimate` button on a dashboard requested as visualization-only.

## Information hierarchy ladder for Archestimator project dashboard

Use this ordering before designing UI:

1. Project identity: name, client, location, code.
2. Primary financial answer: current estimate total, budget, variance, currency.
3. Estimate state: active estimate/revision, row/item count, last edited.
4. Output state: latest export/proposal/package, issued/stale status.
5. Recent activity: last changes that explain why values changed.
6. Structure preview: compact hierarchy/estimate distribution preview.
7. Metadata CRUD: edit drawer/modal/action, secondary but always discoverable.
8. Database/source/debug provenance: hidden from normal users unless in developer/debug mode.

## Dashboard visualization rules

- A visualization dashboard needs comparative or status meaning, not decorative metrics.
- Do not show values simply because columns exist in the database.
- Every tile must answer: what changed, what is important, or what action is implied?
- Prefer one primary project summary band plus supporting chart/list regions over unrelated equal-weight cards.
- If data is missing, show the honest empty visualization state and next data dependency; do not fill the page with generic placeholders.
- Use data ink: totals, deltas, bars, lists, sparklines, and segmented summaries only when they represent real project data.

## UI composition rules for Archestimator

- Workshop/app typography cap remains: 12px max; 10px body/control text; 8-9px meta labels.
- Use shared primitives first: Button, SearchInput, toolbar, modal, card/panel primitives.
- Keep actions in predictable project chrome; do not mix creation actions into a visualization-only page unless asked.
- Preserve CRUD editability through the existing `ProjectDetailsModal` / `updateProjectDetails` path until a better shared drawer pattern exists.
- Remove `Source: Supabase` from user-facing project dashboards; source/provenance is internal/debug metadata.

## Mandatory pre-design checklist

Before implementing any project dashboard UI:

1. Capture or inspect the route.
2. List available data from repository functions and what is absent.
3. Write a hierarchy ladder for the page.
4. Identify the primary answer the dashboard should give.
5. Identify which controls are CRUD/edit controls vs workflow/navigation controls.
6. Sketch sections in text before coding.
7. Verify with DOM/screenshot, not only source diff.

## Failure pattern to avoid

Bad pattern from rejected pass:

- Replace requested removals with generic metric cards.
- Treat project metadata as visualization.
- Make all cards visually equal.
- Add an edit button but no designed dashboard logic.
- Verify only typecheck/test, not actual rendered hierarchy.

Correct pattern:

- Design a project command/summary surface around estimate totals, budget variance, activity, revision/export state, and compact structure preview.
- Keep project details editable in a secondary but visible action.
- Do not expose backend provenance.
- Measure and screenshot before claiming UI quality.
