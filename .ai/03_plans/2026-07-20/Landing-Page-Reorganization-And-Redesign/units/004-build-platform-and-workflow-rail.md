# UNIT-004 — Build Platform and Workflow Rail

**Status:** READY  
**Depends on:** UNIT-003  
**Goal:** Implement the capability proof grid, Platform thesis, and five-chapter sticky workflow that forms the page's main Attio-led narrative.

## Owned paths

- `src/components/landing/new-redesign/sections/PlatformWorkflow.tsx`
- `src/components/landing/new-redesign/sections/PlatformWorkflow.module.css`
- `src/components/landing/new-redesign/interactions/WorkflowRail.client.tsx`

## Implementation

1. Build the capability matrix as the no-fake-proof equivalent of Attio's logo wall. Use only source-verified capabilities; no icons are required when labels suffice.
2. Build the Platform intro with the supplied connected-workflow belief and restrained editorial measure.
3. Build five server-rendered chapter articles in the exact order from the architecture contract.
4. Use a desktop `6/24 + 18/24` split. Rail is sticky below `116px`; each chapter has enough natural height to show intro plus proof panels without scroll hijacking.
5. Use original DOM/SVG proof panels drawn from the shared fixture. Do not import live workshop/share components into the marketing page.
6. Implement `WorkflowRail.client.tsx` with IntersectionObserver/root-margin logic that selects the chapter crossing roughly `45%` viewport.
7. On anchor click, use smooth scrolling only when motion is permitted; update `aria-current` and leave browser history/anchors coherent.
8. Below `992px`, convert to a `53px` horizontal sticky selector below the `100px` stack. Keep chapter articles in ordinary vertical flow.
9. Below `768px`, convert paired desktop panels to stack/snap/compact disclosure rather than shrinking UI.
10. Use only the shared reveal and sticky-state motion families.

## Acceptance

- Capability grid contains no logos, metrics, testimonials, or unavailable features.
- Exactly five chapter labels and five matching article IDs exist.
- Desktop rail offset, column split, active threshold, and indicator timing match the contract.
- Narrow selector remains reachable, scrollable, and visibly indicates the active chapter.
- Every chapter is understandable with JavaScript disabled and all content remains in DOM order.
- Chapter 5 explicitly distinguishes preserved context from the incomplete guided revision handoff.

## Decisive verification

- Source inspection of article/rail ID reciprocity, observer cleanup, and reduced-motion scrolling.
- CSS inspection at all four declared breakpoint branches.
- Type/LSP diagnostics and scoped lint.

## Recovery

Remove the three owned files and restore the scaffold slots. No route cutover has occurred.
