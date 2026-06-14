# 05 — Recommendation and Implementation Plan (Rev 3)

## Recommended direction

**Option L ("Ledger") as the spine, with Option AI's whole-section indent grafted in**, delivered in two phases. Hierarchy is carried by **text-ink ramp + outline numbering + a perceptible sibling rule + spacing**, and the row table is aligned under its own header. **All surface fills stay flat; no guide lines, no concentric borders, no tonal bands.**

### Visual thesis

> The root area is the dark medium-weight landmark; deeper areas step to regular secondary text; siblings are parted by a single inset hairline rule; each area's row table sits directly under its own header.

### Why this direction (vs Rev 1)

- Solves the user's two **literal** asks: "darker parent / lighter child" (on the AA-grade text ramp, since background tone is sub-JND) and "horizontal line breaks between siblings" (a *visible* rule; the current `#f2f2f2` is invisible).
- Fixes the **primary** verified bug, Gap B (header indented, table full-width) — which Rev 1's Option E explicitly declined to touch.
- Stays brand-true (ledger, not file explorer) and **respects** the prior `UX-4/OD-7` flat-ward decision (fills stay flat; the ramp is on text only) — so it does not relitigate a shipped direction.
- Minimal, reversible, flag-gated; keeps header surface fills and `groupGap` untouched so two of the four locked tests stay green.

### Non-negotiable corrections baked into this plan

1. **Names never use `tertiary`.** `#7F7F7F` ≈ 4.0:1 fails AA at 10px. The ramp is `ink → secondary` and **holds at `secondary`**; deeper depth is carried by weight + indent + the outline code.
2. **Weights stay regular/medium only.** External "bold summary row" precedent maps to `font-medium` root names and `font-normal` descendant names. Do not use `font-semibold` or `font-bold` in this app surface.
3. **`uppercase tracking-normal`** for the root register (verified house idiom), not wide tracking.
4. **New token `--divider-sibling` (~`#d9d9d9`)** for the sibling rule; do not overload `--hairline` or ship a raw hex into a workshop component.
5. **Add supported heading-level semantics** to the visible node name, e.g. `role="heading" aria-level={Math.min(depth + 1, 6)}` (currently absent; WCAG 1.3.1). Do not put `aria-level` on a generic section without a role that supports it.
6. **Gate block indent** against the **714px** row-grid floor (`02`).

---

## Phase 1 — must-have

Phase 1 splits into a **typographic baseline** (1A, zero structural risk — ship and validate with the user first) and a **structural fix** (1B, the Gap B fix that touches layout).

> **On "subtle, not extreme":** 1A (U1–U4) is unambiguously subtle — text weight/colour, a 1px rule, a 9px code, an aria attribute. **1B (U5, the 20px whole-block indent) is the loudest change in the pack** and the one most likely to read as "not subtle." It is therefore **conditional, not automatic**: ship 1A, judge it in the real app at the common shallow depths, and only proceed to U5 if 1A is insufficient to resolve row ownership (Gap B). Do not treat 1B as a default-on baseline. (This matches the "gated" framing in `01` Checkpoint B and `06`.)

### Phase 1A — typographic baseline (do-nothing-plus)

#### U1. Depth-aware header name ramp
- **Goal:** root reads as the dark landmark; descendants step lighter, all AA.
- **Files:** `src/components/workshop/estimate-sheet/rows/node-visuals.tsx`, `branch.tsx` (call site), `src/components/workshop/library/template-editor/TemplateEditorSheet.tsx` (shared-helper guard), `tests/vitest/estimate-sheet-branch-header-ui.test.tsx`, plus a focused template-editor guard if coverage exists.
- **Approach:** make the estimate-sheet node-name styling depth-aware without accidentally changing unrelated template/library names. Acceptable implementation shapes:
  - keep `nodeNameClasses(depth = 1)` backward-compatible so existing zero-argument calls continue to render the old descendant-style template name (`text-secondary font-medium` or the locally intended template style); or
  - introduce `estimateSheetNodeNameClasses(depth)` and leave `nodeNameClasses()` unchanged for shared consumers.
  For the estimate sheet, `depth === 0`: `truncate text-[10px] font-medium uppercase tracking-normal text-ink`. `depth >= 1`: `truncate text-[10px] font-normal text-secondary`. Do **not** introduce tertiary. `branch.tsx` passes `depth`.
- **Patterns to follow:** `uppercase tracking-normal` as used in `NewEstimateForm`, `ProjectEstimatesTable`, `ProjectDetailsModal`.
- **Test scenarios:** root name node has classes `text-ink`, `font-medium`, `uppercase`; a depth-1 child name has `text-secondary` + `font-normal` (not ink, not uppercase); a depth-2 grandchild name also has `text-secondary` (assert it is **not** `text-tertiary`). Add a shared-helper regression guard so `TemplateEditorSheet` does not receive root uppercase/ink styling by accident. Covers success criteria 1 & 4.
- **Verification:** render a 3-level fixture; root visibly heavier/darker; no name uses tertiary.

#### U2. Perceptible inset sibling rule
- **Goal:** the user's "horizontal line breaks between siblings", visible and correctly scoped.
- **Files:** `src/app/globals.css` (token), `branch.tsx` (thread/pass `childIndex` and render the divider), optionally `node-visuals.tsx` for a helper such as `siblingRuleClasses`, `tests/vitest/estimate-sheet-branch-header-ui.test.tsx` or a focused branch-rendering test.
- **Approach:**
  - Add token: `--divider-sibling: #d9d9d9;` in `:root`, plus `--color-divider-sibling: var(--divider-sibling);` in the `@theme` block (enables `border-divider-sibling`). Document in `DESIGN.md`.
  - Keep `nodeShellClasses(depth)` surface semantics unchanged unless U5 later moves the whole section block. A full-width `border-t` on the nested `<section>` is **not acceptable for Phase 1A** because it is not inset while indentation remains header-only.
  - In `branch.tsx`, pass a primitive `siblingIndex` / `isFirstSibling` into each recursive branch. For `depth > 0 && siblingIndex > 0`, render a decorative divider immediately before the header: `<div aria-hidden className="border-t border-divider-sibling" style={{ marginLeft: `${leftIndent + 8}px` }} />` or the equivalent pseudo-element. The left margin aligns the rule with the header's current visual indent in 1A.
  - If U5 later moves indent onto the block, simplify the rule so it starts at the new block left edge and does not double-inset. This is a U5 follow-up, not a reason to make the 1A rule full-width.
  - The divider may add 1px of height if needed; the visual goal is that it rides the existing `groupGap` and does not create a new band.
- **Patterns to follow:** Material/iOS inset-grouped dividers; "no rule above first child" idiom (`03`).
- **Test scenarios:** first child branch renders no sibling divider; second same-depth child renders exactly one `aria-hidden` divider with `border-divider-sibling`; divider style/class proves it is inset, not full-width; `groupGap` assertions UNCHANGED. Covers success criterion 2.
- **Verification:** render ≥2 siblings; a rule appears above the 2nd+ but not the 1st; first-child has no top rule.

#### U3. Elevate the outline-code backbone
- **Goal:** make the `01.02.03` code the AA-safe carrier of structure.
- **Files:** `branch.tsx` (node-code `<p>`, line ~222).
- **Approach:** `text-[8px] … text-tertiary` → `text-[9px] font-sans leading-none tabular-nums text-tertiary`. (Code stays tertiary — it is decorative/duplicated, not the sole carrier; size bump improves legibility.) Optional: weight-step root code to `text-secondary font-medium` (Phase 2).
- **Patterns to follow:** 9px tabular-nums in `row-table.tsx`, `cells`, `bulk-action-toolbar`.
- **Test scenarios:** `Test expectation: none` for behaviour; visual only (code renders at 9px, does not wrap, header height stays `h-10`).
- **Verification:** header height unchanged; code reads cleanly.

#### U4. Add supported heading-level semantics to the node name
- **Goal:** mirror visual depth in the accessibility tree (WCAG 1.3.1).
- **Files:** `branch.tsx` (the visible node-name element inside the header).
- **Approach:** add a supported semantic target on the visible node name, e.g. `<p role="heading" aria-level={Math.min(depth + 1, 6)} ...>{node.name}</p>`, or an equivalent real heading element if it does not disturb typography/layout. Keep the outer section's `aria-label`, caret `aria-expanded`, and sr-only `headerAriaLabel` intact. Cap exposed heading levels at 6 if depth exceeds 5; exact depth still remains available in the outline code and data.
- **Test scenarios:** `getByRole("heading", { name: rootName, level: 1 })` finds the root; depth-1 child is level 2; a deep node is capped at level 6 if needed. `aria-expanded` and the sr-only count text still present. Covers success criterion 6.
- **Verification:** screen-reader exposes heading level; existing expand/collapse and count announcements unchanged.

> **Checkpoint after 1A:** ship behind the flag, confirm with the user that tonal/typographic cues + the sibling rule satisfy the need before doing structural work. This is the cheap validation gate the critique called for.

### Phase 1B — structural ownership fix (Gap B)

#### U5. Indent the whole node block (20px) so the table aligns under its header
- **Goal:** the row table sits directly under its own header at every depth (fixes Gap B); 20px step matches the Templates-panel precedent.
- **Files:** `branch.tsx` (`leftIndent`, the header `paddingLeft`, the body wrapper), `tests/vitest/estimate-sheet-spacing.test.tsx` (if indent is asserted).
- **Approach:**
  - U5 is not part of the default Phase 1A pickup. Before enabling it, measure the actual center work-surface width with the left tree and right dock in their common states. Use this objective formula:
    `availableGridWidth = centerWorkSurfaceWidth - horizontalContainerPadding - blockIndent`.
    Ship U5 only while `availableGridWidth >= 714px` at every required viewport/state below.
  - Required viewport/state matrix before choosing `CAP`: desktop 1440px with library dock open; laptop 1280px with dock open; laptop 1280px with dock collapsed; tablet/narrow editing fallback if this route supports editing there. If any required state fails, reduce the cap or keep U5 off.
  - `const indentStep = 20;` `const blockIndent = Math.min(depth * indentStep, CAP);` where `CAP` is derived from the matrix above — likely cap at depth 2 (40px) or 3 (60px) for the middle column, **not** a blind 96px.
  - Apply the indent to the **inner node block / body wrapper** so header **and** the row table **and** the add-row strip share the same block origin. The table's outer frame should align with the header/block frame, not with the node-name text column. Keep the header's intrinsic `px-1` + caret/name gutter inside that block. The root (depth 0) gets 0 inset; its frame is the outer container.
  - Keep the row table's internal grid full-width **within** the indented block (do not alter `ROW_COLUMNS`; shrink the available block width and let the block move).
  - **Breadcrumb offset recalibration (concrete):** today the breadcrumb uses `paddingLeft: leftIndent + 72` *because the breadcrumb sits in the body and the body is not indented* (the `72` is the intra-header offset that lines it up under the name column: caret slot + dot + gap ≈ 72px). Once the **block** carries `leftIndent`, the breadcrumb must **drop the `leftIndent` term** and keep only the intra-content offset (≈ `72 − 8` = the caret/dot column relative to the block's new left edge). Net: change `leftIndent + 72` → a constant ~`64px` (verify the exact caret+dot+gap width in `branch.tsx` and match it). If you skip this, the breadcrumb double-indents.
  - Re-verify the **sticky depth-0 header's** left origin: root is 0px inset, so it should still align with the root table, but confirm in-app after the relocation.
- **Patterns to follow:** Smartsheet/MS Project indent-the-content approach; the Templates panel's `indentStep={20}`.
- **Test scenarios:** at depth 1 the row table outer frame and header/block frame share the same left origin; indent caps at the chosen depth (no further inset deeper); no horizontal scroll at depth ≤ cap in every required viewport/state. Covers success criteria 3 & 5.
- **Verification (no-go gates below):** record the matrix measurements and show `availableGridWidth >= 714px` at the cap; sticky root header still aligns with the root table.

---

## Phase 2 — nice-to-have (only if Phase 1 tests under-powered in-app)

These are **register amplifiers**, not new mechanisms. Defer until Phase 1 is judged in the real app.

- **U6. Root-only left anchor accent:** a 2px `border-l-2 border-secondary/30` (≈ `#cbcbcb`, within token family, orange stays reserved) on the **depth-0** header only, to tie the landmark header to its grid. Root-only so it reads as "landmark", not per-node containment (respects `UX-4/OD-7`).
- **U7. Heavier depth-0 section rule:** a slightly more saturated top rule between depth-0 areas than between deeper siblings (financial-model "heavier parent border" convention) — only if multiple root areas exist.
- **U8. Weight-stepped outline code:** root code `text-secondary font-medium`, deeper code stays `text-tertiary` (decorative).
- **Deferred / future:** hover-lineage highlight; compact sticky "path pill" replacing the scrolling breadcrumb. Out of scope unless requested.

---

## Feature flags

```ts
// src/components/workshop/estimate-sheet/rows/node-visuals.tsx
export const ESTIMATE_SHEET_HIERARCHY_UI = {
  depthNameRamp: true,        // U1
  siblingRule: true,          // U2
  elevatedNodeCode: true,     // U3
  nodeHeadingLevels: true,    // U4  (a11y win; safe to leave always-on)
  blockIndent: false,         // U5  (structural + loudest change; enable only AFTER the 1A checkpoint, then gate by width)
  rootAnchorAccent: false,    // U6  (phase 2)
  heavierRootRule: false,     // U7  (phase 2)
  weightSteppedCode: false,   // U8  (phase 2)
};
```

Ship 1A behind explicit booleans so product can A/B each cue and roll back independently.

---

## Test-impact map (read before coding)

Four suites currently lock the flat look (`02`). This plan is designed to minimise churn:

| Test file | Stays green? | Required change |
|-----------|--------------|-----------------|
| `estimate-sheet-spacing.test.tsx` | Mostly | `groupGap` and `nodeShellClasses(depth)` surface assertions remain unchanged in Phase 1A. If U5 later moves block indent into the body/block wrapper, update only the new indent-specific assertions. |
| `estimate-sheet-branch-header-ui.test.tsx` | Needs additions | Header **surface/border** assertions (`bg-surfaceMuted/40`, `hover:bg-surfaceMuted/40`, `border-t`, `border-hairline`) stay green (no header-fill change). **Add** assertions: root name `text-ink`/`font-medium`/`uppercase`; depth-1 name `text-secondary`/`font-normal`; depth-2 name `text-secondary` (not tertiary); node names expose heading roles/levels. Also assert second sibling divider exists and first sibling divider does not, or add a focused sibling-divider test. |
| `estimate-sheet-tree-dom.test.tsx` | Green | No change expected (tree-node bg unchanged). Re-run to confirm. |
| `estimate-mixed-content.test.tsx` | Green | `groupGap` unchanged; re-run to confirm. |
| Template editor coverage or a focused guard | Needs check | Because `TemplateEditorSheet.tsx` reuses `nodeNameClasses()`, prove the helper change did not apply root uppercase/ink styling to template/library names. Add a small test if no existing coverage exercises this consumer. |

Map each changed assertion to its unit before editing. Do **not** weaken assertions to pass — update them to the new ground truth and keep them specific.

---

## No-go gates (falsifiable acceptance criteria)

- **Do not ship** if any node **name** renders in `tertiary` (AA fail).
- **Do not ship U5** if the viewport/state matrix is unmeasured, if `availableGridWidth < 714px` at the chosen cap in any required state, or if horizontal scroll appears on a 13–14" laptop middle column. Reduce the cap until it passes; past the cap, stop indenting and let the text ramp + sibling rule carry depth.
- **Do not ship** if the sibling rule appears **above the first child** of any parent.
- **Do not ship** if the visual weight reads "file-browser-like" (connectors, nested cards) — that is out of scope by construction.
- **Do not ship** if render-probe counts for `EstimateSheetBranch` / `EstimateRowItemsTable` increase, or if the memo boundary regresses.

---

## Accessibility plan

1. Preserve all existing `aria-label`, `aria-expanded`, and the sr-only `headerAriaLabel` counts.
2. **Add supported heading-level semantics to the visible node name** (U4) — the one real semantic gap. Prefer `role="heading" aria-level={Math.min(depth + 1, 6)}` unless a real heading element fits the existing typography/layout.
3. Names stay ≥ AA (`secondary` floor). The outline code + indent + heading levels carry depth so colour is never the sole cue (WCAG 1.4.1).
4. The sibling rule and any anchor accent are **decorative** (`aria-hidden`), conveying no component state — exempt from 1.4.11's 3:1; document this exemption.
5. `uppercase` on the root name is cosmetic (`text-transform`); the accessible name still comes from `node.name` in normal case.

## Performance plan

1. No new per-node React state. Name/rule helpers are pure functions of primitive props. Keep `nodeShellClasses(depth)` unchanged in Phase 1A; render the sibling rule separately. Keep `nodeNameClasses()` backward-compatible for `TemplateEditorSheet`, or introduce an estimate-sheet-specific helper.
2. Thread only `depth` and `childIndex`/`siblingIndex` (already-stable scalars) — **no** new inline object/array props in the recursive `map`, or `EstimateRowItemsTable`'s memo degrades.
3. Prefer classes over per-render computation; the sibling rule is a static border, not JS.
4. Run `reportEstimateSheetContentRender` / `reportEstimateRowItemsTableRender` before and after; confirm no render-count increase.

## Housekeeping (recommended, low-risk, outside the component)

- Correct `DESIGN.md`'s stale `ink: #292929` → `#3D3D3D`, and record the Ledger ink-ramp + sibling-rule decision and the depth-2+ `secondary`-floor a11y note. (Documentation-only; do as a separate small commit.)

## Validation plan

**Local checks:** `bun run type-check`; changed-file ESLint + `lint:design-system`; the four vitest suites above; `git diff --check`.
**Visual checks (two depths — do not test only the stress fixture):**
1. **Common shallow estimate (depth 0–1, the typical case per `02`):** confirm the root reads as the heavier/darker landmark vs its children, and the sibling rule clearly parts adjacent areas. At this depth almost all of the effect comes from the **root name ramp + the sibling rule** (1A), which is the point — verify those two cues alone are enough before relying on indent.
2. **Deep stress estimate (≥3 levels):** confirm each table aligns under its header (if U5 shipped); no name uses tertiary; no horizontal scroll at depth ≤ cap; sticky root header aligns with the root table.
Both: keyboard expand/collapse + screen-reader announcements (including heading levels) intact.
