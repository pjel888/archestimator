# 07 — Constraint Stress-Test

**Date:** 2026-05-21  
**Goal:** Subject each alternative strategy to Archestimator's known hard constraints and identify failure modes before implementation.

---

## 1. Constraint inventory

| # | Constraint | Source | Failure mode if violated |
|---|-----------|--------|--------------------------|
| C1 | 12px absolute max font size in app | `DESIGN.md`, `AGENTS.md` | Feels unprofessional, breaks density contract. |
| C2 | 10px normal body/table text | `DESIGN.md` | Any larger text competes with row data. |
| C3 | Monochrome-first, orange-accent-second | `DESIGN.md` | Color-coding groups/areas feels toy-like or SaaS-generic. |
| C4 | No heavy shadows, no gradients | `DESIGN.md` | Elevation effects look out of place in architectural UI. |
| C5 | Border-heavy, shadow-light | `DESIGN.md` | Separation must come from borders and backgrounds, not shadows. |
| C6 | `h-8` (32px) max header height | Current code (`EstimateSheetBranch`) | Taller headers break the compact rhythm and reduce rows per viewport. |
| C7 | 32px indent step, 192px max | Current code | Deeper nesting must not create unreadable squashed content. |
| C8 | Row table visual weight | Current code (`EstimateRowItemsTable`) | Area headers must not compete with `min-h-24` material cells. |
| C9 | No dark mode (light-only currently) | Current code | Any token must work on light `#fff` / `#f4f7fa` surfaces. |
| C10 | Roboto Mono for money, tabular nums | `DESIGN.md` | Header totals must stay tabular; non-money text stays Inter. |
| C11 | Phosphor Icons only | Current code | No custom SVGs or emoji replacements. |
| C12 | Accessibility: color-independent distinction | `02-ux-plan.md` | WCAG 1.4.1 violation if icon+color are the only cues. |

---

## 2. Stress-test matrix

### Strategy A — Background Semantics

| Constraint | Pass / Fail | Evidence |
|------------|-------------|----------|
| C1 12px max | ✅ Pass | Uses 10px text; no change. |
| C2 10px body | ✅ Pass | No text size changes. |
| C3 Monochrome-first | ✅ Pass | Uses existing `surfaceMuted`, `white`, `divider` tokens only. |
| C4 No shadows/gradients | ✅ Pass | No shadows or gradients added. |
| C5 Border-heavy | ✅ Pass | Full border on groups, bottom border on areas. |
| C6 h-8 header | ✅ Pass | No height change. |
| C7 32px indent | ✅ Pass | Background bands do not affect indent math. |
| C8 Row table weight | ✅ Pass | White area headers recede; muted group headers sit above the table without competing. |
| C9 Light-only | ✅ Pass | `bg-surfaceMuted` and `bg-white` both work on light canvas. |
| C10 Tabular nums | ✅ Pass | Totals unchanged. |
| C11 Phosphor Icons | ✅ Pass | Icons unchanged. |
| C12 Color-independent | ✅ Pass | Background + weight + border provide 3 independent channels. |

**Stress-test verdict:** ✅ **Passes all constraints.**  
**Edge case:** Empty area on white canvas — mitigated by the `border-b` keeping it visible as a divider.

---

### Strategy B — Border Accent Differentiation

| Constraint | Pass / Fail | Evidence |
|------------|-------------|----------|
| C1 12px max | ✅ Pass | No text changes. |
| C2 10px body | ✅ Pass | No text changes. |
| C3 Monochrome-first | ✅ Pass | Uses `divider` and `hairline` only. |
| C4 No shadows/gradients | ✅ Pass | No shadows. |
| C5 Border-heavy | ✅ Pass | Border-only approach is literally border-heavy. |
| C6 h-8 header | ✅ Pass | No height change. |
| C7 32px indent | ⚠️ Marginal | `border-l-4` on deeply nested groups reduces usable text width at narrow center-column widths. At 192px indent + 4px border + 8px padding, the name field shrinks significantly. |
| C8 Row table weight | ⚠️ Marginal | Both types share `bg-surfaceMuted`, so groups do not clearly sit "above" the table. The distinction is weaker. |
| C9 Light-only | ✅ Pass | No dark-mode issues. |
| C10 Tabular nums | ✅ Pass | Unchanged. |
| C11 Phosphor Icons | ✅ Pass | Unchanged. |
| C12 Color-independent | ✅ Pass | Border style + weight provide independent channels (but weight is weaker than background). |

**Stress-test verdict:** ⚠️ **Marginal pass.** `border-l-4` is risky at deep nesting + narrow viewport. Shared background weakens the group/area semantic boundary.

---

### Strategy C — Typography + Connector Emphasis

| Constraint | Pass / Fail | Evidence |
|------------|-------------|----------|
| C1 12px max | ⚠️ Marginal | Requires 11px for groups to create enough differentiation. This is within the 12px limit but pushes against it. |
| C2 10px body | ❌ Fail | Groups break the 10px convention by going to 11px. In a dense sheet with 50+ headers, mixed 10px/11px creates visual noise. |
| C3 Monochrome-first | ✅ Pass | No color changes. |
| C4 No shadows/gradients | ✅ Pass | No shadows. |
| C5 Border-heavy | ✅ Pass | No border changes. |
| C6 h-8 header | ✅ Pass | No height change. |
| C7 32px indent | ✅ Pass | Connectors add horizontal complexity but do not shrink content width. |
| C8 Row table weight | ❌ Fail | Identical `bg-surfaceMuted` on both types means area headers compete equally with the row table for attention. The blue material cells (`bg-[#EFF6FF]`) now compete with gray headers at the same visual level. |
| C9 Light-only | ✅ Pass | No issues. |
| C10 Tabular nums | ✅ Pass | Unchanged. |
| C11 Phosphor Icons | ✅ Pass | Unchanged. |
| C12 Color-independent | ✅ Pass | Typography + connectors are fully accessible. |

**Stress-test verdict:** ❌ **Fails C2 and C8.** Mixed font sizes in a compact UI are a density violation. Equal background weight between areas and their row tables creates visual competition.

---

### Strategy D — Explicit Badge + Icon Enhancement

| Constraint | Pass / Fail | Evidence |
|------------|-------------|----------|
| C1 12px max | ✅ Pass | Badges are 8px. |
| C2 10px body | ✅ Pass | No text size changes. |
| C3 Monochrome-first | ✅ Pass | Badge uses `text-tertiary` only. |
| C4 No shadows/gradients | ✅ Pass | No shadows. |
| C5 Border-heavy | ✅ Pass | Badges have `border-hairline`. |
| C6 h-8 header | ⚠️ Marginal | At 32px height, adding a badge + icon background reduces horizontal space for the name. The badge must be very small (`px-1`) to fit without truncation. |
| C7 32px indent | ✅ Pass | No impact on indent. |
| C8 Row table weight | ❌ Fail | Both types share `bg-surfaceMuted`, so area headers do not recede. The badge adds noise without solving the "competition with row table" problem. |
| C9 Light-only | ✅ Pass | No issues. |
| C10 Tabular nums | ✅ Pass | Unchanged. |
| C11 Phosphor Icons | ✅ Pass | Icon backgrounds are CSS-only. |
| C12 Color-independent | ✅ Pass | Badges + icon shapes are accessible. |

**Stress-test verdict:** ❌ **Fails C8.** Does not solve the core problem: area headers still compete visually with the row table because they share the muted background.

---

### Strategy E — Hybrid (Background + Bold + Optional Badge)

| Constraint | Pass / Fail | Evidence |
|------------|-------------|----------|
| C1 12px max | ✅ Pass | Group names stay 10px (semibold, not larger). |
| C2 10px body | ✅ Pass | Area names stay 10px normal. |
| C3 Monochrome-first | ✅ Pass | Existing tokens only. |
| C4 No shadows/gradients | ✅ Pass | No shadows. |
| C5 Border-heavy | ✅ Pass | Full borders + divider borders. |
| C6 h-8 header | ✅ Pass | No height change. |
| C7 32px indent | ✅ Pass | No border-left eating into space (only `border-l-2` on groups). |
| C8 Row table weight | ✅ Pass | White area headers recede completely; the row table becomes the dominant surface. |
| C9 Light-only | ✅ Pass | No issues. |
| C10 Tabular nums | ✅ Pass | Unchanged. |
| C11 Phosphor Icons | ✅ Pass | Unchanged. |
| C12 Color-independent | ✅ Pass | Background + weight + border + optional badge = 4 independent channels. |

**Stress-test verdict:** ✅ **Passes all constraints.**  
**Note:** The optional badge is the only marginal element; if it fails density review, it can be removed without breaking the core distinction.

---

## 3. Failure-mode summary

| Strategy | Failed constraints | Fatal? | Mitigation |
|----------|-------------------|--------|------------|
| A | None | — | Monitor empty-area orphan risk in testing. |
| B | C7 (marginal) | No | Reduce `border-l-4` to `border-l-2` or `border-l` if text truncation occurs. |
| C | C2, C8 | **Yes** | Cannot use without breaking density and row-table hierarchy. |
| D | C8 | **Yes** | Core visual hierarchy problem remains unsolved. |
| E | None | — | Remove badge if noisy; core system still passes. |

---

## 4. Edge-case scenarios

### Scenario 1: Empty area at depth 2

**Setup:** `Main House (group) → Foyer (area, no rows)`

- **Strategy A:** White area header + white empty drop zone. Looks like a clean divider + call-to-action. ✅ Acceptable.
- **Strategy B:** Muted header + muted empty drop zone. Hard to see where the area ends and the empty zone begins. ⚠️ Risky.
- **Strategy C:** Muted header, normal weight. Looks almost identical to a group. ❌ Fails.
- **Strategy D:** Muted header + badge. Badge saves it, but still competes with group styling. ⚠️ Acceptable but noisy.
- **Strategy E:** Same as A. ✅ Acceptable.

### Scenario 2: Deep nesting (depth 4)

**Setup:** `Lot A → Main House → Ground Floor → Wing A → Master Bedroom (area)`

- **Strategy A:** Four muted bands (Lot, House, Floor, Wing) then white area header. The "gray wall" concern is real but mitigated by `groupGap(depth)` (decreasing top margin at deeper levels) and the 32px indent. ✅ Acceptable.
- **Strategy B:** Four muted bands with varying left-border thickness. At depth 4 with 128px indent, the thick left border is far from the viewport edge and may be clipped. ⚠️ Risky.
- **Strategy C:** Four muted bands with 11px/10px text differences. At depth 4, the text-size difference is barely perceptible. ❌ Fails.
- **Strategy D:** Four muted bands with badges. Extremely noisy. ❌ Fails.
- **Strategy E:** Same as A. ✅ Acceptable.

### Scenario 3: Area with 20+ row items

**Setup:** `Kitchen (area) → 20 material rows`

- **Strategy A:** White area header blends into white table. The table's sticky header (`bg-white`) and material cells (`bg-[#EFF6FF]`) provide all necessary visual structure. The area header acts as a clean section break. ✅ Excellent.
- **Strategy B:** Muted area header sits above white table. Creates a "lid" effect that separates the table from its context. ⚠️ Acceptable but adds unnecessary chrome.
- **Strategy C:** Muted area header, normal text. Same as current — no improvement. ❌ Fails.
- **Strategy D:** Muted area header + badge. Badge is lost in the noise once the table dominates the viewport. ❌ Fails.
- **Strategy E:** Same as A. ✅ Excellent.

---

## 5. Stress-test conclusion

**Only Strategy A and Strategy E pass all hard constraints without fatal flaws.**

- Strategy E is Strategy A plus optional typography/badge enhancements.
- Since Strategy E's enhancements are additive and removable, the **core safety net is Strategy A**.
- Strategy C and D fail because they do not address the fundamental visual hierarchy problem: **area nodes need to recede so their row tables can dominate**.
- Strategy B is usable but weaker than A/E at deep nesting and does not leverage the proven "banded header + white rows" pattern from construction software benchmarks.
