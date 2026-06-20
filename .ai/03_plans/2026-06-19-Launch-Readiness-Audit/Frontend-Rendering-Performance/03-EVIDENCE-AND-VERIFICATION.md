# Frontend Rendering Performance — Evidence & Verification (2026-06-19)

Adversarial re-verification of `01-AUDIT-FINDINGS.md`. Each finding was checked
by opening the cited file at the cited lines and trying to **refute** it.
First-hand commands re-run this pass:

- `bun run lint` → **6 errors, 16 warnings** (reproduced).
  - 3 errors: `.gitnexus/run.cjs:29-31` (`no-require-imports`) — **tooling, not
    app source** → excluded from the source-domain count.
  - 2 errors: `useLiquidGlassRefraction.ts:118` (refs-during-render) + `:122`
    (set-state-in-effect, the `setTransform({})` inside the effect) → **FE-PERF-01**.
  - 1 error: `projects-page-client.tsx:691` (set-state-in-effect) → **FE-PERF-02**.
  - Net **source-domain errors: 3** — matches the audit's correction of "early
    signal (d)".
- `bun run test:dom tests/vitest/perf` → **24/24 passed**, 7 files, 12.22s.
  Memoization guards hold on `main`.
- `rg "useGlassElasticity" src` → **definition only, zero callers** (dead code
  confirmed).
- "charts set-state-in-effect" claim from the brief: **refuted** — `rg useEffect`
  over `src/components/charts/` and `src/components/workshop/project-charts/`
  returns nothing. The real red is in `projects-page-client.tsx`, exactly as the
  prior auditor re-attributed.

---

## Verdict table

| ID | Verdict | Severity | Blocker | Evidence (re-checked) |
|----|---------|----------|---------|------------------------|
| FE-PERF-01 | **confirmed** | medium | no | `useLiquidGlassRefraction.ts:118` ref write in render body; `:146` `setTransform({...})` per rAF frame; effect-body `setTransform({})` at `:122`/`:129`/`:184`. Zero callers. 2 of 3 source lint errors. |
| FE-PERF-02 | **adjusted** (lines only) | low | no | Real location is `:690-692`, **not** `:584-587` (file modified post-audit). Latch is monotonic/guarded — benign one extra render on first delete. 1 source lint error. Severity/scope unchanged; only the citation was stale. |
| FE-PERF-03 | **confirmed** | medium | no | `ShareEstimateTreeView.tsx:93` maps every `node.rows` to a DOM row; no `content-visibility`/`contain-intrinsic-size`; `:254` auto-expands first 2 levels (desktop); `:278` recreates `renderNode` each render. Scale-dependent, mobile-recipient risk on a large published estimate. |
| FE-PERF-04 | **confirmed** | low | no | `row-table.tsx:511,530-535` virtualizes rows (flag-gated, `minRows` default 75); `:267` tags rows `[contain-intrinsic-size:96px] [content-visibility:auto]`. Branch recursion mounts node shells regardless of viewport. Guards green. Covered by Performance-Refactor Phase 3. |
| FE-PERF-05 | **confirmed** | low | no | `CostDonutChart.tsx:286-299` memoizes `data`; `:301-322` recompute `pieGenerator`/`arcGenerator`/`arcs`/`callouts` every render (incl. hover). Donut dynamic-imported (`ProjectChartsClient.tsx:26`), bucket-collapsed to 8 (`:116`). Trivial at ≤8 slices. |
| FE-PERF-06 | **confirmed** | low | no | `bun run lint` warns `react-hooks/incompatible-library` at `ProjectEstimatesTable.tsx:1089` (`useReactTable`). It is a **warning**, not an error. Bounded per-project estimate count. Covered by RISK-24. |
| FE-PERF-07 | **confirmed** | low | no | `LiveProjectCard.tsx:689-694` content-visibility + contain-intrinsic-size present; `projects-page-client.tsx` uses `useDeferredValue` for search. Group-mode memo gap is real but deferred-with-rationale. Covered by Projects-Page-Performance. |

**Refuted: none.** **Severity/blocker inflation found: none** (the prior auditor
was already appropriately conservative — all `launch_blocker:false`). The only
correction is the FE-PERF-02 line drift.

### existing_plan_overlap re-checks

- FE-PERF-03 `partial:2026-06-17-Performance-Refactor`: confirmed — that pack
  *names* `/share/[token]` in QA capture lists but plans **no** receiver-tree
  virtualization. Partial is correct.
- FE-PERF-04 `covered-by:2026-06-17-Performance-Refactor` (Phase 3): pack exists,
  files reference virtualization/content-visibility. Confirmed.
- FE-PERF-06 `covered-by` RISK-24/doc 26: `16_RISK_REGISTER.md` present. Confirmed.
- FE-PERF-07 `covered-by:2026-06-19-Projects-Page-Performance`: archived pack present with
  `01_DIAGNOSIS.md` / `04_FURTHER_OPTIMIZATIONS.md` covering the cited sections.
  Confirmed.
- FE-PERF-01 / FE-PERF-02 `none`: no prior pack mentions the elasticity hook or
  the bulk-delete latch. Confirmed new.

---

## Proof gates per remediation item

### R1 — delete `useGlassElasticity`
- **Local proof (sufficient):**
  - `rg "useGlassElasticity|GlassElasticityOptions" src` → must return **0**
    after deletion.
  - `bun run lint` → the 2 `useLiquidGlassRefraction.ts` errors disappear; total
    source-domain errors drop by 2.
  - `bun run test:dom tests/vitest/perf` → still 24/24 (no consumer existed, so
    no behavioral test exists to break).
- **Cannot prove locally:** nothing relevant — it is dead code; runtime is
  unaffected by definition.

### R2 — derive bulk-delete latch
- **Local proof (sufficient):**
  - `bun run lint` → `projects-page-client.tsx:691` error gone → **source-domain
    errors = 0** (only `.gitnexus/run.cjs` tooling errors remain).
  - `bun run test:dom tests/vitest/perf` → 24/24 (incl.
    `projects-page-render-baseline`).
  - Manual: open the projects page, multi-select, trigger bulk delete → the
    confirm modal still mounts and opens; it stays mounted after close (latch
    behavior preserved).
- **Honest limit:** the React-Compiler "refs during render" interaction can only
  be confirmed by `bun run lint` output after the edit (ESLint runs the compiler
  rules) — if it complains, fall back to the guarded-write variant in R2 and
  re-lint. A bare `tsc`/Vitest pass would **miss** a compiler-rule regression.

### R3 — share-tree content-visibility (+ memoized renderNode)
- **Local proof:**
  - `bun run test:dom` for any existing share-tree test (e.g.
    `rg -l "ShareEstimateTree" tests/`) → must stay green; the DOM structure is
    unchanged (only CSS containment classes + memo wrappers added).
  - Visual: render `/share/[token]` against a seeded large published estimate
    (dev-auth-bypass harness) and diff the screenshot — must be pixel-identical
    (content-visibility only defers off-screen paint, doesn't change layout).
- **Honest limit:** the *performance* benefit (shorter first long-task on a
  large proposal) is **not** provable by a unit test. It requires a Chrome
  Performance capture / Lighthouse on a realistically large published estimate
  on a throttled mobile profile — a manual/provider check, not a local gate.
  Until a genuinely large published estimate exists, the win is theoretical and
  the content-visibility lines are cheap insurance only.

### R4 — donut memoization
- **Local proof:** add/extend a render-count test asserting that toggling
  `activeId` (hover) does **not** re-invoke `buildCallouts` (spy), or simply
  rely on `bun run lint` + existing chart snapshot staying green. Low value;
  skip for launch.

---

## What local checks fundamentally cannot prove (domain-wide honesty note)

- Real-device paint/long-task budgets on the actual beta-recipient hardware
  (mobile Safari/Chrome opening `/share/[token]`) — needs RUM or a manual
  throttled capture, not in scope of `bun run validate`.
- That a "large" published estimate exists at all in beta — the FE-PERF-03/04/07
  risks are **scale-gated**; with the small proposals seen so far, every hot
  path is already memoized + virtualized + content-visibility'd and proven green
  by `tests/vitest/perf` (24/24). The launch verdict (no blockers) rests on that
  green suite plus the manual share-load check.
