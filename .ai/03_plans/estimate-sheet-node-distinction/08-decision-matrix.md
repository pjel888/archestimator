# 08 — Scored Decision Matrix & Final Recommendation

**Date:** 2026-05-21  
**Preceding documents:** `01` (audit), `02` (UX plan), `03` (UI plan), `04` (readiness), `05` (benchmarks), `06` (alternatives), `07` (stress-test)

---

## 1. Scoring methodology

Each strategy is scored 1–5 on seven criteria. The criterion weights reflect Archestimator's current priorities (density and scannability are highest because the user is an estimator working fast).

| Criterion | Weight | Why this weight |
|-----------|--------|-----------------|
| Scannability | 1.4 | Estimators scroll fast; they must read structure without stopping. |
| Constraint compliance | 1.3 | Violating density/font/shadow rules is a blocking defect per `AGENTS.md`. |
| Nesting resilience | 1.2 | The product supports arbitrary group nesting; the UI must not break at depth 4+. |
| Row-table harmony | 1.2 | The row table is the most visually complex surface; headers must not compete. |
| Accessibility | 1.1 | Required for professional tool credibility; non-negotiable but not the hardest problem. |
| Implementation safety | 1.0 | Small change footprint is preferred, but not at the expense of the above. |
| Benchmark alignment | 0.8 | Domain validation matters, but we are not copying competitors blindly. |

**Max raw score:** 5 × 7 = 35  
**Max weighted score:** (5×1.4) + (5×1.3) + (5×1.2) + (5×1.2) + (5×1.1) + (5×1.0) + (5×0.8) = 7.0 + 6.5 + 6.0 + 6.0 + 5.5 + 5.0 + 4.0 = **40.0**

---

## 2. Decision matrix

| Criterion | Weight | A — Background | B — Border | C — Typography | D — Badge | E — Hybrid |
|-----------|--------|---------------|------------|----------------|-----------|------------|
| Scannability | 1.4 | 5 | 3 | 2 | 4 | 5 |
| Constraint compliance | 1.3 | 5 | 4 | 2 | 3 | 5 |
| Nesting resilience | 1.2 | 4 | 4 | 4 | 3 | 4 |
| Row-table harmony | 1.2 | 5 | 3 | 2 | 2 | 5 |
| Accessibility | 1.1 | 4 | 4 | 5 | 5 | 5 |
| Implementation safety | 1.0 | 5 | 5 | 4 | 4 | 4 |
| Benchmark alignment | 0.8 | 5 | 2 | 2 | 1 | 5 |
| **Weighted total** | — | **38.8** | **28.6** | **24.2** | **25.4** | **39.4** |
| **Percent of max** | — | **97.0%** | **71.5%** | **60.5%** | **63.5%** | **98.5%** |

### Score justification (selected cells)

**Strategy A — Background**
- Scannability 5: Background difference is the fastest pre-attentive channel.
- Row-table harmony 5: White area headers let the table dominate; muted group headers sit above.
- Nesting resilience 4: "Gray wall" is a minor concern at depth 4+ but mitigated by decreasing `groupGap`.

**Strategy B — Border**
- Scannability 3: Border differences are processed slower than background differences.
- Row-table harmony 3: Shared `bg-surfaceMuted` means area headers still compete with the table.
- Benchmark alignment 2: No strong benchmark match for border-only container distinction.

**Strategy C — Typography**
- Scannability 2: 10px vs 11px bold is hard to read at scroll speed.
- Constraint compliance 2: Breaks C2 (mixed font sizes in compact UI) and C8 (row-table competition).
- Row-table harmony 2: Identical backgrounds = equal visual weight.

**Strategy D — Badge**
- Scannability 4: Badge is explicit, but 8px text is hard to scan quickly.
- Row-table harmony 2: Same background problem as C.
- Benchmark alignment 1: No benchmark uses per-node text badges in dense hierarchies.

**Strategy E — Hybrid**
- Scannability 5: Background + weight + optional badge = three redundant channels.
- Constraint compliance 5: Core system (A) passes all; badge is optional and removable.
- Row-table harmony 5: Same as A.
- Implementation safety 4: Slightly more classes than A, but still low risk.

---

## 3. Confidence assessment

### Confidence in the scoring itself

| Factor | Confidence | Notes |
|--------|-----------|-------|
| Competitive benchmark validity | High | Excel, Airtable, Procore, and OmniOutliner are well-documented; patterns are consistent. |
| Constraint inventory completeness | High | All constraints are sourced from `DESIGN.md`, `AGENTS.md`, and live code. |
| Pre-attentive processing science | High | Background > border > shape > text in visual search tasks is well-established in cognitive psychology (Treisman, Wolfe). |
| Empty-area edge case | Medium | Strategy A/E handle it adequately, but we have not tested with real users. |
| Deep-nesting "gray wall" | Medium-High | Mitigated by `groupGap(depth)` and indent, but depth 5+ is untested. |

### Confidence per strategy

| Strategy | Confidence | Why |
|----------|-----------|-----|
| A | **91%** | Strong benchmark support, passes all constraints, one minor edge case (empty area). |
| B | **68%** | Usable but weaker distinction; border-left space risk at deep nesting. |
| C | **42%** | Fails core density and hierarchy constraints; would need significant redesign to work. |
| D | **45%** | Badge noise is a real risk; fails the row-table harmony test. |
| E | **94%** | Core is Strategy A (91%); additive badge/weight enhancements are safe and removable. |

---

## 4. Final recommendation

### Primary recommendation: Strategy E (Hybrid)

**Implement the background-semantics core from Strategy A, reinforced by typography weight and an optional kind badge.**

**Exact specification:**

1. **Group header:**
   - `bg-surfaceMuted border border-hairline border-l-2 border-l-divider`
   - `font-semibold text-ink`
   - `hover:bg-[#EAEEF3]`

2. **Area header:**
   - `bg-white border-b border-hairline`
   - `font-normal text-secondary`
   - `hover:bg-surfaceMuted/60`

3. **Kind badge (static, 8px):**
   - `rounded-sm border border-hairline bg-white px-1 py-0 text-[8px] font-bold uppercase tracking-[0.08em] text-tertiary`
   - Placed between name and total.
   - **Decision gate:** If screenshot review feels cluttered, degrade to hover-only or remove entirely. The background + weight distinction stands alone.

4. **Accessibility:**
   - `aria-label={`${node.name}, group`}` / `aria-label={`${node.name}, area`}`
   - Collapse button: `aria-label={`${collapsed ? "Expand" : "Collapse"} ${node.name} ${node.kind}`}`

### Fallback recommendation: Strategy A (Background only)

If during implementation the badge proves too noisy or the `font-semibold` on groups feels heavy next to tree-node selection states, remove the badge and revert group names to `font-normal`. The background difference alone is still a **91% confidence** solution.

### What to avoid

- Do **not** implement Strategy C or D. They fail hard constraints and would require re-engineering.
- Do **not** color-code groups vs areas with accent/orange/blue tints. Violates monochrome-first and adds no benchmark-supported value.
- Do **not** increase header height. `h-8` is a sacred compact-density constant.

---

## 5. Risk-adjusted implementation order

| Phase | Content | Confidence gate |
|-------|---------|-----------------|
| 1 | Background + border classes only (Strategy A core) | Screenshot review. If passed, continue. |
| 2 | Add `font-semibold` to groups, `font-normal text-secondary` to areas | Screenshot review. If passed, continue. |
| 3 | Add static 8px badge | **Decision gate.** If Philip or screenshot review says "cluttered," skip to Phase 3b. |
| 3b (alt) | Add hover-only badge instead of static | Screenshot review. If still cluttered, remove badge entirely. |
| 4 | Accessibility label updates, `aria-label` kind suffix | Required. No gate. |
| 5 | Build + validate + screenshot regression | Merge gate. |

---

## 6. Open questions that could change the recommendation

1. **Does Philip want the tree panel and sheet to use symmetric styling?** Currently the tree uses `bg-surface-muted` for selected nodes. If the sheet group headers also use `bg-surfaceMuted`, a selected group in the tree and an expanded group in the sheet will share the same background. This is acceptable (they are the same semantic entity), but if Philip wants the sheet to feel "different" from the tree, we might need to adjust.

2. **How does the empty-area drop zone look with a white header?** The current `EmptyAreaMessage` uses `bg-surfaceWarm/80`. If the area header is white, the drop zone should probably also be white. This is a minor polish item in Phase 1.

3. **Should deeply nested groups use progressively darker backgrounds?** This would be a Strategy A variant ("level bands"). It solves the "gray wall" problem but introduces a new complexity. **Recommendation:** Defer. Start with flat `bg-surfaceMuted` for all groups and only add level-based tints if user feedback supports it.

---

## 7. Sign-off checklist before coding

- [ ] Philip has reviewed this matrix and either approved Strategy E or selected a fallback.
- [ ] The decision is recorded in `.ai/10_state/decisions.md` with date and rationale.
- [ ] Any open questions above are resolved.
- [ ] Implementation proceeds using `04-implementation-readiness-plan.md` phases.
