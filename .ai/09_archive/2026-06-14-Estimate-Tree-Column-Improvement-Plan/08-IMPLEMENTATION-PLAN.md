# 08 - Implementation Plan

> Part of the **Estimate Master Column (EMC) Improvement Plan** -- `.ai/03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/`
> Status: DRAFT (audit) - 2026-06-14 - Branch: feat/estimate-sheet-uxui
> Index: [00-README](00-README.md)

---

## Goal

Ship the four user-stated EMC improvements as small, TDD-first, individually-committable changes, in risk-ascending order, each landing with its own test rewrite in the same commit so the test suite is never red between commits:

1. **Req 3 (disclosure model)** -- every node with collapsible contents gets a working expand/collapse caret. Today the caret is gated on `hasChildren` only (`branch.tsx:182`), so a rows-only node (the most common node under the P6 single-node model) renders a dead empty slot (`branch.tsx:204`) and can never be collapsed.
2. **Req 1 (Own items label)** -- remove the EMC `"Own items"` eyebrow (`branch.tsx:241-248`), which renders only in the mixed (`hasOwnRows && hasChildren`) case. **Do not** touch the charts `"Own items"` leaf (`aggregate-project-charts.ts:296-309`), a separate money-attribution surface.
3. **Req 2 (spacing/rhythm)** -- replace the dead-code `groupGap` rhythm (`node-visuals.tsx:12-19`, whose `mt-5`/`mt-4` branches never fire because `usesSiblingGroupRhythm` is never passed) and the off-token `space-y-4` (`branch.tsx:237`) with a coherent, depth-aware, token-aligned vertical scale.
4. **Req 4 (CRUD matrix)** -- the matrix is the deliverable ([02-CRUD-CAPABILITY-MATRIX.md](02-CRUD-CAPABILITY-MATRIX.md)); this plan picks the small set of in-scope correctness gap-fills it surfaced (the kind-gate insert bugs) and explicitly defers the rest.

This is a planning artifact. The phases below are written so an implementer can execute them directly, but **no code is changed by this document.**

**Binding readiness addendum:** [10-READINESS-ADDENDUM.md](10-READINESS-ADDENDUM.md) adds second-pass gates for nested row clipping, Bun command parity, DBNET-1 ordering, destructive drag safety, concurrent-agent worktree handling, and maker/checker review. If this file and the addendum differ, follow the stricter addendum.

## Architecture (what the changes touch)

The EMC render path is narrow. Per [07-BLAST-RADIUS-AND-RISK.md](07-BLAST-RADIUS-AND-RISK.md), `branch.tsx` has exactly one importer (`EstimateSheetContent.tsx:96`, rendered at `:2340`) plus self-recursion (`branch.tsx:285`). The atomic blast unit for Reqs 1-3 is:

```
src/components/workshop/estimate-sheet/rows/branch.tsx          # caret gate, Own-items <p>, spacing classes
src/components/workshop/estimate-sheet/rows/node-visuals.tsx    # groupGap, STICKY_* constants
src/components/workshop/EstimateSheetContent.tsx                # collapse state, expand/collapse-all, kind-gates (Req 4)
tests/vitest/estimate-mixed-content.test.tsx                    # the spec that pins current behavior
```

Collapse state is **client-only** and scope-keyed by tab id (`EstimateSheetContent.tsx:1155-1169`); the context value is memoized (`:1171-1177`) and consumed in the branch via `useEstimateSheetExpansion` (`branch.tsx:79`, `expansion.ts:12-16`). Reqs 1-3 touch **no** DB, RPC, server action, network, or RLS path -- they are pure client-render changes.

**Out of the blast radius (do not edit for Reqs 1-3):** `EstimateSheetTree.tsx` (left nav, has its own `NodeIcon`/caret), `ShareEstimateTreePanel.tsx`/`ShareEstimateTreeView.tsx` (read-only mirrors), and `estimate-tree-node-icon.test.tsx` (targets the LEFT tree icon). See [07-BLAST-RADIUS-AND-RISK.md](07-BLAST-RADIUS-AND-RISK.md) BR-07.

**Silent-divergence risk:** `TemplateEditorSheet.tsx` (`TemplateSheetBranch`, line 252+) is a parallel node renderer that shares only the leaf helpers from `node-visuals.tsx` (`nodeHeaderClasses`/`nodeNameClasses`/`nodeTotalClasses`/`NodeIcon`). It is still on the old two-kind model and will NOT inherit `branch.tsx`-local changes. Editing shared `node-visuals` helpers changes BOTH surfaces silently; editing `branch.tsx`-local code changes ONLY the EMC. See [07-BLAST-RADIUS-AND-RISK.md](07-BLAST-RADIUS-AND-RISK.md) BR-02 -- this is an Open Decision, not a blocker.

## Tech stack / tooling

- Next.js + Bun, React, TanStack Query, Zustand, Tailwind (DESIGN.md tokens), Phosphor icons.
- Tests: Vitest + Testing Library (`tests/vitest/`). Node via nvm `v25.8.0` (PATH node is v14, too old -- per project memory).
- The perf regression gate is `tests/vitest/perf/*` (render-relief, cursor-isolation, baseline). The per-table memo comparator `areEstimateRowItemsTablePropsEqual` (`row-table.tsx:57`) is the enforcement point -- **no change in this plan adds a new prop to `EstimateRowItemsTable`**, so the comparator and isolation tests are not at risk (see [05-PERFORMANCE-AUDIT.md](05-PERFORMANCE-AUDIT.md) PERF-2/PERF-4/PERF-5).

### Standard verification commands

Run from repo root with nvm node active:

```bash
# focused EMC + charts regression set (run after EVERY commit in A/B/C)
bun x vitest run --maxWorkers=1 tests/vitest/estimate-mixed-content.test.tsx \
  tests/vitest/project-charts-aggregation.test.ts \
  tests/vitest/estimate-template-drop-zones.test.tsx

# perf isolation gate (run after any branch/table/host change)
bun x vitest run --maxWorkers=1 tests/vitest/perf

# type + lint
bun run type-check
bun run lint
bun run lint:design-system
```

For any Phase C visual/styling touch, also run the touched-file design scan in [10-READINESS-ADDENDUM.md](10-READINESS-ADDENDUM.md). Do not use `npx next lint`; this repo's lint gate is `bun run lint`.

### Execution order and rationale

The canonical execution order is **R3 -> R1 -> R2 -> R4** (see Phases A-D below): cheap-to-expensive, each with its test rewrite in the same commit (TDD: flip the assertion and implement green in ONE commit). Phase A=R3 (caret), Phase B=R1 (Own items), Phase C=R2 (spacing), Phase D=R4 (CRUD). A and B are independent; B before C avoids the Own-items `<p>` confusing the spacing snapshot. C is sequenced last among the presentational changes because it is the only one that can perturb the sticky-offset math (BR-04). D is separate per-operation work that crosses the mutation/DB seam.

> **Phase letters are execution order and differ from 07-BLAST-RADIUS change-family letters.** Mapping: Phase A = R3 (caret) = 07 Family B; Phase B = R1 (Own items) = 07 Family A; Phase C = R2 (spacing) = 07 Family C; Phase D = R4 (CRUD) = 07 Family D. Do NOT read "Family A/B/C" in [07-BLAST-RADIUS-AND-RISK.md](07-BLAST-RADIUS-AND-RISK.md) as a phase order -- those letters key off the *change*, these key off *execution order*. The order authority is this list (R3 -> R1 -> R2 -> R4), not a 07 family-letter sequence.

> **Commit discipline (DEFAULT for every A/B/C/D task):** flip the assertion to the target behavior **and** implement the code change in the **SAME commit**, so the suite is green at every commit. This plan's never-red-between-commits invariant and the Codex review gate both forbid landing intentionally-red commits. "Write the new test first, watch it fail locally, then implement before committing" is the *local* TDD loop -- the red state is a pre-commit checkpoint, never a committed state. Where a task lists separate test and implementation sub-steps, that is authoring order within one commit, not two commits.

---

## Phase A -- Disclosure model fix (Req 3)

**Outcome:** the caret keys off `hasContents` (`hasChildren || hasOwnRows`), not `hasChildren`, so any node with rows OR children advertises and offers expand/collapse. The truly-empty node (`!hasContents`) keeps the non-interactive empty slot so leaf alignment is preserved. `aria-expanded` now appears on previously-leaf headers. The collapse engine already supports this (the toggle handler at `branch.tsx:189-196` never required children; the whole `!collapsed` body block at `branch.tsx:236-324` is already the collapsible content) -- only the affordance is missing.

**Why this is the headline fix:** confirmed root cause at `branch.tsx:182` (`hasChildren ? <Button.../> : <span aria-hidden .../>`). `hasContents` is already computed and unused for the caret at `branch.tsx:88`. See [03-UXUI-AUDIT.md](03-UXUI-AUDIT.md) and [04-FEATURE-READINESS-AND-BUG-AUDIT.md](04-FEATURE-READINESS-AND-BUG-AUDIT.md) EMC-RDY-01/02.

**Blast radius (07):** BR-05 (collapse-id surface reshapes; `collectAllNodeIds` already enumerates every id so collapse-all/per-node toggle become *consistent* after the fix), BR-06 (breaks `estimate-mixed-content.test.tsx:96-111`). **Perf (05):** PERF-4 -- net WIN: collapsing a rows-only node unmounts its `EstimateRowItemsTable` (gated by `!collapsed` at `branch.tsx:236`), removing heavy tables from the render tree; no new table props, comparator untouched.

### Task A1 -- Flip the caret/aria assertions in the spec test (red first)

**Files (Modify):**
- `tests/vitest/estimate-mixed-content.test.tsx:96-111`

**TDD steps:**

1. Rewrite the existing test so it asserts the *target* behavior. Replace the body of the `"renders a disclosure caret + aria-expanded only on a node with children"` test (lines 96-111) and rename it. The leaf in `mixedTree()` is `kitchen` (own rows, no children) -- it MUST now have a working caret. New test:

```tsx
  it("renders a disclosure caret + aria-expanded on any node with contents (rows OR children)", () => {
    renderSheet(mixedTree(), "building-a");

    // Parent (rows + children) has a caret/disclosure with aria-expanded.
    const parentToggle = screen.getByRole("button", { name: /Collapse Building A|Expand Building A/ });
    expect(parentToggle).toHaveAttribute("aria-expanded", "true");

    // A rows-only child is now collapsible: it advertises a caret + aria-expanded.
    const kitchenSection = screen.getByLabelText("Kitchen");
    const kitchenToggle = within(kitchenSection).getByRole("button", { name: /Collapse Kitchen|Expand Kitchen/ });
    expect(kitchenToggle).toHaveAttribute("aria-expanded", "true");
  });
```

> **`aria-expanded` value note:** the `"true"` assertions above assume nodes render **expanded by default** -- `collapsedNodeIdsByScope` initializes to `{}` (`EstimateSheetContent.tsx:992`), so `collapsedNodeIds` is an empty Set on mount and `collapsed=false`. If you would rather not couple the test to the default-expanded mount, relax both assertions to presence-only `toHaveAttribute("aria-expanded")` to match the existing test convention; the caret-existence is what Req 3 is really pinning.

2. Add a NEW test asserting the truly-empty node keeps NO caret (alignment preserved, nothing to collapse). Add an `emptyTree()` builder near `leafTree()` (after line 57) and a test after the one above:

```tsx
function emptyTree(): EstimateTreeNode[] {
  return [
    { id: "empty-area", name: "Empty Area", kind: "area", total: "₱0.00", estimateRowItems: [], children: [] },
  ];
}
```

```tsx
  it("renders no disclosure caret on a truly-empty node (no rows, no children)", () => {
    renderSheet(emptyTree(), "empty-area");
    const section = screen.getByLabelText("Empty Area");
    expect(within(section).queryByRole("button", { name: /Collapse Empty Area|Expand Empty Area/ })).not.toBeInTheDocument();
    const header = section.querySelector(".sticky");
    expect(header).not.toBeNull();
    expect((header as HTMLElement).querySelector("[aria-expanded]")).toBeNull();
  });
```

3. **Run** `bun x vitest run --maxWorkers=1 tests/vitest/estimate-mixed-content.test.tsx` -- the caret/aria test FAILS (leaf `kitchen` has no button today), the empty-node test PASSES already (empty node is `!hasChildren`). Confirm the red is the expected one.
4. Add keyboard coverage for the rows-only caret: focus the Kitchen disclosure button, press `Enter`, assert the table hides and focus remains on the button; press `Space`, assert the table returns and `aria-expanded` matches. This is the a11y proof that rows-only nodes are not just visually collapsible.
5. Add collapse-all coverage: trigger the host collapse-all control, assert rows-only tables hide, then re-expand only the rows-only node. This protects the `collectAllNodeIds` / per-node-caret reconciliation.
6. Add active-search coverage or a written non-blocking decision: while search forces `collapsedNodeIds` empty, either hide/disable disclosure buttons or assert that visible buttons restore the prior collapse state after search clears. Do not leave OD-3 as a recommendation without a Phase A test/decision.
7. **Do NOT commit yet.** The rewritten assertions are red until A2 lands the `hasContents` gate. Per the commit-discipline default, A1 and A2 land in **one commit**: author the A1 assertions, watch them fail locally (the expected red checkpoint), then do A2 and commit once (the A2 commit message below covers both). Never commit the red state.

### Task A2 -- Gate the caret on `hasContents`, preserve the empty-node slot

**Files (Modify):**
- `src/components/workshop/estimate-sheet/rows/branch.tsx:182` (the ternary condition)
- `src/components/workshop/estimate-sheet/rows/branch.tsx:83-85` (the stale leaf comment)
- `src/components/workshop/estimate-sheet/rows/branch.tsx:101-107` (`headerAriaLabel` -- unchanged in logic; verify it still reads correctly for rows-only nodes)

**TDD steps:**

1. Change the caret gate condition. Current:

```tsx
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`${collapsed ? "Expand" : "Collapse"} ${node.name}`}
              aria-expanded={!collapsed}
```

Change `hasChildren ?` to `hasContents ?` (the `hasContents` predicate is already computed at `branch.tsx:88`). Leave the `Button` body, the toggle handler (`:189-196`), the `CaretDown` glyph (`:198`), and the empty-slot `<span className="size-6 shrink-0" aria-hidden="true" />` (`:204`) exactly as-is -- the empty slot now renders ONLY for `!hasContents` nodes, which is the correct alignment fallback.

2. Update the now-false leaf comment at `branch.tsx:83-85`. Replace:

```tsx
  // Containment is derived from CHILDREN, not kind: a node is a leaf iff it has
  // no child sub-areas. The disclosure caret, aria-expanded, and the rows-vs
  // -sub-areas distinction all key off this.
```

with the P6 truth:

```tsx
  // P6 single-node model: a node is "expandable" iff it has collapsible
  // contents (own rows OR child sub-areas) -- NOT iff it has children. The
  // disclosure caret and aria-expanded key off hasContents; only a truly-empty
  // node (no rows, no children) is a non-collapsible leaf.
```

3. **Run** `bun x vitest run --maxWorkers=1 tests/vitest/estimate-mixed-content.test.tsx` -- all three caret/empty/own-items tests now reflect target behavior; the caret + empty tests pass. (The Own-items tests at 86-94 still pass -- Phase A does not touch the label.)
4. **Run** the perf gate: `bun x vitest run --maxWorkers=1 tests/vitest/perf`. Confirm relief (`rendersOutside===0`) and cursor (`contentRenders===0`, `totalTableRenders===0`) still pass -- A2 adds no table props, so they must stay green (PERF-4).
5. **Run** `bun run type-check`.
6. **Commit** `fix(estimate-sheet): caret keys off hasContents so rows-only nodes collapse (Req 3)`.

### Task A3 -- Reconcile `collectAllNodeIds` semantics (documentation-only, no behavior change)

**Files (Modify):**
- `src/components/workshop/estimate-sheet/rows/expansion.ts:18-26`

**Context:** `collectAllNodeIds` (`expansion.ts:18-26`) recurses `node.children` only and pushes every visited node id; `collapseAll` builds its Set from it (`EstimateSheetContent.tsx:1264-1266`). Before A2 this produced ids the caret could not act on (collapse-all marked a rows-only node collapsed, but no caret existed to re-expand it individually -- only expand-all could). After A2 the per-node caret and the bulk surface are *consistent*: every id collapse-all enumerates is now individually toggleable. This is a confirmed reconciliation, not a new bug (see [07-BLAST-RADIUS-AND-RISK.md](07-BLAST-RADIUS-AND-RISK.md) BR-05, [04-FEATURE-READINESS-AND-BUG-AUDIT.md](04-FEATURE-READINESS-AND-BUG-AUDIT.md) EMC-RDY-06).

**TDD steps:**

1. No logic change. Update the function's intent comment so a future contributor does not re-introduce the conflation. Add above the function (line 18):

```ts
// Returns EVERY node id in the subtree (recurses children). Under P6 every
// visited node is collapsible (it can own rows even with no children), so the
// id set is safe for collapse-all: each id has a matching per-node caret
// (branch.tsx gates the caret on hasContents). Keep this child-recursive.
```

2. **Run** the focused set + `bun run type-check`. No new test needed (behavior unchanged; A1's tests already cover per-node consistency, and expand-all/collapse-all are exercised indirectly via the header buttons).
3. **Commit** with A2, or as `docs(estimate-sheet): clarify collectAllNodeIds is intentionally child-recursive`.

> **Persistence note (not in scope):** collapse state is in-memory only (`EstimateSheetContent.tsx:992`, scope-keyed `:1155-1169`); it survives tab switches but is lost on reload. Whether to persist (localStorage keyed by `estimateId+tabId`) is an **Open Decision** for [09-OPEN-DECISIONS.md](09-OPEN-DECISIONS.md), not a Phase-A task (EMC-RDY-03).

---

## Phase B -- Remove the EMC "Own items" label (Req 1)

**Outcome:** the EMC `"Own items"` eyebrow (`branch.tsx:241-248`) is removed. It renders only in the `hasOwnRows && hasChildren` case, so removing that condition removes the label entirely. The rows-first DOM order (`branch.tsx:240`, own rows above children) already separates a node's own rows from its child sub-areas, and after Phase A the child cards have working carets that visually demarcate the boundary.

**Critical do-not-touch (07 BR-03, CRITICAL):** `aggregate-project-charts.ts:296-309` emits its OWN `"Own items"` leaf (id `area:{id}:own`) for money-attribution -- a *different file, different surface, different test* (`project-charts-aggregation.test.ts:244` asserts the exact row + the container-total-equals-sum-of-leaves invariant at `:249-254`). The two share only the literal string `"Own items"`. A grep-and-delete on `"Own items"` would corrupt chart totals. **Scope Phase B to `branch.tsx` only.** See [06-DATABASE-AND-NETWORK-AUDIT.md](06-DATABASE-AND-NETWORK-AUDIT.md) DBNET-3, [04-FEATURE-READINESS-AND-BUG-AUDIT.md](04-FEATURE-READINESS-AND-BUG-AUDIT.md) EMC-RDY-07.

**Perf (05):** PERF-5 -- removing one conditional `<p>` is strictly cheaper, zero memo/isolation impact.

### Task B1 -- Update the spec test for label removal (red first)

**Files (Modify):**
- `tests/vitest/estimate-mixed-content.test.tsx:73-94`

**TDD steps:**

1. The rows-first test (`:73-84`) uses `"Own items"` as its before-anchor (`ownItemsLabel` at line 77). Re-anchor it on the own-rows table cell instead so it no longer depends on the deleted label. Replace lines 76-83:

```tsx
    const buildingSection = screen.getByLabelText("Building A");
    const ownRowCell = within(buildingSection).getByText("HEMLINGBY Loveseat");
    const childSection = screen.getByLabelText("Kitchen");

    // DOM order: this node's own-rows table → child sub-area section.
    expect(ownRowCell.compareDocumentPosition(childSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
```

(Drop the `ownItemsLabel` lookup and the first `compareDocumentPosition` that referenced it.)

2. Replace the `"shows the 'Own items' label only when a node has BOTH rows and children"` test (`:86-94`) with an assertion that the label is gone everywhere:

```tsx
  it("renders no 'Own items' EMC label (rows-first DOM order disambiguates instead)", () => {
    const { unmount } = renderSheet(mixedTree(), "building-a");
    expect(within(screen.getByLabelText("Building A")).queryByText("Own items")).not.toBeInTheDocument();
    unmount();

    renderSheet(leafTree(), "pantry");
    expect(screen.queryByText("Own items")).not.toBeInTheDocument();
  });
```

3. **Run** `bun x vitest run --maxWorkers=1 tests/vitest/estimate-mixed-content.test.tsx` -- the new no-label test FAILS (the mixed node still shows the label today). Confirm expected red.
4. **Do NOT commit yet.** Per the commit-discipline default, B1 and B2 land in **one commit**: author the B1 assertions, watch the no-label test fail locally, then do B2 and commit once (the B2 commit message below covers both). Never commit the red state.

### Task B2 -- Delete the EMC "Own items" eyebrow

**Files (Modify):**
- `src/components/workshop/estimate-sheet/rows/branch.tsx:241-248`

**TDD steps:**

1. Delete the entire conditional block (lines 241-248):

```tsx
          {hasOwnRows && hasChildren ? (
            // "Own items" eyebrow (L4) — shown only when a node has BOTH rows
            // and children, to disambiguate this node's own rows from the
            // first child's rows. Doubles as the L7 screen-reader boundary.
            <p className="text-[9px] font-medium leading-3 text-tertiary" style={{ paddingLeft: `${leftIndent + 8}px` }} data-estimate-own-items-label>
              Own items
            </p>
          ) : null}
```

The `EstimateRowItemsTable` immediately following (`:249`) becomes the first child of the `space-y-4` wrapper.

2. **A11y replacement decision (Open Decision -- pick one and record it):** the deleted `<p>` doubled as the screen-reader boundary (comment at `:243-244`). The `headerAriaLabel` (`branch.tsx:103-107`) ALREADY announces `"{name}, area, N rows, M sub-areas"` as an `sr-only` span (`:181`), so the dual content is already announced. **Recommended:** rely on the existing `headerAriaLabel` and add no replacement. If the owner wants an explicit boundary preserved, replace the deleted block with a zero-visual `<span className="sr-only" data-estimate-own-items-label>Own items</span>` and soften the B1 test to assert the `sr-only` element rather than absence. See [03-UXUI-AUDIT.md](03-UXUI-AUDIT.md) / UX-3 cross-ref.

3. **Run** `bun x vitest run --maxWorkers=1 tests/vitest/estimate-mixed-content.test.tsx tests/vitest/project-charts-aggregation.test.ts` -- the EMC tests pass; **`project-charts-aggregation.test.ts` must stay green** (it asserts the charts leaf, which you did NOT touch). This is the explicit do-not-touch verification.
4. **Run** `bun run type-check`.
5. **Commit** `feat(estimate-sheet): remove "Own items" EMC eyebrow; rows-first order disambiguates (Req 1)`.

### Task B3 -- Add a do-not-touch guard comment near the charts leaf

**Files (Modify):**
- `src/lib/project-charts/aggregate-project-charts.ts:296`

**TDD steps:**

1. No logic change. Add a one-line guard comment above the charts `"Own items"` leaf emission (`:296`) so a future "remove Own items" task does not delete it by string match:

```ts
// NOTE: this charts "Own items" leaf is money-attribution (a mixed node's own
// rows must surface exactly once). It is a SEPARATE surface from the EMC label
// removed in the EMC plan (branch.tsx). Do NOT delete on an "Own items" grep.
```

2. **Run** `bun x vitest run --maxWorkers=1 tests/vitest/project-charts-aggregation.test.ts` -- still green (comment-only).
3. **Commit** with B2 or as `docs(charts): guard the money-attribution Own-items leaf from accidental removal`.

---

## Phase C -- Spacing / rhythm system (Req 2)

**Outcome:** a coherent, depth-aware, token-aligned vertical rhythm that actually fires. Today the rhythm is partly DEAD: `groupGap(depth, usesSiblingGroupRhythm)` (`node-visuals.tsx:12-19`) returns `mt-0` for every nested branch because `usesSiblingGroupRhythm` is never passed in the recursion (`branch.tsx:285-309` omits it; it defaults `false` at `branch.tsx:78`), so the `depth===1 => mt-5` / `depth>1 => mt-4` branches are unreachable. Confirmed at `node-visuals.tsx:15` (`if (depth > 0 && !usesSiblingGroupRhythm) return "mt-0";`). Meanwhile `space-y-4` (16px, `branch.tsx:237`) and the `depth*32` indent step (`branch.tsx:89`) are off the DESIGN.md spacing scale (`xs:4 / sm:8 / md:12 / lg:20 / xl:48`). See [03-UXUI-AUDIT.md](03-UXUI-AUDIT.md) UX-2/UX-4, [04-FEATURE-READINESS-AND-BUG-AUDIT.md](04-FEATURE-READINESS-AND-BUG-AUDIT.md) cross-ref, [07-BLAST-RADIUS-AND-RISK.md](07-BLAST-RADIUS-AND-RISK.md) BR-04.

**Hard constraint (07 BR-04, HIGH):** `STICKY_HEADER_H=40` / `STICKY_THEAD_H=40` (`node-visuals.tsx:9-10`) MUST equal the rendered header height (`h-10`=40px, `branch.tsx:174`) because they drive the depth-accumulated sticky offsets (`ownRowsStickyTop = stickyTop + STICKY_HEADER_H`, `branch.tsx:95`; `childStickyTop`, `:96`) and are asserted by `estimate-mixed-content.test.tsx:121`. **Strategy: keep header height fixed at `h-10`/40px and tune ONLY the non-sticky gaps** (`groupGap`, `space-y-*`, `leftIndent`, breadcrumb `my-1`/`pb-2`). This avoids the three-way sticky coupling entirely. Do NOT change `h-10`, `STICKY_HEADER_H`, or `STICKY_THEAD_H` in this phase.

**Perf (05 PERF-5/PERF-6):** spacing changes are className/number-only, O(1) per branch, no memo input -- render-neutral. The only perf-adjacent risk is sticky math, which this phase avoids by holding header height constant.

### Task C1 -- Make `groupGap` a live, depth-driven, token-aligned function

**Files (Modify):**
- `src/components/workshop/estimate-sheet/rows/node-visuals.tsx:12-19`
- `src/components/workshop/estimate-sheet/rows/branch.tsx:78` and `:160` (remove the dead `usesSiblingGroupRhythm` flag from the signature/call) and `:47` (prop type)

**TDD steps:**

1. Add a small spacing unit test so the rhythm is enforceable. Create `tests/vitest/estimate-sheet-spacing.test.tsx`:

```ts
import { describe, expect, it } from "vitest";
import { groupGap } from "@/components/workshop/estimate-sheet/rows/node-visuals";

describe("groupGap vertical rhythm (Req 2)", () => {
  it("gives the root node no top margin", () => {
    expect(groupGap(0)).toBe("mt-0");
  });

  it("separates depth-1 siblings with the lg token (20px)", () => {
    expect(groupGap(1)).toBe("mt-5");
  });

  it("tightens as depth increases (token-aligned, decreasing rhythm)", () => {
    expect(groupGap(2)).toBe("mt-3"); // md = 12px
    expect(groupGap(3)).toBe("mt-2"); // sm = 8px
    expect(groupGap(4)).toBe("mt-2");
  });
});
```

2. **Run** `bun x vitest run --maxWorkers=1 tests/vitest/estimate-sheet-spacing.test.tsx` -- FAILS (today `groupGap(1)` returns `mt-0` for the recursion's default `usesSiblingGroupRhythm=false`; and `groupGap(2)` returns `mt-0`). Confirm red.

3. Rewrite `groupGap` (`node-visuals.tsx:12-19`) to be purely depth-driven (delete the dead `usesSiblingGroupRhythm` parameter) with a decreasing, token-aligned rhythm so the tree reads as a hierarchy:

```ts
// Depth-driven inter-node rhythm, token-aligned to DESIGN.md spacing
// (sm:8 / md:12 / lg:20). The gap DECREASES with depth so nesting reads as a
// hierarchy: top-level siblings breathe, deep siblings sit tighter. The root
// (depth 0) carries no top margin (its container owns the outer gap).
export function groupGap(depth: number) {
  if (depth <= 0) return "mt-0";
  if (depth === 1) return "mt-5"; // lg = 20px
  if (depth === 2) return "mt-3"; // md = 12px
  return "mt-2";                  // sm = 8px
}
```

4. Remove the now-dead `usesSiblingGroupRhythm` flag end-to-end:
   - `branch.tsx:47`: delete `usesSiblingGroupRhythm?: boolean;` from `EstimateSheetBranchProps`.
   - `branch.tsx:78`: remove `usesSiblingGroupRhythm = false` from the destructure.
   - `branch.tsx:160`: change `groupGap(depth, usesSiblingGroupRhythm)` to `groupGap(depth)`.
   - The recursive call (`branch.tsx:285-309`) never passed it, so nothing to change there.

5. **Run** `bun x vitest run --maxWorkers=1 tests/vitest/estimate-sheet-spacing.test.tsx` -- green. **Run** `bun run type-check` (catches any remaining `usesSiblingGroupRhythm` reference).
6. **Run** `bun x vitest run --maxWorkers=1 tests/vitest/estimate-mixed-content.test.tsx tests/vitest/perf` -- the sticky test (`:121`) must still pass (header height untouched); perf still green.
7. **Commit** `fix(estimate-sheet): make groupGap a live depth-driven rhythm; drop dead sibling flag (Req 2)`.

### Task C2 -- Tighten the in-node cluster gap and quantize the indent step

**Files (Modify):**
- `src/components/workshop/estimate-sheet/rows/branch.tsx:237` (`space-y-4` -> token cluster gap)
- `src/components/workshop/estimate-sheet/rows/branch.tsx:89` (`leftIndent` step)

**Context:** `space-y-4` (16px) is the gap between a node's own-rows table, its add-row strip, and its child branches (`branch.tsx:237`). At 16px the in-node cluster reads as "separate nodes". Per [03-UXUI-AUDIT.md](03-UXUI-AUDIT.md) UX-2, use `space-y-2` (8px=sm) so the table/strip/children read as one node, while the inter-node `groupGap` (C1) carries node separation. The indent step `Math.min(depth * 32, 192)` (`branch.tsx:89`) is off-token and runs deep trees off-screen; quantize to `Math.min(depth * 16, 96)` (16px step, 96px cap).

**TDD steps:**

1. There is no unit assertion for these specific classNames today, and Testing Library does not assert Tailwind gap utilities cleanly. Add a focused render assertion to `tests/vitest/estimate-sheet-spacing.test.tsx` that the in-node wrapper uses the tightened gap, scoped to the rendered DOM. Append a render-based block (importing the same harness style as `estimate-mixed-content.test.tsx`):

```tsx
// (add at top of file alongside existing imports)
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { estimateLibraryItems, type EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

// (and the next/navigation + session mocks copied from estimate-mixed-content.test.tsx)
```

```tsx
  it("uses the tightened in-node cluster gap (space-y-2), not space-y-4", () => {
    resetEstimateWorkspaceState();
    const nodes: EstimateTreeNode[] = [{
      id: "a", name: "A", kind: "area", total: "₱0.00",
      estimateRowItems: [{ ...estimateLibraryItems[0], id: "r1" }], children: [],
    }];
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <EstimateSheetContent selectedNodeId="a" nodes={nodes} renderSidebar={false} />
      </QueryClientProvider>,
    );
    const section = screen.getByLabelText("A");
    expect(section.querySelector(".space-y-2")).not.toBeNull();
    expect(section.querySelector(".space-y-4")).toBeNull();
  });
```

(If you prefer not to import the full host into the spacing test, fold this assertion into `estimate-mixed-content.test.tsx` instead, which already wires the host + mocks. Either location is fine; do not duplicate the mocks if you reuse that file.)

2. **Run** the spacing test -- FAILS (`space-y-4` still rendered).
3. Change `branch.tsx:237` from:

```tsx
        <div className={cn("space-y-4", !showBreadcrumbs && "mt-1")}>
```

to:

```tsx
        <div className={cn("space-y-2", !showBreadcrumbs && "mt-1")}>
```

4. Change `branch.tsx:89` from `const leftIndent = Math.min(depth * 32, 192);` to:

```tsx
  const leftIndent = Math.min(depth * 16, 96);
```

(The breadcrumb `paddingLeft` at `:222` uses `leftIndent + 72` and the header at `:175` uses `leftIndent + 8`; both follow `leftIndent` automatically.)

5. **Run** the spacing test (green) + `bun x vitest run --maxWorkers=1 tests/vitest/estimate-mixed-content.test.tsx tests/vitest/perf` + `bun run type-check`.
6. **Manual check (un-automated, BR-04/PERF-6):** open a 3-4 deep mixed estimate in the dev app and scroll -- confirm sticky headers stack without overlap or dead gaps (header height unchanged, so this should hold) and the inter-node rhythm reads as a hierarchy. Per project memory, verify via the user's Chrome session (dev-auth bypass is disabled).
7. **Commit** `fix(estimate-sheet): tighten in-node gap to space-y-2 and quantize indent to 16px step (Req 2)`.

### Task C3 -- Reduce double-border nesting if the Phase C screenshot still reads as stacked cards

**Files (Modify):**
- `src/components/workshop/estimate-sheet/rows/branch.tsx:163`

**Context:** [03-UXUI-AUDIT.md](03-UXUI-AUDIT.md) UX-4 flags 3-4 nested uses of the same `border-hairline` token (node card `branch.tsx:163`, row table `row-table.tsx:158`, cells `cells.tsx`), flattening the node>row>component hierarchy. The cheapest, lowest-risk slice is to let the node card carry a tonal step instead of a competing border. Treat this as a Phase C readiness decision, not an unexamined optional polish item: if the browser screenshot still reads as stacked nested cards, reduce the border nesting or record why the current border model passes `DESIGN.md`.

**TDD steps:**

1. No unit test asserts the node-card border specifically. This is a visual change verified by the Phase C browser screenshot gate. If the current screenshot fails, change `branch.tsx:163` so nested nodes drop the full border and rely on `groupGap` + a tonal surface step (keep the root's `rounded-xs border` for the outer frame):

```tsx
        depth > 0 ? "bg-surfaceMuted/30" : "rounded-xs border border-hairline bg-surfaceMuted/20",
```

2. **Run** `bun x vitest run --maxWorkers=1 tests/vitest/estimate-mixed-content.test.tsx` (no border assertion -- should stay green) + manual deep-tree screenshot.
3. **Commit** separately `style(estimate-sheet): reduce nested card-on-card borders for node>row hierarchy (Req 2)`.

### Task C4 -- Prove nested rows are not clipped by sticky headers

**Files (Modify/Create):**
- Prefer a Playwright spec under `e2e/` if a stable authenticated estimate fixture is available.
- Otherwise create a manual evidence note under `.ai/05_logs/` with screenshots and measured pass/fail criteria.

**Context:** The owner-visible bug is that nested row items can be cut by the sticky table title header (`Materials`, `Qty`, etc.) once the node is nested. Unit tests can assert `style.top`, but they cannot prove real browser layout. Phase C is not complete until browser evidence proves row contents are fully visible.

**Required proof:**

1. Use a 4-5 depth mixed tree with own rows at several depths. The selected subtree should include at least 25 nodes and 100 visible row bodies for the no-virtualization scale assumption.
2. Scroll through the EMC and capture desktop/narrow screenshots at 1440, 1280, 1024, 768, and 390px widths. Repeat the deep nested-row view at 100%, 125%, and 150% zoom.
3. Confirm the first nested row below every sticky thead is fully visible: material card, row title, quantity input, unit, row actions, and add-row affordance are not under the header.
4. If automated, assert bounding boxes: each sticky `thead` bottom must be less than or equal to the first visible row top in its table, and sticky node headers must not intersect child table bodies.
5. Store screenshot/evidence paths and link them in the implementation closeout.

**Stop condition:** any overlap, clipping, or text/control collision under the sticky header blocks Phase C completion.

---

## Phase D -- CRUD gap-fills surfaced by the matrix (Req 4)

Req 4's primary deliverable is the matrix itself ([02-CRUD-CAPABILITY-MATRIX.md](02-CRUD-CAPABILITY-MATRIX.md)). The matrix surfaced two classes of issue: (a) **correctness bugs** that contradict the P6 model and ship today, and (b) **missing operations**. This phase fixes the in-scope correctness bug (the kind-gates) and explicitly **defers** the rest with rationale. Unlike A/B/C, D crosses the mutation seam and (for the insert path) the DB-vs-migrations drift -- see [07-BLAST-RADIUS-AND-RISK.md](07-BLAST-RADIUS-AND-RISK.md) and [06-DATABASE-AND-NETWORK-AUDIT.md](06-DATABASE-AND-NETWORK-AUDIT.md) DBNET-1.

### Task D0 (PRE-STEP) -- Confirm hosted-vs-committed RPC drift before any client change (DBNET-1)

**Files:** none (investigation; output recorded in [09-OPEN-DECISIONS.md](09-OPEN-DECISIONS.md)).

**Why this gates D1, D2, and D3:** the client kind-gates (D1/D3) are only safe to lift once the *server* accepts inserts into non-`area` / non-`group` nodes in **every** environment, and D2 (the committed relax migration) must mirror the **exact** bodies running in the hosted project. All three tasks depend on knowing whether hosted RPCs are relaxed and how they differ from the committed migrations. Do this first.

**Steps (DB lane -- owner-authed Supabase MCP, per CLAUDE.md / the Supabase skill):**

1. Run `pg_get_functiondef` (owner auth) against the hosted DB for the **three** insert RPCs: `insert_estimate_row_item_with_history`, `insert_estimate_subtree_into_estimate`, `insert_estimate_template_into_estimate`.
2. Diff each live definition against its committed migration body (`20260524050746_...` for the row RPC, `20260613134852_...:87` for the subtree RPC, `20260612094734_...:824` for the template RPC) and record, per function: *is hosted relaxed (kind-gate removed)?* and *exact delta vs committed SQL?*
3. Record the drift findings in [09-OPEN-DECISIONS.md](09-OPEN-DECISIONS.md) (DBNET-1).

**Blocking outcome:** **D1, D2, and D3 are BLOCKED until D0 completes.** If D0 shows hosted RPCs are NOT relaxed, the client gate-lifts (D1/D3) and the migration (D2) must include the server relax and ship together. If D0 shows hosted RPCs are relaxed but uncommitted, D2 must mirror the live bodies exactly (no-op against hosted, real fix against fresh envs) and D1/D3 may follow. Do not lift either client gate on an unverified assumption that hosted RPCs are relaxed.

### Task D1 -- Lift the client kind-gate on single-row insert (P6 correctness)

**Files (Modify):**
- `src/components/workshop/EstimateSheetContent.tsx:1648-1649`

**Context (confirmed):** `insertLibraryItem` returns early when `targetNode?.kind !== "area"` (`EstimateSheetContent.tsx:1649`), which silently no-ops add-blank-row, library-item click/drag, the command palette, and the sidebar add-event on a `group`-kind node -- with no toast. The server action `insertEstimateRowItemFromLibrary` already allows ANY node ("a row may be inserted into ANY node", per [06-DATABASE-AND-NETWORK-AUDIT.md](06-DATABASE-AND-NETWORK-AUDIT.md) DBNET-2). The sibling template handlers prove the target shape: `insertTemplateIntoParent` (`:1689-1693`) already uses an existence check (`if (!targetParentNode) return false;`), NOT a kind check. See [02-CRUD-CAPABILITY-MATRIX.md](02-CRUD-CAPABILITY-MATRIX.md) ("Add blank row" / "Insert library item" status broken).

**DB DRIFT BLOCKER (DBNET-1, must clear first -- via D0):** the *committed* `insert_estimate_row_item_with_history` RPC still hard-codes `node.kind = 'area'` (`supabase/migrations/20260524050746_...:344,349,351`); `.ai/10_state/current-state.md` records that hosted P6 relax work landed, but the relax SQL still needs committed migration parity. Lifting the client gate WITHOUT landing the relaxed RPC as a committed migration means any fresh / non-prod environment will reject row inserts into group nodes server-side. **D1 must NOT ship until D0 confirms the drift status AND D2 (the committed migration) lands** (or, if D0 shows hosted RPCs are relaxed and a committed migration already exists, D1 may follow). This is gated by Task D0 above; record the dependency in [09-OPEN-DECISIONS.md](09-OPEN-DECISIONS.md).

**TDD steps:**

1. Add a test asserting a `group`-kind node accepts a blank-row insert. In `tests/vitest/estimate-mixed-content.test.tsx` (which already wires the host), add a test that renders the `mixedTree()` (`building-a` is `kind: "group"`) and clicks its "Add row" affordance, then asserts the optimistic row appears. Because the insert path requires `projectId && estimateId` for the server call (`EstimateSheetContent.tsx:1668`) but does the optimistic tree edit unconditionally (`:1655-1666`), the optimistic add is observable without a server round-trip:

```tsx
  it("allows adding a blank row to a group-kind node (P6, no kind gate)", async () => {
    const user = userEvent.setup();
    renderSheet(mixedTree(), "building-a");
    const section = screen.getByLabelText("Building A");
    const before = within(section).getAllByRole("row").length;
    // The add-row control's accessible name comes from QuietAddRowButton's
    // aria-label `Add blank estimate row to {nodeName}` (drop-zones.tsx:45),
    // which OVERRIDES the visible "Add row" text — match the aria-label.
    await user.click(within(section).getByRole("button", { name: /Add blank estimate row/i }));
    expect(within(section).getAllByRole("row").length).toBeGreaterThan(before);
  });
```

(Import `userEvent` from `@testing-library/user-event` at the top.)

2. **Run** -- FAILS today (group node no-ops the insert at `:1649`).
3. Change `EstimateSheetContent.tsx:1648-1649` from the kind check to an existence check, matching the template handler pattern:

```tsx
  const insertLibraryItem = useStableCallback((targetNodeId: string, libraryItem: EstimateRowItem) => {
    const targetNode = findEstimateNode(estimateTree, targetNodeId);
    if (!targetNode) return;
```

4. **Run** the new test (green) + `bun x vitest run --maxWorkers=1 tests/vitest/estimate-mixed-content.test.tsx tests/vitest/perf` + `bun run type-check`.
5. **Commit** `fix(estimate-sheet): lift client kind-gate so rows insert into ANY node (Req 4, P6)` -- **only after D0 confirms drift status and D2 lands (or D0 confirms hosted RPCs are relaxed AND a committed migration already exists).**

### Task D2 -- Land the P6 relax SQL as a committed migration (DB drift)

**Files (Create):**
- `supabase/migrations/<timestamp>_relax_insert_rpc_kind_gates.sql`

**Context:** per [06-DATABASE-AND-NETWORK-AUDIT.md](06-DATABASE-AND-NETWORK-AUDIT.md) DBNET-1, three RPCs still kind-gate in the committed migrations: `insert_estimate_row_item_with_history` (`kind='area'`), `insert_estimate_subtree_into_estimate` (`kind='group'`, `20260613134852_...:87`), `insert_estimate_template_into_estimate` (`kind='group'`, `20260612094734_...:824`). `.ai/10_state/current-state.md` records that hosted P5/P6 relax work landed, but a clean apply still rebuilds the old gated RPCs until D2 commits parity SQL.

**Steps (DB lane -- delegate per CLAUDE.md to the Supabase skill / owner-authed MCP):**

1. **Use the D0 drift findings** (Task D0 already ran `pg_get_functiondef` on the three functions and diffed against the committed bodies, recorded in [09-OPEN-DECISIONS.md](09-OPEN-DECISIONS.md)). If D0 has not run, run it now -- D2 cannot author a faithful migration without the live definitions. This resolves the hosted-vs-committed drift question in DBNET-1.
2. Author a forward-only migration that `CREATE OR REPLACE`s the three functions, dropping the `kind = 'area'` / `kind = 'group'` guards and keeping the existing same-estimate / orphan existence checks (the relaxed bodies already running in the hosted project, per the confirmation in step 1). Mirror the exact hosted definitions so the migration is a no-op against hosted and a real fix against fresh environments.
3. **Verify** with the local PG17 prove-harness (per project memory; Docker is absent so use the harness, not `supabase db reset` against Docker) that inserting a row into a `group`-kind node succeeds after applying the migration.
4. Run `supabase advisors` (via MCP) -- expect 0 new ERROR-level findings.
5. **Commit** `feat(db): relax insert RPC kind-gates to match hosted P6 behavior (committed migration)`.

> This task is DB-bearing and owner-supervised. If the owner decides non-prod environments are out of scope for beta, D2 may be deferred and recorded as accepted drift in [09-OPEN-DECISIONS.md](09-OPEN-DECISIONS.md) -- but then D1 must also be deferred (they are coupled).

### Task D3 -- Relax the batch multi-template insert kind-gate (consistency)

**Files (Modify):**
- `src/components/workshop/EstimateSheetContent.tsx:1739-1740`

**Context:** `insertTemplatesIntoParent` (the multi-template BATCH path) still gates `if (targetParentNode?.kind !== "group") return false;` (`:1740`), while the single-template (`:1689-1693`) and drag paths are ungated. So a multi-select template insert into an `area`-kind node silently returns false -- inconsistent with the single path and the P6 model. The batch server action calls the committed `insert_estimate_template_into_estimate` RPC through the history wrapper, and that committed RPC still gates parents by `kind = 'group'`. Therefore D3 is gated by D0 and D2 the same way D1 is; do not ship D3 on optimistic UI proof alone.

**TDD steps:**

1. Add a test (in `estimate-mixed-content.test.tsx`, host already wired) that the batch path accepts a non-group parent. Because batch insert needs `projectId && estimateId` for the round-trip but applies the optimistic clone first, assert the optimistic child nodes appear under an `area` parent after a simulated multi-template drop. `insertTemplatesIntoParent` is an internal host callback, so it cannot be unit-tested directly. **Pick ONE of these two concrete paths (do not leave the test unwritten):**
   - **(a) Preferred -- render+drop seam:** drive the public DOM affordance: render the host, fire a multi-template drop (`dataTransfer` carrying multiple `templateIds`) onto a `TemplateDropZone` whose target node is `kind: "area"`, and assert the optimistic child nodes appear. This is the same harness style D1 uses; it exercises the real `:1740` gate. If the multi-select drag payload is awkward to synthesize in jsdom, extract a tiny pure helper (e.g. `resolveBatchInsertTarget(tree, parentId)` returning the node-or-null) from the gate so the kind-vs-existence decision is unit-testable in isolation, and assert that helper accepts an `area` parent.
   - **(b) Fallback -- documented manual verification:** if neither the render+drop nor the extracted-seam path is feasible this pass, record an explicit manual-verification step in [09-OPEN-DECISIONS.md](09-OPEN-DECISIONS.md) with **pass criteria**: "multi-select two templates in the library, drop onto an `area`-kind node in a real estimate; both template subtrees appear as children; no silent no-op; toast confirms insert." This is a documented, owner-visible verification gate -- **not** an untested change.
2. Change `:1740` from `if (targetParentNode?.kind !== "group") return false;` to `if (!targetParentNode) return false;`.
3. Prove a clean migrated DB accepts multi-template insert into an `area` parent after D2. If D2 is deferred, D3 is deferred too.
4. **Run** the focused set + perf + `bun run type-check`.
5. **Commit** `fix(estimate-sheet): batch template insert accepts ANY parent like the single path (Req 4, P6)`.

### Task D4 -- Make component drag cancel non-destructive

**Files (Modify):**
- `src/components/workshop/estimate-sheet/rows/cells.tsx:151-154`
- Focused DOM/browser test file selected by the implementer

**Context:** `handleComponentDragEnd` clears the attached component whenever `event.dataTransfer.dropEffect !== "move"`. A cancelled drag or failed drop can therefore delete a row component without an explicit delete/clear action. This is a data-loss interaction and cannot remain a passive deferral if Req 4 is called implementation-ready.

**TDD steps:**

1. Add a test or manual browser proof for starting a component drag and cancelling/dropping nowhere. The row component must remain attached.
2. Change the drag-end handler so non-`move` outcomes snap back and do not call the clear path.
3. Keep explicit clear/delete as the only destructive component-removal actions.
4. Run the focused EMC set, the relevant drag/drop test, and `bun run type-check`.
5. Commit `fix(estimate-sheet): keep row component attached after cancelled drag`.

### Task D5 -- Remove or wire the phantom row reorder handle

**Files (Modify):**
- `src/components/workshop/estimate-sheet/rows/row-table.tsx:201-204`

**Context:** The row grip presents `cursor-grab` and `aria-label="Drag material ..."` but has no drag handler and no reorder RPC. For beta readiness, do not ship a false affordance.

**Default path:** remove the visual handle and false `aria-label` until row reorder is intentionally designed. Wiring real row reorder is a larger feature and should be a separate plan.

### Task D6 -- Document remaining deferred CRUD gaps (no code)

**Files:** none (this content is recorded in [02-CRUD-CAPABILITY-MATRIX.md](02-CRUD-CAPABILITY-MATRIX.md) "missing ops" and surfaced in [09-OPEN-DECISIONS.md](09-OPEN-DECISIONS.md)).

The following matrix-surfaced gaps are **explicitly deferred** -- they are real but out of scope for this UX/correctness pass (each needs its own design + impact pass per BR-08). Do not include the destructive drag-cancel bug or the false row handle in this table unless the owner explicitly accepts those known issues for this branch.

| Deferred operation | Why deferred | Where recorded |
|---|---|---|
| Move a row between nodes; row duplicate; node/area duplicate | New operations + server actions + optimistic paths; cross the mutation seam (BR-08) | 06 "missing ops" |
| Explicit indent/outdent + keyboard node reorder | No affordance today (drag-only reparent); new UX | 06 "missing ops" |
| Confirm dialog for single-row delete and tab delete | UX hardening, not correctness | 06 matrix |
| Client `canEditEstimate` gate on left-tree node CRUD + row CRUD | Defense-in-depth; currently RLS-only (server enforced). Beta-acceptable per audit | 03 / 09 open question |
| `assertCanEditEstimate` on row/node mutation server actions | Defense-in-depth (template/source/detach already call it; insert/update/delete/replace row + node CRUD rely on RPC RLS) | 03 DBNET, 09 |
| Move a node across tabs (explicitly blocked with a toast, `EstimateTabStrip.tsx:323-335`) | Intentionally unsupported today | 06 matrix |
| Non-atomic `moveRowComponent` (replace+clear = two RPCs) | Atomicity hardening; needs a transactional RPC | 03 DBNET-9, 06 matrix |
| Persist collapse state across reloads (localStorage) | Product decision (EMC-RDY-03) | 04, 09 |

No `TODO`s are left in code; deferral is documented, not stubbed.

---

## Cross-phase regression gate

After EVERY commit in any phase, run:

```bash
bun x vitest run --maxWorkers=1 tests/vitest/estimate-mixed-content.test.tsx \
  tests/vitest/project-charts-aggregation.test.ts \
  tests/vitest/estimate-template-drop-zones.test.tsx \
  tests/vitest/perf
bun run type-check
bun run lint
bun run lint:design-system
```

`project-charts-aggregation.test.ts` MUST stay green across all phases (it is the BR-03 do-not-touch guard for the charts leaf). The perf suite (`tests/vitest/perf`) MUST stay green across A/C (the BR-04 / PERF-2 / PERF-4 gate). Per project memory: run with nvm node `v25.8.0`, and do not run heavy workflows alongside the full DOM suite (flaky 15s timeouts) -- the focused set above is the safe gate.

**Manual checks the unit suite cannot catch:**
- After C: complete Task C4. Open a 4-5 deep mixed estimate, scroll, confirm no sticky overlap/gaps, no row contents are cut by `Materials / Qty / ...` headers, and the inter-node rhythm reads as hierarchy (BR-04, PERF-6). Verify via the user's Chrome session or a Playwright/browser evidence path.
- After A/C: open `TemplateEditorSheet` (the parallel renderer, BR-02) and confirm the documented divergence is acceptable, or mirror per the Open Decision.

---

## Self-review checklist (Req -> Task mapping)

| User requirement (verbatim intent) | Tasks | Test(s) updated/added | Do-not-touch guard |
|---|---|---|---|
| **Req 1** -- "No need to put the Own items on the nodes that both have nested nodes and nested components." | B1 (test), B2 (delete `branch.tsx:241-248`), B3 (charts guard comment) | `estimate-mixed-content.test.tsx:73-94` rewritten (rows-first re-anchored on table cell; no-label assertion) | `aggregate-project-charts.ts:296-309` + `project-charts-aggregation.test.ts:244,249-254` MUST stay green (BR-03) |
| **Req 2** -- "Fix proper spacing because the spacing/gaps between the nodes and rows are not very good." | C1 (`groupGap` live + token-aligned, drop dead flag), C2 (`space-y-2` cluster gap + 16px indent), C3 (border-readiness decision), C4 (browser clipping proof) | new `estimate-sheet-spacing.test.tsx`; sticky test `estimate-mixed-content.test.tsx:121` re-verified green; browser screenshot/bounding-box proof | header height held at `h-10`/40px unless constants/tests/proof move together (BR-04) |
| **Req 3** -- "Some node rows dont have expand/collapse icons even if they have components nested inside them ... all the features must be examined." | A1 (tests), A2 (caret gate `hasChildren`->`hasContents` at `branch.tsx:182` + comment fix), A3 (`collectAllNodeIds` doc) | `estimate-mixed-content.test.tsx:96-111` rewritten (caret on rows-only node) + empty-node, keyboard, collapse-all, and search-state checks | perf isolation (`tests/vitest/perf`) green; no new table props (PERF-4) |
| **Req 4** -- "Examine and document and put in a matrix ALL the CRUD functionalities ... ALL." | Matrix is [02-CRUD-CAPABILITY-MATRIX.md](02-CRUD-CAPABILITY-MATRIX.md). PRE-STEP: D0 (confirm hosted-vs-committed RPC drift). In-scope fixes: D1 (lift single-insert kind-gate, blocked by D0+D2), D2 (committed relax migration), D3 (batch-insert kind-gate, blocked by D0+D2), D4 (non-destructive drag cancel), D5 (remove false row handle), D6 (remaining deferred gaps). | D1 group-node insert test; D3 batch-insert test plus clean DB proof; D2 PG17 prove-harness; D4 cancel/no-drop proof | D1/D3 gated on D0 drift confirmation + D2 (DBNET-1); D6 leaves no code TODOs |

**Sequencing sanity (R3 -> R1 -> R2 -> R4):** Phase A/R3 (lowest risk, presentational) -> Phase B/R1 (presentational, string-collision guarded) -> Phase C/R2 (presentational, sticky-coupling avoided by holding header height) -> Phase D/R4 (data-bearing, per-operation, D1 coupled to D2). Each presentational phase lands its test rewrite in the same commit so the suite is never red between commits (the breaking-tests authority is [07-BLAST-RADIUS-AND-RISK.md](07-BLAST-RADIUS-AND-RISK.md) "The binding constraint" section; the order authority is this R3 -> R1 -> R2 -> R4 list, not a 07 family-letter sequence).

**Open decisions surfaced by this plan** (full list in [09-OPEN-DECISIONS.md](09-OPEN-DECISIONS.md)): (1) keep an `sr-only` "Own items" boundary or rely on `headerAriaLabel` (B2); (2) persist collapse state across reloads (A3 note); (3) unify the two node renderers or accept `TemplateEditorSheet` divergence (BR-02); (4) ship D2 committed migration vs accept non-prod drift for beta (DBNET-1) -- D1 and D3 are coupled to this; (5) breadcrumb sticky contract and border-readiness proof in Phase C.
