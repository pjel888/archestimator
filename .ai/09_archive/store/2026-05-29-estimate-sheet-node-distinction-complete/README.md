# Estimate Sheet Group / Area Node Visual Distinction

**Date:** 2026-05-21
**Status:** Partially implemented, partially superseded by the 2026-05-25 Activity History modal correction
**Scope:** Group/Area/row hierarchy semantics in `EstimateSheetContent`; center-sheet visual distinction remains relevant, while activity-history UX now belongs to the unified modal
**Companion spec:** `.ai/06_specs/current-project-estimates-component-library-spec.md`
**Companion plan:** `.ai/03_plans/project-estimates-component-library-improvement-plan.md`

---

## Goal

Create subtle but unambiguous visual distinction between **Group Nodes** (organizational containers that may nest other groups and areas) and **Area Nodes** (leaf workspaces that own estimate row items) inside the center estimate sheet, while preserving the existing dense, compact, architectural UI character.

This plan now also covers:
- **Node codes:** Auto-generated hierarchical position codes (e.g., `01`, `01.01`) displayed in every header, with a path for future user-defined persistence.
- **Area breadcrumbs:** Subtle ancestor path trails below area headers (e.g., `Lot A › Main House › Ground Floor`).
- **Activity scope tree semantics:** The same Group Node / Area Node / row-item distinction is reused in the unified Activity History modal's left tree.

The distinction must survive deep nesting, limited horizontal space, and the visual weight of the row-item table that already exists under Area Nodes.

## Current correction

The previous folder scope did not cover Activity History. As of 2026-05-25, estimate activity must use one `Activity History` modal with a left scope tree that includes the whole sheet, all Group Nodes, all Area Nodes, and all row items. The old separate right-slideout `Node Activity` and row `Version History` surfaces are no longer the supported UX. Row-originated controls now open `Row item details`, where Details, Component, and Activity are tabs for the selected row.

## Non-goals

- Do not redesign the persistent left estimate tree panel (`EstimateSheetTree`) as part of this plan; the Activity History modal owns its own scoped activity tree.
- Do not change the node data model, hierarchy rules, or drag-and-drop behavior.
- Do not add new animations, transitions, or motion beyond the existing micro-interaction baseline.
- Do not introduce new colors outside the existing design-token palette.
- Do not increase font sizes beyond the 12px app maximum.
- Do not change the row-item table structure or column layout.

## Affected files (implementation)

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/estimate-tree-data.ts` (type update for `code` field)
- `src/lib/repositories/workspace-repository.ts` (future: include `code` in tree build)
- `src/app/globals.css` (if new theme tokens are required)
- `supabase/migrations/` (future: add `code` column to `estimate_nodes`)
- `tests/vitest/estimate-tree-data.test.ts` (visual regression guard, if applicable)

## Document index

| # | Document | Purpose |
|---|----------|---------|
| 01 | `01-current-state-audit.md` | Exact inventory of how group vs area nodes are rendered today, with code references and constraint mapping. |
| 02 | `02-ux-plan.md` | User mental model, hierarchy readability needs, interaction design, and accessibility requirements for the distinction. |
| 03 | `03-ui-plan.md` | Token-level visual design: color, typography, spacing, borders, backgrounds, icons, and the precise Tailwind-class prescription. |
| 04 | `04-implementation-readiness-plan.md` | Phased implementation order, acceptance criteria, test plan, risk matrix, and definition of done. |
| 05 | `05-competitive-benchmark-study.md` | How Excel, Airtable, OmniOutliner, Notion, and Procore/Buildertrend handle container vs leaf distinction. |
| 06 | `06-alternative-strategies-comparison.md` | Four genuinely distinct visual strategies (Background, Border, Typography, Badge) plus a Hybrid, with honest trade-offs. |
| 07 | `07-constraint-stress-test.md` | Every strategy tested against 12 hard constraints + 3 edge-case scenarios (empty area, deep nesting, large row set). |
| 08 | `08-decision-matrix.md` | Weighted scored matrix (1–5 × 7 criteria), confidence assessment per strategy, and final recommendation with fallback. |
| 09 | `09-user-journey-and-task-flows.md` | Persona-driven task decomposition: morning structure build, midday pricing, afternoon review, client meeting. |
| 10 | `10-north-star-vision.md` | 12-month vision for the estimate sheet: presentation mode, keyboard parity, export, templates, progressive disclosure. |
| 11 | `11-happy-paths-and-edge-cases.md` | Exhaustive scenario mapping: 4 happy paths, 10 edge cases, 4 failure modes, with mitigations and decision log. |
| 12 | `12-gaps-and-improvement-opportunities.md` | 10 gaps identified, 5 improvement opportunities, revised Phase A scope, and deferral list. |

## Key constraints (read before any implementation)

1. **Compact density:** App text is 10px, labels 8–9px, titles max 12px.
2. **Monochrome-first, orange-accent-second:** No neon, no heavy gradients, no decorative color.
3. **Border-heavy, shadow-light:** Use hairline borders and background bands for separation.
4. **Nested indentation:** 32px per depth level, capped at 192px.
5. **Row table visual weight:** The `EstimateRowItemsTable` is already a dense grid with tall material cells (`min-h-24`), blue left-accent borders, and sticky headers. Group Node headers must not compete with this weight.
6. **Precision over play:** The product should feel architectural and technical, not toy-like.
