# Project Charts Page — UX/UI, Performance & Correctness Overhaul

This folder is the plan pack for rebuilding
`/workshop/projects/[projectId]/charts` from "three pretty pies" into a
**cost-comparison analytics surface** that does its one job.

Start here, in order:

1. `00_INDEX.md` — executive summary, the single most important finding, prioritized findings, document map.
2. `12_PREIMPLEMENTATION_REVIEW_AND_REPAIR.md` — adversarial review + the entry gate that must pass before code.
3. `13_SECOND_PASS_GAP_AUDIT.md` — extra codebase angles added after deeper inspection: stale tests, payload proof, cache freshness, AI Ask, shared primitives, visual QA.
4. `08_REDESIGN_NORTH_STAR_AND_DESIGN_SPEC.md` — the target design (IA, layout, type scale, palette, components).
5. `09_IMPLEMENTATION_PLAN.md` — phased, TDD-gated task plan.
6. `11_TRACEABILITY_AND_QA_MATRIX.md` — finding → task → evidence → acceptance.
7. `07_MEASUREMENT_METHODOLOGY.md` — how every claim is measured before/after.

**Current status:** Implementation-ready **after** the P-1 data-contract entry
gate in `09_IMPLEMENTATION_PLAN.md` is green and the second-pass repair gates in
`13_SECOND_PASS_GAP_AUDIT.md` are represented in tests/evidence. The diagnosis
is verified against the live code (file:line throughout) and strengthened by
audit lanes across performance, database, UX/visual design, data-viz research,
infosec, accessibility, downstream AI context, cache freshness, and visual QA.
No product code was changed during planning.

**The one-sentence version:** the page already contains a complete comparison
engine (`buildProjectChartComparison`, delta/variance, sorted by magnitude) that
is wired to **nothing** — fixing this page is mostly a matter of *using the
engine that already exists*, swapping the two worst chart encodings for
position-based bars, doing the aggregation on the server instead of shipping
~1.3–1.6 MB of raw rows to the browser, and lifting the data off the 8 px floor.

---

**Quality posture:** high confidence after gates, not a promise of bug-free
implementation. The pack routes the reader to the right document in the right
order, states the status accurately, and turns the user's "bug-free" goal into
executable prevention gates: stale-test inversion, runtime payload proof,
cache/AI Ask contracts, visual artifacts, and provider evidence boundaries.
