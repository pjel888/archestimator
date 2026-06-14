# 12 — Optimization Backlog (Prioritized, P0–P5)

**Status:** AUDIT / PLANNING / READINESS ONLY — no source, deps, migrations, or provider settings changed.
**Date:** 2026-06-14
**Repo:** `/Users/philiplewis/archestimator` @ HEAD `3070c46c` (`main`)
**Companion docs:** `01_AUDIT_SCOPE_AND_METHOD.md`, `02`–`10` deep-dives, `14_IMPLEMENTATION_PHASE_PLAN.md` (the executable mirror of this backlog), `evidence/current-budgets.md`, `evidence/route-inventory.md`.

---

## 0. How to read this backlog

This is the single prioritized list of optimization work for Archestimator, grouped into six
phases (P0–P5) that map 1:1 to the phases in `14_IMPLEMENTATION_PHASE_PLAN.md`. Each item is
graded with the same language discipline as the rest of the pack:

- **Verified** — read in current source this session.
- **Observed** — backed by a captured benchmark artifact (path cited).
- **Likely** — inferred from code structure, not measured.
- **Blocked** — environment/auth/provider access prevented measurement this session.

**Severity** is the finding's impact rating from the registry (`/tmp/perf-registry-good.json`,
86 findings). **Finding refs** point at the registry IDs and, where relevant, the `PERF-BN-*`
bundle bundle IDs supplied to this authoring pass.

### Per-item schema

Every item below carries: **ID · Phase · Description · Expected impact · Effort · Risk ·
Prerequisites · Files likely affected · Tests required · Owner gate required? · Can ship
before beta? · Must be measured before implementation? · Finding refs.**

### Sequencing gates (read before touching anything)

> **GATE-0 — No P1+ work on a surface before that surface has P0 measurement.**
> The entire reason P0 exists is that this session could not measure live (no dev server,
> dev-auth off, no Playwright storage state, ANALYZE build blocked). Bundle byte sizes, authed
> Lighthouse on heavy routes, and the `ANALYZE=true … --webpack` treemap are all **blocked**.
> Do **not** implement a P2 bundle split, a P3 query change, or a P1 perceived-speed change on
> a route until you have captured that route's baseline (LCP/TBT/treemap/EXPLAIN as relevant).
> Implementing first and measuring after is how the prior plans accreted stale claims.

> **GATE-1 — Owner-gated items never proceed from a stale doc.** Anything marked *Owner gate
> required? = yes* (PITR-off DB work, RUM re-enable, CI re-activation, index drops, irreversible
> migrations) requires explicit owner sign-off in `.ai/10_state/decisions.md`, not inference
> from this backlog. See GOV05/GOV06.

> **GATE-2 — Reconcile, don't re-recommend.** A large share of the obvious wins are already
> landed (proxy public-route early-return, 5-min TanStack staleTime, `experimental.staleTimes`,
> phosphor `optimizePackageImports`, 10 `loading.tsx` shells, 7 `error.tsx`, hover/viewport
> prefetch, ExcelJS isolation, D3 submodule imports, `NeatWireframeBackground` `ssr:false`,
> estimates-list RPC summaries, charts buckets-only payload, teamspace presence). Items here are
> the *residual* gaps verified against HEAD `3070c46c`. Do not re-open closed work.

> **GATE-3 — One contradiction must be resolved by the owner before any RUM work (P4).** The
> readiness-completion proof in older docs depends on Vercel Speed Insights, but Speed Insights
> RUM was **REMOVED in production as a security remediation** (GOV02, Verified/High). Several
> findings (AS01/CR07/RT09/TG03) still say "wire Speed Insights". These conflict. The P4 RUM
> item below is written to surface the contradiction, not to silently re-add the package.

---

## P0 — Measurement & Truth

**Theme:** Establish ground truth before optimizing anything. Nothing in P1–P5 may be
implemented on a surface that P0 has not measured. P0 itself ships no product change.

### P0-1 — Normalize the route inventory into a single canonical surface list
- **Phase:** P0
- **Description:** Reconcile `evidence/route-inventory.md` (31 page routes, 21 API handlers) into one canonical machine-readable list tagging each route as public / auth / share / invite / API, dynamic-vs-static, and current boundary coverage (`loading.tsx` / `error.tsx` / `layout.tsx`). This is the index every later phase's "which surfaces are done" check reads from.
- **Expected impact:** No runtime impact; prevents mis-scoped work and duplicate effort across concurrent agents.
- **Effort:** S
- **Risk:** None (doc/data artifact only).
- **Prerequisites:** None.
- **Files likely affected:** `evidence/route-inventory.md` (already drafted), a new `evidence/route-matrix.json` (planning artifact, this folder only).
- **Tests required:** None (no code).
- **Owner gate required?** No
- **Can ship before beta?** Yes
- **Must be measured before implementation?** No (it *is* the measurement scaffolding).
- **Finding refs:** RT01, RT04, INV11, GOV04.

### P0-2 — Split smoke budgets from launch/readiness budgets
- **Phase:** P0
- **Description:** Relabel the existing `e2e/route-transition-performance-budgets.json` thresholds as **SMOKE** (regression catchers, intentionally loose: publicRoute 15000ms, slow3g 30000ms, bfcache 1500ms, authed 10000ms) and add a separate `route-transition-readiness-budgets.json` holding the CLOSED-BETA tier (e.g. authed sidebar nav < 800ms, `/workshop/projects` LCP ≤ 3000ms, INP < 200ms). Do **not** loosen or tighten the smoke file; keep the signal-bearing assertions (`overlayCount: 0`, `prefetchRscRequestMin: 1`).
- **Expected impact:** Stops a passing smoke run from being mistaken for "ready"; gives go/no-go a real bar.
- **Effort:** S
- **Risk:** Low — additive JSON + checker flag; no product code.
- **Prerequisites:** None.
- **Files likely affected:** `e2e/route-transition-performance-budgets.json`, new `e2e/route-transition-readiness-budgets.json`, `scripts/check-route-transition-readiness.ts` (tier selection).
- **Tests required:** Update/extend the readiness-checker unit coverage; confirm checker reads the correct tier per invocation.
- **Owner gate required?** No
- **Can ship before beta?** Yes
- **Must be measured before implementation?** No.
- **Finding refs:** TG01, GOV08, TG05, GOV11; `evidence/current-budgets.md`.

### P0-3 — Capture the ANALYZE treemap for the public landing + a public Lighthouse run
- **Phase:** P0
- **Description:** Run `ANALYZE=true bunx next build --webpack` against an **isolated** `.next` dir (so it does not collide with concurrent agents' shared build), archive the treemap, and capture a fresh public Lighthouse for `/` `/features` `/pricing` `/about` `/contact`. This is the prerequisite for sizing every public-route bundle item (BN-01/02/03/08, INV10).
- **Expected impact:** Converts "blocked, no bytes" claims into real first-load-JS numbers; sets the public-route JS budget.
- **Effort:** M
- **Risk:** Low (build only; isolated output dir; no deploy). Must coordinate build-artifact contention (see concurrent-agent note).
- **Prerequisites:** Quiet build window OR isolated `.next` path (`NEXT_DIST_DIR` / separate worktree); Chrome for Lighthouse.
- **Files likely affected:** None in `src/`; archive under this folder's `evidence/`.
- **Tests required:** None (measurement run); archive raw report + treemap.
- **Owner gate required?** No
- **Can ship before beta?** Yes (measurement, not a product change).
- **Must be measured before implementation?** N/A — it *is* the measurement.
- **Finding refs:** PERF-BN-04, TG11, GOV11, INV10, AS09.

### P0-4 — Capture authed Lighthouse + treemap for the heaviest unmeasured surfaces
- **Phase:** P0
- **Description:** Capture cold authed Lighthouse + route-chunk sizing for the estimate editor (`[nodeId]`), charts, project detail (`[projectId]`), and library — the surfaces the automated benchmark currently omits. Use owner storage state for authed Lighthouse. Editor route is the priority (heaviest authed surface: tree + content + tree-lib + phosphor).
- **Expected impact:** Replaces "byte-unverified / no editor Lighthouse" with real LCP/TBT/entry-chunk numbers; unblocks BN-06/07, CR01/03/08, DB01.
- **Effort:** M
- **Risk:** Low (measurement). Requires authed session.
- **Prerequisites:** P0-1; owner-provided Playwright storage state (no dev-auth bypass); a production-like build (`next start`, not dev) per TG06.
- **Files likely affected:** None in `src/`; `e2e/`/`scripts/` measurement config + `evidence/` archive only.
- **Tests required:** Extend the route-transition benchmark to include editor/charts/project-detail (TG02).
- **Owner gate required?** Yes — needs owner storage state / authed cookies.
- **Can ship before beta?** Yes (measurement).
- **Must be measured before implementation?** N/A.
- **Finding refs:** PERF-BN-07, PERF-BN-04, TG02, TG07, TG10, TG06, INV08, DB01.

### P0-5 — Inventory unmeasured high-risk surfaces + write the "no readiness claim without proof" gate
- **Phase:** P0
- **Description:** Produce an explicit list of surfaces with **zero synthetic coverage** (editor, charts, project detail, share, settings sub-routes, Excel export) and codify GATE-0 as a checklist the readiness script enforces: a surface cannot be marked "ready" without a captured baseline. Capture the OPEN manual gates (DevTools bfcache proof, production React Profiler) as named, un-fakeable items.
- **Expected impact:** Prevents premature "ready" claims; makes blocked surfaces visible instead of silently assumed-good.
- **Effort:** S
- **Risk:** None (doc/checklist).
- **Prerequisites:** P0-1.
- **Files likely affected:** `15_READINESS_DECISION.md` (cross-link), `scripts/check-route-transition-readiness.ts` (gate list).
- **Tests required:** None.
- **Owner gate required?** No
- **Can ship before beta?** Yes
- **Must be measured before implementation?** No.
- **Finding refs:** TG10, TG07, RT07, TG09, INV08, GOV01.

---

## P1 — No-regret perceived-speed wins

**Theme:** Cheap, reversible, low-risk changes that improve *felt* speed (skeletons, loading
boundaries, error boundaries, churn reduction). Each P1 item on a surface requires that
surface's P0 baseline first (GATE-0).

### P1-1 — Add the missing `loading.tsx` boundaries (project detail, estimate editor, settings sub-routes)
- **Phase:** P1
- **Description:** Add route-level `loading.tsx` shells to the surfaces verified as missing one: `workshop/projects/[projectId]` (blocks shell title on `getCurrentWorkspaceProject`), `workshop/projects/[projectId]/estimates/[nodeId]` (the editor — highest-complexity surface, no route-level loading), and the four `workshop/settings/*` sub-routes. Match the **real** loaded layout (avoid wrong-shape skeletons — see P1-2).
- **Expected impact:** Eliminates blank-screen / late-shell-paint on the heaviest authed surfaces; large perceived-speed win for ~0 server cost.
- **Effort:** S–M
- **Risk:** Low (additive route files; no data change).
- **Prerequisites:** P0-4 (editor/project-detail baseline) so the skeleton matches the real layout.
- **Files likely affected:** new `src/app/workshop/projects/[projectId]/loading.tsx`, `.../estimates/[nodeId]/loading.tsx`, `.../settings/profile|workspace|feedback|beta-users/loading.tsx`.
- **Tests required:** Route-transition spec asserts `overlayCount: 0` and a shell paints; visual check skeleton shape ≈ loaded shape.
- **Owner gate required?** No
- **Can ship before beta?** Yes
- **Must be measured before implementation?** Yes — P0-4 baseline for editor/project-detail.
- **Finding refs:** RT01, RT02, RT03.

### P1-2 — Fix wrong-shaped skeletons (match the loaded layout)
- **Phase:** P1
- **Description:** Audit existing `loading.tsx` shells and any inline skeletons for shape mismatch against the real loaded UI (a wrong-shape skeleton causes a perceived second reflow / CLS-feel even when CLS is 0). Only act where the P0 capture shows a visible mismatch.
- **Expected impact:** Smoother perceived transition; removes the "skeleton then jump" feel.
- **Effort:** S
- **Risk:** Low.
- **Prerequisites:** P0-3 / P0-4 captures (screenshots of loaded vs skeleton).
- **Files likely affected:** existing `loading.tsx` files + skeleton components.
- **Tests required:** Visual diff (manual or Playwright screenshot) loaded vs skeleton.
- **Owner gate required?** No
- **Can ship before beta?** Yes
- **Must be measured before implementation?** Yes — needs the P0 screenshots to confirm a real mismatch.
- **Finding refs:** RT01, RT02; Library Optimization Plan (wrong-shape skeletons).

### P1-3 — Add the missing `error.tsx` boundaries
- **Phase:** P1
- **Description:** Add `error.tsx` to surfaces where an RSC throw currently bubbles to the global boundary: `workshop` (root), `workshop/projects` (list), `workshop/projects/[projectId]`, `workshop/templates`, all `workshop/settings/*`, and `share/[token]` / `invite/[token]`. Keep them minimal + reset-capable.
- **Expected impact:** Graceful per-segment recovery instead of full-app error screen; better resilience, no perf regression.
- **Effort:** S
- **Risk:** Low (additive).
- **Prerequisites:** P0-1 (canonical surface list).
- **Files likely affected:** new `error.tsx` files under the listed segments.
- **Tests required:** Force an RSC throw per segment; assert local boundary catches it.
- **Owner gate required?** No
- **Can ship before beta?** Yes
- **Must be measured before implementation?** No (resilience, not perf — but still P0-1 first).
- **Finding refs:** RT04.

### P1-4 — Reduce `router.refresh()` / `revalidatePath` churn
- **Phase:** P1
- **Description:** Triage the **23 `router.refresh()`** and **57 `revalidatePath`** call sites (notably the estimate/project mutation fan-out that invalidates 3 segments — project + estimates + charts — per write, and `projects-page-client` / `ProjectEstimatesTable` full-segment refresh on non-optimistic paths). Replace blunt full-segment churn with targeted TanStack query invalidation where an optimistic/cache path already exists. **Per-site review** — do not bulk-remove; some refreshes are correct.
- **Expected impact:** Fewer redundant RSC round-trips + full re-renders on every write; lower authed transition cost.
- **Effort:** M (high site count, individual judgment).
- **Risk:** Medium — over-removal can cause stale UI. Each removal must be paired with the correct query invalidation. Reconcile with the archived estimate-sheet plan (GOV12) before touching keystroke paths.
- **Prerequisites:** P0-4 (authed baseline) so before/after is measurable.
- **Files likely affected:** mutation server actions under `src/app/.../actions`, `ProjectEstimatesTable`, `projects-page-client`, estimate/project mutation hooks.
- **Tests required:** Per-changed path: assert data still updates (optimistic + settle), no stale UI, no extra RSC request beyond expected.
- **Owner gate required?** No
- **Can ship before beta?** Yes (incrementally, per site).
- **Must be measured before implementation?** Yes — P0-4 baseline; verify each change does not regress correctness.
- **Finding refs:** RT10, RT11, GOV12.

### P1-5 — Query-cache invalidation cleanup + consistent warm-route reuse
- **Phase:** P1
- **Description:** Make prefetch/warm behavior consistent: `LiveProjectCard` warms only `router.prefetch` while `ProjectEstimatesTable` warms 3 TanStack queries — align so warmed routes actually reuse cache. Extend hover/viewport prefetch to the surfaces that have none (settings, dashboard, charts, estimate nodes) where it pays off. Prove warm-route reuse with the `prefetchRscRequestMin` assertion.
- **Expected impact:** Faster warm navigations; fewer cold fetches on already-warmed routes.
- **Effort:** M
- **Risk:** Low–Medium (over-prefetch wastes bandwidth; gate to high-intent surfaces).
- **Prerequisites:** P0-4.
- **Files likely affected:** `LiveProjectCard`, prefetch hooks (`usePrefetchOnHover`), sidebar nav items, settings/charts entry points.
- **Tests required:** Route-transition spec: warm transition median + `prefetchRscRequestMin: 1` on the newly-prefetched surfaces.
- **Owner gate required?** No
- **Can ship before beta?** Yes
- **Must be measured before implementation?** Yes — confirm a real warm-reuse gap on the target surface first.
- **Finding refs:** RT05, RT06, RT11, INV11.

### P1-6 — Overlay-flash investigation (only if P0 evidence supports)
- **Phase:** P1
- **Description:** If the P0 captures show a navigation overlay flashing on fast transitions, scope the fix. Currently the overlay assertion is `overlayCount: 0` in the smoke spec and there is no captured evidence of a flash this session — so this is a **conditional** item, opened only if P0 surfaces one.
- **Expected impact:** Removes a jarring flash on quick navs (if it exists).
- **Effort:** S (if real).
- **Risk:** Low.
- **Prerequisites:** P0-3 / P0-4 evidence of a flash.
- **Files likely affected:** the global navigation overlay component (the Library plan implicates a global nav overlay).
- **Tests required:** Assert `overlayCount: 0` holds on the affected transition.
- **Owner gate required?** No
- **Can ship before beta?** Yes
- **Must be measured before implementation?** Yes — do not act without captured evidence of the flash.
- **Finding refs:** TG01 (overlay assertions), Library Optimization Plan (global nav overlay); GATE-0.

---

## P2 — Bundle & hydration

**Theme:** Reduce shipped/hydrated JS, concentrated on the public LCP-critical landing route
and the heaviest authed editor route. **Every byte-sized item requires the P0-3/P0-4 treemap
first** — no blind splitting.

### P2-1 — Defer `roughjs` out of the landing entry chunk
- **Phase:** P2
- **Description:** `roughjs` (whole import) ships in the landing first-load JS via the Animated Proposal Record section (LCP-critical public route) yet only executes inside an IntersectionObserver effect. `next/dynamic` the Animated section and/or `await import('roughjs')` inside its existing IO effect; keep SSR markup. Deferred-execution-but-not-deferred-download — fix the download.
- **Expected impact:** Removes a heavy lib from the `/` entry chunk; lower public TBT/first-load JS. Size after P0-3 treemap.
- **Effort:** S–M
- **Risk:** Low (markup preserved; decoration is post-paint anyway). Respect `prefers-reduced-motion`.
- **Prerequisites:** **P0-3 treemap** (size the win).
- **Files likely affected:** `AnimatedProposalRecordSection` / `CompanyProofCarouselSection` and their import sites.
- **Tests required:** Visual: SSR markup intact, decoration still runs on scroll; reduced-motion skips it; treemap confirms `roughjs` left the entry chunk.
- **Owner gate required?** No
- **Can ship before beta?** Yes
- **Must be measured before implementation?** Yes — P0-3.
- **Finding refs:** PERF-BN-01, INV10, AS09.

### P2-2 — Defer `rough-notation` out of the synchronous Hero render path
- **Phase:** P2
- **Description:** `rough-notation` is statically imported into the landing Hero + LaunchFeatureHeading + Animated section but runs only inside effects. `await import('rough-notation')` inside those effects; skip on `prefers-reduced-motion` (reuse the Neat reduced-motion pattern).
- **Expected impact:** Removes `rough-notation` from synchronous Hero JS; lower public first-load JS. Size after P0-3.
- **Effort:** S
- **Risk:** Low.
- **Prerequisites:** P0-3 treemap.
- **Files likely affected:** landing Hero, `LaunchFeatureHeading`, Animated section.
- **Tests required:** Annotation still draws after paint; reduced-motion skips; treemap confirms removal.
- **Owner gate required?** No
- **Can ship before beta?** Yes
- **Must be measured before implementation?** Yes — P0-3.
- **Finding refs:** PERF-BN-02, INV10.

### P2-3 — Lazy-load `lenis/react` after the reduced-motion check
- **Phase:** P2
- **Description:** `lenis/react` is statically imported in `LandingSmoothScrollProvider`; reduced-motion sessions still download it. Lazy-load `ReactLenis` only after the reduced-motion check passes (dynamic / `await import`). Low priority — runtime gate already exists, only the download is wasted.
- **Expected impact:** Saves the Lenis bytes for reduced-motion users; small public-route win.
- **Effort:** S
- **Risk:** Low.
- **Prerequisites:** P0-3 treemap.
- **Files likely affected:** `LandingSmoothScrollProvider`.
- **Tests required:** Reduced-motion session ships zero Lenis; normal session still smooth-scrolls.
- **Owner gate required?** No
- **Can ship before beta?** Yes
- **Must be measured before implementation?** Yes — P0-3.
- **Finding refs:** PERF-BN-03, AS09, INV10.

### P2-4 — Assert `three` / `@firecms/neat` never leak past the dynamic boundary (+ CI guard)
- **Phase:** P2
- **Description:** `@firecms/neat` pulls `three` (very heavy) for the landing hero background only; `NeatWireframeBackground` is already `ssr:false` dynamic. **Verify via the P0-3 treemap that `three` is in an async chunk with zero bytes in the `/` entry**, then add a lint/CI grep guard forbidding static `three` / `@firecms/neat` imports outside `NeatWireframeBackground.tsx`.
- **Expected impact:** Locks in an existing win; prevents future regression of the single heaviest public dep.
- **Effort:** S
- **Risk:** Low (mostly verification + guard).
- **Prerequisites:** P0-3 treemap.
- **Files likely affected:** lint config / a CI grep step; no product change if the assertion passes.
- **Tests required:** Treemap assertion; CI guard fails on a static `three` import outside the allowed file.
- **Owner gate required?** No (the CI guard itself is additive; CI *activation* is owner-gated — see P5).
- **Can ship before beta?** Yes (the guard); the treemap assertion is P0.
- **Must be measured before implementation?** Yes — P0-3.
- **Finding refs:** PERF-BN-08, INV10, AS09.

### P2-5 — Confirm `react-complex-tree` JS placement; scope its CSS
- **Phase:** P2
- **Description:** `react-complex-tree` CSS is verified loading at the workshop layout (all `/workshop/*`) though most workshop routes don't need the tree. Use the P0 treemap to confirm whether the **JS** is in a shared chunk or the route chunk. Target: tree JS only in the editor + library-tree route chunks. If the CSS cost matters, move `style-modern.css` into the already-dynamic tree components; verify no unstyled flash.
- **Expected impact:** Removes tree JS/CSS from workshop routes that never render a tree.
- **Effort:** M
- **Risk:** Medium — moving CSS into dynamic components risks a flash-of-unstyled-tree; verify.
- **Prerequisites:** **P0-4 treemap** (shared vs route chunk).
- **Files likely affected:** `WorkshopCollectionLayout` / workshop layout, the dynamic tree components, `style-modern.css` import site.
- **Tests required:** Visual: no unstyled tree flash on first render; treemap confirms placement.
- **Owner gate required?** No
- **Can ship before beta?** Yes
- **Must be measured before implementation?** Yes — P0-4.
- **Finding refs:** PERF-BN-06, CR08.

### P2-6 — Estimate-editor entry-chunk split decisions (measurement-first)
- **Phase:** P2
- **Description:** The editor is the heaviest authed surface (tree + content + phosphor + tree-lib; the split landed but is byte-unverified). **Capture editor Lighthouse + treemap first (P0-4)**, then decide whether further splits (activity-history, tab strip, copilot) are warranted. Hold TBT against the baseline. Do NOT pre-split blind.
- **Expected impact:** Lower editor entry-chunk + TBT — but only the splits the treemap justifies.
- **Effort:** M (after measurement).
- **Risk:** Medium — over-splitting adds request waterfalls; gate by measured payoff.
- **Prerequisites:** P0-4 (editor Lighthouse + treemap).
- **Files likely affected:** `EstimateSheetContent` and its sub-panels (activity-history, tab strip, copilot) import sites.
- **Tests required:** Editor route-transition: TBT held vs baseline; treemap confirms entry-chunk reduction.
- **Owner gate required?** No
- **Can ship before beta?** Yes
- **Must be measured before implementation?** Yes — P0-4 is a hard precondition.
- **Finding refs:** PERF-BN-07, CR08, DB01, INV08.

### P2-7 — Migrate persisted-URL `<img>` thumbnails to `next/image`
- **Phase:** P2
- **Description:** Three Supabase-storage thumbnails bypass `next/image` (raw `<img>`): `ProjectDetailsModal`, `NewProjectImagePanel`, `library/ComponentInspectorDock`. Migrate the **two persisted-URL** thumbs to `next/image` (the `remotePattern` is already set in `next.config`) with `sizes` + width/height for bounded bytes + CLS 0. Keep the `blob:` preview as a raw `<img>` (documented exception — the optimizer can't transform a blob).
- **Expected impact:** Bounded image bytes + responsive sizing + zero CLS on those panels.
- **Effort:** S
- **Risk:** Low (remotePattern present; one documented exception).
- **Prerequisites:** P0-4 (per-image bytes baseline) — light, can proceed with the known remotePattern.
- **Files likely affected:** `ProjectDetailsModal`, `NewProjectImagePanel`, `library/ComponentInspectorDock`.
- **Tests required:** Images render; no CLS; blob preview still works as documented raw `<img>`.
- **Owner gate required?** No
- **Can ship before beta?** Yes
- **Must be measured before implementation?** Recommended (per-image bytes), not strictly blocking.
- **Finding refs:** PERF-BN-05, AS10, AS05.

### P2-8 — Phosphor icon import hygiene (low-priority mechanical normalize)
- **Phase:** P2
- **Description:** Phosphor import style is inconsistent (98 deep `/dist/ssr` vs 26 barrel). Production byte impact is ~0 because `optimizePackageImports` is wired. Normalize the ~26 barrel value-imports to one convention (`/dist/ssr`), skip type-only imports. Bundle with other cleanups; do not do as a standalone change.
- **Expected impact:** ~0 prod bytes (already optimized); consistency / future-proofing only.
- **Effort:** S (mechanical).
- **Risk:** Low.
- **Prerequisites:** None functionally; bundle with another P2 change.
- **Files likely affected:** ~26 import sites across UI/workshop/landing/notifications.
- **Tests required:** Build passes; no icon regressions; treemap unchanged (confirms ~0 impact).
- **Owner gate required?** No
- **Can ship before beta?** Yes
- **Must be measured before implementation?** No (neutral by `optimizePackageImports`).
- **Finding refs:** PERF-BN-09.

### P2-9 — Global CSS / font verification (act only if prod build proves bloat)
- **Phase:** P2
- **Description:** `globals.css` (18.4KB raw, 29 animations) ships on every route incl. `/share` (most byte-sensitive). **Confirm Tailwind v4 purge is active in the production build** (emitted per-route CSS) before any action. Separately, reconcile the font discrepancy: the design system claims "SF Pro" but the app ships `Roboto_Mono` via `next/font/google` — SF Pro is the system stack (no download), Roboto Mono is the only downloaded font, and it is preloaded app-wide but the authed UI never uses `font-mono`. Decide: drop the unused mono preload or apply it intentionally; correct the design-system doc either way. No CSS split recommended unless the prod build proves bloat.
- **Expected impact:** Potentially drop an unused preloaded font + confirm CSS is purged; smallest-priority public/share byte trim.
- **Effort:** S
- **Risk:** Low.
- **Prerequisites:** P0-3 (prod build per-route CSS) — needed to prove bloat before acting.
- **Files likely affected:** `src/app/layout.tsx` (font), `globals.css`, design-system / README doc.
- **Tests required:** Prod build per-route CSS inspection; confirm no visual regression if mono preload changes.
- **Owner gate required?** No
- **Can ship before beta?** Yes
- **Must be measured before implementation?** Yes — do not split/strip without prod-build evidence.
- **Finding refs:** PERF-BN-10, RLS10, CR06, RT08, INV06, AS02, AS06, GOV09, TG12 (the font discrepancy is reported across many findings — treat as one fix).

---

## P3 — Data & server

**Theme:** Eliminate server waterfalls, project explicit columns, push aggregation into RPCs,
fix RLS initplan hot spots, apply measured indexes. **DB items are owner-gated and EXPLAIN-first.**

### P3-1 — Collapse the double identity resolution + per-navigation server waterfalls
- **Phase:** P3
- **Description:** Authenticated identity is resolved **twice** per workshop navigation (`proxy` `auth.getUser` + shell `getCurrentUserContext`) across the React.cache boundary; project layout + estimate-node page run multi-hop sequential awaits before content paints (partially mitigated). Collapse the duplicate identity resolution and parallelize independent awaits.
- **Expected impact:** Directly attacks the dominant authed cost — LCP ~3.5–3.9s is **server response**, not route-transition infra (observed). High-value.
- **Effort:** M–L
- **Risk:** Medium — identity/auth path is sensitive; must not weaken `getUser()`-over-`getSession()` posture or RLS.
- **Prerequisites:** **P0-4 authed baseline** (LCP/serverResponse) to prove the win.
- **Files likely affected:** `src/proxy.ts` (read-only reconcile), shell `getCurrentUserContext`, `getCurrentWorkspaceProject` (already `React.cache`d), project layout + estimate-node page awaits.
- **Tests required:** Auth still enforced (unauth → /login); identity correct; serverResponse + LCP improved vs P0-4 baseline.
- **Owner gate required?** No (code-level), but coordinate with auth posture.
- **Can ship before beta?** Yes
- **Must be measured before implementation?** Yes — P0-4.
- **Finding refs:** INV02, INV07, RT12, INV08, RT02.

### P3-2 — Explicit column projections (replace `select('*')`)
- **Phase:** P3
- **Description:** **67 `select('*')`** in `src/lib`. Replace with explicit column lists on hot read paths first (estimate tree fetch, component-library loader, project/estimate lists). Editor tree is fetched via the browser Supabase client and ships the **full row payload** to the client (DB01) — narrow it to the columns the UI needs.
- **Expected impact:** Smaller payloads over the wire + less RLS work per row; helps editor (DB01) and lists.
- **Effort:** M (high count; prioritize hot paths).
- **Risk:** Medium — missing a needed column breaks UI; change per-query with the consuming component in view.
- **Prerequisites:** P0-4 (which payloads are heaviest).
- **Files likely affected:** estimate tree fetcher, component-library full loader, project/estimate list queries in `src/lib`.
- **Tests required:** Per-query: UI still has every field it reads; payload size reduced.
- **Owner gate required?** No
- **Can ship before beta?** Yes (incrementally)
- **Must be measured before implementation?** Yes — P0-4 to prioritize.
- **Finding refs:** DB01, DB04 (adjacent), GROUND TRUTH (67 `select('*')`).

### P3-3 — Wire the existing `get_project_chart_buckets` RPC
- **Phase:** P3
- **Description:** `get_project_chart_buckets` (SECURITY INVOKER, WITH RECURSIVE) **exists in migrations but is never called** — charts still fold raw facts in server JS. Wire the RPC (replacing the JS fold). NOTE: the RPC is **not yet applied to hosted** and there is a RECURSIVE category-climb that scans the whole `component_category_nodes` table — EXPLAIN it before relying on it. This is also a JS/RPC dual-maintenance + hosted-apply-drift hazard.
- **Expected impact:** Charts payload + server compute moves to a single RPC; removes the JS fold.
- **Effort:** M
- **Risk:** Medium — RPC not applied to hosted (deploy-time landmine, GOV05); RECURSIVE scan cost unproven (RLS03).
- **Prerequisites:** **Owner-gated hosted apply** of the RPC migration (GOV05); EXPLAIN on the RECURSIVE climb (P3-4 method); P0-4 charts baseline.
- **Files likely affected:** charts data fetcher (the current JS fold), wiring to call `get_project_chart_buckets`.
- **Tests required:** Chart output byte-parity vs the JS fold (golden); EXPLAIN shows acceptable plan; hosted apply verified before wiring depends on it.
- **Owner gate required?** Yes — hosted migration apply (GOV05/GOV06).
- **Can ship before beta?** Conditional — code can be staged; depends on owner applying the migration.
- **Must be measured before implementation?** Yes — EXPLAIN + parity.
- **Finding refs:** DB02, RLS03, RLS09, GOV05, GOV03.

### P3-4 — RLS initplan + helper-chain hot-path optimization
- **Phase:** P3
- **Description:** `is_platform_admin()` uses **bare** `auth.uid()`+`auth.jwt()` (not initplan-wrapped) and gates **every** access helper; the first OR-branch of `can_access_estimate` / `can_edit_estimate` / `current_project_access_rank` / `can_access_project` does a profiles lookup per helper eval; ~152 (or 182 bare vs 33 wrapped, per GOV10) bare `auth.uid()` call sites remain after the 2026-06-14 helper-only initplan fix. Wrap `auth.uid()`/`auth.jwt()` in `(select …)` so the planner evaluates them once per query (initplan), and reduce redundant profiles lookups in the deep helper chain on `estimate_nodes` / `estimate_row_items` hot paths.
- **Expected impact:** Lower per-row RLS cost on the hottest tables (editor tree, row items) — the deep helper chain is on the first-paint path.
- **Effort:** M–L (coordinate-once whole-repo wrap referenced in GOV10).
- **Risk:** **High** — RLS is a security boundary; a wrong rewrite changes access. Owner-gated, EXPLAIN-first, in a maintenance window.
- **Prerequisites:** **Owner gate** (DB security change); live EXPLAIN + RLS timing (currently BLOCKED — RLS08); a migration authored + reviewed; verify access semantics unchanged.
- **Files likely affected:** RLS policy migrations (new migration), `is_platform_admin()` + the four access helpers.
- **Tests required:** RLS regression suite (each role sees exactly what it should — no more, no less); EXPLAIN shows initplan eval; timing improved.
- **Owner gate required?** Yes — security-boundary DB change (GOV06).
- **Can ship before beta?** No — needs owner + maintenance window + live EXPLAIN proof.
- **Must be measured before implementation?** Yes — EXPLAIN + RLS regression mandatory.
- **Finding refs:** RLS01, RLS02, DB04, GOV10, INV03, RLS08.

### P3-5 — Apply the measured P1 index candidates + advisor FKs
- **Phase:** P3
- **Description:** The database-indexing plan's P1 composite-index candidates remain **unapplied and EXPLAIN-unvalidated**; advisor-flagged unindexed FKs (T4 shared-link + ai/audit/event tables) remain candidates. EXPLAIN each candidate against representative data, then apply only the ones a real query plan justifies. NOTE: 28 feature migrations already have `CREATE INDEX` — "no indexes exist" is false (GOV03); do not over-index.
- **Expected impact:** Faster hot queries where EXPLAIN proves a missing index; no benefit (and write cost) for unjustified ones.
- **Effort:** M
- **Risk:** Medium–High — index **drops** are irreversible/owner-gated; adds are safer but still need a maintenance window and EXPLAIN proof. Index work must stay human-DBA.
- **Prerequisites:** **Owner gate**; representative seeded data (TG04 says the seed generator is manifest-only with no DB write path — needs a real seed first); live EXPLAIN (BLOCKED this session).
- **Files likely affected:** new index migrations (owner-applied).
- **Tests required:** EXPLAIN before/after each index; confirm planner uses it; no write-path regression.
- **Owner gate required?** Yes — DB change + any drop is irreversible (GOV06).
- **Can ship before beta?** No — needs EXPLAIN proof + owner.
- **Must be measured before implementation?** Yes — EXPLAIN-first, mandatory.
- **Finding refs:** RLS04, RLS05, DB03, GOV03, RLS06, TG04.

### P3-6 — Excel export + share-read hot-path efficiency
- **Phase:** P3
- **Description:** Proposal XLSX export is a synchronous heavy server op (ExcelJS, node runtime, `maxDuration` 60s) that buffers the **entire** workbook in memory with a multi-tree DB fan-out (no streaming/progress). Public share GET re-resolves the token **twice** and records an event **synchronously** on the hot read path; per-row estimate mutation pre-reads the row (nested-join SELECT) before each write RPC. Add export progress/feedback (P4 RUM-adjacent), de-duplicate the share token resolution, and move the share event write off the synchronous read path.
- **Expected impact:** Snappier share reads (remove the second token resolve + sync event write); faster perceived export (immediate feedback); lighter per-row write.
- **Effort:** M
- **Risk:** Medium — share read is on the public-firewall path (keep the rows-survive-on-any-node corridor intact); export change must not drop data.
- **Prerequisites:** P0 share-route baseline; coordinate with the estimate-unification corridor (do not regress the share firewall).
- **Files likely affected:** `api/share/[token]` GET, share event recorder, `create-proposal-workbook.ts` + export route (feedback/progress), per-row mutation RPC caller.
- **Tests required:** Share read byte-parity + firewall intact; export output unchanged; event still recorded (just off the hot path).
- **Owner gate required?** No (code-level).
- **Can ship before beta?** Yes
- **Must be measured before implementation?** Yes — share + export baseline.
- **Finding refs:** DB08, DB07, DB05, INV12, DB06.

---

## P4 — Production / RUM readiness

**Theme:** Field telemetry + production-like proof. **Blocked by a known contradiction
(GOV02) that the owner must resolve before any RUM package is touched.**

### P4-1 — Resolve the field-RUM contradiction, then wire the chosen RUM source
- **Phase:** P4
- **Description:** Multiple findings (AS01, CR07, RT09, TG03) recommend wiring `@vercel/speed-insights` for field Web Vitals. **GOV02 (Verified/High) says Speed Insights RUM was REMOVED in production as a security remediation** (a markers-in-HTML concern) and that any plan still recommending it is contradicted. **Do NOT re-add `@vercel/speed-insights` without re-checking the original security finding.** The owner must choose: **(a)** re-add Speed Insights with the security finding addressed and sensitive-path redaction (`/share`, `/invite`, `/workshop` not leaked into RUM, mirroring the `@vercel/analytics` URL redaction already in place), OR **(b)** formally adopt `@vercel/analytics` + synthetic/Lighthouse as completion proof and rewrite the readiness acceptance criteria (docs 17/26) to not depend on Speed Insights. The readiness script's `coreVitalsGood` gate currently **cannot pass** without a field beacon — so this is a launch blocker either way, and a **decision**, not a code task, until the owner picks a path.
- **Expected impact:** Unblocks the readiness gate; gives p75 FCP/LCP/INP/CLS field data — but only via the path the owner approves.
- **Effort:** S (code) once the decision is made; the decision itself is the gate.
- **Risk:** **High governance risk** — re-adding the removed package without addressing the security finding would reintroduce the exact issue that triggered its removal.
- **Prerequisites:** **Owner decision** recorded in `.ai/10_state/decisions.md`; if path (a), the security finding must be re-checked and addressed first.
- **Files likely affected:** `src/app/layout.tsx` (mount + redaction) IF path (a); readiness acceptance docs (17/26) + `scripts/check-route-transition-readiness.ts` IF path (b).
- **Tests required:** If (a): verify in a **live deployment** that RUM rows appear and that `/share`/`/invite`/`/workshop` URLs are redacted before declaring readiness. If (b): readiness script green against the adopted source.
- **Owner gate required?** Yes — and this is the single hardest gate in the pack (security + governance).
- **Can ship before beta?** No — owner decision blocks it; field data needs production.
- **Must be measured before implementation?** Yes — and verified in a live deployment after.
- **Finding refs:** GOV02 (authoritative), AS01, CR07, RT09, TG03, INV04, DB09, AS08 (redaction precedent).

### P4-2 — Production-build authed Lighthouse + INP monitoring
- **Phase:** P4
- **Description:** All Playwright perf evidence currently runs against the **dev server**, not a production build (TG06); Lighthouse is a manual, undependencied step with an empty archived report (TG07); INP is **unmeasured** everywhere. Stand up authed Lighthouse against `next start` (production build) with owner storage state, and add INP capture (lab via Lighthouse interaction; field via the P4-1 source once chosen).
- **Expected impact:** Real production-like authed numbers + the missing INP dimension; the CLOSED-BETA budget rows that are "unmeasured" get values.
- **Effort:** M
- **Risk:** Low (measurement).
- **Prerequisites:** P0-4; owner storage state; a production build window.
- **Files likely affected:** `scripts/` Lighthouse runner config, `e2e/` (production-target mode), `evidence/` archive.
- **Tests required:** Reports archived with non-empty payloads; INP captured; budgets compared to CLOSED-BETA tier.
- **Owner gate required?** Yes — authed storage state.
- **Can ship before beta?** Yes (measurement).
- **Must be measured before implementation?** N/A.
- **Finding refs:** TG06, TG07, TG02, TG10, INV08, TG08.

### P4-3 — Close the manual bfcache + React Profiler proof gates
- **Phase:** P4
- **Description:** bfcache restore is proven only by an **inconclusive** Playwright assertion (Lighthouse `bfcacheScore` 0; `pageshow.persisted=false` under Playwright); the production React Profiler trace for the estimate-sheet keystroke path remains OPEN. These are the only true plan-completion gates for route-transition and for the estimate-sheet keystroke perf (which is governed by an archived plan with explicit REJECTED options — GOV12). Capture a manual Chrome DevTools "restored from bfcache" proof and a production React Profiler trace.
- **Expected impact:** Closes the last route-transition + keystroke-perf completion gates with un-fakeable manual proof; allows the route-transition plan to finally archive (GOV01).
- **Effort:** S–M (manual capture).
- **Risk:** Low.
- **Prerequisites:** Production build + real Chrome (not Playwright headless for the bfcache proof); owner session for the authed editor profile.
- **Files likely affected:** None in `src/` (capture only); `evidence/` archive; cross-link `15_READINESS_DECISION.md`.
- **Tests required:** DevTools screenshot "restored from bfcache"; Profiler trace showing keystroke render cost (do NOT re-propose virtualization/`useDeferredValue` without a real miss in the trace — GOV12).
- **Owner gate required?** Partially — authed editor profile needs a session.
- **Can ship before beta?** Yes (it is proof, not a change).
- **Must be measured before implementation?** N/A.
- **Finding refs:** RT07, TG09, INV09, GOV01, GOV12, CR01, CR03.

### P4-4 — Seeded/realistic fixtures for peak-load benchmarking
- **Phase:** P4
- **Description:** The peak-load "benchmark" is **jsdom render-count only** and the seed generator is **manifest-only with no DB write path** (TG04) — there is no realistic large-estimate fixture to measure against. Build a real seed-to-DB path with representative volumes (large estimate trees, many row items) so editor/charts/export and the index candidates (P3-5) can be measured under load.
- **Expected impact:** Enables real peak-load measurement; prerequisite for honest P3-5 index EXPLAINs and large-estimate strategy.
- **Effort:** M
- **Risk:** Low–Medium (seed must write to a non-production DB only).
- **Prerequisites:** Owner-provided non-production DB target; P0-1 surface list.
- **Files likely affected:** seed scripts (new DB-write path), `evidence/` fixture manifest.
- **Tests required:** Seed produces representative volumes; benchmark runs against seeded data.
- **Owner gate required?** Yes — DB target selection (must not seed production).
- **Can ship before beta?** Yes (test infra).
- **Must be measured before implementation?** N/A (it enables measurement).
- **Finding refs:** TG04, CR03, DB03, RLS04.

---

## P5 — Post-beta scale

**Theme:** Larger structural investments justified only after beta + RUM data. Most are
explicitly owner-gated or deferred. Do not start these for closed beta.

### P5-1 — Virtualization on the estimate tree / sheet / row tables (only if a real browser miss is proven)
- **Phase:** P5
- **Description:** No virtualization on the estimate tree, sheet, or row tables — full render of every node/row (CR03); every keystroke recomputes whole-tree derivations on the 2212-line sheet component (CR01); `collectEditableRows` rebuilds the full editable map on every settle (CR05); a whole-tree `JSON.stringify` signature is computed on every prop sync (CR04). **GOV12: the estimate-sheet keystroke/virtualization perf is governed by an archived plan with explicit REJECTED options — do NOT re-propose `useDeferredValue`/`useOptimistic`/virtualization without a real browser miss** captured in the P4-3 React Profiler trace.
- **Expected impact:** Potentially large on very large estimates — but unproven; the archived plan rejected speculative options.
- **Effort:** L
- **Risk:** **High** — sheet is the core surface; the archived decision explicitly rejected these without a proven miss.
- **Prerequisites:** **P4-3 React Profiler proof of a real miss** + **P4-4 large seeded fixture**; reconcile with the archived plan + owner.
- **Files likely affected:** `EstimateSheetContent` (2212 lines), tree component, row tables, derivation memoization.
- **Tests required:** Profiler shows keystroke cost dropped on a large fixture; correctness unchanged; no regression on small estimates.
- **Owner gate required?** Yes — overrides an archived REJECTED decision.
- **Can ship before beta?** No.
- **Must be measured before implementation?** Yes — a captured real miss is mandatory (GOV12).
- **Finding refs:** CR01, CR03, CR04, CR05, GOV12, DB01.

### P5-2 — Background jobs for export / AI / upload
- **Phase:** P5
- **Description:** Move the synchronous heavy server operations (proposal XLSX export buffering the whole workbook; AI ask/package-builder; image upload processing) to background jobs with progress/feedback, so they don't hold a 60s `maxDuration` function or block interaction.
- **Expected impact:** Removes long synchronous server holds; better UX on heavy ops at scale.
- **Effort:** L
- **Risk:** Medium — new infra (queue/worker); owner-gated (Redis/queue infra is currently deferred — GOV06).
- **Prerequisites:** Owner decision on background-job infra (deferred per GOV06); P3-6 (incremental export feedback first).
- **Files likely affected:** export route, AI routes, image route, new worker/queue infra.
- **Tests required:** Job lifecycle (enqueue → progress → complete → error); output parity with the synchronous path.
- **Owner gate required?** Yes — infra decision (GOV06: Redis deferred).
- **Can ship before beta?** No.
- **Must be measured before implementation?** Yes — only worth it under proven load (P4-4).
- **Finding refs:** INV12, DB05, DB06, GOV06.

### P5-3 — CDN / image pipeline maturation
- **Phase:** P5
- **Description:** Private project images bypass `next/image` (served via a Node API route, 5-min browser cache, no edge/optimizer transform — AS10); the 2.7MB unoptimized `sidebar-BG.png` is served as a CSS background on every authed page (AS04); ~10MB of orphaned/dead assets ship in `public/` (AS03). Mature the image pipeline: optimize/serve the sidebar bg through a transform, route private images through an edge-cacheable optimized path, and purge the dead assets.
- **Expected impact:** Lower authed asset bytes (2.7MB bg on every page is significant) + cleaner `public/`.
- **Effort:** M–L (the private-image edge path is the hard part; dead-asset purge is trivial and could be pulled into P2).
- **Risk:** Medium — private images are RLS-gated; an edge path must not leak private buckets.
- **Prerequisites:** P0-4 (authed asset weight); security review for any private-image edge caching.
- **Files likely affected:** sidebar bg asset + CSS, `api/projects/images` route, `public/` cleanup.
- **Tests required:** Private images still RLS-gated; no private bucket leak; sidebar bg bytes reduced; dead assets gone.
- **Owner gate required?** Partially — private-image edge path needs security sign-off.
- **Can ship before beta?** Partially — dead-asset purge + sidebar-bg optimization yes; private-image edge path post-beta.
- **Must be measured before implementation?** Yes for the bytes; the dead-asset purge is safe to do early.
- **Finding refs:** AS03, AS04, AS10, AS05, PERF-BN-05.

### P5-4 — Search / index expansion + pagination/virtualization for large lists
- **Phase:** P5
- **Description:** As data grows, add pagination/virtualization to large authed lists (projects, components, templates) and expand DB indexes/search to match the new access patterns. Gated on proven volume — the estimates-list/library/charts surfaces were just optimized and archived (GOV04); do not re-optimize them speculatively.
- **Expected impact:** Keeps lists fast at scale.
- **Effort:** L
- **Risk:** Medium.
- **Prerequisites:** P4-4 (proven volume), P3-5 (index method), GOV04 (don't re-touch archived surfaces).
- **Files likely affected:** list components + their queries; new indexes (owner-gated).
- **Tests required:** Lists render fast at the seeded volume; indexes EXPLAIN-justified.
- **Owner gate required?** Yes — index work (GOV06).
- **Can ship before beta?** No.
- **Must be measured before implementation?** Yes.
- **Finding refs:** DB03, RLS04, GOV04, TG04.

### P5-5 — Observability dashboard + regression budgets in CI
- **Phase:** P5
- **Description:** Documented production monitoring (alerting, regression detection, dashboards) is **aspirational** — the shipped `PerformanceMonitor` is dev-console only (TG08); the CI perf-smoke workflow is **defined but inactive** (last ran 2026-05-18, all failures, decision-gated to stay disabled — TG05). Stand up a real observability dashboard (fed by the P4-1 RUM source) and re-activate CI perf-smoke against the SMOKE tier (P0-2), with the CLOSED-BETA readiness budgets gating release manually.
- **Expected impact:** Continuous regression detection + field visibility; closes the monitoring governance gap.
- **Effort:** L
- **Risk:** Medium — CI re-activation is owner-gated (CI/CD currently deferred — GOV06); a flaky perf job is worse than none.
- **Prerequisites:** **Owner decision to re-activate CI** (GOV06); P4-1 (RUM source); P0-2 (budget tiers); stable production build (TG06).
- **Files likely affected:** `.github/workflows/ci.yml` (exists; re-activation owner-gated), dashboard config, `PerformanceMonitor` (promote beyond dev-console).
- **Tests required:** CI perf-smoke green against SMOKE tier; dashboard shows live p75; no flaky failures.
- **Owner gate required?** Yes — CI/CD re-activation (GOV06).
- **Can ship before beta?** No.
- **Must be measured before implementation?** Yes — needs the RUM source + stable build first.
- **Finding refs:** TG05, TG08, AS01/GOV02 (RUM source), GOV06, GOV11, P0-2.

---

## Appendix A — Phase → finding-ref coverage map

| Phase | Backlog items | Primary finding refs |
|-------|---------------|----------------------|
| P0 Measurement & Truth | P0-1 … P0-5 | TG01, TG02, TG05, TG06, TG07, TG10, TG11, GOV08, GOV11, PERF-BN-04, RT07, INV08 |
| P1 Perceived-speed | P1-1 … P1-6 | RT01, RT02, RT03, RT04, RT05, RT06, RT10, RT11, GOV12 |
| P2 Bundle & hydration | P2-1 … P2-9 | PERF-BN-01…10, INV01, INV10, CR08, AS02–AS10, RLS10, font cluster |
| P3 Data & server | P3-1 … P3-6 | INV02, INV07, RT12, DB01–DB08, RLS01–RLS06, GOV03, GOV05, GOV10, INV12 |
| P4 RUM readiness | P4-1 … P4-4 | GOV02, AS01, CR07, RT09, TG03, TG04, TG06, TG07, TG09, INV04, INV09, RT07, GOV01 |
| P5 Post-beta scale | P5-1 … P5-5 | CR01, CR03, CR04, CR05, GOV12, INV12, DB05, AS03, AS04, AS10, TG05, TG08, GOV04, GOV06 |

## Appendix B — Owner-gate index (do not proceed without sign-off)

- **P3-3** hosted apply of `get_project_chart_buckets` (GOV05)
- **P3-4** RLS initplan / helper-chain rewrite — security boundary (GOV06)
- **P3-5** index candidates + advisor FKs; any drop is irreversible (GOV06)
- **P4-1** field-RUM contradiction resolution — security + governance (GOV02)
- **P4-2 / P4-4** authed storage state / non-production seed DB target
- **P5-2** background-job infra (Redis deferred, GOV06)
- **P5-3** private-image edge caching — security review
- **P5-4** index expansion (GOV06)
- **P5-5** CI/CD re-activation (GOV06)

> Reminder: PITR is off and several DB items are irreversible. No DB/provider mutation is
> performed from this backlog — these are recommendations gated on owner sign-off recorded in
> `.ai/10_state/decisions.md`.
