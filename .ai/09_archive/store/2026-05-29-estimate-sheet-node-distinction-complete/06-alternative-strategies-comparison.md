# 06 — Alternative Strategies Comparison

**Date:** 2026-05-21  
**Goal:** Map four genuinely distinct visual strategies for group/area distinction, with honest trade-offs, so the decision is not a single-point-of-failure guess.

---

## How to read this document

Each strategy is a **coherent visual system**, not a single property. Strategies are mutually exclusive at the philosophy level (though hybrid combinations are noted). Every strategy is evaluated against the same five criteria:

1. **Scannability** — Can a user tell group from area at a glance while scrolling?
2. **Nesting resilience** — Does the distinction remain clear at depth 4+?
3. **Density impact** — Does it increase perceived clutter or cognitive load?
4. **Accessibility** — Does it survive color-blindness, low vision, and screen readers?
5. **Implementation risk** — How likely is a layout regression or unexpected visual conflict?

---

## Strategy A: Background Semantics *(Container = Band, Surface = Sheet)*

**Core idea:** Group headers sit on a muted background band; area headers sit on white and blend into their row table.

**Visual prescription:**
- Group: `bg-surfaceMuted` + `border` + `border-l-2 border-l-divider` + `font-semibold`
- Area: `bg-white` + `border-b border-hairline` + `font-normal text-secondary`

**Pros:**
- Maps directly to the dominant pattern in Airtable grouped records and Procore division headers.
- Background is the fastest-attended visual channel (size > color > shape in pre-attentive processing).
- Area headers naturally "disappear" into the table below, reducing visual competition with row data.
- Zero risk of clashing with the blue material-cell accents (`bg-[#EFF6FF]`, `border-l-accent/70`).

**Cons:**
- If an area has NO rows, the white header on white canvas may look "orphaned" or like a missing section.
- Deeply nested groups create multiple muted bands stacked together; could feel like "gray wall."
- Requires careful hover-state calibration so white area headers don't look disabled.

**Benchmark support:** Airtable ✅, Procore ✅, Excel (optional) ⚠️  
**Confidence:** High for areas with rows; medium for empty areas.

---

## Strategy B: Border Accent Differentiation *(Same Background, Different Borders)*

**Core idea:** Both group and area headers share `bg-surfaceMuted`, but use fundamentally different border treatments to communicate role.

**Visual prescription:**
- Group: `bg-surfaceMuted` + `border` (full box) + `border-l-4 border-l-tertiary` (thick left organizational accent)
- Area: `bg-surfaceMuted` + `border-l-0 border-r-0 border-t-0 border-b-2 border-b-hairline` (bottom divider only, no top/side borders)

**Pros:**
- Keeps the background surface unified; no "gray wall" risk at deep nesting.
- Border differences are pre-attentively processed almost as fast as background differences.
- Works well for empty areas (they still have the bottom border, so they don't look orphaned).
- Very low implementation risk — only border classes change.

**Cons:**
- Both types still share the muted background, so the distinction is thinner than Strategy A.
- The thick left border (`border-l-4`) on deeply nested groups could eat into the already-limited horizontal space (indent maxes at 192px, but the content area shrinks as panels resize).
- Does not leverage the "sheet surface" mental model as strongly.

**Benchmark support:** No direct benchmark match; closest is OmniOutliner's level-based left margins.  
**Confidence:** Medium. The distinction is real but subtle.

---

## Strategy C: Typography + Connector Emphasis *(Minimal Chrome, Maximum Structure)*

**Core idea:** Keep backgrounds and borders identical for both types. Rely on typography weight, size hierarchy, and vertical connector lines to communicate role and nesting.

**Visual prescription:**
- Group: `bg-surfaceMuted border` + `text-[11px] font-bold text-ink` (slightly larger, boldest weight allowed)
- Area: `bg-surfaceMuted border` + `text-[10px] font-normal text-secondary` (standard size, subdued)
- Add `border-l border-hairline` vertical guides on child content wrappers to trace hierarchy.

**Pros:**
- The most "architectural" and precise aesthetic; minimal decorative chrome.
- Typography is universally accessible (screen readers, color blindness, low contrast).
- Connector lines solve the deep-nesting traceability problem independently of node-type distinction.
- Easy to implement — mostly text-class changes.

**Cons:**
- **Scannability is the weakest of all strategies.** Users must read text weight/size differences at 10–11px scale while scrolling. This is cognitively expensive.
- The current `groupTint()` already makes both types look identical; this strategy only tweaks text. It may not feel like a meaningful change.
- Connector lines add horizontal complexity and may clash with the table's vertical grid lines.
- Does not solve the "what will expand?" predictability problem as strongly as background or border strategies.

**Benchmark support:** Excel (bold subtotals) ⚠️, OmniOutliner (level styles) ⚠️  
**Confidence:** Low for immediate scannability; medium for long-term readability if paired with connectors.

---

## Strategy D: Explicit Badge + Icon Enhancement *(Semantic Labeling)*

**Core idea:** Keep backgrounds and borders identical. Make the distinction explicit through large, unmissable semantic labels and enhanced iconography.

**Visual prescription:**
- Group: `bg-surfaceMuted border` + static 8px badge `"GROUP"` + icon in a subtle rounded-square background (`bg-white/80 rounded-sm`)
- Area: `bg-surfaceMuted border` + static 8px badge `"AREA"` + icon in a subtle rounded-square background with a tiny dot or accent
- Both use `font-normal` names; the badge carries the semantic load.

**Pros:**
- Completely unambiguous — the label literally says the kind.
- No background/border changes means zero risk of clashing with other UI elements.
- Icon backgrounds make the 13px icon more scannable without increasing icon size.

**Cons:**
- **Density killer.** At `h-8` (32px), adding a badge + icon background eats horizontal space that is already scarce (name + total must fit).
- Feels bureaucratic or "form-like" rather than architectural.
- 8px uppercase labels are hard to read quickly; they become visual noise when repeated on every header.
- Violates the principle that the UI should feel precise, not labeled.

**Benchmark support:** None of the benchmarks use text badges for every hierarchy node.  
**Confidence:** Low. Too noisy for the density.

---

## Strategy E: Hybrid — Background + Bold + Subtle Badge *(Recommended Compromise)*

**Core idea:** Combine the strongest elements of Strategy A and Strategy C, with an optional badge as a safety net.

**Visual prescription:**
- Group: `bg-surfaceMuted` + full border + `font-semibold` + optional hover badge
- Area: `bg-white` + bottom border only + `font-normal text-secondary`
- Badge: hover-only or static, 8px, placed after name

**Pros:**
- Background difference provides fast scannability.
- Typography weight reinforces the distinction.
- Badge removes all ambiguity for new users.
- Can degrade gracefully: if badge is too noisy, hide it; the background + weight distinction still works.

**Cons:**
- Slightly more complex implementation than pure Strategy A.
- Still has the "empty area on white canvas" risk from Strategy A.

**Benchmark support:** Airtable ✅, Procore ✅, Excel (optional + bold) ✅  
**Confidence:** Highest overall.

---

## Side-by-side visual simulation

### At root level (depth 0)

```
Strategy A / E (Hybrid)
┌─────────────────────────────────────────────┐
│ ▼ 📁 Lot A                      ₱5.2M       │  ← muted band, full border, semibold
└─────────────────────────────────────────────┘
  ┌───────────────────────────────────────────┐
  │ ▼ 📁 Main House                 ₱3.1M     │  ← muted band, full border, semibold
  └───────────────────────────────────────────┘
    ┌─────────────────────────────────────────┐
    │ ▼ ⬚ Foyer                       ₱245K   │  ← white, bottom border only, normal
    └─────────────────────────────────────────┘
      [row table begins here, white bg]

Strategy B (Border-only)
┌─────────────────────────────────────────────┐
│ ▼ 📁 Lot A                      ₱5.2M       │  ← muted, thick left border
└─────────────────────────────────────────────┘
  ┌───────────────────────────────────────────┐
  │ ▼ 📁 Main House                 ₱3.1M     │  ← muted, thick left border
  └───────────────────────────────────────────┘
    ┌─────────────────────────────────────────┐
    │ ▼ ⬚ Foyer                       ₱245K   │  ← muted, bottom border only
    └─────────────────────────────────────────┘

Strategy C (Typography-only)
┌─────────────────────────────────────────────┐
│ ▼ 📁 Lot A                      ₱5.2M       │  ← muted, 11px bold
└─────────────────────────────────────────────┘
  ┌───────────────────────────────────────────┐
  │ ▼ 📁 Main House                 ₱3.1M     │  ← muted, 11px bold
  └───────────────────────────────────────────┘
    ┌─────────────────────────────────────────┐
    │ ▼ ⬚ Foyer                       ₱245K   │  ← muted, 10px normal
    └─────────────────────────────────────────┘

Strategy D (Badge)
┌─────────────────────────────────────────────┐
│ ▼ 📁 Lot A             [GROUP]  ₱5.2M       │  ← muted, badge visible
└─────────────────────────────────────────────┘
    ┌─────────────────────────────────────────┐
    │ ▼ ⬚ Foyer            [AREA]   ₱245K     │  ← muted, badge visible
    └─────────────────────────────────────────┘
```

---

## Summary table

| Strategy | Scannability | Nesting resilience | Density impact | Accessibility | Implementation risk | Overall confidence |
|----------|-------------|-------------------|----------------|---------------|---------------------|-------------------|
| A — Background semantics | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Low | **High** |
| B — Border accent | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Very Low | Medium |
| C — Typography + connectors | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Low | Low |
| D — Badge + icon | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | Low | Low |
| **E — Hybrid (A + C)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Low | **Highest** |

**Scoring note:** ⭐ = poor / risky, ⭐⭐⭐⭐⭐ = excellent / safe.
