# 03 - UX/UI & Visual Design Audit

> Part of the **Estimate Master Column (EMC) Improvement Plan** -- `.ai/03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/`
> Status: DRAFT (audit) - 2026-06-14 - Branch: feat/estimate-sheet-uxui
> Index: [00-README](00-README.md)

---

## Scope and method

This document audits the **Estimate Master Column (EMC)** — the middle column of the estimate sheet page — from a UX/UI and visual-design lens. The EMC is rendered by `EstimateSheetContent.tsx` (host) and the recursive per-node renderer `src/components/workshop/estimate-sheet/rows/branch.tsx`, with leaf chrome in `node-visuals.tsx`, `row-table.tsx`, `cells.tsx`, and `drop-zones.tsx`.

Every claim below was verified by reading the cited file at the cited line. The design-system source of truth is `DESIGN.md` at repo root (verified present, 27071 bytes, 2026-06-14). Where I cite a token I quote the literal `DESIGN.md` value. Sibling docs cross-referenced: the disclosure/feature analysis in [04-FEATURE-READINESS-AND-BUG-AUDIT](04-FEATURE-READINESS-AND-BUG-AUDIT.md), the CRUD matrix in [02-CRUD-CAPABILITY-MATRIX](02-CRUD-CAPABILITY-MATRIX.md), the render-economy constraints in [05-PERFORMANCE-AUDIT](05-PERFORMANCE-AUDIT.md), and the test/blast-radius scope in [07-BLAST-RADIUS-AND-RISK](07-BLAST-RADIUS-AND-RISK.md).

### The relevant DESIGN.md tokens (verified, quoted)

| Token group | Value (verbatim `DESIGN.md`) | Anchor |
|---|---|---|
| `hairline` | `#F2F2F2` (replaces shadows; "Use thin borders and whitespace for separation") | `DESIGN.md:11`, `DESIGN.md:342` |
| `surfaceMuted` / `surfaceWarm` | both `#F5F5F5` (they are the SAME color) | `DESIGN.md:17-18` |
| `accent` | `#292929` (a near-black, NOT a blue) | `DESIGN.md:19` |
| spacing scale | `xs:4px sm:8px md:12px lg:20px xl:48px xxl:64px section:112px` | `DESIGN.md:197-204` |
| radius | `xs` = `3px` is the ONLY app radius | `DESIGN.md:485-486` |
| type ceiling | `12px` strongest titles, `11px` subtitles/secondary headings, `10px` body/controls/cells, `8-9px` meta/eyebrow | `DESIGN.md:354`, `DESIGN.md:369-373` |
| hierarchy invariant | "labels, eyebrows, metadata... must never render larger than the input/control/body text they describe" | `DESIGN.md:355` |
| nesting rule | "Avoid nested card-on-card clutter... One surface should own each work zone." | `DESIGN.md:541` |
| elevation | "Border (`#F2F2F2`) replaces heavy shadows" | `DESIGN.md:342`, `DESIGN.md:479` |
| selection | "selected rows/cells use accent-soft background or clear outline, not decorative color" | `DESIGN.md:551` |

**The headline:** the color and type discipline in the EMC is strong and mostly token-compliant. The drift is concentrated in three places the user named — a legacy label (Issue 1), the vertical-rhythm system (Issue 2), and the disclosure model (Issue 3) — plus a layer of polish (off-token gaps, double-borders, a non-system blue, decorative drag handles). None of these require a rebuild. Issue 3 is a **correctness-grade** bug; Issues 1 and 2 are alignment-and-rhythm corrections.

---

## 1. Issue 1 — the "Own items" eyebrow

### 1.1 Current behavior (verified)

The "Own items" eyebrow is rendered in `branch.tsx:241-248`:

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

The render gate is `hasOwnRows && hasChildren` (`branch.tsx:241`), where `hasChildren = childAreas.length > 0` (`branch.tsx:86`) and `hasOwnRows = estimateRowItems.length > 0` (`branch.tsx:87`). So the label renders in **exactly one** case: a *mixed* node that has both its own rows AND child sub-areas. A rows-only node (`hasOwnRows && !hasChildren`) shows nothing; a children-only node shows nothing. Verified by the test `estimate-mixed-content.test.tsx:86-94` which asserts the label is present on the mixed `Building A` node and absent on the rows-only `Pantry` leaf.

It sits in DOM order **above** the own-rows table (`branch.tsx:249`), and the layout is rows-first: own rows + add-row strip render before child sub-areas (`branch.tsx:240-281`, comment at 238-240).

### 1.2 Why the user wants it gone, and why removing it from the "both" case removes it entirely

User requirement (verbatim): *"No need to put the Own items on the nodes that both have nested nodes and nested components."* Because `hasOwnRows && hasChildren` is the **only** condition under which the eyebrow ever renders, "remove it from the both-case" is functionally "remove the label entirely." There is no other case to preserve it in.

The inconsistency the user is reacting to is real and is one of **asymmetry**: the *same surface* — a node's own-rows table — is labelled "Own items" when the node also has children, but is silently unlabelled when the node is a pure leaf. The user reads the same table and sees a label appear or vanish depending on a sibling structure that has nothing to do with the table itself. That is a legitimate visual inconsistency, not a preference quibble.

### 1.3 Two distinct "Own items" surfaces — do NOT conflate

There are **two** things called "Own items" and they must be treated as separate decisions:

| Surface | File:line | Purpose | In scope for Issue 1? |
|---|---|---|---|
| EMC visual eyebrow | `branch.tsx:245` (`data-estimate-own-items-label`) | Disambiguate a mixed node's own rows from its first child's rows | **YES — remove this** |
| Charts aggregation leaf | `aggregate-project-charts.ts:300` (`id: \`area:${child.id}:own\``, `label: "Own items"`) | Money-attribution: a container that ALSO owns rows gets an explicit leaf so its own money is counted exactly once, not merged into a child rollup (comment `aggregate-project-charts.ts:296-297`) | **NO — leave untouched** |

The two share only the literal string `"Own items"`. Different file, different namespace, different consumer. Deleting the charts leaf would corrupt chart totals (own-row money dropped or double-counted) — it is asserted by `project-charts-aggregation.test.ts`. The blast-radius perspective rates this a **critical-if-careless** trap (string-collision delete). The remediation guard: search the string before any delete and confirm each hit's file; scope Issue 1 to `branch.tsx` only.

### 1.4 The disambiguation role it played, and the cost of deletion

The eyebrow's stated job (comment `branch.tsx:242-244`) is to mark the boundary in a mixed node between "my own rows (above)" and "my first child's rows (below)." The rows-first DOM order already separates them structurally (own rows render before children), but the eyebrow is the only *explicit* textual cue that the table immediately below the header belongs to *this* node rather than to a child.

Removing it returns a small ambiguity in the mixed case: where do MY rows end and my first child's begin? But two structural facts make that ambiguity minor:

1. Child sub-areas each render inside their own bordered `<section>` with their own sticky header (`branch.tsx:158-172`), depth-indented (`leftIndent = Math.min(depth * 32, 192)`, `branch.tsx:89`). A child is visually a separate card; the parent's own rows are not.
2. The own-rows table sits flush under the parent header; the first child sits under its own header one indent step deeper.

So the boundary is already carried by layout — the eyebrow is redundant with structure in most cases. The fix is to make that structural cue *stronger* (so deletion costs nothing) rather than keep a tiny grey label that is itself misaligned (see 1.5).

### 1.5 A secondary defect in the current label: it is misaligned with the table it labels

Even setting the user request aside, the eyebrow is misplaced. It is indented to `leftIndent + 8` (`branch.tsx:245`), but the table it labels renders full-bleed inside its own bordered container with the table's own left edge at `0` relative to that container (`row-table.tsx:158`: `border border-hairline bg-white`, no left inset). So the label floats at the header's text indent while the table edge sits further left — the label does not sit flush above the data it describes. This is another reason not to "fix" the label in place but to remove it and carry the boundary structurally.

### 1.6 Recommendation (Issue 1)

1. **Remove** the visual eyebrow `<p data-estimate-own-items-label>` at `branch.tsx:241-248` (delete the conditional block). Render-neutral: it is one static DOM node with no state/callback/`editableRows` dependency, so removal only removes one node per mixed node.
2. **Preserve the screen-reader boundary** that the comment claims the label "doubles as" (`branch.tsx:244`). Keep an `sr-only` boundary so assistive-tech users still get the "own items" demarcation at zero visual cost:
   ```tsx
   {hasOwnRows && hasChildren ? <span className="sr-only">Own items</span> : null}
   ```
   This keeps the L7 accessibility boundary while satisfying the visual request, and lets `estimate-mixed-content.test.tsx` keep a (now `sr-only`) assertion rather than deleting it. Owner decision needed: keep the `sr-only` boundary, or remove the concept from the EMC entirely (see Open Decisions).
3. **Carry the visual boundary structurally** instead of with a label:
   - Align the own-rows table's left edge to the header indent (`leftIndent + 8`) so the table visually keys to its parent header (today it does not — see 1.5). One shared inset, applied to both header and own-rows table container.
   - Ensure child cards read as clearly deeper (depth+1 indent step from Issue 2) so "parent's own rows above, child sub-areas below" is unmistakable by layout alone.
4. **Do NOT touch** `aggregate-project-charts.ts:298-309` or `project-charts-aggregation.test.ts`.
5. **Update** `estimate-mixed-content.test.tsx:77,82,86-93`: the rows-first test (73-84) currently uses `getByText("Own items")` as its before-anchor (line 77); re-anchor it on the `<thead>`/table or the material cell. The "only when BOTH" test (86-94) must be deleted or inverted to assert the `sr-only` boundary instead of visible text.

---

## 2. Issue 2 — Spacing & vertical rhythm

User requirement (verbatim): *"Fix proper spacing because the spacing/gaps between the nodes and rows are not very good."*

This is the most diffuse of the three but has a clean root cause: **the depth-driven rhythm is dead code, so every nested node renders with no inter-node margin, and the only separation comes from a single off-token 16px flex gap that also separates unrelated elements.**

### 2.1 Every spacing source in the EMC (verified inventory)

| # | Source | Value | File:line | Fires when |
|---|---|---|---|---|
| S1 | `groupGap(depth)` depth-0 | `mt-0` | `node-visuals.tsx:16` | root node |
| S2 | `groupGap(depth)` depth>0 **without** sibling-rhythm | `mt-0` | `node-visuals.tsx:15` | **EVERY nested node** (flag never passed — see 2.2) |
| S3 | `groupGap(depth)` depth-1 **with** sibling-rhythm | `mt-5` (20px=`lg`) | `node-visuals.tsx:17` | **never reached** (dead) |
| S4 | `groupGap(depth)` depth>1 **with** sibling-rhythm | `mt-4` (16px, off-token) | `node-visuals.tsx:18` | **never reached** (dead) |
| S5 | inner cluster gap | `space-y-4` (16px, off-token) | `branch.tsx:237` | between own-table / add-strip / each child |
| S6 | post-header top nudge | `mt-1` (4px=`xs`) | `branch.tsx:237` | only when NO breadcrumbs |
| S7 | left indent step | `min(depth * 32, 192)` (32px step, off-token) | `branch.tsx:89` | every node |
| S8 | node header height | `h-10` (40px) | `branch.tsx:174` |  every node |
| S9 | breadcrumb band | `my-1` (8px) + `pb-2` (8px) + `text-[8px]` line | `branch.tsx:220` | every nested non-collapsed node (`showBreadcrumbs`, `branch.tsx:91`) |
| S10 | node card chrome | `border border-hairline bg-surfaceMuted/20` | `branch.tsx:163` | every node |
| S11 | own-rows table chrome | `border border-hairline bg-white` | `row-table.tsx:158` | every node with rows |
| S12 | row height | `min-h-24` (96px) | `row-table.tsx:192` | every data row |
| S13 | thead height | `min-h-10` (40px) | `row-table.tsx:161` | every table |
| S14 | sticky header offset constant | `STICKY_HEADER_H = 40` | `node-visuals.tsx:9` | sticky cascade math |
| S15 | sticky thead offset constant | `STICKY_THEAD_H = 40` | `node-visuals.tsx:10` | sticky cascade math |

### 2.2 Why it reads as bad — the dead rhythm

`groupGap` is defined as (`node-visuals.tsx:12-19`):

```ts
export function groupGap(depth: number, usesSiblingGroupRhythm = false) {
  if (depth > 0 && !usesSiblingGroupRhythm) return "mt-0";   // S2 — fires for ALL nested nodes
  if (depth === 0) return "mt-0";                             // S1
  if (depth === 1) return "mt-5";                             // S3 — unreachable
  return "mt-4";                                              // S4 — unreachable
}
```

The `depth===1 → mt-5` and `depth>1 → mt-4` branches are only reachable when `usesSiblingGroupRhythm === true`. But the recursive child render at `branch.tsx:285-309` **never passes `usesSiblingGroupRhythm`** — it passes `node`, `nodeCode`, `ancestorPath`, the handlers, `depth + 1`, and `stickyTop`, and nothing else. The prop defaults to `false` (`branch.tsx:78`). Therefore for **every real nested node** the first guard (`depth > 0 && !usesSiblingGroupRhythm`) fires and returns `mt-0`. The intended depth-aware rhythm (S3/S4) is unreachable dead code. (Memory observation 7363 independently confirms this root cause.)

**Net effect:** sibling sub-areas have *no* top margin between them. The only thing separating them is the parent's `space-y-4` (S5, 16px) flex gap from `branch.tsx:237`. That single 16px gap also separates the own-rows table from the add-row strip and the add-row strip from the first child. So nodes, tables, and strips all share **one undifferentiated 16px gap** — there is no intentional hierarchy in the vertical spacing. Adjacent bordered cards sit flush-ish, separated by a gap that means three different things. This is precisely why the gaps "feel bad": the rhythm is accidental, not designed.

### 2.3 Why it reads as bad — off-token values and double-borders compound it

- **Off-token gaps.** `space-y-4` (S5) and the dead `mt-4` (S4) are **16px**, which is NOT in the `DESIGN.md` spacing scale (`xs:4 sm:8 md:12 lg:20 xl:48`, `DESIGN.md:198-202`). 16px falls between `md:12` and `lg:20`, so it reads as "off" against everything else in the app. `mt-5` (S3, 20px) DOES map to `lg`, but it never fires.
- **Off-token indent.** The 32px indent step (S7, `branch.tsx:89`) is off-scale; the nearest tokens are `lg:20` and `xl:48`. A 32px step is large enough that deep trees run toward the right edge while still not mapping to a token.
- **Double-borders flatten depth (see Issue 4 / §4.2).** The node card border (S10) sits immediately adjacent to the own-rows table border (S11), both the same `#F2F2F2` hairline. With *no* inter-node margin (S2) AND identical borders, two stacked nodes look like one continuous grid. The gap that should carry separation is missing, and the border that's left does not distinguish layers.
- **Breadcrumb band steals rhythm and sticky height (see §3.4 / Issue 4).** The breadcrumb (S9) adds ~24-30px inside the sticky container on every nested node, fighting the rhythm and the sticky offset math.

#### Cross-surface indent — three different systems the user moves between

The Req-2 spacing decision must be *cross-surface-aware*: a user navigating the estimate sheet sees **three different per-depth indent systems** across the three tree renderers. Indent is the most felt expression of hierarchy, so changing the EMC step in isolation widens the gap with the other two. (Actually *unifying* the three is out of scope here — this table only ensures the EMC step is chosen with the others in view.)

| Renderer | Per-depth step | Cap | Source (verified) |
|---|---|---|---|
| EMC (this doc) — current | `depth * 32` | 192px | `branch.tsx:89` |
| EMC (this doc) — **proposed** | `depth * 16` | 96px | §2.4 below |
| Left tree (`EstimateSheetTree`) | `depth * 16` (`TREE_INDENT_STEP = 16`) | none (uncapped width) | `ui/tree.tsx:46,457` |
| Template editor (`TemplateEditorSheet`) | `depth * 24` | 144px | `TemplateEditorSheet.tsx:266` |

Note the proposed EMC step (`depth*16`) coincidentally matches the left tree's `TREE_INDENT_STEP`, which is a point in its favor (the two surfaces a user toggles between most often would finally agree); the template editor's `depth*24` would remain divergent. Reconciling the template editor is the parity question raised in §5 / Open Decisions, not a Req-2 task.

### 2.4 Proposed spacing scale — concrete, token-aligned, before/after

Adopt a depth-aware vertical scale keyed to `DESIGN.md` tokens, and make it *actually fire*. Two equivalent ways to make it fire: (a) delete the `usesSiblingGroupRhythm` flag and make `groupGap` purely depth-driven, or (b) thread the flag through the recursion. **Recommend (a)** — the flag is a no-op today and adds a hidden footgun.

**Proposed `groupGap` (depth-driven, decreasing with depth so the tree reads as a hierarchy):**

```ts
export function groupGap(depth: number) {
  if (depth === 0) return "mt-0";   // root: no top margin
  if (depth === 1) return "mt-5";   // 20px = lg  — top-level siblings most separated
  if (depth === 2) return "mt-3";   // 12px = md
  return "mt-2";                     // 8px  = sm  — deep siblings tightest
}
```

**Proposed inner-cluster gap (`branch.tsx:237`):** replace `space-y-4` (16px, off-token) with `space-y-2` (8px = `sm`). The 16px gap is too large for an *in-node* cluster (own table → add-strip → children) and reads as "separate nodes." 8px reads as "parts of the same node."

**Proposed indent step (`branch.tsx:89`):** quantize to a token and halve it: `leftIndent = Math.min(depth * 16, 96)` (16px = 4 base units, half the current 32). Deep trees no longer run off-screen and the step is on-scale. (Confirm against real depth distribution — see Open Decisions; if estimates are shallow, 20px=`lg` per step is also acceptable.)

**Before / after table:**

| Concern | Before | After | Token alignment |
|---|---|---|---|
| Inter-node margin (nested siblings) | `mt-0` always (S2 dead rhythm) | depth1 `mt-5`/depth2 `mt-3`/depth3+ `mt-2` | `lg`/`md`/`sm` ✔ |
| In-node cluster gap | `space-y-4` (16px) | `space-y-2` (8px) | `sm` ✔ |
| Indent step | `depth*32` cap 192 | `depth*16` cap 96 | 4×base ✔ |
| Post-header nudge | `mt-1` (4px) | keep `mt-1` (`xs`) | `xs` ✔ |
| Node card border | always (S10) | drop / reduce (see Issue 4) | "one surface per zone" ✔ |
| Header height | `h-10` (40px) | **keep 40px** (avoid sticky-cascade churn) | — |

**Critical constraint:** if the header height changes, `STICKY_HEADER_H` (S14) and `STICKY_THEAD_H` (S15) MUST change in lockstep, because the sticky cascade offsets (`ownRowsStickyTop = stickyTop + STICKY_HEADER_H`, `branch.tsx:95`; `childStickyTop = ownRowsStickyTop + (hasOwnRows ? STICKY_THEAD_H : 0)`, `branch.tsx:96`) are computed from these constants and the test `estimate-mixed-content.test.tsx:121` asserts `thead.style.top === \`${STICKY_HEADER_H}px\``. **Recommendation: keep header height fixed at 40px and tune ONLY the non-sticky gaps (S2/S5/S7).** That confines Issue 2 to className/value changes and avoids the three-way sticky coupling (rendered height ↔ constant ↔ accumulated offset). The blast-radius perspective rates a header-height change as the riskiest path in Issue 2.

### 2.5 Document the scale so it stays enforceable

Encode the spacing map as a small comment/constant block in `node-visuals.tsx` next to `groupGap`, citing the `DESIGN.md` tokens, so future contributors do not reintroduce off-token gaps or a dead flag.

---

## 3. Issue 3 — Disclosure / caret model (UX lens)

User requirement (verbatim): *"Some node rows dont have expand/collapse icons even if they have components nested inside them which might be symptomatic of a bigger issue so all the features must be examined."*

This is a **correctness-grade** disclosure bug, not polish. The functional root cause and the model-level analysis live in the feature-readiness perspective; here I cover the **UX consequences**: alignment, affordance, hover/focus, and keyboard.

### 3.1 Current behavior (verified)

The caret is rendered by the ternary at `branch.tsx:182-205`, gated on `hasChildren` ONLY:

```tsx
{hasChildren ? (
  <Button
    variant="ghost"
    size="icon-sm"
    aria-label={`${collapsed ? "Expand" : "Collapse"} ${node.name}`}
    aria-expanded={!collapsed}
    className="size-6 rounded-xs p-0 text-tertiary"
    onClick={() => setCollapsedNodeIds(/* toggle node.id */)}
  >
    <CaretDown size={13} weight="regular" aria-hidden="true" className={collapsed ? "-rotate-90" : ""} />
  </Button>
) : (
  // Reserve the caret slot so leaf names stay aligned with parents.
  <span className="size-6 shrink-0" aria-hidden="true" />
)}
```

`hasChildren = childAreas.length > 0` (`branch.tsx:86`). A node with its own rows but no child sub-areas (`hasOwnRows && !hasChildren` — the most common node under the P6 single-node model) falls into the `else` branch and gets a non-focusable, `aria-hidden` empty `<span className="size-6 shrink-0" />` (`branch.tsx:204`). It gets **no caret, no `aria-expanded`, and no toggle** — even though its entire body (own-rows table + add-row strip) is rendered inside the `!collapsed` block at `branch.tsx:236-324` and would collapse perfectly if a caret existed. The toggle handler (`branch.tsx:189-196`) only needs `node.id`; nothing about it requires children. The bug is purely the affordance gate.

The leaf comment at `branch.tsx:84-85` states the (now-false) model assumption: *"a node is a leaf iff it has no child sub-areas. The disclosure caret, aria-expanded, and the rows-vs-sub-areas distinction all key off this."* Under P6 every node can hold rows AND children, so "expandable" should mean "has collapsible contents" (`hasContents = hasChildren || hasOwnRows`, already computed at `branch.tsx:88`) — not "has children." This is the conflation the user intuited as "symptomatic of a bigger issue."

### 3.2 UX consequence — affordance (the user's literal complaint)

A node that visibly contains components shows **no** expand/collapse control. The user cannot collapse a heavy rows-only area to scan the tab. This is the exact report. Because expandability is advertised inconsistently (children-only and mixed nodes get a caret; rows-only nodes do not), the column teaches the user that *some* sections collapse and others do not, with no visible reason — eroding trust in the disclosure model.

### 3.3 UX consequence — alignment (the good part, preserve it)

The empty `<span className="size-6 shrink-0" />` placeholder (`branch.tsx:204`) reserves the caret column, so the `NodeIcon` (`branch.tsx:206-208`) and name (`branch.tsx:213`) stay horizontally aligned with parents that *do* have a caret. Alignment is currently correct — only the affordance is missing. When the gate is widened to `hasContents`, keep the empty-slot fallback ONLY for the genuinely-empty node (`!hasContents`) so that the truly-empty node still aligns and is correctly non-collapsible (nothing to hide).

### 3.4 UX consequence — hover / focus / keyboard

- The caret is a shared `Button variant="ghost" size="icon-sm"` (`branch.tsx:183-185`), so it inherits the design-system focus-visible ring and hover state. Glyph is `CaretDown size={13}` `text-tertiary` (`branch.tsx:188,198`) — on-token (8-9px-equivalent meta glyph). Rotation `-rotate-90` when collapsed (`branch.tsx:198`) is a clear collapsed/expanded cue.
- Today, rows-only nodes give **keyboard users no expand/collapse at all** and announce no `aria-expanded`, so the section silently advertises non-expandability. Widening the gate fixes this for free (the `Button` brings keyboard + focus + aria).
- Minor polish: on hover, lift the caret from `text-tertiary` to `text-secondary` for a slightly stronger affordance cue (the header already has `hover:bg-surfaceMuted/40` via `nodeHeaderClasses()`, `node-visuals.tsx:28`). Verify the shared `Button` already provides a focus-visible ring (it does for the row-table buttons at `row-table.tsx:362`).

### 3.5 Recommendation (Issue 3)

1. **Gate the caret on `hasContents` (`hasChildren || hasOwnRows`), not `hasChildren`** — change `branch.tsx:182` from `hasChildren ?` to `hasContents ?`. Any node with collapsible contents advertises and offers expandability.
2. **Collapse hides the whole body together.** The `!collapsed` block already wraps own-rows table + add-strip + children (`branch.tsx:236-324`), so collapsing a rows-only node unmounts its table — a *net perf win* on large sheets (the perf perspective confirms this).
3. **Keep the empty-slot placeholder ONLY for `!hasContents`** so the truly-empty node stays aligned and non-collapsible.
4. **Update the model comment** at `branch.tsx:84-85` to the P6 truth ("expandable iff `hasContents`").
5. **Reconcile collapse-all/expand-all.** `collectAllNodeIds` (`expansion.ts`) already enumerates every node id, and `collapseAll` builds its Set from `collectAllNodeIds([selectedNode])` (`EstimateSheetContent.tsx:1264-1266`). Today collapse-all marks rows-only leaves collapsed but they have no caret to re-expand individually — so the bulk surface and the per-node surface are already inconsistent; widening the gate **reconciles** them. No change to `collapseAll`/`expandAll` themselves.
6. **Update tests:** `estimate-mixed-content.test.tsx:96-111` currently asserts the leaf has NO disclosure button (line 105) and NO `aria-expanded` on its header (line 110). Both assertions encode the bug and must flip: assert a rows-only node now HAS a caret + `aria-expanded`, and assert ONLY a fully-empty node has none.

---

## 4. Broader polish

Beyond the three named issues, the EMC has a coherent set of secondary visual-design drifts. Each is anchored and has a concrete recommendation with values.

### 4.1 Visual hierarchy: weak node-vs-row typographic ranking

`node-visuals.tsx:31-37` sets the node header type:

```ts
export function nodeNameClasses() {
  return "truncate text-[10px] font-medium text-secondary";   // node NAME = 10px
}
export function nodeTotalClasses() {
  return "shrink-0 text-right text-[10px] font-normal tabular-nums text-ink";  // node TOTAL = 10px
}
```

The node name is `text-[10px]` (`node-visuals.tsx:32`) and the node total is `text-[10px]` (`node-visuals.tsx:36`). But the material name inside the node's own rows is `text-[11px]` (`cells.tsx:72`) and numeric cells are `text-[10px]` (`row-table.tsx:159`). So a **node header name (10px) is SMALLER than a component material name inside it (11px) and the SAME size as ordinary numeric cells.** The container reads lighter than its contents — an inverted hierarchy. `DESIGN.md` allows `11px` for subtitles/secondary headings and `12px` for strongest titles (`DESIGN.md:369-370`); a node header is the closest thing the EMC has to a section title and is under-weighted.

**Recommendation:**
- Node name → `text-[11px] font-medium text-ink` (subtitle scale, `DESIGN.md:370`), so the container outranks its row content.
- Node total → `text-[11px] font-medium text-ink tabular-nums` right-aligned (already `shrink-0 text-right`, `node-visuals.tsx:36`).
- Optionally the depth-0 root node name → `text-[12px]` as the single strongest title (`DESIGN.md:369`, "12px maximum").
- Net 3-step ladder within the 8-12px envelope: node (11-12px) > component material (11px, now clearly inside a heavier header) > numeric cells (10px).

### 4.2 Bordered-card-around-bordered-table double-borders

Every node renders as a hairline-bordered muted card (`branch.tsx:163`: `border border-hairline bg-surfaceMuted/20`, root also `rounded-xs`). Inside it, the rows table renders its OWN hairline border (`row-table.tsx:158`: `border border-hairline bg-white`), each cell uses `border-r`/`border-x border-hairline` (`row-table.tsx:161-180`, `198-216`), and the material cell is another bordered/hover surface (`cells.tsx:184`). That is 3-4 nested uses of the SAME `#F2F2F2` hairline, directly against `DESIGN.md:541` ("Avoid nested card-on-card clutter... One surface should own each work zone") and `DESIGN.md:342` (hairline replaces shadows, use whitespace for separation). Because all layers use the identical hairline and near-identical surfaces (`surfaceMuted/20` vs `white` — and note `surfaceMuted` = `surfaceWarm` = `#F5F5F5`, `DESIGN.md:17-18`), the eye cannot quickly parse node vs row grid vs component. This compounds Issue 2 (no inter-node margin + identical borders = two stacked nodes look like one grid).

**Recommendation — pick ONE border-bearing layer per containment level:**
- **Node:** drop the full card border (`branch.tsx:163`); separate nodes with the inter-node margin from Issue 2 plus a single bottom-rule or left-rule on the sticky header. (DESIGN.md "thin borders and whitespace," `DESIGN.md:342`.)
- **Row table:** keep its border (`row-table.tsx:158`) as the single grid frame.
- **Component/material cell:** drop the competing surface border and rely on the table cell border + hover bg only.
- If a node card is kept as a drag-target affordance, make its surface a tonal step from the table (node `bg-surfaceMuted/40`, table `bg-white`) and drop the node border so only ONE hairline outlines the cluster.

Owner decision: should the depth-0 (root) node render full card chrome at all, or be a frameless container that only borders its children? (See Open Decisions.)

### 4.3 Non-system blue in selection / replace-target styling

`DESIGN.md:19` defines `accent` as `#292929` (near-black) and `DESIGN.md:551` says "selected rows/cells use accent-soft background or clear outline, not decorative color." The EMC uses raw blues in several places:
- Active editable cell: `bg-accent/10 ring-1 ring-inset ring-accent/30` (`row-table.tsx:241,273,332`) — this uses the `accent` token correctly (near-black), good.
- Active row: `bg-[#F6FAFF] shadow-[inset_2px_0_0_rgba(37,99,235,0.70)]` (`row-table.tsx:193`) — `#F6FAFF` and `rgba(37,99,235,...)` are a **raw blue**, NOT a design token, and `shadow-[inset...]` is a shadow (DESIGN.md prefers borders over shadows, `DESIGN.md:342,479`).
- Replace-target highlight: `bg-blue-100 ring-2 ring-inset ring-accent` (`cells.tsx:161,185`) — `blue-100` is a **non-system blue**.

**Recommendation:** replace the raw blues with the `accent`-soft + hairline/ring system already used by the active-cell styling (`bg-accent/10`, `ring-accent/30`). Replace the inset shadow on the active row with a left rule (`border-l-2 border-accent`) or `bg-accent/5` per `DESIGN.md:551`. This unifies all selection/active feedback to one near-black accent language. (Owner approval needed for any retained blue — see Open Decisions.)

### 4.4 Drag affordances are inconsistent (3 treatments) and one is destructive

The EMC exposes drag in three visually different ways using the SAME glyph for different meanings:
1. **Row "reorder" handle** — `DotsSixVertical size={14}` in a plain `<span>` with `cursor-grab` and `aria-label="Drag material {x}"` (`row-table.tsx:202-204`). It has a drag aria-label but **no `draggable` and no `onDragStart`** in `row-table.tsx` — it is a **phantom affordance**. No reorder-row server action exists (confirmed by the CRUD-matrix perspective). It looks draggable and does nothing.
2. **Component drag handle** — a real ghost `Button` with `DotsSixVertical size={11}`, `draggable`, `onDragStart`/`onDragEnd` (`cells.tsx:239-252`). This is the ONLY genuinely-draggable row affordance.
3. **Template/library drops** — dashed `EstimateDropZone` surfaces (`drop-zones.tsx:20-34`).

So `DotsSixVertical` means "reorder this row" in one place (broken) and "move this component" in another (works), with different chrome and reliability. **Worse:** the component drag's `onDragEnd` CLEARS the component when `dropEffect !== "move"` (`cells.tsx:151-154`) — a cancelled or missed drag silently deletes the component, a destructive outcome with no confirmation and no surfaced undo.

Drop highlights are also three different languages: node card tints `bg-surfaceWarm/30` on template drag-over (`branch.tsx:164`), material cell shows `bg-blue-100 ring-2 ring-inset ring-accent` (`cells.tsx:185`), dashed zone shows `opacity-100` (`drop-zones.tsx:24-26`).

**Recommendation:**
- One grab-handle chrome (ghost icon button, `DotsSixVertical`) used identically for row and component handles. If the row handle is not wired, **remove it** (`row-table.tsx:202-204`) rather than ship a misleading affordance — or wire it to a real reorder mutation (needs a new server action; out of UX scope, route to CRUD/DB perspectives).
- One drop-highlight token across all targets: pick the dashed-zone + `ring-accent` pattern and reuse it for node template-over, component-replace, and add-row drop. Replace `bg-surfaceWarm/30` (`branch.tsx:164`) and `bg-blue-100` (`cells.tsx:185`) with the accent/hairline system.
- Make `cells.tsx:151-154` non-destructive: a cancelled drag should snap back, not clear. Deletion already has an explicit Trash button (`cells.tsx:211-224`); a failed drag must not silently delete.

### 4.5 Empty-state and add-row affordances are too quiet / mixed copy density

At rest, a non-empty node's only add affordance is `QuietAddRowButton`: a 24px-high (`h-6`), `text-[9px]`, `text-tertiary` row reading "Add row" with an 11px Plus (`drop-zones.tsx:36-52`). Combined with the off-token gaps (Issue 2) and the wall of hairlines (§4.2), it is easy to miss. There is **no EMC affordance to add a sub-area** — the empty-state copy tells users to "add a sub-area from the tree" (`drop-zones.tsx:88`), pushing a core create action OUT of the EMC into the left rail. The empty-node state (`drop-zones.tsx:85-94`) packs a long sentence at `text-[9px]` next to a 96px-wide (`w-24`) button — dense and unbalanced. The tab-level empty states in `EstimateSheetContent.tsx` use a nicer eyebrow/title/helper/buttons composition, so empty states across the EMC do not share one pattern.

**Recommendation:**
- Keep "Add row" quiet but raise the label from `text-tertiary` to `text-secondary` (`drop-zones.tsx:46`) and ensure it sits in the in-node cluster with the new 8px gap (Issue 2) so it reads as part of the node.
- Add a parallel quiet "Add sub-area" affordance in the EMC node footer so creating structure does not force a context switch to the left tree (matches the empty-state's own "a row OR a sub-area" promise). Note: node CRUD currently originates in the LEFT `EstimateSheetTree` via CustomEvents (see CRUD-matrix perspective) — wiring this is a cross-perspective decision.
- Trim the empty-node sentence (`drop-zones.tsx:88`) to "Add a row or sub-area" with the two affordances as buttons, not prose.
- Reuse one empty-state composition (eyebrow/title/helper/buttons) for both tab-level and in-node empty states.

### 4.6 Off-token raw type and redundant utilities

- Node code is `text-[8px] font-sans leading-none tabular-nums text-tertiary` (`branch.tsx:211`) — functionally the `app-label-sm` token (8px/400/10px line, `DESIGN.md:121-124`) but bypasses the type system, and `font-sans` is redundant (SF Pro is already the stack). The code-above-name as an 8px eyebrow is correct per the hierarchy invariant (label smaller than the value, `DESIGN.md:355`).
- **Recommendation:** replace the raw class with a shared `app-label-sm` token utility and drop the redundant `font-sans`. Same for the `#` and index cells at `row-table.tsx:162,198` which also use raw `text-[9px] font-sans`.

### 4.7 Accessibility of color / contrast

- `text-tertiary` is used heavily for primary affordances (caret `branch.tsx:188`, add-row label `drop-zones.tsx:46`, node code `branch.tsx:211`). For *interactive* elements, tertiary-on-white can be low-contrast; the recommendations in §3.4 (caret hover lift) and §4.5 (add-row to `text-secondary`) help. Verify caret and add-row meet contrast for their interactive role.
- The `sr-only` L7 header label (`branch.tsx:181`, `headerAriaLabel` at `branch.tsx:103-107`) is well-built and announces dual content; preserve it. The `sr-only "Own items"` boundary (§1.6) keeps the L7 boundary after the visual label is removed.
- The phantom drag handle (§4.4) has a misleading `aria-label="Drag material {x}"` (`row-table.tsx:203`) on a non-draggable element — an a11y defect (announces a capability that does not exist). Removing the handle removes the false announcement.

---

## 5. Cross-references

- **Disclosure model (functional root cause, collapse engine, persistence):** feature-readiness perspective. Issue 3 here is the UX face of that bug; the engine analysis (collapse state ephemerality, `collectAllNodeIds`, search override) lives there.
- **CRUD matrix:** the phantom row-reorder handle (§4.4) and "no EMC add-sub-area" (§4.5) are CRUD gaps; the matrix documents affordance/handler/persistence/gating/status for each.
- **Performance:** Issue 1 (label removal), Issue 2 (className-only spacing), and Issue 3 (caret via existing `EstimateSheetExpansionContext`, not new table props) are all render-safe. The hard constraint: do NOT add new always-changing props to `EstimateSheetBranch` or the memoized `EstimateRowItemsTable` (`row-table.tsx:57-82` comparator is the perf contract). Collapsing a rows-only node (Issue 3) *improves* large-sheet perf by unmounting its table.
- **Blast radius / tests:** `estimate-mixed-content.test.tsx` pins the current behavior for ALL of Issues 1/2/3 and must be rewritten *in the same change* (lines 77/82/86-94 for Issue 1; 96-111 for Issue 3; 121 for any header-height change in Issue 2). The charts "Own items" leaf (`aggregate-project-charts.ts:298-309`, asserted by `project-charts-aggregation.test.ts`) is out of scope and must stay green. `TemplateEditorSheet.tsx` is a parallel renderer that will NOT inherit these EMC fixes — decide explicitly whether to mirror.
- **Database / network:** none of Issues 1/2/3 touch persistence (collapse state is client-only, scope-keyed in `EstimateSheetContent.tsx:1155-1169`). Confirmed zero-migration.

---

## 6. Open decisions (UX/UI)

1. **Issue 1 a11y boundary:** keep an `sr-only "Own items"` boundary after removing the visual label, or remove the concept from the EMC entirely and rely on layout? Determines whether `estimate-mixed-content.test.tsx` is updated (sr-only assertion) or its assertion deleted.
2. **Issue 2 header height:** is the 40px header height allowed to change (triggering the `STICKY_HEADER_H` 3-way coupling, `node-visuals.tsx:9` ↔ `branch.tsx:95-96` ↔ `estimate-mixed-content.test.tsx:121`), or must it stay fixed at 40px and only inter-node gaps move? Recommendation: keep fixed.
3. **Issue 2 indent step:** is the 96px max indent (currently `depth*32` cap 192, `branch.tsx:89`) ever hit in real estimates, or do trees stay shallow? Real depth distribution confirms whether the proposed 16px-step is sufficient.
4. **Issue 4 root card chrome:** should the depth-0 (root/selected) node render full card chrome (`branch.tsx:163`), or be a frameless container that only borders its children? (DESIGN.md "one surface owns each work zone," `DESIGN.md:541`.)
5. **Issue 4 blues:** do the `bg-blue-100`/`ring-accent` replace ring (`cells.tsx:185`), the `#F6FAFF`/`rgba(37,99,235)` active-row styling (`row-table.tsx:193`), and the `bg-surfaceWarm/30` template tint (`branch.tsx:164`) have owner approval, given `DESIGN.md:19,551` restrict color to the near-black `accent`? Recommendation: replace all with the `accent` system.
6. **Phantom row handle:** wire the `DotsSixVertical` row handle (`row-table.tsx:202-204`) to a real reorder mutation (needs a new server action) or remove the misleading affordance? Recommendation: remove unless reorder is a committed feature.
7. **Template editor parity:** mirror the EMC spacing/disclosure fixes into `TemplateEditorSheet.tsx`, or accept documented visual divergence between the two node renderers?
