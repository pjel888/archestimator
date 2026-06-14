# Research & Benchmarking — Minimalist Project Cost Dashboards

**Date:** 2026-06-14
**Method:** Two external research passes (industry dashboards & IA; donut-chart appropriateness & activity-feed UX). Findings below are convergent across construction SaaS prior art, finance-dashboard literature, and accessibility sources. Full source list at the end.

---

## 1. The market gap (this is an opportunity, not a solved problem)

**No dominant construction tool has a well-designed single-project cost-first overview.** Concretely:

- **Procore** — the project *Home* shows tasks, schedule, contacts, weather. Cost is a separate Budget tool, one click away. Estimators must navigate away to see money. (A known Procore complaint.)
- **Buildertrend** — leads its *budget* screen with Projected Profit / Margin, but only inside a sub-tool; the estimate worksheet is separate, and totals surface only in a modal on "Send to Budget".
- **CoConstruct** — its dashboard is portfolio-level and schedule-first; single-project cost is inherited from portfolio widgets, not purpose-designed.
- **Knowify** (trade-contractor focus) — the **closest comparator**: its single-project view leads with profitability, WIP, and budget-vs-actual by category (labour / materials / equipment / subs). Matching Knowify's *information hierarchy* with a cleaner UI is a real competitive signal.

**Implication for Archestimator:** lead with cost on the project home. That alone differentiates against the incumbents, all of which bury it.

---

## 2. What information is *vital* vs *noise*

Industry convergence on the numbers that drive a single project's decisions:

**Vital (decision-triggering):**
- **Current estimate total** — the number the user opened the project to see. This is the hero.
- **Budget variance** (± amount and %) — "are we on track" — with a semantic colour pill (green/amber/red) reinforced by sign/arrow (never colour alone).
- **Margin %** — "is this job worth doing" (where margin data exists).
- **Cost mix / breakdown by category** — context for *why* the number is what it is.
- **Recent consequential changes** — estimate created/sent/approved, significant cost edits.

**Noise / vanity (observed being shown by incumbents, to avoid):**
- Weather widgets (Procore), client-login counts and job-log compliance (CoConstruct) — these measure *tool adoption*, not project health.
- **"Total estimates: 4"** as a co-equal headline stat — answers no decision.
- **Standalone "Currency: PHP" tile** — the `₱` glyph on the formatted figure already carries it.
- **"Last updated" as a dedicated stat tile** — duplicates the left panel's Updated field and the activity feed; freshness belongs in an eyebrow.
- Sparkline/radar/area "chart gallery" filler that animates but answers nothing.

> **Cross-domain anchor (ICU vital-signs panel):** show the 4–6 numbers that, if they deviate, demand action today — each with a normal-range band. Everything else is "charting history" and belongs behind a tab. The construction equivalent: estimate total, variance, margin, projected final cost.

---

## 3. Layout & hierarchy principles

1. **One hero number, 2–3× the visual weight of anything else** (Stripe / Baremetrics pattern). Contrast alone communicates hierarchy — no icons or colour needed. **Reject the equal-weight 4-up card grid**: it creates false equivalence and destroys the "single most important number" read. This is the #1 AI-slop failure mode for dashboards.
2. **A summary *band*, not a card grid**, gives the tightest density with clearest hierarchy: hero figure left, supporting figures + variance pill to its right.
3. **Progressive disclosure over tabs over separate screens:** (a) summary always visible → (b) cost breakdown visible on scroll, no click → (c) line-item detail behind expand → (d) version history / change log behind a tab.
4. **Cost breakdown belongs *below* the hero, not competing with it.** It's the "why", not the "what".
5. **Bullet chart** (Stephen Few) is the literature's preferred budget-vs-actual element — collapses budget, actual, and variance into one legend-free bar. A candidate for the variance affordance (vs. a second chart).
6. **Recent activity / versions are reference data → collapsed section or tab,** never a co-equal headline stat.

---

## 4. Donut chart for cost mix — when it's right, and how to do it honestly

The user asked for donut charts; the research says **donuts are acceptable but not the default** for cost breakdown. The honest position:

**Use a donut when** there are **3–5 named categories**, the story is part-to-whole ("what fraction is labour?"), and a **total figure sits in the centre** (the donut's one structural advantage over a pie). Archestimator already has exactly this component (`CostDonutChart`, centre total, Okabe–Ito palette).

**Prefer a ranked horizontal bar when** there are 6+ categories or the question is "which costs *more*" (bars share a baseline; arcs don't — bars win ranking tasks). **Use a treemap** for hierarchical categories.

**Donut rules (all already satisfied or cheap to satisfy in this codebase):**
- **Hard cap 5–6 visible segments**; fold anything under ~8–10% into a neutral-grey **"Other"** (the existing `collapseProjectChartBuckets(allBuckets, 8)` does this — consider tightening to ~5).
- **Centre text = total** (large/bold) + label below. `CostDonutChart` already renders a centre total.
- **Direct labels/callouts beat a standalone legend** (a legend forces two round-trips per category).
- **Okabe–Ito CVD-safe palette**, value/percent label on each segment as a second encoding channel (helps colour-blind users and 200% zoom). Already enforced via `colorForBucket`.
- **Mandatory data-table alternative** wired via `aria-describedby` — both DESIGN.md (lines 387-390) *and* WCAG 1.1.1 require it. SVG `<text>` does not reflow on zoom. **This is non-negotiable and is the single most important accessibility requirement of this plan.**

**Donut antipatterns to avoid:** 3D/exploded slices, >5–6 segments, legend-only (no direct labels), empty centre, rainbow/sequential palettes, side-by-side donuts for comparison (use grouped/stacked bars — and that's what Compare already does).

---

## 5. Recent-activity feed — UX patterns

**Show consequential state changes, not raw events.** Filter test: *would a PM act differently if they saw this?* If no, suppress.

- **Show:** estimate created/duplicated/deleted, status changes (Draft→Sent→Approved), significant cost edits (±threshold), line items added/removed, comments, collaborator invited/role-changed, export/PDF generated.
- **Suppress:** auto-saves, minor metadata, system-initiated syncs, repeated identical events (debounce/aggregate: "You and 2 others edited Materials").
- **Phrasing:** *actor → past-tense verb → object → optional context*, <~80 chars. "Sarah approved the Phase 2 estimate."
- **Timestamps:** relative under 7 days ("3 hours ago", "Yesterday"), absolute beyond ("12 Jun"); exact datetime on hover.
- **Grouping:** by day with sticky headers; reverse-chronological within day.
- **Density:** 5–7 (max 8) rows in a dashboard card → "View all activity" link to a full log page when more exist. Don't put filter/search in the card.
- **Empty states (design all three):** (a) no estimates yet → CTA; (b) data exists but quiet → "No activity in the last 7 days"; (c) filtered → "No activity matches these filters". Never a blank box.
- **Architectural separation:** the dashboard feed is **curated & human-readable** (~10% of events). The full **audit log** is a separate page/record. Mixing them yields "too noisy to use, too incomplete to audit." Keep them separate even if they share event storage.

---

## 6. How the research maps to the chosen design

| Research recommendation | Where it lands in the plan |
|-------------------------|----------------------------|
| One hero number, reject 4-up grid | Zone A: single primary `FinancialTotalCard` + quiet meta line (`02`, `03/U5`) |
| Cost mix below hero, ≤5 segments, centre total | Zone B donut, `collapseProjectChartBuckets` → top-5 (`03/U6`) |
| Mandatory chart data table | `BreakdownTable` via `aria-describedby` (`03/U6`) — hard requirement |
| Activity = curated, ≤8, separate from audit log | Zone D, flagged, `LIMIT 8`, no cursor v1 (`03/U10-U11`) |
| Honest budget/variance, colour + non-colour cue | Variance pill reusing `ProjectTotalHeader` health logic (`03/U5`) |
| Don't sum mixed currencies | Single-currency guard on any rollup (`03` KTD-4) |
| Bullet chart for variance | Noted as an option in Open Questions (`03`) |

---

## 7. Sources

**Dashboards & IA**
- Procore Project Home — https://support.procore.com/products/online/user-guide/project-level/home/tutorials/about-the-project-home-page
- Buildertrend Job Costing Budget Overview — https://buildertrend.com/help-article/job-costing-budget-overview/
- Buildertrend Estimate Overview — https://buildertrend.com/help-article/estimate-overview/
- CoConstruct Performance Dashboard — https://www.coconstruct.com/learn-construction-software/performance-view-overview
- Knowify Job Costing — https://knowify.com/job-costing-software/
- 35 SaaS Dashboard Design Examples (2026) — https://www.925studios.co/blog/saas-dashboard-design-examples-2026
- Design Thoughtful Dashboards for B2B SaaS (UX Collective) — https://uxdesign.cc/design-thoughtful-dashboards-for-b2b-saas-ff484385960d
- F9 Finance Dashboard Best Practices — https://www.f9finance.com/dashboard-design-best-practices/
- Construction Dashboards: A PM's Guide (K38) — https://www.k38consulting.com/construction-dashboards/
- SaaS Dashboard UX Patterns 2026 — https://www.gitnexa.com/blogs/saas-dashboard-ux-patterns

**Donut charts & accessibility**
- "Are pie charts evil?" (Hill 2025, SagePub) — https://journals.sagepub.com/doi/10.1177/14738716241259432
- Donut vs Pie Chart (AFFiNE) — https://affine.pro/blog/donut-chart-vs-pie-chart
- PatternFly Donut Chart guidance — https://pf3.patternfly.org/v3/pattern-library/data-visualization/donut-chart/
- Accessibility Standards Empower Better Chart Design (Smashing, 2024) — https://www.smashingmagazine.com/2024/02/accessibility-standards-empower-better-chart-visual-design/
- Okabe–Ito palette reference — https://conceptviz.app/blog/okabe-ito-palette-hex-codes-complete-reference
- Colour-blind data viz (Datylon) — https://www.datylon.com/blog/data-visualization-for-colorblind-readers

**Activity feeds**
- Activity Feed Design Guide (GetStream) — https://getstream.io/blog/activity-feed-design/
- Activity Feed Pattern (UXPatterns.dev) — https://uxpatterns.dev/patterns/social/activity-feed
- Benefits of Activity Feeds in B2B (Knock) — https://knock.app/blog/the-benefits-of-adding-an-activity-feed-to-your-product
- What is an Activity Feed (SuprSend) — https://www.suprsend.com/post/activity-feed
