# Frontend Rendering Performance — Remediation Plan (2026-06-19)

> Adversarially verified. All 7 prior findings hold (one line-number drift
> corrected). **Launch blockers in this domain: 0.** The two lint-clearing items
> below are not perf blockers — they are the source-domain `bun run lint` errors
> that keep `bun run validate` red and block any "green gate" launch criterion.
> Do them because they are tiny, zero-behavior-change, and unblock the gate.

## Verification delta vs prior audit

- **FE-PERF-02 line drift:** the set-state-in-effect is at
  `projects-page-client.tsx:690-692` (not `:584-587` as the audit text said —
  the file was modified after the audit; the audit's *description* of the latch
  is still exactly correct). The remediation below targets the real lines.
- **FE-PERF-01 lines exact:** `useLiquidGlassRefraction.ts:118` (ref-in-render)
  and `:146` (per-frame setState inside the rAF tick); zero callers confirmed.
- Everything else confirmed at or near the cited lines (LiveProjectCard
  content-visibility now `:689-694`; otherwise as cited).

---

## Priority 0 — Green-gate unblockers (do first; not perf blockers)

These three lint errors are the only source-domain `bun run lint` errors
(the other 3 are `require()` imports in `.gitnexus/run.cjs`, tooling — out of
scope, leave them). Clearing FE-PERF-01 + FE-PERF-02 takes source-domain errors
to 0.

### R1 — Delete dead `useGlassElasticity` (FE-PERF-01)
- **File:** `src/components/sidebar/useLiquidGlassRefraction.ts`
- **Steps:**
  1. Delete `export function useGlassElasticity(...)` (lines ~103-189).
  2. Delete the now-unused `GlassElasticityOptions` type and the elasticity
     constants (`DEFAULT_ELASTICITY_STRENGTH`, `ELASTICITY_DAMPING`,
     `ELASTICITY_EPSILON`) **only if** nothing else references them — `rg` first.
  3. Remove any now-unused imports (`CSSProperties`, `useState` if unused).
- **Why safe:** `rg "useGlassElasticity" src` returns only the definition — zero
  callers. The hook is exported-but-unused dead code. Deleting it changes no
  runtime behavior and removes 2 of the 3 source lint errors.
- **Alternative (only if the effect is wanted later):** reimplement the elastic
  nudge as a ref-based **direct DOM write** inside the rAF tick
  (`element.style.transform = ...`) and drop the `setTransform` React state
  entirely — never re-render React per frame. Do **not** ship the current
  setState-per-frame version.
- **Risk:** very low · **Effort:** S · **Deps:** none
- **Migration/RLS:** none.

### R2 — Derive the bulk-delete mount latch during render (FE-PERF-02)
- **File:** `src/components/workshop/projects-page-client.tsx:683-692`
- **Current:**
  ```ts
  const [bulkDeleteModalMounted, setBulkDeleteModalMounted] = useState(false);
  useEffect(() => {
    if (deleteProjectTargetIds.length > 0) setBulkDeleteModalMounted(true);
  }, [deleteProjectTargetIds.length]);
  ```
- **Replace with a render-phase monotonic latch (ref read in render):**
  ```ts
  const hasMountedBulkDelete = useRef(false);
  if (deleteProjectTargetIds.length > 0) hasMountedBulkDelete.current = true;
  const bulkDeleteModalMounted = hasMountedBulkDelete.current;
  ```
  This removes the effect and the `react-hooks/set-state-in-effect` error.
  `bulkDeleteModalMounted` is consumed once at `:1562` (`{bulkDeleteModalMounted && (`)
  — keep that usage unchanged.
- **Note on React Compiler:** a bare ref *write* in render can also trip the
  compiler's "refs during render" rule if this component is compiled. If the
  ESLint output flags it, switch to the lazy-`useState` initializer + a
  render-time `if` that calls the setter is *not* allowed; instead keep the ref
  latch but gate the write with the existing monotonic guard (write only when
  not already true) — verify against `bun run lint` after the edit.
- **Risk:** low · **Effort:** S · **Deps:** none
- **Migration/RLS:** none.

---

## Priority 1 — Only real user-facing upside (scale-gated, non-blocker)

### R3 — Add content-visibility to the `/share/[token]` receiver tree (FE-PERF-03)
- **File:** `src/components/share/ShareEstimateTreeView.tsx`
  (`TreeNodeRenderer`, the per-row container at `:88-92` and the node wrapper at
  `:173-174`)
- **Why it matters:** `/share/[token]` is the **only** interactive surface an
  external beta recipient reaches, and the one route with **enforced** CSP. It
  paints the full estimate DOM: every `node.rows` → a DOM row (`:93`),
  `defaultExpandedNodeIds` auto-expands the first two levels on desktop (`:254`),
  and `renderNode` is recreated each render (`:278`). No windowing, no
  content-visibility. Fine for small proposals; heavy first paint / long task on
  mobile for a large published estimate.
- **Cheapest win (do this; ~10 lines):**
  1. On the per-row container (`:88`) and on each node wrapper `<div>` (`:174`),
     add Tailwind `[content-visibility:auto] [contain-intrinsic-size:auto_44px]`
     (rows) / a node-appropriate intrinsic size — mirror
     `LiveProjectCard.tsx:689-694`. Off-screen subtrees then skip layout/paint.
  2. Memoize `renderNode` with `useCallback` keyed on
     `[currencyCode, isMobile, activeNodeId, toggleNode]`, and wrap
     `TreeNodeRenderer` in `React.memo` so collapsed siblings don't re-render on
     a single toggle.
- **If a real large proposal is observed (defer until then):** window
  `node.rows` per node with `@tanstack/react-virtual` (already a dependency,
  used in `row-table.tsx`).
- **Risk:** low (CSS containment only; verify the share visual snapshot/manual
  load is unchanged) · **Effort:** M · **Deps:** none
- **Gate:** only ship if a large published estimate is expected in beta;
  otherwise the content-visibility lines are still cheap insurance.
- **Migration/RLS:** none (read-only published-snapshot rendering).

---

## Priority 2 — Optional polish (skip for launch)

### R4 — Memoize `CostDonutChart` arcs/callouts (FE-PERF-05)
- **File:** `src/components/charts/CostDonutChart.tsx:301-322`
- **Steps:** wrap `pieGenerator`/`arcGenerator`/`arcs` and `callouts` in a
  `useMemo` keyed on `[data, activeId, dims, currencyCode]` so a hover
  (`setActiveId`) re-runs only the cheap opacity diff, not the full pie/arc +
  callout-stacking solver.
- **Why low:** donut is dynamic-imported (`ProjectChartsClient.tsx:26`), only
  mounts in the optional Share view, and inputs are bucket-collapsed to ≤8
  (`:116`). The loops are trivial. Pure micro-polish.
- **Risk:** very low · **Effort:** S · **Deps:** none

---

## No action (confirmed covered by prior packs — do NOT re-plan here)

- **FE-PERF-04** (estimate-sheet branch recursion mounts every node shell;
  rows virtualized inside each table): **covered-by**
  `2026-06-17-Performance-Refactor` Phase 3 (incremental totals, per-row
  subscription, virtualization thresholds). Currently green
  (`nodeTotalsComputes===1`, `rendersOutside===0`). Leave to that pack.
- **FE-PERF-06** (`ProjectEstimatesTable` `useReactTable` defeats React-Compiler
  memo; unwindowed rows): **covered-by** Performance-Refactor RISK-24 / doc 26.
  It is a **warning**, not an error; estimates-per-project are bounded. No action.
- **FE-PERF-07** (projects card list not virtualized; group-mode O(N) memo gap):
  **covered-by** `2026-06-19-Projects-Page-Performance` (§2/§3, §04). Mitigated
  by content-visibility + `useDeferredValue`; deferred-with-rationale. No action.

---

## Cross-domain dependencies / hand-offs

- **Bundle/asset sizing** (donut d3-shape chunk, `next/image` thumbnails) →
  domain 6. Not blocked by anything here.
- **RSC / data-fetch** (server-component split that keeps the estimate-sheet hot
  path off the client) → domain 8. R3's CSS-only change is independent.
- **DB query perf** → domain 3. No coupling.
- **CSP enforcement / nonce pipeline** (Report-Only on `/`, `/workshop`,
  `/invite`; enforced on `/share`) → security domain. R3 touches `/share`
  (enforced-CSP route) but adds only Tailwind classes / inline `style`
  containment — confirm no new inline `<script>`/`<style>` is introduced (it
  isn't; existing `style={{paddingLeft}}` pattern is already in use there).

## Sequencing

1. **R1 + R2** (parallel, both S) → source-domain `bun run lint` = 0 errors →
   `bun run validate` can go green on this domain. Do these regardless of the
   rest.
2. **R3** if a large published estimate is in the beta plan (or as cheap
   insurance).
3. **R4** only if touching the donut for another reason.

All items are READ-ONLY-on-source for other agents until an implementer is
assigned; this plan edits only the files named above.
