# Implementation Routes

Status: second-pass route map. This document does not authorize implementation by itself.

## Route recommendation

The first browser count/profile pass is captured in `12_browser_count_profile_report.md`. It did not prove a high-confidence current DOM/windowing bottleneck, but it did show non-virtualized full mounting on the inspected row surfaces.

The next implementation route is Route G: proactive shared `Tree` virtualization behind a default-off flag. This is not a default-on shipping decision.

Use these route rules for later passes:

- If tree DOM dominates, take Route B, then Route C.
- If row-table DOM dominates, take Route D only after Route E proves table/focus semantics.
- If the evidence is mixed but startup-bias criteria pass, take Route G.
- If the evidence is mixed and startup-bias criteria fail, stop after Route A and do not add the dependency yet.

Default implementation bias, unless Gate 0 contradicts it: shared Tree first, left tree consumer second, right tree consumers third, center row-table last. The row-table route should jump ahead only when browser evidence proves the center sheet body is the dominant bottleneck.

## Route A - Baseline-only first

Purpose: prove whether virtualization is the right cost to pay.

Prerequisites:

- large fixtures for `500+` center sheet rows
- large fixtures for `1,000+` visible tree rows
- browser trace or Playwright script on the actual estimate route

Steps:

1. Run current jsdom perf profile for estimate sheet rendering.
2. Capture a real-browser trace on the target route.
3. Record DOM counts for left tree, right tree, and center row tables.
4. Record edit latency near top, middle, and bottom rows.
5. Record tree expand/collapse and right-panel search responsiveness.
6. Decide the first enabled surface or stop.

Pros:

- no speculative dependency
- no behavior change
- prevents optimizing the wrong bottleneck

Cons:

- no immediate user-facing improvement
- requires good fixtures before code work starts

Exit gate:

- named first surface with saved before metrics, or documented stop decision

Rollback:

- no rollback needed because no dependency or source behavior changed

## Route B - Shared tree primitive first

Purpose: add virtual rendering to the shared `Tree` primitive without enabling all consumers at once.

Prerequisites:

- Gate 0 proves tree DOM/windowing is the primary bottleneck
- route keeps `Tree` non-virtual behavior as the default
- tests cover virtual-path activation before mounted row counts

Steps:

1. Add `@tanstack/react-virtual`.
2. Add default-off tree virtualization flag.
3. Add `virtualization` prop to `Tree`.
4. Extract current row rendering into a shared `renderFlatRow` helper.
5. Add virtual path using stable node ids as item keys.
6. Update focus to scroll logical targets into view before focusing DOM; this is the first real blocker, not a polish item.
7. Keep root drop zones outside the virtual row window.
8. Add shared tests for focus, ARIA, DnD bands, context menu, empty state, and threshold fallback.

Pros:

- one implementation covers all tree consumers
- centralized fix for focus and DnD mechanics
- cleanest long-term tree architecture

Cons:

- largest shared blast radius
- a tree regression can affect both left and right panels

Exit gate:

- shared `Tree` tests pass with flag off and virtual mode on
- virtual-path activation is asserted in tests
- browser proof shows no blank gaps or interaction regressions

Rollback:

- keep `NEXT_PUBLIC_TREE_VIRTUALIZATION=false`
- stop passing `virtualization` to consumers if needed

## Route C - Tree consumer rollout

Purpose: enable the shared virtual tree path one consumer at a time.

Prerequisites:

- Route B is complete
- left tree browser QA has a large fixture
- right library/templates QA has source search fixtures

Steps:

1. Enable only `EstimateSheetTree`.
2. Verify keyboard navigation, context menu, inline rename, DnD, root zones, and current-row rail.
3. Enable `LibraryTree`.
4. Verify search, expand/collapse, drag from library into sheet, and bounded mounted rows.
5. Enable `TemplatesTree`.
6. Verify variable-height rows and loading skeletons; add `measureElement` or a larger estimate if visual proof shows clipping, overlap, or scroll drift.

Pros:

- fastest visible tree benefit after shared work
- isolates consumer-specific behavior
- supports partial rollback

Cons:

- requires repeated browser QA
- consumer-specific bugs may not show in shared tests

Exit gate:

- each consumer can be enabled alone
- each consumer has a separate proof entry

Rollback:

- disable the tree flag or remove the prop from only the failing consumer

## Route D - Row-table-first

Purpose: virtualize center estimate row bodies when the center sheet is the proven bottleneck.

Prerequisites:

- Gate 0 proves row-table DOM dominates
- Route E settles table body strategy first
- row-id focus helpers are planned before the virtual body ships
- browser evidence accounts for the existing `content-visibility: auto` row optimization, so the route is not justified by row count alone

Steps:

1. Add a default-off `virtualization` prop to `EstimateRowItemsTable`.
2. Extract current row rendering into a shared local render function.
3. Add a virtual row body using stable row ids as item keys.
4. Preserve `data-estimate-row-id`, `data-estimate-row-index`, and cell index attributes.
5. Add row-id focus helper in `cells.tsx`.
6. Update keyboard movement to scroll to logical row id before focusing.
7. Keep selection state independent of mounted rows.
8. Add mounted and offscreen remote cursor behavior.
9. Verify top/middle/bottom edit, blur-save, pending focus after add-row, and sticky header behavior in browser.

Pros:

- direct attack on large center-sheet DOM cost
- leaves tree surfaces untouched
- likely highest benefit if large row bodies are the bottleneck

Cons:

- highest interaction risk
- native table semantics may require structural compromise
- focus/cursor state is more fragile than tree state

Exit gate:

- browser trace improves the failing metric
- editing and keyboard navigation work across virtual boundaries
- offscreen cursor behavior is proven

Rollback:

- keep `NEXT_PUBLIC_ESTIMATE_ROW_VIRTUALIZATION=false`
- retain existing table rendering path

## Route E - Spike before row-table implementation

Purpose: resolve the hard unknown before committing to Route D.

Best spike targets:

- native table body with virtual rows
- grid-like virtual body with table-like accessibility
- row-id focus recovery across unmounted rows
- offscreen cursor fallback shape

Steps:

1. Pick one unknown, not the whole row-table feature.
2. Build a short-lived proof with the smallest fixture that exercises the unknown.
3. Capture browser screenshot/trace or targeted test result.
4. Write a discard/keep recommendation.
5. Delete or fold the spike; do not let spike shortcuts become architecture.

Pros:

- prevents committing to the wrong table structure
- makes Route D less speculative

Cons:

- extra branch or throwaway code
- can sprawl if not time-boxed

Exit gate:

- one clear recommendation: native table path, grid-like path, or stop

Rollback:

- discard spike artifacts and return to Route A/B/C/D decision

## Route F - Infrastructure-first instrumentation

Purpose: add measurement hooks before any UI virtualization work.

Use this route when:

- the browser signal is noisy
- existing tests cannot prove virtual-path activation
- performance work needs repeatable local evidence

Steps:

1. Add or extend render probe to report logical count, mounted count, and active virtual path.
2. Add a browser script that records DOM count and scroll-gap checks.
3. Keep probes disabled or test-only if they are not useful in app runtime.
4. Rerun Route A with stronger evidence.

Pros:

- reduces false positives
- gives implementation routes reusable gates

Cons:

- instrumentation has no direct user-facing win
- probe code must not become noisy runtime surface

Exit gate:

- future virtualization tests can prove the virtual path is active

Rollback:

- remove or keep probes as test-only helpers

## Route G - Startup-bias proactive shared tree

Purpose: spend a small amount of reversible engineering effort now to create a shared virtual tree primitive that can save future performance work, without claiming it should be default-on yet.

Use this route when:

- tree surfaces are core to the app experience
- the shared `Tree` is already the central insertion point
- the implementation can remain default-off behind `NEXT_PUBLIC_TREE_VIRTUALIZATION`
- browser evidence is suggestive but not strong enough to justify default-on
- row-table evidence is not strong enough to justify the high-risk center-sheet route

Steps:

1. Add dependency and default-off tree flag.
2. Add shared `Tree` virtual mode without enabling consumers by default.
3. Add virtual-path activation tests, focus tests, DnD tests, and ARIA tests.
4. Enable only in local/staging for browser proof.
5. Keep default-off until before/after browser evidence proves benefit and no interaction regressions.

Pros:

- creates reusable infrastructure before tree scale becomes a launch blocker
- keeps risk bounded to a default-off path
- avoids touching the higher-risk center row table without stronger evidence

Cons:

- may add dependency and dormant code before users feel the bottleneck
- still requires careful tests because shared `Tree` is broad blast radius
- does not replace default-on proof

Exit gate:

- default-off path is behavior-identical
- virtual path is testable and locally usable
- no consumer is default-on without browser proof

Rollback:

- keep flag off, stop passing `virtualization`, or remove the dormant path before release

## Route decision table

| Evidence after Gate 0 | Primary route | Fallback route | Do not do |
| --- | --- | --- | --- |
| left/right tree DOM dominates | B then C | F if activation proof is weak | D in same PR |
| center row-table DOM dominates | E then D | F if metrics are noisy | B in same PR |
| both dominate clearly | choose the worse surface first | second surface in later PR | dual-surface shipping PR |
| neither dominates, startup-bias criteria pass | G | F then A again | row-table-first |
| neither dominates, startup-bias criteria fail | stop after A | B1 memoization or other measured fixes | dependency install |
| browser signal is inconclusive | F then A again | targeted spike | default-on virtualization |

## Stop conditions

Stop the implementation route and return to planning if:

- Gate 0 cannot identify a DOM/windowing bottleneck
- the virtual path cannot be proven active in tests
- tree focus still depends on an already-mounted offscreen target
- right-panel rows clip or overlap without a measurement strategy
- row-table keyboard focus cannot move by stable row id
- remote cursor fallback requires forcing local scroll
