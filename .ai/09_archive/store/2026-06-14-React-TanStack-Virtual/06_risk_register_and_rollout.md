# Risk Register And Rollout

## Risk register

| Risk | Severity | Surface | Mitigation |
| --- | --- | --- | --- |
| Planning underestimates production BOQ scale by over-weighting the sample project | High | tree, EMC | treat expected thousands of nested nodes/rows as a product constraint; use sample route only for shape/regression evidence |
| Virtualization added where DOM count is not the current sample bottleneck | Medium | tree, EMC | acceptable for shared Tree and EMC only because paths are default-off, reversible, and production-scale BOQs are expected |
| Virtualization added where DOM count is not the bottleneck | High | row table | keep EMC row-table body enablement behind larger fixture, spike, and browser trace |
| Tree focus targets unmounted rows | High | left/right trees | scroll-to-index before focus; tests for Arrow/Home/End |
| Tree DnD bands calculate wrong target | High | left/right trees | tests at first/last rendered rows; keep root zones outside virtual body |
| Inline rename draft lost when row unmounts | High | left tree | keep focused/editing row mounted via custom range extractor or temporarily disable virtualization around editing row |
| EMC branch section unmount breaks mixed-content layout | High | EMC | preserve rows-first order in the logical stream; regression tests for mixed nodes, rows-only nodes, empty nodes |
| EMC sticky header collides with virtual sections | High | EMC | keep only displayed-node header sticky; browser proof at normal/narrow viewports |
| EMC drops target wrong logical node | High | EMC | tests for template/component drops after scroll; preserve node id stream and edge auto-scroll |
| Native table semantics break under absolute rows | High | center sheet | spike explicit virtual body strategy; add accessibility and visual tests |
| Row edit focus lost across virtual boundary | High | center sheet | move from index-only focus to row-id focus with scroll-to-row |
| Offscreen selected rows pruned incorrectly | Medium | center sheet | selection state remains logical id set, independent of mounted rows |
| Remote cursor target missing for offscreen row | Medium | center sheet | graceful fallback, no forced local scroll, cursor isolation test |
| Medium-size lists get slower | Medium | all | thresholds keep small lists non-virtual |
| Overscan too low creates blank gaps | Medium | all | tune overscan in browser; keep conservative initial overscan |
| Dynamic row heights cause scroll drift | Medium | right templates, center sheet | use `measureElement` or larger estimates |
| React 19 `flushSync` warnings | Medium | all | set `useFlushSync:false` unless proven unnecessary |
| Bundle cost before immediate user-visible benefit | Medium | tree | accept only for shared Tree route; keep flags off by default and monitor bundle impact |
| Tests pass while virtual path is disabled | High | all | assert virtual wrapper/probe activation before mounted row counts |
| Collapsed fixtures fake a small DOM count | High | tree | assert logical visible row count before mounted count |
| Browser scroll behavior is overclaimed from jsdom | High | all | keep browser proof mandatory for scroll gaps, sticky overlap, and narrow panels |

Expanded blast-radius details are in `07_blast_radius_map.md`.

## Rollout plan

### Stage 1 - Local flag only

Flags:

```bash
NEXT_PUBLIC_TREE_VIRTUALIZATION=false
NEXT_PUBLIC_EMC_VIRTUALIZATION=false
NEXT_PUBLIC_ESTIMATE_ROW_VIRTUALIZATION=false
```

No behavior change. Dependency may be present for the shared Tree and EMC implementation routes, but non-virtual paths remain the runtime default.

### Stage 2 - Single-surface local enablement

Enable only one surface at a time:

```bash
NEXT_PUBLIC_TREE_VIRTUALIZATION=true
NEXT_PUBLIC_EMC_VIRTUALIZATION=false
NEXT_PUBLIC_ESTIMATE_ROW_VIRTUALIZATION=false
```

or:

```bash
NEXT_PUBLIC_TREE_VIRTUALIZATION=false
NEXT_PUBLIC_EMC_VIRTUALIZATION=true
NEXT_PUBLIC_ESTIMATE_ROW_VIRTUALIZATION=false
```

Run targeted tests and browser QA.

### Stage 3 - Closed-beta dogfood

Keep the feature hidden behind env flags. Enable only on local/staging after manual browser proof.

Monitor:

- support reports about lost edits or scroll jumps
- browser console warnings
- perceived sheet open time
- row/table visual overlap
- keyboard and DnD regressions

### Stage 4 - Default-on decision

Only consider default-on when:

- before/after traces prove improvement
- rollback flag has been tested
- all target tests pass
- normal fixtures do not regress
- no active blocker remains in this risk register

## Rollback

Immediate rollback:

```bash
NEXT_PUBLIC_TREE_VIRTUALIZATION=false
NEXT_PUBLIC_EMC_VIRTUALIZATION=false
NEXT_PUBLIC_ESTIMATE_ROW_VIRTUALIZATION=false
```

If dependency remains installed but flags are off, the app should use the previous render paths. Remove the dependency later only if bundle analysis shows meaningful cost or the virtual path is abandoned.

## Implementation staffing suggestion

Use parallel lanes once implementation starts:

- Lane A: browser baseline and fixture proof
- Lane B: shared `Tree` virtual mode behind flag
- Lane C: EMC branch/section virtual mode behind flag
- Lane D: EMC row-table virtual body behind flag
- Lane E: adversarial QA and browser regression

Do not let shared Tree, EMC branch/section, and EMC row-table routes land in the same source PR unless a later large-fixture pass proves the combined change is independently necessary and each path has separate flags/tests.

Route options and fallback paths are mapped in `08_implementation_routes.md`.

## Decision log

- Product direction: proceed toward TanStack Virtual because large sheet/tree surfaces are core MVP workflow and likely to hit DOM ceilings.
- Engineering constraint: previous repo decisions rejected speculative default-on virtualization. This plan reopens shared Tree and EMC virtualization because the owner clarified expected production node scale, while keeping default-on rollout gated by browser proof.
- Architecture decision: shared tree virtualization belongs in `src/components/ui/tree.tsx`; EMC branch/section virtualization belongs around `EstimateSheetBranch`/`EstimateSheetContent`; EMC row virtualization belongs in `EstimateRowItemsTable`.
- Rollout decision: feature flags and thresholds are mandatory because this is mission-critical UI.
