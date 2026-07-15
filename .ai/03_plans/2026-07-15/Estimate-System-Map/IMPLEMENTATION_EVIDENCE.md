# Estimate System UX Brain — Implementation Evidence

Status: Verified complete

## Evidence Ledger

| Evidence | Status | Result |
| --- | --- | --- |
| Typed documentation validation | PASS | The canonical document loads with 7 areas, 8 features, 14 pages, 7 personas, 9 experience paths, and 11 intersections. Reference, classification, current/partial, core-chain, support-path, and directed-return invariants fail fast. |
| Focused static validation | PASS | Targeted ESLint and `git diff --check` pass for the five Estimate System implementation files and the corrected execution plan. |
| Repository typecheck | PARTIAL | `bunx tsc --noEmit --pretty false` reaches one unrelated concurrent error in `src/components/workshop/estimate-sheet/rows/row-table.tsx:252`; no Estimate System error is reported. |
| Desktop browser UltraQA | PASS | Product remains default; UX defaults to Estimator and Build and price; personas, search, no-match recovery, ordered steps, cross-links, focus, intersections, and decision truth were exercised at 1280×720. Later source-review corrections to no-path wording and domain classification were independently approved after browser finalization. |
| Compact browser UltraQA | PASS | At 768px wide the index stacks above content, the handoff chain becomes one column, relationship rows stack, and document horizontal overflow remains false. |
| Browser console | PASS | Final in-app browser warning/error count is zero. |
| Independent review | PASS | Simplicity approved. Correctness/accessibility approved after the no-path/search distinction was repaired. Architecture approved after legacy Client Links, topology validation, and revision truth were corrected. Completion verification returned `APPROVE_IMPLEMENTATION`. |
| Change-impact detection | DEGRADED | Mandatory GitNexus detection ran across the shared dirty worktree and reported high aggregate risk from unrelated Library and estimate-row changes. The explicitly five-file secondary graph scope reported zero affected flows but retained stale/misattributed symbol mappings. Independent source review and focused static validation provide the decisive scoped evidence. |
| Plan-pack validation | PASS | `bun run validate:plan-pack -- .ai/03_plans/2026-07-15/Estimate-System-Map --write` passes with refreshed artifact, evidence, and manifest hashes. |

## Browser Verification Matrix

| Contract | Fresh result |
| --- | --- |
| Default view | Product tab selected on first load. |
| UX default | UX opens with Estimator, Build and price an estimate, and Happy path selected. |
| Persona filtering | Selecting Project lead prioritizes its owned paths; Anonymous visitor and Platform administrator show honest no-path states. |
| Search | Journey title, step title, page title, and feature title searches return match explanations. An unmatched query was exercised; final source now distinguishes a real search miss from a persona with no assigned paths and restores focus when reset. |
| Ordered path | Build and price renders Step 1 of 4 through Step 4 of 4 with Page and Feature links. |
| Cross-view navigation | Page and Feature links move to the owning record, focus its `h2`, and preserve persona, path, query, and local UX mode when returning. |
| Keyboard | Arrow keys move the segmented control between Happy path and Intersections and leave a visible focus ring on the active control. |
| Intersections | The authoring → publication → external review → monitoring chain, supporting component/template/data paths, and partial return loop are all present. |
| Decision boundary | Approval and decline stop at monitoring; only `changes_requested` enters the partial response path. Actual estimate revision remains current; only missing guided navigation and return continuity are partial. |
| Responsive layout | Desktop and 768px compact checks report no page-level horizontal overflow. |

## Fresh Browser Artifacts

- `estimate-system-ux-qa-happy-path-desktop-settled.png` — 1280×720 ordered Estimator path.
- `estimate-system-ux-qa-intersections-desktop-settled.png` — 1280×720 keyboard-focused intersection mode.
- `estimate-system-ux-qa-intersections-compact.png` — 768×900 compact one-column handoff chain and support paths.

## Static Receipts

```text
bun -e 'import { estimateSystemDocumentation as documentation } from "./src/lib/admin/estimate-system-map-data"; console.log(JSON.stringify(documentation.integrity))'
{"ok":true,"areaCount":7,"featureCount":8,"pageCount":14,"personaCount":7,"experiencePathCount":9,"intersectionCount":11}
```

```text
bunx eslint src/lib/admin/estimate-system-map.ts src/lib/admin/estimate-system-map-data.ts src/components/admin/estimate-system-map/EstimateSystemMap.tsx src/components/admin/estimate-system-map/EstimateSystemGraph.tsx src/components/admin/estimate-system-map/EstimateSystemUx.tsx
# exit 0

git diff --check -- src/lib/admin/estimate-system-map.ts src/lib/admin/estimate-system-map-data.ts src/components/admin/estimate-system-map/EstimateSystemMap.tsx src/components/admin/estimate-system-map/EstimateSystemGraph.tsx src/components/admin/estimate-system-map/EstimateSystemUx.tsx .ai/03_plans/2026-07-15/Estimate-System-Map/IMPLEMENTATION_PLAN.md
# exit 0

bun run validate:plan-pack -- .ai/03_plans/2026-07-15/Estimate-System-Map --write
# plan-pack validation passed; hashes refreshed
```

## Review Receipts

- Correctness/accessibility: explicit related-path navigation clears incompatible search state, preserves a supporting persona, exposes directional labels, restores search focus, and distinguishes no-path personas from search misses.
- Architecture: Client Links is a separate legacy area; every UX path is classified once; core, support, and directed partial-return connections are validated; revision truth is current while continuity gaps are partial.
- Completion: the fourth UX tab, parent-owned state, seven personas, nine ordered paths, cross-links, intersections, truth labels, and responsive evidence meet the implementation acceptance criteria.

## Remaining Risk

- Repository-wide TypeScript proof remains blocked by the unrelated estimate-row tooltip indexing error at `src/components/workshop/estimate-sheet/rows/row-table.tsx:252`.
- The guided return from a client change request to the source estimate and back to the next issue remains intentionally documented as partial product behavior, not implemented continuity.
- Graph indexes are stale against the shared dirty worktree; their aggregate high-risk label belongs to concurrent Library and estimate-row changes rather than a detected Estimate System execution flow.
