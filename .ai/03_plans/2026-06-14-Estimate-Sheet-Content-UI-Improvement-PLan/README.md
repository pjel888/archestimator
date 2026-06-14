# Estimate Sheet Content — Hierarchy UI/UX Improvement Plan

**Date:** 2026-06-14
**Revision:** 3 (readiness-hardened — see "Revision history" below)
**Scope:** Read-only audit, research, and planning. No code changes in this pack.
**Status:** Ready for a coding agent to implement **Phase 1A only**. Phase 1B is conditional after visual review. Start at `06-next-ai-handoff.md`.

**Target component family:**

- `src/components/workshop/EstimateSheetContent.tsx` — orchestrator / middle sheet
- `src/components/workshop/estimate-sheet/rows/branch.tsx` — recursive `EstimateSheetBranch` (**primary file**)
- `src/components/workshop/estimate-sheet/rows/row-table.tsx` — `EstimateRowItemsTable`
- `src/components/workshop/estimate-sheet/rows/node-visuals.tsx` — node chrome helpers
- `src/components/workshop/estimate-sheet/rows/drop-zones.tsx` — add-row / drop targets

---

## Why this plan exists

`EstimateSheetContent` displays a recursive, nested estimate tree in a **vertical workspace**. Each node ("Area") can hold its own cost rows *and* child sub-areas (single-node model, P5/P6 — see `02`). The product team wants **parent ↔ child** and **sibling ↔ sibling** relationships to be instantly scannable, because misreading depth in a long estimate can lead to costing the wrong area.

Today the hierarchy is communicated almost entirely by a small indent step and decreasing top-margin. Both are weak, and one real bug remains unsolved: the area **header indents but its own row table does not**, so a deep header floats to the right of its own left-aligned grid (Gap B).

## The user's design intent (this revision)

The user is explicit and the direction is **subtle, not extreme**:

> "darker for parents and lighter header for children", spacing, subtle colour changes, and "maybe horizontal line breaks between siblings".

This revision takes that instinct seriously **and** grounds it against the real design system. The headline finding: the neutral surface palette is a **~4% luminance window** (`surfaceMuted`, `surfaceWarm`, `canvas` are all `#f5f5f5`; background is `#fff`), so "darker parent / lighter child" *via background fill* is below the just-noticeable difference and is not accessible. The instinct is therefore **relocated to the one ramp that has real, AA-grade range — text ink** (`#3D3D3D → #5D5D5D`) — and paired with the user's literal horizontal **sibling rule** and the existing spacing rhythm. See `03` and `04`.

## One-line visual thesis (revised)

> A precise estimate **ledger**: the root area is the dark medium-weight landmark; deeper areas step to regular secondary text; siblings are parted by a single perceptible hairline rule; and each area's row table sits directly under its own header. No file-tree connectors, no nested cards, no tonal background bands.

This replaces Revision 1's thesis ("vertical guide lines + indented columns"), which has been **rejected** — see `04` and the Revision history.

## What this folder contains

| File | Purpose |
|------|---------|
| `01-brief-and-intent.md` | User goal, refined intent, strategic framing, constraints, resolved open questions, non-goals. |
| `02-audit-current-state.md` | Verified current rendering code, the **token-reality** analysis, **prior-iteration history**, **tests that lock the design**, and observed UX gaps. |
| `03-research-findings.md` | External patterns (tonal subtlety + accessibility, sibling dividers, BOQ/estimating-tool precedents) with citations. |
| `04-design-options.md` | Candidate strategies (the live ones) + the explicitly **rejected** ones, with re-scored comparison and ASCII mockups. |
| `05-recommendation-and-plan.md` | Recommended direction, phased implementation units, file map, test-impact map, no-go gates, a11y + perf plans. |
| `06-next-ai-handoff.md` | Precise pickup instructions for the coding agent, plus context from the agents who built and revised this pack. |
| `07-ux-ui-readiness-audit.md` | Readiness audit added after the planning review: workflow mapping, fixed readiness gaps, UX gates, and final handoff verdict. |

## Mandatory constraints

- Stay inside the existing Archestimator product design system (`DESIGN.md`, `src/app/globals.css`). **Note:** `DESIGN.md` lists a stale `ink: #292929`; the shipped value is `--ink: #3D3D3D` (`globals.css`). Reason about contrast against the shipped value.
- App/workshop font max `12px`; names `10px`; meta/code/labels `8–9px`.
- App/workshop font weights are **regular/medium only**. Do not use `font-semibold`/`font-bold` in the estimate-sheet app UI.
- Only `xs` (`3px`) border radius on app surfaces.
- Use existing tokens. The **one** new token this plan proposes is `--divider-sibling` (~`#d9d9d9`) for the sibling rule, because the existing `--hairline` (`#f2f2f2`, ~1.05:1 on white) is visually invisible.
- No new app accent colours. Orange stays reserved for the occupancy dot and Add buttons only.
- **No file-tree connectors / guide lines, no nested concentric borders, no per-depth background fills.** These either do not exist anywhere in the product, contradict the brand, or were already tried and removed (see `02` → "Prior iteration history").
- Preserve accessibility (`aria-expanded`, sr-only content counts, decorative elements `aria-hidden`). Add a real heading/level semantic target for the visible node name (currently absent from the middle sheet).
- Preserve `EstimateSheetBranch` / `EstimateRowItemsTable` memoization and the render probes.

## Success criteria

*(Headline view; `01-brief-and-intent.md` has the detailed six — parent/child clarity, sibling clarity, row ownership, depth clarity, no overflow, no a11y/perf regression.)*

1. A user can glance at a deeply nested sheet and immediately distinguish which rows belong to which area, and which areas are siblings vs parent/child.
2. The change degrades gracefully and does not trigger horizontal scrolling at normal depth (≤ 2–3) on a 13–14" laptop. Row tables never fall below the ~714px grid floor (see `02`).
3. Hierarchy is **never carried by colour or tone alone** (WCAG 1.4.1): every visual cue is mirrored by the outline code, the indent, and the accessibility tree. Load-bearing text stays ≥ AA (`secondary` floor, never `tertiary`).
4. The change is reversible and additive, flag-gated, with no regression in keyboard navigation, screen-reader announcements, or render-probe counts.

## Non-goals

- Re-architecting the data model or mutation layer.
- Changing drag-and-drop behaviour or collapse/expand semantics.
- Adding new features (filters, grouping, export), or row reordering.
- Touch/mobile redesign.
- Redesigning the left estimate tree or the right library dock.

---

## Revision history

- **Rev 1 (original):** Recommended **Option E — vertical guide lines + left accent bars** (file-tree style), delivered in two phases.
- **Rev 2 (this pack):** Re-grounded against the real code, tokens, tests, and git history. **Option E is rejected** because (a) its central justification ("align with the left tree's guide lines") is factually false — `tree.tsx` has *no* guide lines, only an indent spacer + caret; (b) it contradicts the brand's "precise BOQ, not a file explorer" principle; (c) its Phase-2 accent bands / per-area backgrounds relitigate a decision the codebase already made and reversed (`UX-4 / OD-7`, "reduce nested card-on-card borders"); and (d) it does not match the user's tonal/spacing/divider intent. The recommendation is now the **Ledger** direction (text-ink ramp + sibling rule + outline-code) with the **row-table-aligned-to-header** structural fix grafted in. The disciplined doc structure, the Gap A–G inventory, and the feature-flag / a11y-preservation guardrails from Rev 1 are kept.
- **Rev 3 (readiness audit):** Hardened the handoff for UX/UI implementation readiness without touching app code. Corrections: translated external "bold parent row" precedent into Archestimator's allowed **medium/regular** app weight scale; clarified that Phase 1A's sibling rule needs an explicit inset divider element or pseudo-element while block indent is still off (not a full-width section border); documented the shared `nodeNameClasses()` blast radius into `TemplateEditorSheet`; moved the semantic requirement to supported node-name heading levels; made U5 require a viewport/state width matrix; added `07-ux-ui-readiness-audit.md` and a stronger coding-agent stop condition.

*Start with `01-brief-and-intent.md`, then `02-audit-current-state.md`, before reading the options.*
