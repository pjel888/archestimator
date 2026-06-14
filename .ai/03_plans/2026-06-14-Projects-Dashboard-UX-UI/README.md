# Project Dashboard — UX/UI Audit & Plan Pack

**Date:** 2026-06-14
**Surface:** `http://localhost:3000/workshop/projects/{projectId}` — the project **Dashboard** tab
**Type:** Planning / readiness / audit only. **No code was written.**
**Effort:** ultracode — 6 parallel codebase readers + 2 external researchers → 3 route-compared design directions → 2 adversarial critics + a judge panel (14 agents, ~730k tokens), then synthesized by hand.

---

## TL;DR

The dashboard's `<main>` area is wasted on empty-state guidance even when a project has estimates worth millions. The cost data, a CVD-safe donut, the financial-card primitive, and the colour/format system **already exist** — the only thing missing is a surface that composes them at the project's entry route. The plan turns `<main>` into a minimalist **"Honest Hero"** overview:

- **One hero figure** — the most-recently-updated estimate's total + a budget-variance pill (not a 4-up stat grid).
- **A cost-mix donut** (≤5 segments + Other, centre total) **always paired with an accessible breakdown table** (`aria-describedby`).
- **A lean list** of the project's other estimates with one-click "open" / "compare" deep-links.
- **A feature-flagged recent-activity strip** (≤8 curated rows) that ships *after* cost, because it needs new event instrumentation.

**Cost ships first (free data); activity ships second (behind a flag).**

---

## The decision in one paragraph

Three directions were generated and scored. The judge picked **D1 (KPI-First Minimal)** for minimalism + feasibility, but the two adversarial critics **disagreed**: the feasibility skeptic validated D1's cost-first risk-sequencing while the minimalism critic rejected D1's four equal-weight cards as AI-slop and flagged a missing chart data table — favouring **D2's single-hero hierarchy**. The chosen design, **"Honest Hero,"** takes **D1's skeleton + D2's hierarchy** and resolves every blocker: one dominant number (not a grid), a mandatory donut data-table, a dedicated single-estimate query (the assumed `getProjectChartsData` wrapper provably over-fetches), an honestly-labelled "most recently updated" anchor (no `is_primary` flag exists), a single-currency guard (currency is per-estimate), and flag-gated activity (no `project_id` on `estimate_sheet_events`, project edits unaudited today).

---

## How to read this pack

| File | What it covers |
|------|----------------|
| **`00-current-state-audit.md`** | What actually renders today (it's not literally empty), the reuse inventory with file/line evidence, and the 10 hard constraints the plan must respect. |
| **`01-research-and-benchmarking.md`** | External research: the market gap (no incumbent does cost-first project home well), vital-vs-noise information, donut appropriateness rules, and activity-feed UX — with sources. |
| **`02-design-directions-and-decision.md`** | The 3 route-compared directions, the scorecard, the two-critic disagreement, and the chosen "Honest Hero" design with an ASCII layout. |
| **`03-implementation-plan.md`** | The implementation-ready plan: requirements (R1–R14), key technical decisions (KTD-1–8), Mermaid data-flow/decision diagrams, 11 implementation units (U1–U11) with files + test scenarios, phased delivery, risks, scope boundaries, and open questions. |

**Start with `03` if you just want to build it.** Read `00`→`02` for the why.

---

## What ships, in order

- **Phase 0 (design system):** extract shared `SegmentedControl`; add `SectionHeading` + a relative-time util. *(U1–U2)*
- **Phase 1 (cost-first, shippable on its own):** single-estimate cost query → dashboard summary assembly → Zone A headline, Zone B donut+table, Zone C estimate list → compose into `<main>` with skeletons + the unchanged empty state. *(U3–U8)*
- **Phase 2 (activity, flagged):** instrument project-metadata events → `composeCollaborationActivity` + project-activity query → `ProjectActivityList` UI behind a flag. *(U9–U11)*
- **Deferred:** `is_primary` column, `estimate_sheet_events.project_id` denormalization, locale parameterization, full activity log + cursor pagination, fleet KPIs, bullet-chart variance. *(see `03` Scope Boundaries)*

---

## Honest assessment of this plan's confidence

- **Cost half — high confidence.** Every data source was verified by file/line; the only new backend is one well-scoped query. The feasibility skeptic confirmed it is "genuinely free."
- **Activity half — medium confidence.** The gaps are real and named (no `project_id`, unaudited project edits, no collaboration composer, no actor→name resolver confirmed). It is correctly flag-gated so it cannot block the valuable cost work. Three integration assumptions (Compare URL params, actor-name resolver, feature-flag mechanism) must be confirmed during implementation — they are listed as dependencies, not hand-waved.
- **Design — high confidence, adversarially earned.** The chosen design exists *because* two critics attacked the obvious winner and forced the blockers into the open. The biggest residual risk is donut callout legibility at the real cell width (U6), which the mandatory data table mitigates regardless.

---

## Provenance

Generated via the `ce-plan` workflow under ultracode. Raw multi-agent output (audits, directions, verdicts, judge synthesis) was captured during the session; this pack is the hand-synthesized, deduplicated result aligned to `DESIGN.md` and the `.ai/` framework. Reuse claims and gaps carry file/line citations so an implementer can verify before building.
