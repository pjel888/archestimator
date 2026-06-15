# Second-Pass Review Report

Status: planning report. No app code, dependency, migration, provider setting, or runtime configuration was changed.

Third-pass note: `11_browser_evidence_and_startup_decision.md` refines this report by splitting Gate 0 into a lighter reversible-implementation threshold and a stricter default-on threshold. The 2026-06-15 corrections in `13_shared_tree_virtualization_implementation_plan.md` and `14_emc_virtualization_implementation_plan.md` further supersede this report: expected production-scale nested BOQs justify planning shared Tree and EMC virtualization now, while default-on rollout remains gated.

## Review question

Are we satisfied with the quality and strategy of the TanStack Virtual plan?

Answer after the 2026-06-15 correction: satisfied with shared Tree and EMC virtualization as planned work, with one important constraint. Default-on rollout must remain strict. Virtualization should be treated as production-scale infrastructure for the shared Tree and EMC surfaces, not as a generic speed upgrade for every surface.

## What changed in this pass

- Added a detailed blast-radius map in `07_blast_radius_map.md`.
- Added implementation route options in `08_implementation_routes.md`.
- Expanded UltraQA scenarios into testable failure modes in `09_second_pass_scenario_catalog.md`.
- Updated the index to make the second-pass gates explicit.
- Closed three parallel review lanes: blast-radius audit, implementation-route audit, and adversarial QA scenario audit.

## Key findings

### 1. The bottleneck proof is the shipping strategy

The prior project decision rejected speculative default-on virtualization. The current plan reopens shared Tree and EMC virtualization because the owner clarified expected production node scale. Browser evidence from a large real route remains required before default-on rollout.

Implication: Route A is not busywork. It is the gate that prevents turning the feature on broadly when memoization, state isolation, query shaping, or row rendering structure is the real bottleneck.

### 2. Tree, EMC branch, and row-table routes have different risk profiles

Tree virtualization is a shared primitive risk:

- one implementation can benefit left and right trees
- one bug can affect all tree consumers
- the hard contracts are focus, DnD, root zones, context menu, inline rename, search, and ARIA metadata
- the first blocker is scroll-to-target before focus; the virtualizer itself is not the hard part

EMC branch/section virtualization is a center layout risk:

- it handles the recursive Estimate Master Column hierarchy, not the shared `Tree`
- it should preserve rows-first mixed-content ordering, collapse/search, sticky header behavior, add-row strips, and template/component drops
- it needs dynamic measurement because section heights vary
- it directly targets the center sheet when many BOQ nodes are visible even if each node owns only a few rows

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
- `NEXT_PUBLIC_EMC_VIRTUALIZATION`
- `NEXT_PUBLIC_ESTIMATE_ROW_VIRTUALIZATION`

These flags should remain default-off until browser proof and rollback proof exist for the selected surface.

## Recommended route

1. Plan Route G now: shared Tree virtualization behind a default-off flag.
2. Plan Route H now: EMC branch/section virtualization behind a default-off flag.
3. Use Route B/C implementation details for the shared primitive and consumer rollout.
4. Use Route A/F to build stronger browser evidence and activation instrumentation.
5. If EMC row-table DOM dominates in a larger fixture, run Route E before Route D.
6. If Tree or EMC interaction proof fails, keep the non-virtual path and stop before enablement.

Default order: shared Tree primitive, left tree consumer, EMC branch/section route, right tree consumers with height proof, lower-traffic shared Tree consumers, EMC row-table sub-route after a spike.

## Remaining implementation questions

These should be answered during the first implementation phase, not guessed now:

- Does the center row-table virtual body preserve native table semantics, or does it need a grid-like structure?
- Does EMC branch virtualization flatten node sections only, or should it split node rows/add-row/drop strips into smaller virtual items?
- Should tree inline rename pin the editing row with a custom range extractor or temporarily suspend virtualization around the editing row?
- What is the smallest useful overscan for the estimate route without blank gaps?
- Should render probes be test-only or available behind development instrumentation?

## Readiness verdict

Planning readiness: ready for shared Tree and EMC implementation planning.

Implementation readiness: ready to start shared Tree and EMC planning-to-implementation when requested, behind default-off flags and with tests first.

Shipping readiness: not ready. Shipping requires route-specific tests, browser proof, and rollback proof.
