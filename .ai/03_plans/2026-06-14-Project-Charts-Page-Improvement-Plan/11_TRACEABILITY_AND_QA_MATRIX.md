# 11 — Traceability & QA Matrix

Finding → task → test → acceptance, plus adversarial QA scenarios and rollback
gates. Nothing in this pack is "done" until its row here is green with evidence.

---

## Finding → task → evidence matrix

| Finding | Doc | Task(s) | Test / evidence | Acceptance (`07`) |
|---|---|---|---|---|
| **C1** comparison engine dead | 03 | P-1.1, P0.2, P0.3 | view-model contract test; insight + variance render tests | J (time-to-insight < 10 s); B |
| **C2** donut/bubble worst encoding | 03,04 | P0.3, P1.1, P1.4 | variance/composition render; bubble deletion + d3-hierarchy absent | bundle check; D |
| **C3** color rank-indexed / not CVD / sole link | 03,06 | P-1.2, P0.5, P3.3 | stable-color unit test; grayscale chart↔table test; CVD assertion | H (CVD-safe, redundant) |
| **H1/H9** raw facts shipped / aggregate in JS | 01,02 | P2.1, P2.3, P2.4 | payload contract test; golden-master | A (< 50 KB); F |
| **H2** per-row Map O(rows×nodes) | 01 | P0.9 (interim), P2.1 | aggregation-time bench; unit guard | B (≥ 100×) |
| **H3** full recompute on interaction | 01 | P2.3 (server buckets) | INP bench on Group By | C (< 200 ms) |
| **H4** micro-typography / 700 weight | 03,06 | P0.4, P3.1 | type-scale assertion; DESIGN.md amendment | H; D-7 landed |
| **H5** no title / IA / entry point | 03 | P0.1, P0.6 | header band render test | J |
| **H6** 220 px columns / reflow fail | 03,06 | P3.6, P0.7 | 320 px reflow check | G (no h-scroll) |
| **H7** contrast (muted/connector/fill) | 06 | P3.2, P1.4 (fill mooted) | contrast assertions | H (≥ 4.5:1 / 3:1) |
| **H8** bubble a11y / no h1 / img-role | 06 | P1.4, P3.3, P3.4 | Storybook a11y; SR walk; heading order | I |
| **M1** bare auth.uid() | 02 | P2.6 | EXPLAIN before/after; advisor | E (InitPlan; lint clear) |
| **M2** unordered LIMIT truncation | 02 | P2.5 | deterministic-order test; banner | F; banner shows on `didHitLimit` |
| **M3** no loading.tsx / thin states | 01,03 | P0.7, P0.8 | skeleton-shape test | D (CLS < 0.1) |
| **M4** threadbare motion / no cross-highlight | 03 | P1.6 | activeBucketId highlight test; Playwright hover/focus artifact | I/K |
| **M5** per-row cost over-fetch | 05 | P2.3, P2.4 | payload contract test | A |
| **M6** no /workshop headers | 05 | P4.1 (ref) | cross-cutting ticket linked | referenced |
| **M7** roving tabindex / focus restore / touch | 06 | P3.5, P3.7 | keyboard walk; target-size check | I |
| **M8** charts freshness after shared mutations | 13 | P2.8 | component-library/category/supplier invalidation regression | cache/tag/revalidation proof |
| **M9** AI Ask projectCharts downstream contract | 13 | P-1.9, P2.9 | `ai-ask-read-context` + route prompt tests | compact buckets, no raw facts |
| **L1** microcopy | 03 | P0.6 | copy snapshot | manual |
| **L2** reduced-motion | 06 | P3.7 | prefers-reduced-motion test | I |
| **D-10** donut shared with /share | 08,10 | P1.3 | share tests + screenshot diff | share path pixel-stable |
| **D-14** shared UI primitives / control alignment | 10,13 | P0.6, P1.7 | `bun run lint:design-system`; source review; Storybook screenshots | no route-local control primitives; aligned rows |
| **D-15** data-viz palette exception | 10,13 | P3.1, P1.7 | DESIGN.md amendment or token note; visual/source review | chart hues only in marks/legends/tables |
| **D-17** navigation reframe | 10,13 | P0.10 | dashboard/sidebar test update | user-facing label/icon match cost comparison |
| **R-2/R-6** executable payload + visual proof | 13 | P2.4, P3.8 | HAR/payload artifact; Storybook a11y; Playwright screenshots | artifacts attached, not prose-only proof |

---

## Adversarial QA scenarios (must all pass before merge)

1. **Single estimate:** page shows composition + optional donut, comparison controls
   hidden, no broken "compare" copy. (`08` single-estimate state, `03` UX-6)
2. **Two estimates, identical totals:** insight reads "≈ equal / no material
   difference," not "0% lower"; variance bars near-zero render cleanly.
3. **`deltaPercent` null (baseline bucket = 0, comparand > 0):** renders "new", never
   "∞%"/"100%". (`03` UX-10, P-1.3)
4. **Bucket present in one estimate only:** appears in variance + table with the
   missing side shown as 0/—, color stable.
5. **All rows "Unassigned space" (no area ancestor):** single bucket, no crash;
   golden-master covers it. (`02` DB-4 walk semantics)
6. **Supplier with legacy text-only `supplier` (no `source_snapshot.supplierId`):**
   buckets via fallback identically client and RPC. (P2.2)
7. **Truncation (large fixture > 5000 rows):** banner shows "totals incomplete";
   after P2 the RPC aggregates the full set and the banner clears. (`02` DB-6)
8. **Group By toggle on the large fixture, 3 estimates:** INP < 200 ms, no jank.
   (C)
9. **Colorblind render (deuter/protan/tritan sim):** every adjacent bucket
   distinguishable; chart↔table mapping survives grayscale. (H)
10. **320 px / 400% zoom:** no horizontal page scroll; columns stacked; controls
    reachable. (G)
11. **Keyboard-only:** Tab reaches every control in a sane order; no 36-stop slice
    trap; focus not lost on estimate change. (I, `06` A11Y-8/9)
12. **Screen reader:** the detail table is announced as the chart's alternative;
    h1→h2 order correct. (I)
13. **/share/[token] donut unchanged:** Playwright/visual artifact remains
    pixel-stable against the accepted baseline after P1.3. (D-10)
14. **RLS denial:** a viewer-role user on a project they lack access to gets
    `notFound()`, not a partial render. (`05` SAFE-1)
15. **Component-library mutation freshness:** a category/supplier/library mutation
    that affects existing chart buckets cannot leave a stale charts route. (P2.8)
16. **AI Ask compact chart context:** AI Ask receives bucket-level chart context after
    P2 and never receives raw row/node/category/supplier arrays. (P2.9)
17. **Navigation reframe:** sidebar/dashboard label no longer says "Charts" with a
    pie icon. (P0.10)
18. **Primitive/alignment guard:** baseline selector, estimate chips, and view toggle
    keep aligned labels/control heights/helper rows in the Storybook matrix. (P0.6)

---

## Rollback gates

| Phase | Backout | Safe-revert evidence |
|---|---|---|
| P0 | revert view layer → independent-donut grid returns | donut component kept importable |
| P1 | revert per component; bubble deletion is the only destructive step (recoverable via git) | share tests green |
| P2 | revert repository swap → JS aggregation path (kept until golden-master proven); RPC + RLS migrations independently revertible | golden-master green before cutover; deploy probes RPC, fails open on partial drift (per add-new-tab deploy lesson) |
| P3 | token + a11y edits are additive; revert per token | contrast assertions |
| P4 | reference-only | n/a |

---

## Final verification wave

Run the smallest useful subset per phase, then the whole wave before merge:

| Claim | Command / artifact | Pass condition |
|---|---|---|
| Type and design-system contracts | `bun run type-check`; `bun run lint:design-system` | both pass; no new route-local control primitives |
| Core chart contract | `bun x vitest run tests/vitest/project-charts-aggregation.test.ts tests/vitest/project-charts-ui.test.tsx tests/vitest/project-dashboard-charts-ui.test.ts tests/vitest/share/cost-donut-chart-hydration.test.tsx --maxWorkers=1` | comparison view, stale-test inversions, nav rename, and share guardrails green |
| AI Ask downstream contract | `bun x vitest run tests/vitest/ai-ask-read-context.test.ts tests/vitest/ai-ask-route.test.ts --maxWorkers=1` | compact chart context preserved; no raw fact arrays |
| Visual/a11y harness | `bun run storybook:validate`; focused Playwright spec such as `bun run test:e2e -- e2e/project-charts-visual.spec.ts --project=chromium` once added | Storybook builds; addon-a11y serious/critical clean; screenshots saved |
| Payload proof | Playwright HAR/Flight artifact saved under `.ai/05_logs/<YYYY-MM-DD>-project-charts-payload/` | large fixture payload `< 50 KB`; raw fact keys absent |
| Large fixture perf | `bun run perf:seed-fixture` or the project-charts fixture script, then focused payload/INP checks | fixture row counts recorded; INP and payload thresholds met |
| Live DB / RLS proof | linked Supabase EXPLAIN/advisor artifacts for project `ebxxqidacheyapmmzavr` only | RPC equivalent; `(select auth.uid())` InitPlan warning cleared for touched helpers |
| Build readiness | `bun run build` | build passes after the focused wave |

Do not claim live DB, provider, Storybook, or browser proof unless the named
artifact exists.

---

## Definition of done (whole pack)

- All matrix rows green with the named evidence artifact attached to the phase PR.
- All 18 adversarial scenarios pass.
- Measured deltas (`07` A–J) recorded baseline→after in each phase PR.
- Golden-master green; live-DB verification queries (`02`) run and captured.
- Targeted vitest suites, typecheck, design-system lint, Storybook validation,
  focused Playwright visual/payload proof, and build are green; share page
  screenshot-stable.
- DESIGN.md data-viz amendment (D-7) landed.
- Cache freshness and AI Ask downstream contracts are covered.

---

## Quality posture

Every original and second-pass finding now traces to a task, test, or evidence
artifact. The final wave names the commands/artifacts that must exist before the
implementation can claim completion, with local proof kept separate from provider
proof.
