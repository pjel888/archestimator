# 09 Second Pass Visualization And UI Readiness Audit

**Date:** 2026-05-23
**Scope:** second-pass readiness review for package choice, current route truth, and UI standards
**No implementation in this file.**

## Why this pass was needed

The first plan pack was directionally correct on AI safety, tool contracts, and user confirmation, but it needed a tighter check against the live repo state and visual/package choices. The key correction is that project estimate comparison charts are now an approved protected route, while AI workflow visualization remains a separate future decision.

## Current repo evidence

Current app/package facts:

- `package.json` already includes `@nivo/pie`.
- `/workshop/projects/[projectId]/charts` is listed in `.ai/10_state/current-state.md` as a protected route.
- `.ai/10_state/decisions.md` says Nivo is the chart package for that route and must remain isolated to `src/components/workshop/project-charts/`.
- `src/app/workshop/projects/[projectId]/charts/page.tsx` loads chart data through `getProjectChartsData(projectId, ...)`.
- `src/components/workshop/project-charts/ProjectCostDonutChart.tsx` uses `ResponsivePie` from `@nivo/pie`.
- `DESIGN.md` defines the product/workshop text scale: 12px max outside landing, normal app controls around 10px, labels around 8-9px.

Plan correction:

- Treat project charts as current approved route truth, not generic in-progress chart work.
- Keep charting and AI workflow visualization as different decisions.
- Do not add a visualization package in the AI readiness phase.

## Package research snapshot

Fresh npm metadata rechecked on 2026-05-23 during the third pass:

| Package | Current metadata | Fit for Archestimator Copilot |
| --- | --- | --- |
| `@xyflow/react` | version `12.10.2`, MIT, peer `react >=17`, `react-dom >=17`, described as a customizable React library for node-based editors and interactive flow charts | Best candidate if a later approved implementation needs an interactive AI plan graph or editable workflow preview. Requires client-side sizing/CSS discipline and should be dynamically scoped to the Copilot panel. |
| `mermaid` | version `11.15.0`, MIT, Markdown-like syntax for flowcharts, mindmaps, sequence diagrams, class diagrams, gantt charts, git graphs, and more | Good for static `.ai` documentation diagrams. Not recommended as a first app dependency because the Copilot MVP needs reviewable structured patches, not rendered prose diagrams. |
| `d3` | version `7.9.0`, ISC, Data-Driven Documents | Powerful but too custom for first Copilot workflow visualization. Use later only if bespoke analytics/layout math is needed and React owns DOM rendering. |
| `@nivo/pie` | version `0.99.0`, MIT, peer React range includes React 19 | Already used for project estimate comparison donuts. Keep isolated to project charts; it is not a node/workflow visualization package. |
| `react-flow-renderer` | version `10.3.17`, MIT, deprecated in favor of newer React Flow packages, peers React `16 || 17 || 18` | Reject. It is deprecated and does not fit this repo's React 19 baseline. |

Context7 documentation checks:

- `@xyflow/react` installation uses `npm install @xyflow/react`, imports `ReactFlow`, and requires `@xyflow/react/dist/style.css` plus an explicitly sized parent container.
- Mermaid supports programmatic rendering through `mermaidAPI.render`, but its core value is documentation-like diagram syntax.
- D3 works well with React when D3 owns calculations/scales/layout and React owns DOM, but that is a heavier custom implementation path.

## Recommendation

For the first AI chatbot implementation, use **no new visualization package**.

Render:

- conversation turns;
- detected intent;
- current project/estimate context;
- proposed project/tree/row patches;
- budget summary;
- warnings;
- selectable Apply sections;
- audit/source/confidence metadata.

This can be built with existing compact tables, panels, forms, and workshop primitives. It also keeps the security review simpler because user trust depends more on visible diffs and confirmation than on a graph.

If a future approved slice needs a visual plan graph, choose **`@xyflow/react`** as the first candidate:

- It matches node/edge workflows better than Nivo, Mermaid, or raw D3.
- It should be restricted to a client component inside the Copilot review panel.
- It must use explicit container dimensions so it does not break the fixed workspace shell.
- It must keep visible text within the app 12px maximum unless Philip approves a one-off exception.
- It must not become the only review surface; text/table patches remain canonical for auditability.
- It should be recorded in a dedicated ADR under `.ai/05_decisions/` and promoted into `.ai/10_state/decisions.md` only after implementation is approved.

## UI readiness findings

The Copilot plan should inherit the current app constraints:

- protected route only;
- fixed-shell workspace behavior;
- one internal scroll area;
- app text max 12px;
- dense 10px control/table rhythm;
- shared primitives from `src/components/ui/` and `src/components/workshop/`;
- source/confidence indicators that do not create layout shifts;
- structured patch preview before Apply.

The likely first route placement is the estimate workspace, because that is where selected project, estimate, node, rows, component library, and templates can all be derived from current route context. A global assistant can come later only after the estimate-scoped version proves safe.

## Additional readiness gates

- [ ] A UI spec identifies the exact initial route and panel placement before implementation.
- [ ] The Copilot patch preview uses existing compact app typography and survives narrow desktop widths without overflow.
- [ ] Any future `@xyflow/react` proof of concept includes browser screenshot verification at desktop and mobile widths.
- [ ] Agent-generated diffs remain available as tables/lists even if a graph preview is added.
- [ ] Nivo remains isolated to `src/components/workshop/project-charts/` unless a separate charting plan explicitly widens it.
- [ ] No AI package or visualization dependency is added before a scoped implementation plan is approved.
