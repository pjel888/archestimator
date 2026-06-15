# 02 — Audit of Current State (verified)

All code references in this doc were verified against the working tree on 2026-06-14 (branch `codex/templates-project-sources-performance`). Where Rev 1 used pseudocode, this revision quotes the real classes and line numbers.

## Component map

| File | Responsibility | Key exports |
|------|----------------|-------------|
| `src/components/workshop/EstimateSheetContent.tsx` | Middle-sheet orchestrator: state, mutations, filter/group, renders root `EstimateSheetBranch` (depth 0). Computes `estimateNodeTotals` via `computeNodeTotals` and passes the map down. | `EstimateSheetContent` |
| `src/components/workshop/estimate-sheet/rows/branch.tsx` | **Recursive node renderer.** One area header + own rows table + add-row strip + child `EstimateSheetBranch`s. | `EstimateSheetBranch`, `SheetMutationHandlers` |
| `src/components/workshop/estimate-sheet/rows/row-table.tsx` | Cost-row table for one area, memoized via `areEstimateRowItemsTablePropsEqual`. Fixed 9-column grid. | `EstimateRowItemsTable`, `areEstimateRowItemsTablePropsEqual` |
| `src/components/workshop/estimate-sheet/rows/node-visuals.tsx` | Shared helpers: `groupGap`, `nodeShellClasses`, `getNodeCode`, `nodeHeaderClasses`, `nodeNameClasses`, `nodeTotalClasses`, `NodeIcon`. These are used beyond the middle sheet, so helper changes need compatibility checks. | (as listed) |
| `src/components/workshop/estimate-sheet/rows/drop-zones.tsx` | Add-row / component-drop / template-drop targets. | `ComponentDropTarget`, `TemplateDropZone`, `QuietAddRowButton` |
| `src/components/workshop/library/template-editor/TemplateEditorSheet.tsx` | Reuses `nodeNameClasses()` for template/library node names; it is not part of the estimate-sheet hierarchy change but is affected by shared-helper edits. | `TemplateEditorSheet` |
| `src/components/ui/tree.tsx` | **Left-panel** tree. Indent spacer + caret only — **no guide lines.** | `Tree`, `TREE_INDENT_STEP = 16` |

**Single-node ("Area") model.** P5/P6 unification shipped to prod: there is one node kind ("Area") that can hold rows AND children. `hasContents = hasChildren || hasOwnRows`; the disclosure caret and `aria-expanded` key off `hasContents`. (`branch.tsx` lines 79–101.)

## How `EstimateSheetBranch` renders today (verified)

```tsx
// branch.tsx:89  indent applies to the HEADER only
const leftIndent = Math.min(depth * 16, 96);

<section className={cn(groupGap(depth), nodeShellClasses(depth), dragHighlight)} aria-label={node.name}>
  <div className={cn("bg-white", depth === 0 && "sticky top-0 z-[20]")}>
    <div
      className={cn("flex h-10 items-center gap-2 border-t border-hairline bg-surfaceMuted/40 px-1",
                    nodeHeaderClasses() /* = "hover:bg-surfaceMuted/40" */)}
      style={{ paddingLeft: `${leftIndent + 8}px` }}      // header indents…
    >
      <span className="sr-only">{headerAriaLabel}</span>  // "{name}, area, N rows, M sub-areas"
      {hasContents && !searchActive ? <caret aria-expanded/> : <span className="size-6"/>}
      <span data-occupancy-dot className={hasOwnRows ? "bg-orange-600" : "bg-tertiary"} />
      <div className="min-w-0 flex-1">
        {nodeCode && <p className="text-[8px] … tabular-nums text-tertiary">{nodeCode}</p>}
        <p className={nodeNameClasses() /* "truncate text-[10px] font-medium text-secondary" */}>{node.name}</p>
      </div>
      <span className={nodeTotalClasses()}>{pesoFormatter.format(total)}</span>
    </div>
  </div>

  {!collapsed && (
    <div className="mt-1 space-y-2">
      {showBreadcrumbs && <breadcrumb style={{paddingLeft: leftIndent + 72}} />}
      <EstimateRowItemsTable … />                          // …but the TABLE is full-width (no indent) → Gap B
      <ComponentDropTarget empty={!hasContents} … />       // add-row strip, between rows and children → Gap F
      {childAreas.map((child, childIndex) => (
        <EstimateSheetBranch … depth={depth + 1} nodeCode={getNodeCode(nodeCode, childIndex)} />
      ))}
    </div>
  )}
</section>
{depth === 0 && <div aria-hidden className="h-32" />}      // bottom scroll buffer (root only)
```

## Current hierarchy signals (verified)

1. **Indentation.** `leftIndent = Math.min(depth * 16, 96)` applied as the header's `paddingLeft` **(+ a fixed 8px caret gutter)**. The breadcrumb uses `leftIndent + 72`. **The row table is not indented at all.**
2. **Vertical spacing** (`groupGap`, `node-visuals.tsx:9`): `depth 0 → mt-0`, `1 → mt-5 (20px)`, `2 → mt-3 (12px)`, `3+ → mt-2 (8px)`. Decreases with depth.
3. **Node codes** (`getNodeCode`): `01`, `01.02`, `01.02.03`, rendered at `text-[8px] tabular-nums text-tertiary` above the name.
4. **Caret:** rendered when `hasContents && !searchActive`; otherwise a `size-6` spacer keeps names aligned.
5. **Shell / background** (`nodeShellClasses`, `node-visuals.tsx:18`): root → `rounded-xs border border-hairline bg-surfaceMuted/20`; **all** nested nodes → `bg-surfaceMuted/20` (same tone, no border). Header → `bg-surfaceMuted/40`.
6. **Breadcrumbs:** shown when expanded and `ancestorPath.length > 0`; not sticky.
7. **Occupancy dot:** 3px circle, `opacity-50`, **orange iff `hasOwnRows` (the node directly holds ≥1 row item)**, else tertiary. Data-driven; flips live when the first/last row is added/removed.
8. **Rows table:** `overflow-hidden border border-hairline bg-white`, fixed grid `ROW_COLUMNS` (see below). Always full width inside the section.

## Token reality (the binding constraint — new in Rev 2)

Verified in `src/app/globals.css`:

| Token | Hex | Notes |
|-------|-----|-------|
| `--background` | `#ffffff` | |
| `--surface-muted` / `surfaceMuted` | `#f5f5f5` | |
| `--surface-warm` / `--canvas` | `#f5f5f5` | **identical to surfaceMuted** |
| `--hairline` / `--divider` | `#f2f2f2` | ~1.05:1 on white → **visually invisible as a rule** |
| `--ink` | `#3D3D3D` | `DESIGN.md` says `#292929` — **stale** |
| `--secondary` | `#5D5D5D` | |
| `--tertiary` | `#7F7F7F` | design-system-pinned (globals.css comment) |
| `--brand-orange` | `rgb(170,65,42)` | reserved |

**The neutral surface band is a ~4% luminance window.** Rendered fills over white:

- `bg-surfaceMuted/20` ≈ `#FDFDFD`
- `bg-surfaceMuted/30` ≈ `#FCFCFC`
- `bg-surfaceMuted/40` ≈ `#FBFBFB`
- `bg-surfaceMuted` (full) = `#F5F5F5`

`#f5f5f5` vs `#ffffff` ≈ **1.04:1**. The `/20` → `/40` step is ~2 levels — at or below the just-noticeable difference, and *worse* in the near-white range where the eye is least sensitive. **Conclusion: background/header tone cannot reliably carry hierarchy and is not accessible as a sole cue.**

**The text ramp, by contrast, has real range** (contrast on white):

| Colour | Hex | On white | Verdict for 10px name |
|--------|-----|----------|------------------------|
| ink | `#3D3D3D` | ~10.4:1 | AA pass (landmark) |
| secondary | `#5D5D5D` | ~6.5:1 | AA pass (**floor for names**) |
| tertiary | `#7F7F7F` | ~4.0:1 | **AA FAIL** (4.5:1 needed) — names must never use this |

On `surfaceMuted/40` (`#FBFBFB`), tertiary drops to ~3.87:1. **Implication:** the depth ink-ramp may step `ink → secondary`, but must bottom out at `secondary`. Past depth 1, depth is carried by **weight + indent + the outline code**, not colour.

## Prior iteration history (why this is not greenfield — new in Rev 2)

These files were deliberately moved **toward flatness**. Any plan that reintroduces heavy containment owes a "why now different" argument. Verified from git log + in-file comments:

- `6a8af01d` — *"reduce nested card-on-card borders for node>row hierarchy (Req 2)."*
- `3fe78bf4` — *"tighten in-node gap to space-y-2 and quantize indent to 16px step (Req 2)."*
- `55613ca1` — *"make groupGap a live depth-driven rhythm; drop dead sibling flag (Req 2)."* (A prior `usesSiblingGroupRhythm` flag existed and was removed as dead.)
- **Uncommitted** working-tree change: nested shell fill reduced from `bg-surfaceMuted/30` → `bg-surfaceMuted/20`, flattening tone further.
- `node-visuals.tsx:16–17` comment: *"One node model: root and descendants share the same surface tone; depth is expressed by spacing, indentation, and the root frame, **not a darker child fill**."*
- `branch.tsx:164–168` comment: *"Node>row>component hierarchy reads via ONE frame, not concentric borders (UX-4 / OD-7)… nested nodes share the same surface tone."*

**Reading:** darker child fills, concentric borders, and per-area background bands were tried and rejected as card-on-card noise. The Ledger recommendation (`05`) respects this: it leaves all surface fills flat and puts the ramp on **text only**.

## Tests that lock the current design (new in Rev 2 — read before editing)

Four suites encode the current flat look. Any hierarchy change must update the relevant assertions; the coding agent should map these before touching code (`05` → "Test-impact map").

| Test file | What it locks |
|-----------|---------------|
| `tests/vitest/estimate-sheet-spacing.test.tsx` | `groupGap` values (mt-0/5/3/2); **`nodeShellClasses` keeps root + children on the same `bg-surfaceMuted/20` tone**, only root bordered. |
| `tests/vitest/estimate-sheet-branch-header-ui.test.tsx` | Header = `bg-surfaceMuted/40` + `hover:bg-surfaceMuted/40` + `border-t` + `border-hairline`. |
| `tests/vitest/estimate-sheet-tree-dom.test.tsx` | Tree node `bg-surfaceMuted` expectations. |
| `tests/vitest/estimate-mixed-content.test.tsx` | References `groupGap` rhythm. |

The Ledger recommendation is designed to keep header **surface** fills and `groupGap` **untouched** (those tests stay green). In Phase 1A, `nodeShellClasses(depth)` stays unchanged; the sibling rule is a separate inset divider element/pseudo-element. For `nodeNameClasses`, either keep the existing zero-argument call backward-compatible (`nodeNameClasses(depth = 1)` or equivalent) or introduce a new estimate-sheet-specific helper so `TemplateEditorSheet` does not accidentally inherit root uppercase/ink styling.

## Row grid width floor (new in Rev 2)

`ROW_COLUMNS = grid-cols-[36px_32px_minmax(160px,1fr)_58px_92px_106px_92px_108px_30px]` (`row-table.tsx:76`). Fixed columns sum to **714px** (the `minmax(160px,1fr)` only grows). The middle column sits between the left tree and the right dock. **This is the hard cap on block indentation:** every 20px of block indent eats 20px of usable width, so block indent must be gated to keep the grid ≥ ~714px (`05`, no-go gates).

## Observed UX gaps (verified; re-prioritised)

- **Gap B — Row ownership ambiguity (PRIMARY).** Header gets `paddingLeft: leftIndent + 8` while the row table renders full-width with no matching indent. At depth ≥ 1 the header floats right of its own left-aligned grid. *This is the highest-value fix and Rev 1's Option E explicitly declined to solve it.*
- **Gap A — Weak parent/child containment.** The only parent→child cue is the small indent + a little extra top margin; no tonal/weight differentiation between the root landmark and deep grandchildren.
- **Gap C — Sibling differentiation too subtle.** Siblings are separated only by `mt-*` and the invisible `#f2f2f2`. Many siblings read as a flat stack of identical headers.
- **Gap E — Header hierarchy is flat.** Every header uses the same `10px` name colour/weight (`secondary`) and `8px` code at all depths. Roots do not anchor more strongly than grandchildren.
- **Gap D — Node code under-used.** The `01.02.03` code is the strongest *explicit* hierarchy signal but is `8px tertiary` and easy to miss; it is also the AA-safe backbone we can lean on.
- **Gap F — Add-row strip splits parent from children.** `ComponentDropTarget` renders after the parent's rows and before child areas; visually it can read as a separator. (Lower priority; the block-indent + header ramp keep ownership clear enough.)
- **Gap G — Horizontal crowding at depth.** Header indent caps at 96px; if we indent the block too, the 714px grid floor binds. Must be gated.

## Accessibility audit (current)

- ✅ `aria-label` on each section names the node.
- ✅ `aria-expanded` on caret buttons; `headerAriaLabel` (sr-only) announces row + sub-area counts.
- ⚠️ **Heading/level semantics are absent** from the middle-sheet node names (only the left tree and activity-history expose comparable level structure). Add a supported semantic target such as `role="heading" aria-level={Math.min(depth + 1, 6)}` on the visible node name, while keeping the section label and caret `aria-expanded` intact — see `05`, U4.
- ⚠️ Parent↔child sections are not explicitly wired (`aria-owns`/`aria-controls`); out of scope.

## Performance audit (current)

- `EstimateSheetBranch` is not itself memoized but receives stable callbacks (`useStableCallback` in the parent). `EstimateRowItemsTable` is `memo` with `areEstimateRowItemsTablePropsEqual`.
- New visual props must be **primitive** (`depth`, `childIndex`) and computed inline from existing values — no new object/array props in the recursive `map`, or the memo boundary degrades.
- Render probes exist (`reportEstimateSheetContentRender`, `reportEstimateRowItemsTableRender`, `reportEstimateRowItemRender`) — use them before/after.

## Risk summary for any redesign

| Risk | Mitigation |
|------|------------|
| Horizontal overflow / grid below 714px on deep block indent | Gate indent: cap at depth ~2–3; fall back to text-ramp only past the cap. |
| Background tone is imperceptible / inaccessible | Don't use it. Put the ramp on text; keep fills flat. |
| Locked tests go red | Map every assertion in `05`; keep header fills + `groupGap` untouched to minimise churn. |
| Memoization breaks | Pass only `depth`/`childIndex` scalars; no inline objects. |
| `tertiary` names fail AA | Floor names at `secondary`; let weight + indent + code carry deeper depth. |
| Reintroducing rejected chrome (accent bands, concentric borders) | Out of scope; respect `UX-4 / OD-7`. |
