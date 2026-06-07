# Strategy Critique and Corrected Decision

Date: 2026-06-06

## 2026-06-06 Decision Update

The corrected decision remains valid, but the readiness posture has changed. The old single-score readiness framing is retired. Current canonical scoring is scoped in `CURRENT_CANONICAL_PLAN.md` and `05_READINESS_VALIDATION.md`:

- architecture strategy is high-confidence;
- MVP Phases 0-3 are ready for future implementation handoff;
- editable-tree phases remain measurement- and owner-gated;
- performance claims are not ready until Profiler and bundle data exist.

This critique should be read together with `BLAST_RADIUS_ANALYSIS.md`, because `WorkshopTree` is now verified as a `HIGH` risk shared primitive.

## Honest Confidence

No, the original pack was not 100 percent strategy-complete.

It had the right broad direction:

- Do not rewrite every tree.
- Keep `react-complex-tree` for editable drag/drop trees.
- Extract shared tree data utilities before virtualization.
- Split `EstimateSheetContent.tsx` by behavior seams.

But it was lacking in five ways:

1. It treated large files and bridge nodes too similarly.
2. It did not include enough exact source-line evidence for future implementers.
3. It did not define TDD-first implementation steps with expected red/green signals.
4. It did not adversarially test the plan for false readiness.
5. It did not give a durable Ultragoal/Team handoff that a later Codex run can execute without rediscovering the same context.

## Corrected Strategy

The implementation should be split into two tracks:

### Track A - Safe Reuse Foundation

Purpose:

- Build shared pure utilities and read-only tree reuse first.

Why:

- It has low mutation risk.
- It creates the API needed by later tree and sheet splits.
- It can be tested without touching optimistic persistence.

Scope:

- `src/components/workshop/tree-core/*`
- `src/components/share/share-tree/*`
- `src/components/workshop/workshop-tree.tsx`
- `src/components/share/ShareEstimateTreePanel.tsx`
- `src/components/share/ShareEstimateTreeView.tsx`

Stop condition:

- Shared tree-core tests pass.
- Share panel and share view use the same row renderer and expansion/search hooks.
- No editable tree behavior changes.

### Track B - Bridge-Node Decomposition

Purpose:

- Reduce blast radius in the files that graph analysis identifies as chokepoints.

Why:

- `EstimateSheetContent` and `EstimateSheetTree` are top bridge nodes, not just long files.
- Editing them without tests risks row edit, tree navigation, activity/history, proposal preview, sidebar insertion, and collaboration regressions.

Scope:

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/component-library-manager/AddComponentModal.tsx`
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`
- `src/components/workshop/component-library/tree/buildLibraryTree.ts`
- `src/lib/component-library/library-folder-reorder.ts`

Stop condition:

- Each extraction preserves behavior with failing tests first.
- Route peak-load/profile evidence is collected after componentization.
- No new virtualization dependency is added until measured thresholds justify it.

## Decision Drivers

1. Behavior preservation over abstraction purity.
2. Measured render-scope reduction over speculative memoization.
3. Editable tree stability over a forced generic tree replacement.
4. Reusable pure utilities before reusable UI shells.
5. Testable bite-sized extraction over broad refactor commits.

## Options Considered

### Option 1 - Single App-Wide Tree Component

Pros:

- One apparent public API.
- Easy to explain at a high level.

Cons:

- Hides major differences between editable RCT trees, read-only share trees, and activity flat trees.
- Risks breaking drag/drop, rollback, and tree accessibility.
- Encourages a prop-heavy component that becomes another chokepoint.

Verdict:

- Rejected.

### Option 2 - Layered Tree Core plus Adapters

Pros:

- Keeps data utilities pure.
- Allows recursive, RCT, and flat/virtual renderers to coexist.
- Lets share tree unification prove the contract before high-risk estimate work.

Cons:

- More files initially.
- Requires discipline to keep domain data out of the core.

Verdict:

- Chosen.

### Option 3 - Virtualization First

Pros:

- Directly attacks large visible row counts.
- May improve extreme scroll cases.

Cons:

- The repo does not currently include `@tanstack/react-virtual`.
- Recursive `WorkshopTree` cannot be virtualized cleanly without flattening first.
- WAI-ARIA dynamic row metadata becomes mandatory when the full set is not in the DOM.
- Editable drag/drop trees need RCT state stability before renderer replacement.

Verdict:

- Deferred until after flattening, indexing, and Profiler evidence.

## ADR

Decision:

- Adopt layered tree/component reuse: pure tree utilities, headless hooks, and render shells. Keep React Complex Tree for editable drag/drop trees during the first implementation sequence.

Drivers:

- Existing repo already shares `WorkshopTreeRow`, `WorkshopTreeTabs`, tree row affordances, and compact tree visual constants.
- Graph evidence marks `EstimateSheetContent` and `EstimateSheetTree` as bridge nodes.
- Official React guidance supports measuring and reducing update scope before broad memoization.
- Official TanStack guidance supports virtualizing flattened row lists, not recursive trees directly.
- WAI-ARIA requires explicit level/position metadata when virtual/dynamic trees do not keep every node in the DOM.

Alternatives considered:

- Single generic tree component.
- Immediate virtualization.
- Broad `memo`/`useCallback` pass.
- Full rewrite away from React Complex Tree.

Why chosen:

- This option minimizes behavior risk while still creating reusable foundations.

Consequences:

- Early implementation has more pure utility tests.
- Some UI duplication remains until the share-tree and editable-tree phases land.
- Future virtualization stays behind a measurable dependency gate.

Follow-ups:

- Implement Track A first.
- Run Track B only after Track A tests pass.
- Keep virtualization as a separate measured decision record.

## Pre-Mortem

Failure scenario 1:

- Implementation extracts tree utilities but does not wire them into real surfaces.
- Mitigation: require share tree panel/view unification in the same Track A branch.

Failure scenario 2:

- `EstimateSheetContent` split moves code but leaves all state in the same parent.
- Mitigation: each extraction must reduce one concrete state/render responsibility and include a Profiler or render-count check where practical.

Failure scenario 3:

- Virtualized rows lose tree accessibility metadata.
- Mitigation: tree-core aria tests must cover `aria-level`, `aria-posinset`, and `aria-setsize` before any virtual renderer lands.

## What Changed From The First Pack

- Added bridge-node risk to sequencing.
- Added exact line evidence in `07_REPO_EVIDENCE_REGISTER.md`.
- Added TDD red/green tasks in `08_TDD_IMPLEMENTATION_TASK_PACK.md`.
- Added UltraQA-style plan quality scenarios in `09_ULTRAQA_PLAN_QUALITY_REPORT.md`.
- Added Ultragoal/Team handoff in `10_ULTRAGOAL_TEAM_HANDOFF.md`.
