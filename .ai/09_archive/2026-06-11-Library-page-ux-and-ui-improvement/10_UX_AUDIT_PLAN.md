# UX Audit Plan

Status: audit protocol for the Library page. No coding.

## Audit Objective

Determine whether `/workshop/library` lets beta users find, trust, inspect, add, organize, and safely archive construction cost components with accurate UI, accessible interactions, and acceptable performance.

## Primary Users

| Persona | Likely job |
| --- | --- |
| Estimator | Find and compare component costs quickly while preparing estimates. |
| Architect/designer | Understand component scope, source, and cost confidence before reuse. |
| Admin/manager | Maintain catalogue quality, supplier/brand records, lifecycle state, and archival hygiene. |
| Beta reviewer | Validate that catalogue data and UI behavior are trustworthy enough for closed beta. |

## Research Questions

1. Can users find a known component in under 10 seconds by name or category?
2. Can users determine whether a component price is current and trustworthy?
3. Can users discover supplier/brand/category structure without reading instructions?
4. Can users add a new component without losing context or creating incomplete data?
5. Can users safely archive components and understand destructive consequences?
6. Does the right tree panel help navigation, or does it compete with search?
7. Which facets are truly useful: category, supplier, brand, lifecycle, confidence, source, pricing freshness?
8. Does the card layout communicate enough, or is a detail inspector required for trust?
9. Does the page work for keyboard-only and screen-reader users?
10. Does the page remain responsive under dense data and rapid search?

## Audit Tasks

| ID | Task | Success signal |
| --- | --- | --- |
| T1 | Open Library from global nav | User lands on route and understands page structure. |
| T2 | Search for a known component by name | Result appears, count updates, focus remains stable. |
| T3 | Search by supplier or brand | Matching cards are discoverable and metadata is visible. |
| T4 | Browse category tree to a component | User can select a path and return/reset. |
| T5 | Find all components with low or missing confidence | Either possible today or logged as a facet gap. |
| T6 | Inspect a component price/source/date | User can determine trust level. If not possible, detail surface is required. |
| T7 | Add a component with supplier/brand/category and image | Flow completes or exposes clear blocker. |
| T8 | Archive selected components | Preview is clear, destructive action is deliberate, result is announced. |
| T9 | Use the page keyboard-only | No trap, focus visible, all core actions reachable. |
| T10 | Use mobile viewport | Page reflows without incoherent overlap or hidden critical actions. |

## Audit Method

1. Capture authenticated baseline screenshots.
2. Record DOM, accessibility tree, console, and network state.
3. Walk each task with mouse, keyboard, and reduced-motion where relevant.
4. Compare observed content counts with Supabase read-only queries.
5. Score each task on discoverability, efficiency, trust, accessibility, and performance.
6. Convert failures into implementation-ready issues only after evidence is captured.

## Scoring Rubric

| Score | Meaning |
| --- | --- |
| 5 | Clear, fast, accessible, visually aligned, no observed errors. |
| 4 | Works with minor polish issues. |
| 3 | Works but creates hesitation, weak affordance, or minor accessibility debt. |
| 2 | Partially works or requires hidden knowledge. |
| 1 | Visible path exists but fails or misleads. |
| 0 | Not implemented or inaccessible. |

## Audit Deliverables

1. Screenshot set.
2. Task walkthrough notes.
3. Accessibility findings.
4. Performance trace summary.
5. Schema/content discrepancy report.
6. Prioritized issue list.
7. Implementation readiness checklist update.

## Non-Goals

1. Do not redesign the page during audit.
2. Do not mutate production data.
3. Do not add new dependencies.
4. Do not treat speculative features as accepted scope.

## Readiness Criteria For Moving To Implementation

1. P0 blockers in `06_IMPROVEMENT_RECOMMENDATIONS.md` are satisfied.
2. At least one authenticated baseline exists.
3. Every P1 issue has a reproducible evidence note.
4. Schema and route counts match or the discrepancy is explained.
5. Accessibility and performance criteria have executable checks.
