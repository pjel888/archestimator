# 01 — Brief and Intent

## User request (verbatim essence)

Original (Rev 1):

> "Comprehensively audit our `EstimateSheetContent` component… recursive code that displays nested tree structure data. Our focus is UX and UI. We need a way to signify that a child is under a parent and the difference between siblings too. This is difficult because this is a vertical workspace. Please research, audit, and then create all the necessary plans… This is not a coding task — only audit/readiness/analysis/documentation/planning/research."

Refinement (Rev 2):

> "Improve the visuals BUT not too extremely. Just subtle design nuances… that better show the UX/UI that a node is a child of another node, a node is a sibling etc. Maybe with spacing. Maybe with subtle colour changes (darker for parents and lighter header for children?). Maybe horizontal line breaks between siblings. We need to explore and research and plan this more."

## Intent

Make the **hierarchical structure of the estimate sheet visually obvious** without turning the compact, spreadsheet-like workspace into a heavy outline or file browser. The sheet must stay dense, editable, and fast, but containment (parent → child → grandchild) and sibling boundaries must be readable at a glance.

The user's instinct points at three subtle mechanisms — **tone**, **spacing**, and **horizontal dividers**. Rev 2 adopts the divider ask directly, keeps the existing spacing, and **redirects the tonal ask**: the *literal* version ("lighter header *fill* for children") is not viable — the neutral palette is sub-perceptible and fails accessibility (`02`/`03`) — so the "lighter child" cue moves onto header *text* (ink + weight), where it is both visible and AA-grade. Rev 3 tightens that cue to the actual app weight contract: root uses **medium** weight, descendants use **regular** weight; no semibold/bold app typography. That redirect, and the prominence of the block-indent fix, are the two judgment calls in this pack; both are surfaced as explicit **checkpoints** below for the user to confirm rather than presented as settled.

## Strategic framing (why this is worth doing well)

This is a small visual change with outsized leverage on the product's core promise. Archestimator's identity is *precise, architectural, understated* — "when the product delivers a number, that number is trustworthy" (`PRODUCT.md`). A misread of depth in a long estimate is not a cosmetic annoyance; it leads to **costing the wrong area**, which directly undermines that trust. The estimate sheet is the primary work surface where 8-hour sessions happen, so legibility of structure compounds across every interaction.

The opportunity cost of getting the *mechanism* wrong is also real: the easy, generic answer (file-tree guide lines) would import a "tool that looks like a file explorer" aesthetic the brand explicitly rejects, and would relitigate a flat-ward direction the team already shipped. The right move is the one that reinforces the ledger/document identity while solving the legibility problem — which is also the cheaper, lower-risk move. (A standalone `STRATEGY.md` is out of scope for a UI-detail plan; this paragraph is the strategic lens applied inline.)

## How the user's instinct is honoured (and where it is redirected)

| User's idea | Verdict | What we do instead / additionally |
|-------------|---------|-----------------------------------|
| "darker for parents, lighter header for children" | **Redirect — we *decline* the literal version.** A lighter *header fill* for children is not viable: the neutral surface palette is a ~4% luminance window (all surfaces `#f5f5f5`), below the just-noticeable difference, and fails WCAG as a sole cue (`02`, `03`). The header background stays identical at every depth. | Relocate "darker parent / lighter child" to the **text-ink ramp**, which has real AA-grade range: root name `ink #3D3D3D` + medium weight (the dark "landmark"); deeper names `secondary #5D5D5D` + regular weight (the "lighter" descendants). It is the *name glyph* that lightens, not the header panel — see **Checkpoint A**. |
| "horizontal line breaks between siblings" | **Adopt (literally).** | A single perceptible hairline rule (`--divider-sibling` ~`#d9d9d9`) between same-depth siblings, *not* above the first child. The current `#f2f2f2` hairline is invisible. |
| "spacing" | **Keep (deliberately unchanged).** | The existing `groupGap` rhythm (20/12/8px by depth) already spans the section-vs-sibling range, so we do *not* add a new spacing lever; the sibling rule rides the top of that gap (adds zero height). Treating spacing as "already solved" is itself a decision, recorded here. |

### Checkpoints to confirm with the user

These are the two places where the pack made a judgment the user may want to overrule:

- **Checkpoint A — the tonal redirect.** We deliver "lighter child" on the *name text*, and keep every header *fill* the same at all depths (a literally-lighter child header is below the perceptible/accessible threshold). If the user specifically wants the header *panel* to look lighter, see Option QT ("Quiet-Tone") in `04` — it needs a new `--surface-landmark` token, is perceptually marginal, and breaks a locked test. Default is the text-ramp; confirm.
- **Checkpoint B — the 20px block indent (the loudest change).** The block-indent fix for row ownership (U5 in `05`) is the most visually prominent change in the pack and the one most likely to read as "not subtle." It is therefore **gated**: ship the cheaper typographic baseline (U1–U4) first, judge it in the real app, and only do U5 if the baseline is insufficient. Confirm at that point.

## Context

`EstimateSheetContent` renders the middle panel. The **left panel tree** (`EstimateSheetTree` + `src/components/ui/tree.tsx`) is a separate component; it uses an **indent spacer + a disclosure caret only — it has *no* vertical guide lines or connector lines** (verified in `tree.tsx` lines ~462–492). Rev 1 incorrectly stated the left tree "has guide lines"; that error seeded a wrong recommendation and is corrected here.

The **middle sheet** is not a file tree. It is a vertically stacked set of **area blocks**, each containing:

1. a header row (caret, occupancy dot, node code, name, total)
2. an optional breadcrumb band
3. a table of the area's own cost rows
4. an "Add row / drop here" strip
5. recursively rendered child sub-areas (`depth + 1`)

The recursive renderer is `EstimateSheetBranch`. Every node is a first-class **Area** that can hold rows AND children (single-node model, P5/P6 shipped to prod — see `02`).

## Constraints and assumptions

### Hard constraints

- **Vertical workspace.** Dominant axis is top-to-bottom; horizontal space is bounded by the left tree and right library dock. The row grid has a fixed **~714px** content floor (`02`), which caps how far blocks can indent.
- **Existing design system.** SF Pro, neutral palette, thin borders, `3px` radius, compact `8–12px` type scale. Reason about contrast against the *shipped* `--ink: #3D3D3D`, not `DESIGN.md`'s stale `#292929`.
- **Accessibility (WCAG 2.1 AA).** Information never by colour alone (1.4.1). Load-bearing text ≥ 4.5:1 (`secondary` passes at ~6.5:1; **`tertiary` fails at ~4.0:1** — do not use it for **names**). The decorative outline *code* (`01.02.03`) may stay `tertiary`: it is duplicated by the name + indent + a real heading-level semantic target, so it is never the sole carrier (no contradiction with the names rule). Preserve `aria-expanded` and sr-only counts; add supported level semantics to the visible node name.
- **Performance.** `EstimateSheetBranch` uses stable callbacks; `EstimateRowItemsTable` is memoized with a custom comparator. New visual props must be primitive (`depth`, `childIndex`) and must not break the memo boundary.
- **No new app accent colours.** Only the approved orange exceptions carry hue.

### Assumptions

- Deep nesting is expected but bounded; BOQ practice rarely exceeds depth 2–3. The UI should degrade gracefully beyond that and never crush the row grid.
- Users scan by area name and total first, then drill into rows.
- Sibling comparison matters: users want "these three sub-areas" to read as one coherent block.

## Success criteria

1. **Parent/child clarity:** a child area reads as lighter/subordinate to its parent through the text-ink ramp + indent, not merely raw indentation.
2. **Sibling clarity:** adjacent same-depth siblings are parted by a visible rule + the spacing rhythm.
3. **Row ownership (Gap B):** each area's row table sits directly under its own header (aligned left edges), not floating to the right.
4. **Depth clarity:** current depth is scannable from indent + ink weight + the outline code, without reading the full code string.
5. **No horizontal overflow** at normal depth on laptop widths; row tables never fall below ~714px.
6. **No a11y or perf regressions;** colour is never the sole carrier of structure.

## Non-goals

- Rebuilding the tree data model or mutation layer.
- Changing collapse/expand semantics or drag-and-drop.
- Adding row reordering.
- Redesigning the left estimate tree or the right library dock.
- Mobile/touch-first redesign.

## Open questions — resolved in this revision

1. **Should child headers align with the parent's row table or the parent's caret column?** → Resolved: indent the **whole node block** (header + table + add-row strip) as one unit so the table aligns under its own header (`05`, U5). This is the literal fix for Gap B.
2. **Should we render vertical guide lines inside the middle sheet?** → **Resolved: No.** They exist nowhere in the product (the left tree has none), they contradict the "precise BOQ, not a file explorer" principle, and the user did not ask for them. (`04`, "Rejected options".)
3. **How to handle rows-first order without rows looking orphaned from their header?** → Resolved: the header ink-step + block indent + the row table aligning under its own header keep rows visually attached; the add-row strip stays inside the block (`02`, Gap F).
4. **Sibling separators — explicit rule or implicit spacing?** → Resolved: **both.** A perceptible hairline rule at the top of the existing gap. The rule is the explicit cue the user asked for; the gap is the rhythm.
5. **"Focus path" hover highlight that dims unrelated branches?** → Deferred to a later iteration (`05`, Phase 2 / Future).

## Handoff note to the coding agent

This folder is a completed, re-grounded audit and planning pack. Do **not** start coding until you have read `02` (verified current state + tests that lock the design), `03` (research), `04` (options, including what was rejected and why), and `05` (the recommendation, phases, and no-go gates). If the recommendation conflicts with newer product direction, pause and ask before writing code. `06` is your entry point.
