# Second-Pass Review Report

Status: planning report. No app code, dependency, migration, provider setting, or runtime configuration was changed.

Third-pass note: `11_browser_evidence_and_startup_decision.md` refines this report by splitting Gate 0 into a lighter reversible-implementation threshold and a stricter default-on threshold.

## Review question

Are we satisfied with the quality and strategy of the TanStack Virtual plan?

Answer: more satisfied after this pass, with one important constraint. The plan is strategically strong only if Gate 0 remains strict. Virtualization should be treated as a measured remedy for a proven DOM/windowing bottleneck, not as a generic speed upgrade.

## What changed in this pass

- Added a detailed blast-radius map in `07_blast_radius_map.md`.
- Added implementation route options in `08_implementation_routes.md`.
- Expanded UltraQA scenarios into testable failure modes in `09_second_pass_scenario_catalog.md`.
- Updated the index to make the second-pass gates explicit.
- Closed three parallel review lanes: blast-radius audit, implementation-route audit, and adversarial QA scenario audit.

## Key findings

### 1. The bottleneck proof is the strategy

The prior project decision rejected speculative virtualization. The current plan should reopen that decision only with browser evidence from a large real route.

Implication: Route A is not busywork. It is the gate that prevents paying virtualization complexity when memoization, state isolation, query shaping, or row rendering structure is the real bottleneck.

### 2. Tree and row-table routes have different risk profiles

Tree virtualization is a shared primitive risk:

- one implementation can benefit left and right trees
- one bug can affect all tree consumers
- the hard contracts are focus, DnD, root zones, context menu, inline rename, search, and ARIA metadata
- the first blocker is scroll-to-target before focus; the virtualizer itself is not the hard part

Row-table virtualization is an interaction risk:

- it intersects editing, blur-save, selected ids, pending focus, sticky headers, table semantics, and collaboration cursors
- it should not start without a spike if Gate 0 points to the center sheet
- it should account for existing row `content-visibility` optimization before assuming raw row count is enough justification

Right-panel tree virtualization is a height risk:

- library and template rows are mixed-height
- templates can inject skeleton rows
- a fixed `28px` estimate is likely optimistic until browser proof says otherwise

### 3. Misleading success is the highest QA risk

A test can pass while proving the wrong thing if:

- virtualization is below threshold and silently disabled
- the fixture is collapsed, so mounted count is naturally small
- jsdom assertions pretend to prove real scroll smoothness
- tests only edit mounted rows
- cursor tests only cover coordinates, not unmounted row anchors

Every windowing test must first prove the virtual path is active.

### 4. Rollout is credible only with separate flags

The plan should keep:

- `NEXT_PUBLIC_TREE_VIRTUALIZATION`
- `NEXT_PUBLIC_ESTIMATE_ROW_VIRTUALIZATION`

These flags should remain default-off until browser proof and rollback proof exist for the selected surface.

## Recommended route

1. Execute Route A: browser baseline and dependency decision.
2. If tree DOM dominates, implement Route B and roll out through Route C.
3. If row-table DOM dominates, run Route E before Route D.
4. If evidence is mixed or weak, stop and do not add `@tanstack/react-virtual` yet.

Default bias after Gate 0, unless evidence contradicts it: shared Tree first, left tree consumer second, right tree consumers third with height proof, center row-table last after a spike.

## Remaining implementation questions

These should be answered during the first implementation phase, not guessed now:

- Does the center row-table virtual body preserve native table semantics, or does it need a grid-like structure?
- Should tree inline rename pin the editing row with a custom range extractor or temporarily suspend virtualization around the editing row?
- What is the smallest useful overscan for the estimate route without blank gaps?
- Should render probes be test-only or available behind development instrumentation?

## Readiness verdict

Planning readiness: ready for Gate 0 baseline work.

Implementation readiness: not ready to install or code virtualization until Gate 0 chooses a surface.

Shipping readiness: not ready. Shipping requires route-specific tests, browser proof, and rollback proof.
