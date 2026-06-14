# Browser Evidence And Startup Decision

Status: third-pass planning. This document answers what counts as browser evidence and how the AI-startup posture changes the decision threshold.

## Short answer

Browser evidence proves a DOM/windowing bottleneck when the real route shows that mounted rows are a material part of the slow path, and reducing mounted rows is likely to reduce that cost.

For this startup, the decision has two gates:

1. **Start implementation gate:** can be lighter if the work is reversible, default-off, and aimed at a core future bottleneck.
2. **Default-on gate:** stays strict and requires before/after browser proof plus interaction QA.

That means it can be reasonable to implement shared tree virtualization now behind a flag, even if the proof is not strong enough to turn it on by default. The center row-table path should still require stronger proof because it has much higher correctness risk.

## What to measure in the browser

Use the real estimate route with large fixtures:

```text
http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/61afe46e-3d5d-4f04-85ae-758e78aa4937
```

Measure these surfaces separately:

| Surface | Selectors/signals | Interaction |
| --- | --- | --- |
| left tree | mounted `[data-tree-row]` count, tree expand/collapse timing | expand deep nodes, Arrow/Home/End, context menu |
| right library/templates trees | mounted `[data-tree-row]` count, search result mount count | search, expand project sources, drag into sheet |
| center row tables | mounted `[data-estimate-row-id]` count, table body size | scroll long area, edit top/middle/bottom rows |
| whole route | total DOM nodes, long tasks, React commit duration | load, scroll, search, edit |

## Evidence that points to a DOM/windowing bottleneck

Any one signal is suggestive. Multiple signals together are convincing.

| Signal | What it means | Strength |
| --- | --- | --- |
| mounted row count scales with dataset | the DOM grows linearly as estimates or trees grow | medium |
| total DOM nodes are very high on a large fixture | the browser has a lot of elements to style/layout/paint | medium |
| Chrome Performance shows long `Recalculate Style`, `Layout`, or `Paint` tasks during load/scroll/search | browser rendering work is meaningful, not just app data work | high |
| React Profiler shows long commits dominated by row components | React reconciliation/rendering is tied to row volume | high |
| scroll creates blanking, jank, or long tasks when many rows are mounted | windowing is likely to improve perceived interaction | high |
| hiding/collapsing most rows sharply improves the same interaction | fewer mounted rows change the bottleneck | high |
| a prototype virtual path reduces mounted rows and improves the failing metric | virtualization directly addresses the bottleneck | highest |

## Evidence that points away from virtualization

Do not call it a DOM/windowing bottleneck if the slow path is mainly:

- network or database latency
- query/cache waterfall
- expensive data transforms before rendering
- image loading
- Supabase or route-loader delay
- one heavy component unrelated to row count
- React state churn from global context or collaboration updates
- row-table updates that already stay isolated while DOM count is not high

Virtualization may still help later, but it is not the first fix for those symptoms.

## Practical browser procedure

### Pass 1 - Count

Open the route and record:

- total DOM nodes from Chrome Performance monitor or the Elements panel
- mounted tree rows
- mounted estimate rows
- logical fixture sizes

The key ratio is mounted rows vs logical rows. If they are almost equal on large fixtures, virtualization has a target. If mounted rows are already bounded, virtualization is probably not the main lever.

### Pass 2 - Profile

Record a Chrome Performance trace for:

1. initial route load
2. expanding a deep left-tree section
3. searching right-panel sources
4. scrolling a long center row table
5. editing top, middle, and bottom rows

Look for:

- long tasks over roughly one frame budget during normal interaction
- repeated style/layout/paint work tied to row surfaces
- React commits that grow with row count
- visible scroll jank or blank areas

### Pass 3 - Compare a cheap reduction

Before writing production virtualization, compare against a cheap row-count reduction:

- collapse large branches and repeat the interaction
- search/filter to a smaller visible set and repeat the interaction
- use a temporary local branch or dev-only fixture toggle if needed

If the same action becomes materially smoother when mounted rows drop, that is strong evidence for virtualization.

### Pass 4 - Prove the route before default-on

After a virtual path exists behind a flag, repeat the same trace with:

- flag off
- flag on
- same fixture
- same viewport
- same interaction

Default-on requires the flag-on trace to improve the failing metric and pass interaction QA. Merely reducing DOM count is not enough if focus, DnD, editing, or accessibility regresses.

## Thresholds for decisions

These are planning thresholds, not hard product law.

| Decision | Required evidence |
| --- | --- |
| do not implement yet | no high row counts, no rendering long tasks, or slow path is data/network/state churn |
| implement shared tree route behind default-off flag | high or growing tree row counts, core workflow relevance, shared insertion point, and bounded rollback |
| enable tree locally/staging | virtual path passes activation, focus, DnD, ARIA, search, and no-blank-gap browser checks |
| implement row-table route | row-table body is the dominant browser bottleneck and table/focus spike passes |
| turn any route on by default | before/after browser proof improves the failing metric, normal fixtures do not regress, and rollback flag is tested |

## AI-startup decision adjustment

Because the team is AI-driven, the plan should optimize for future speed as well as immediate proof.

Lower the bar to **start** when all are true:

- the surface is central to the product
- the implementation is reversible
- the old path stays intact
- the feature is default-off
- the abstraction is shared rather than one-off
- the tests prevent misleading success
- the work avoids the highest-risk surface unless evidence justifies it

Do not lower the bar to **ship default-on**. Lost edits, broken DnD, or inaccessible rows cost more than the saved engineering time.

## Current recommendation after the third pass

The best startup-biased route is:

1. Use the browser count/profile pass in `12_browser_count_profile_report.md` as the current measured baseline.
2. Implement shared `Tree` virtualization behind a default-off flag.
3. Enable left `EstimateSheetTree` locally/staging first.
4. Enable right trees only after mixed-height browser proof.
5. Leave center row-table virtualization for a later spike unless a larger-fixture browser trace clearly identifies it as the dominant bottleneck.

This gives the team reusable future infrastructure without prematurely risking estimate editing correctness.

The measured pass is not strong enough to turn virtualization on by default. It is strong enough to justify reversible, default-off shared tree infrastructure because the current app mounts all inspected logical rows, the tree abstraction is central, and the row-table route remains gated.
