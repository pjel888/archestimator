# 13 — Phase 7: Bundle / Code-Splitting / Runtime Cleanup

> **Authoring agent:** W10. **Status:** Phase plan (Wave 2). Implements contract `_SYNTHESIS.md §1 RSC/bundle / §3 track 5`, target `04_TARGET_ARCHITECTURE.md §1` (route/data, provider topology, config) + §2 (boundary checklist R-3/R-6/R-7/R-11). Grounded in dossier `R1-rsc-and-bundle.md`, audit `A-01`/`A-17`/`A-34`/`A-35`/`A-36`/`A-37`, patterns `PAT-22`/`PAT-28`/`PAT-08`, decision `D-002` (pull quick wins forward, gated), risk **RISK-06** (bundle regression instead of improvement).
>
> **Scope discipline (contract §4):** planning only — no `src/**` / `next.config.ts` / `package.json` edits in this pack. Files/config named are *targets*; the `analyze` npm script is flagged "to be added." Validation uses only the existing command vocabulary.
>
> **Quick-win note (contract §2, `D-002`):** the **provider-topology move**, **`d3`→`d3-shape` dedup**, and **share-page dynamic charts** are cheap, isolated, high-leverage, and depend on **nothing** from the tree/sheet refactors. They MAY be pulled forward to right after Phase 0 baseline (each gated by `ANALYZE=true bun run build` before/after + `bun run validate`). The disciplined default is still this phase; the early-win option is recorded for `05_PHASED_REFACTOR_PLAN`.

---

## 0. Goal & success definition

Stop heavy/authed code from entering bundles that don't need it, and code-split the remaining eager heavy deps, while **preserving the confirmed-good patterns** (exceljs server-only, Three/WebGL lifecycle, dynamic-import discipline).

**Done when:** the landing/public chunk contains **no** supabase-js / realtime / notifications; `d3` is removed (only `d3-shape` remains); `CostDonutChart` is dynamic at all 3 consumers; `optimizePackageImports` is extended; an `analyze` npm script exists; a bundle-size budget exists (cross-ref `03`). Verified by `ANALYZE=true bun run build` before/after + `bun run validate`.

**Phase 0 prerequisite (contract §5 Q-bundle, `A-37` open Q):** every "ships into bundle X" claim below is **import-graph-derived, not measured**. Phase 0's first job is `ANALYZE=true bun run build` to confirm: (a) supabase/realtime is actually in the landing chunk, (b) `react-complex-tree`/`d3` weight, (c) rough-notation/roughjs/lenis don't leak past landing. **Do not act on a claim the analyzer doesn't confirm.**

### 0.1 LAW — Estimate-editor first paint MUST NOT wait for (Bible §4.5/§9)

The estimate editor's first paint is the load-bearing perceived-latency surface. It **MUST NOT** be blocked on, or eager-import, any of the following — each must be lazy, dynamic, or out-of-band:

- the **full component-library dataset** (already lazy-loaded via `useLazyEstimateLibrary` — this is now a **formal rule**, not an implementation accident: the dataset is fetched on demand, never as a first-paint dependency);
- **D3 chart modules** (`d3-shape`; see §3 — dynamic at all consumers, never in the editor's initial chunk);
- **ExcelJS / proposal-export code** (server-only + API-route-reachable only, §4; the client builds the model and POSTs — never bundles the workbook writer);
- **Three.js / visual-effects modules** (`@firecms/neat`, lenis, roughjs, rough-notation — landing-scoped, §4; never reachable from the editor graph);
- **AI package-builder modules** (dynamic-imported only when the AI panel is opened);
- **inactive right-dock panels** — Components / Templates / AI / Proposal / Attachments load **only when opened or intentionally prefetched**, never eagerly at first paint.

This is the consolidated product law behind §2/§3/§4 and the no-barrel-in-hot-client rule (§5). Cross-ref **doc 09 §9** (right-sidebar/center-column boundary — the sheet passes the right dock already-derived props and the dock must not eager-mount inactive panels), which owns the editor-side decomposition this law constrains.

---

## 1. Heavy-dependency inventory

PINNED from R1 B1 / `A-34` (install sizes via `du -sh node_modules/<dep>`):

| Dep | Install | Status | Action |
|---|---|---|---|
| `@phosphor-icons/react` | 57M | Mostly efficient (`/dist/ssr` path, 127 files) | Normalize the few bare-barrel value imports; keep in `optimizePackageImports` (§5) |
| `three` (via `@firecms/neat`) | 38M | **Exemplary lifecycle** (`A-37`) | **Preserve**, do not touch (§4) |
| `exceljs` | 22M | **Cleanly server-only** (`A-37`) | **Preserve**, confirm no client leak (§4) |
| `react-complex-tree` | 2.7M | **Effectively dead** (CSS + 1 type alias) | Remove (Phase 2 retires `WorkshopTree`; dep removal confirmed here via analyzer) (`A-17`, `PAT-08`) |
| `d3` (full) | 868K | **Redundant** — only `d3-shape` imported | **Remove `d3`**, keep `d3-shape` (§1.1) (`A-34`) |
| `d3-shape` | 440K | The one actually used (`arc`/`pie`) | Keep; add to `optimizePackageImports`; ship lazily (§3) |

### 1.1 `d3` dedup (quick win)

`CostDonutChart.tsx:4-5` imports only `d3-shape` (`arc`, `pie`); **no bare `d3` usage anywhere in `src`** (R1 B4/B5, verified). Full `d3` (868K) is a dependency only by historical accident.

- **Action:** remove `d3` from `package.json` `dependencies` (keep `d3-shape`; `@types/d3` is dev — review whether `@types/d3-shape` suffices).
- **Safe move:** verify no transitive need first (no other dep requires `d3` at runtime) — analyzer + `bun run build`.
- **Validation:** `ANALYZE=true bun run build` shows `d3` gone from the graph; `bun run validate`.

---

## 2. Client / server import boundaries — provider topology (A-01, highest-leverage)

**The problem (PINNED, `A-01`/`PAT-28`):** `src/app/providers.tsx:30-46` (`"use client"`) mounts **every** provider via root `layout.tsx:25`, so authed-only concerns run on `/`, `/pricing`, `/share/[token]`. `RealtimeAuthBridge` (`realtime-auth-bridge.tsx:22-66`) on mount calls `createSupabaseBrowserClient()`, `supabase.auth.getSession()`, and subscribes to `onAuthStateChange` — dragging `@supabase/ssr` + supabase-js into the **landing bundle** and firing an **auth roundtrip on marketing pages**.

**Target topology (`04 §1.1`):**

```
src/app/layout.tsx (root)  →  <RootProviders>  // PUBLIC-SAFE only
    QueryClientProvider      (shared; cheap — keep unless analyzer shows weight)
    ToastProvider            (shared; cheap)
    VercelWebAnalytics       (already global, lightweight — A-37)
    RouteLoadingOverlay      (pure UI; no supabase)

src/app/workshop/layout.tsx (authed)  →  <WorkshopProviders>  // AUTHED-ONLY
    RealtimeAuthBridge       (supabase realtime)
    NotificationProvider     (authed feature)
    PerformanceMonitor       (authed instrumentation)
    NavigationListener       (authed nav telemetry)
    BfcacheHandler           (app-shell concern)
```

- **Net effect:** marketing/landing **and** the public `/share/[token]` ship no supabase-js/realtime/notifications and fire no auth roundtrip. Biggest app-shell win.
- **Safe first move (`A-01`):** confirm via analyzer that supabase is actually in the landing chunk **before** relocating; the move itself is isolated (no data-shape change).
- **Unsafe moves to avoid (`A-01`):** removing `QueryClientProvider` from root if any public route uses a query hook; deleting `PerformanceMonitor` outright (it backs perf telemetry — relocate, don't delete).
- **Validation:** before/after `ANALYZE=true bun run build` landing-chunk diff; e2e `landing-audit.spec.ts` asserts no auth network call on `/`; `bun run validate`.
- **Boundary rule (`04 §2 R-3`):** no supabase-js/realtime/notifications import may be reachable from a public route's component graph. The new DS/bundle budget (§6) can later assert this.

- **HARD constraint — RSC auth boundary MUST survive the move (RISK-19, cross-ref `22_SECURITY_AND_RLS_THREAT_PLAN.md`):** `src/app/workshop/layout.tsx` **MUST remain a Server Component**. Do **not** add `"use client"` to it. `WorkshopProviders` is a client component and must be rendered as a **CHILD client boundary** *below* the server layout — never by converting the layout itself. The server layout runs `getCurrentUserContext()` → `redirect("/login")` and the terms-acceptance gate; these MUST stay server-side, executing **above** any client boundary, so an unauthenticated request is 302'd before any authed provider mounts. Converting the layout to a client component (RISK-19) would drop the redirect to client-side and leak the authed shell. 
  - **Required gate (new, Phase 7):** `prove:workshop-auth-boundary` (e2e: unauthenticated request to a `/workshop/*` route → 302 to login, no authed provider/realtime mount). 
  - **Required check:** a `/share/[token]` **session-residue check** — confirm relocating the auth providers under `workshop/layout.tsx` leaves no supabase session/realtime subscription mounted on the public share route (verifies the boundary holds both directions: authed code stays in, public route stays clean).

This is a **quick win** (`D-002`) — pullable post-Phase-0; overlaps R-state (provider topology) but is owned here. **Ships behind the `workshopScopedProviders` feature flag** (`24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md`) so the relocation is independently revertible; cross-ref `25_OBSERVABILITY_RUM_AND_RESOURCE_BUDGETS.md` for the exec-time/TBT + field-RUM budgets that prove the bundle/roundtrip win in the field (not only in the analyzer).

---

## 3. Dynamic-import targets — share/data charts (A-35, quick win)

**The problem (PINNED, `A-35`/`PAT-28`):** `CostDonutChart` (d3-shape, `arc`/`pie`) is dynamic **only** on the charts route (`ProjectChartsClient.tsx:26-29`) but imported **statically** at:
- `CostBreakdownSection.tsx:5` → rendered by `ProjectDataClient.tsx:82` (the `/workshop/projects/[id]/data` route), and
- `SharePageTabs.tsx:23` (the **public** `/share/[token]` page).

So d3-shape ships eagerly to the Data route and **to external share recipients** even when the cost-chart tab isn't open.

- **Action (`04 §2 R-7`):** make `CostDonutChart` `next/dynamic` (with a skeleton fallback) at **all three** consumers, or tab-gate it so it loads only when the cost tab is active. Priority: the external-facing `SharePageTabs` first (worst case — untrusted/cold recipients).
- **Pattern to copy:** the existing `ProjectChartsClient.tsx:26-29` dynamic boundary and `HeroSection.tsx:11-14` (`loading: () => null`) — both confirmed-good (`A-06`).
- **Validation:** `ANALYZE=true bun run build` share-chunk diff (d3-shape no longer in the initial share chunk); `shared-link-receiver.spec.ts`; `bun run validate`.

This is a **quick win** (`D-002`) — pullable post-Phase-0; isolated to 2 import sites.

### 3.1 Landing LCP / CLS audit (perf review #8, cross-ref `25_OBSERVABILITY_RUM_AND_RESOURCE_BUDGETS.md`)

The landing route is the highest-traffic public surface; its Core Web Vitals are field-visible. A short audit, not a refactor:

- **LCP element (hero):** identify the landing LCP element (hero heading/image). If it is an image, it MUST carry `priority` (preload); if a background/WebGL layer, ensure the LCP text/heading is **not** blocked behind the dynamic `NeatWireframeBackground` (it is already off the critical path with `loading:()=>null`, §4 — preserve that). Add a preload only for the true LCP resource.
- **Fonts:** confirm `next/font` is used with `display:swap` and **self-hosted** (no render-blocking external font request), and that the swap does **not** cause a layout-shifting fallback (size-adjust/fallback metrics tuned so the swap is non-shifting).
- **CLS budget:** add a **CLS < 0.1** budget to the **landing** row of the resource budget (`25`). Reserve space for the hero, any consent/analytics banner (`LandingAnalyticsLoader`), and lazy media so nothing reflows on hydration.
- **Validation:** `landing-audit.spec.ts` asserts LCP element has `priority`/preload and CLS < 0.1; cross-ref the field-RUM dashboard in `25` for real-user confirmation.

---

## 4. Preserve the confirmed-good (do NOT spend effort; do NOT regress)

PINNED positives (`A-37`, R1 B2/B3/B7/B8). These are *reference patterns*, not work:

- **ExcelJS isolation (already good):** imported only in `create-proposal-workbook.ts:1`, reachable only from the API route `…/export/proposal.xlsx/route.ts:4` and `build-proposal-export-model.ts`. No client component imports it; the client builds the *model* and POSTs to the server route. **Confirm no client leak** during the EstimateSheetContent decomposition (Phase 3) — `build-proposal-export-model` is client-bundled today (R1 finding-2); pushing pure model-building server-side (`04 §2 R-4`) is a Phase-3/4 concern, not Phase 7, but must not pull exceljs into the client.
- **Three / WebGL pause/lazy (already exemplary):** `NeatWireframeBackground.tsx` is dynamic off the landing critical path (`HeroSection.tsx:11-14`, `loading:()=>null`), `@firecms/neat` further dynamically imported inside the effect (`:117`), static fallback for reduced-motion/coarse-pointer (`:6,57-62`), `requestIdleCallback` activation (`:66-79`), **`IntersectionObserver` pauses the gradient off-screen** (`:132-141`), `destroy()` on unmount (`:148-153`). **Preserve exactly** — it is the gold-standard for any future animated/WebGL work.
- **Landing-only libs (`lenis`, `roughjs`, `rough-notation`):** scoped to `src/components/landing/**`; `lenis` short-circuits under reduced-motion. Confirm via analyzer they don't leak into the app shell (Phase 0 check) — they shouldn't, as they're absent from providers/layout.
- **Third-party scripts:** `@next/third-parties/google` (GA) consent-gated, landing-only (`LandingAnalyticsLoader.tsx:3`); `@vercel/analytics/next` global but lightweight (`layout.tsx:32`) — acceptable global; `resend` server-only. No action.
- **Dynamic-import discipline (`A-06`):** `EstimateWorkspaceClient.tsx:19-31`, `LibraryPageClient.tsx:20-23`, `ComponentLibraryManager.tsx:70-85`, `TemplatesBrowseManager.tsx:48-55`, `projects-page-client.tsx:105-106` — preserve all these boundaries during any decomposition.

---

## 5. Import rules — icons, D3 isolation, config

- **No-barrel-in-hot-client rule (Bible §9.1):** a `"use client"` file is a **bundle boundary** — whatever it statically imports ships into that route's client chunk. Therefore, in the **hot client route files** (`EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`): **no helper barrels and no re-export blocks** (no `export *`, no aggregating re-export surface); **prefer direct imports** for internal modules (import the one symbol from its module, not from an index barrel); and **dynamic-import heavy inactive panels** (the Components/Templates/AI/Proposal/Attachments docks — §0.1). Barrels defeat code-splitting and drag dead modules into the editor first-paint bundle. **Enforced by the `no-hot-barrel-imports` static check (doc 27 SC-3 / item 8)** — a `scripts/*.mjs` grep gate (or ESLint `no-restricted-syntax`) scoped to those two files, forbidding both barrel re-exports *and* barrel imports into them.
- **Icon imports (`04 §2`, R1 B6):** the SSR/per-icon subpath `@phosphor-icons/react/dist/ssr` is the mandated path (avoids the 57M barrel; tree-shakes with `optimizePackageImports`). **Normalize** the few remaining bare-barrel **value** imports (2 files, e.g. `{ FolderSimple, Cube, CaretDown }`) to `/dist/ssr`. Type-only imports (`import type { Icon }`) are erased — leave them. Low impact (optimizePackageImports already helps) but worth consistency; a lint rule (Phase 6 DS gate or here) could ban bare-barrel value imports.
- **D3 isolation:** after the dedup (§1.1), `d3-shape` is imported only in `CostDonutChart.tsx` and is loaded only via the dynamic chart boundary (§3). It must never enter the landing/share initial chunk.
- **ExcelJS isolation:** already correct (§4) — the rule is "server-only, API-route-reachable only"; the Phase-3 model-building move must not violate it.
- **Config — `optimizePackageImports` (`next.config.ts:55`, `A-36`):** today only `@phosphor-icons/react`. **Extend to:** `@tanstack/react-table` (1 importer), `@tanstack/react-virtual` (3 importers), `@radix-ui/react-context-menu` (1 importer), `d3-shape`. Low-risk barrel pruning. No `modularizeImports` exists; not required if optimizePackageImports covers the barrels.
  - **Exec-time check per addition (perf review #10, Q-32; cross-ref `25_OBSERVABILITY_RUM_AND_RESOURCE_BUDGETS.md`, RISK-06):** each `optimizePackageImports` entry gets a **before/after module-EVALUATION-time** measurement, not only a kb diff. Barrel pruning changes *which* modules are imported and can shift **eager init cost** (e.g. a barrel that previously deferred a submodule may now pull it into a hot path, or vice-versa). A kb win that regresses module-init/TBT is a net loss. Add each entry only when both kb **and** exec-time hold or improve; otherwise log under Q-32 (whether `optimizePackageImports` additions change module-init time) with the measured delta.
- **Config — `experimental.staleTimes {dynamic:60, static:180}` (`:64-67`):** **keep** — it intentionally pairs the Router Cache with warm TanStack caches (decisions.md); do not regress it.
- **Image strategy (`sharp`):** `images.remotePatterns` is restricted to the Supabase component-images bucket (`:31-50,69-71`); `sharp` is the optimization dep. **Fine — no action.** Just confirm new image surfaces use `next/image` + an allowlisted remote pattern rather than raw `<img>`.
  - **Estimate-row images (Bible §13.3):** component/material images rendered in estimate **ROWS** (thumbnails, library-item previews) MUST use Next `Image` **with known width/height** (preserve explicit `w`/`h` → reserves layout space → **no CLS** on load/swap), **lazy-load** offscreen images (visible window only), and use **placeholders for missing images** (no broken-image flash, no null-source layout jump). **CRITICAL — never load large source images into virtualized OFFSCREEN rows:** only the visible virtual window may request full-res images; rows above/below the viewport must issue no full-res fetch (the row-image analogue of the §11/§13.3 offscreen-render budget). **Doc 09 §11A owns the row-render side** of this law (transcribes Bible §13.3 + the Phase-3 validation gates); this bullet states only the bundle/image-config side so the two don't conflict — defer the row-render contract to doc 09 §11A.

---

## 6. Bundle analyzer workflow + budgets (A-03, cross-ref 03)

- **Analyzer is wired but scriptless (`A-03`, R1 A5):** `next.config.ts:2,190-194` wraps config in `@next/bundle-analyzer` gated by `ANALYZE=true`, but `package.json` has **no `analyze` script** — devs must remember `ANALYZE=true bun run build`.
- **Action (to be added, Phase 0/7):** add `"analyze": "ANALYZE=true next build"` (or `bun run build` equivalent) to `package.json` scripts. Pure ergonomics; running it is its own proof.
- **Bundle-size budget (new, cross-ref `03_PERFORMANCE_BASELINE_AND_BENCHMARKS.md` + `04 §11/§12.4`):** add a per-route/per-chunk kb ceiling so a heavy-dep regression is visible. Two hard assertions seeded by this phase's wins:
  1. **Landing/public chunk contains no supabase/realtime** (asserts §2 stuck).
  2. **Share initial chunk contains no d3-shape** (asserts §3 stuck).
  Plus a generic per-chunk ceiling at `baseline × 1.15` (margin per `03`). These are **PROPOSED** numbers ratified in Phase 0 against the measured baseline, wired as a gate in Phase 9 (the budget is not in `bun run validate` today — contract §0).
- **Workflow:** before/after `ANALYZE=true bun run build` for every change in this phase; diff the chunk that the change targets (landing, share, data, charts). This is the RISK-06 control.

---

## 7. `router.refresh()` runtime audit (PAT-22, shared with Phase 4)

`router.refresh()` spans **12 files** (`A-02`, contract correction; real call e.g. `ProjectEstimatesClient.tsx:215`, **not** the store). Each re-runs a whole server segment + RSC payload.

- **Target rule (`04 §1.4 / §2 R-10`):** prefer scoped TanStack invalidation (`patchAndMarkStale`, Phase 1) over `router.refresh()` when the change is representable in the client cache. Reserve `router.refresh()` for genuine fresh-RSC needs (auth/permission/route-structure). Each retained call carries a one-line justification comment.
- **Ownership:** the *inventory + reclassification* is primarily **Phase 4** (`10_PHASE_4`, cache/data) — it needs per-feature behavioral knowledge (which refresh truly needs new RSC). Phase 7 owns the **runtime** angle: once a refresh is reclassified to invalidation, confirm the perceived-latency win via the route-transition spec, and ensure no remaining refresh re-imports authed-only code into a public path.
- **Unsafe move (`A-02`):** blanket-replacing `router.refresh()` with invalidation — some genuinely need fresh server data (auth/permission transitions).
- **Validation:** route-transition perf spec (`bun run test:e2e:perf`, currently non-gating, tightened in Phase 9); per-feature behavioral tests.

---

## 8. Migration order

1. **Provider topology move (§2)** — quick win, biggest leverage. **Ships behind the `workshopScopedProviders` flag** (doc 24). Analyzer-confirm supabase-in-landing first, relocate `WorkshopProviders` as a child client boundary under the RSC `workshop/layout.tsx` (keep the layout an RSC — §2 hard constraint), re-run analyzer + `landing-audit.spec.ts` + `prove:workshop-auth-boundary` + `/share` session-residue check, and confirm the win in the field via the exec-time/TBT + RUM budgets in doc 25.
2. **`d3` dedup (§1.1)** — quick win. Remove dep, `bun run build`, analyzer confirms gone.
3. **Share/data dynamic charts (§3)** — quick win. Make `CostDonutChart` dynamic at all 3 consumers (share first), analyzer confirms d3-shape out of share initial chunk.
4. **`optimizePackageImports` extension + `analyze` script (§5/§6)** — config-only, low risk.
5. **Icon bare-barrel normalization (§5)** — 2 files; trivial.
6. **`react-complex-tree` dep removal (§1)** — **gated on Phase 2** retiring `WorkshopTree` + replacing the CSS import (`src/app/workshop/layout.tsx:15` `react-complex-tree/lib/style-modern.css`) and the `TreeItemIndex` type alias (`library-folder-reorder.ts:1,86`). Phase 7 confirms removal via analyzer once Phase 2 lands (`A-17`, `PAT-08`).
   - **SEV-4 — CSS-removal visual-regression guard (cross-ref doc 08 Phase-2 cleanup + Q-10):** BEFORE deleting the `react-complex-tree/lib/style-modern.css` import, run a **visual-regression assertion** at Phase 2 (`bun run storybook:validate` / pixel-diff) confirming the KEPT `Tree` and `LibraryFolderTree` render **pixel-identically** with the CSS removed. This is a low-likelihood but easy-to-miss visual break on an **authed surface** — the shared `style-modern.css` could be silently styling the kept renderers, not only the deleted `WorkshopTree`. Dep deletion is gated on (a) analyzer proof the dep is absent (Q-10) **AND** (b) this visual-regression pass.
7. **Bundle-size budget wiring (§6)** — seed the budget; ratify numbers in Phase 0, gate in Phase 9.
8. **`router.refresh()` runtime confirmation (§7)** — trails Phase 4's reclassification.

Steps 1–5 are independent quick wins (`D-002`); 6 depends on Phase 2; 7 depends on Phase 0; 8 depends on Phase 4.

---

## 9. Validation & risk

- **Commands (existing vocabulary, contract §4):** `ANALYZE=true bun run build` (the primary instrument — before/after every change), `bun run validate`, `bun run test:e2e` / `bun run test:e2e:perf` (landing-audit, shared-link-receiver, route-transition), and the new `analyze` script once added.
- **RISK-06 (bundle regression instead of improvement):** mitigated by the before/after analyzer discipline on every step, the bundle-size budget (§6) catching regressions, and not touching the confirmed-good (§4). A change that *grows* a chunk fails the budget.
- **Measurement-first gate (contract §5 Q-bundle):** no import-graph claim is acted on before Phase 0 analyzer confirms it. If the analyzer shows supabase is *not* in the landing chunk (e.g. Next already tree-split it), the provider move's bundle rationale weakens to "still fewer authed roundtrips on public routes" — note and re-prioritize.
- **Cross-phase dependencies:** §1/§6 `react-complex-tree` removal depends on **Phase 2** (WorkshopTree retirement); §7 depends on **Phase 4** (refresh reclassification); §4 exceljs-isolation must be preserved through **Phase 3** (model-building server-move). The 3 quick wins (§2/§3/§1.1) depend on **nothing but Phase 0 baseline**.
- **Decision refs:** `D-002` (gated quick wins). **Risk refs:** RISK-06 (bundle), with RISK-14 (shared-seam) on `providers.tsx`/`next.config.ts` if Phase 4 also edits them.
