# 11 — Implementation Plan (revised)

Execution guide for the implementation AI. Dependency-aware phases with exact paths, symbols, and unit IDs. **Re-read every touched file immediately before editing; coordinate via file-scope ownership; small diffs. No vague "decide in-task" instructions — every decision is resolved below or logged as an open decision with owner/trigger/impact.**

> **Profile:** `standard`. Phases are independently landable EXCEPT the sequencing rule in P0-2/Phase 2 (security gate must stay first).

---

## Core design decision: the child→layout slot contract (resolves P0-3/P0-4)

**Problem:** Next.js layouts cannot receive props from child pages. But each workshop page supplies per-page chrome variation: `title`, `eyebrow`, `showEyebrow`, `hideTitle`, `breadcrumbs`, `titleSlot` (e.g. `<WorkshopHeaderGreeting>`, `<LibraryTitleBarClient>`, `<ProjectTitleAsync>`), `actions`, `centerHeader`, `subHeader`, **4 distinct `canvasClassName` washes** (`dashboard-transparent-shell`, `projects-canvas-wash`, `publisher-canvas-wash`, `library-canvas-wash`), `alignChromeToProjectSidebar`, `projectId`, and `sidebarStatus` (home passes `projectsBadgeCount`).

**Resolved contract — split the shell into PERSISTENT chrome (layout-owned) vs PER-PAGE header (page-owned):**

| Layer | Owner | What it renders | How per-page variation is supplied |
|---|---|---|---|
| **`WorkshopShell`** (layout-owned, NEW) | `workshop/layout.tsx` | Persistent ONLY: `<main data-workshop-page-shell-root>`, `WorkshopGlassBackdrop`, `<MainSidebar/>` (+Suspense fallback), `WebVitalsProbe`, sidebar-width CSS vars, the footer shell (without page-specific modals). Renders `{children}` inside `<Suspense fallback={<WorkshopContentSkeleton/>}>`. | No per-page props needed — this is the mount-once chrome. **`canvasClassName` becomes a fixed workshop-wide wash OR applied to the inner content wrapper via the children** (see below). |
| **`WorkshopRouteHeader`** (page-owned, NEW, server component) | each `page.tsx` | Per-page: `title`, `eyebrow`, `breadcrumbs`, `actions`, `centerHeader`, `subHeader`, `titleSlot`. | Each page renders `<WorkshopRouteHeader .../>` as the first child of its content. Props are page-local. |
| **`canvasClassName` wash** | each `page.tsx` | The colored canvas background. | Applied to the page's content wrapper (the page owns its content area), NOT to the shell `<main>`. The shell `<main>` keeps a neutral background. This preserves all 4 washes without a layout prop. |
| **`sidebarStatus`** (home's `projectsBadgeCount`) | `workshop/page.tsx` | Pending-invite badge count. | **Resolved via the layout's existing data fetch OR a client store.** The count comes from `homebase.receivedPendingInviteCount` fetched in `workshop/page.tsx`. Since a layout can't receive a child value, use the **existing `useNavigationUiStore`** (or a small dedicated client store) the home page writes to on mount, and `MainSidebar` reads from. This is the one genuine data-flow addition. |

**This is NOT the `library`/`projects/[projectId]` pattern** (adversarial P0-3 refuted the "same proven pattern" claim): those layouts own the whole shell for a *subtree*. Here we are sharing chrome *across top-level siblings* with per-page header variation, which requires the split above.

### Reconciliation with existing nested layouts (resolves P0-4)
- **`library/layout.tsx`:** currently renders `WorkshopPageShell` with `canvasClassName="library-canvas-wash"` + `<LibraryTabsLayoutClient>` as `subHeader` + `<LibraryTitleBarClient>` as `titleSlot`. **After Phase 1:** it must STOP rendering the full shell (the parent `workshop/layout.tsx` now renders `WorkshopShell`). It renders only `<WorkshopRouteHeader>` (library title + tabs) + `{children}`. `library-canvas-wash` moves to the library content wrapper. **`LibraryTabsLayoutClient`** stays as a sub-header inside `WorkshopRouteHeader`.
- **`projects/[projectId]/layout.tsx`:** currently renders `WorkshopPageShell` with `alignChromeToProjectSidebar`, `ProjectMiniSidebar`, `centerHeader={<ProjectEstimateMetadataStrip/>}`, `actions={<Suspense><ProjectChromeAsync/></Suspense>}`, `<ProjectTitleAsync>`, `<ProjectTotalFooterOverlay projectId>`. **After Phase 1:** stops rendering the full shell. Renders `<WorkshopRouteHeader>` (project title + metadata strip + chrome actions) + `<ProjectMiniSidebar projectId>` (the mini sidebar stays — it lives in the content area, not the shell) + `{children}`. **`alignChromeToProjectSidebar` padding:** moves to the project content wrapper (it changes content padding, applied where the mini-sidebar sits). **`ProjectTotalFooterOverlay`:** stays page/subtree-owned (it's `projectId`-specific; the footer overlay is a content-layer concern, not shell chrome).
- **DOM invariant (corrected, stronger than before):** exactly ONE `[data-workshop-page-shell-root]` AND `ProjectMiniSidebar` present ONLY under `projects/[projectId]/*`. A count-only check is insufficient — verify both presence and location.

---

## Phase 0 — Establish baseline (DISCOVERY-REQUIRED)
**Objective:** Record current-state metrics so Phase 1's improvement is provable.
**Units:** WP-0.1
- **WP-0.1:** Create `perf-baseline.md`. In a **production build** (`bun run build && bun run start` — prefetching is prod-only per `link.md:298`), measure using the **existing** `e2e/route-transition-performance.spec.ts` `authenticatedWorkshopTransition` test + `route-transition-performance-budgets.json`: (a) `transitionMs` for `/workshop`→`/workshop/projects`, (b) RSC prefetch request count, (c) `overlayCount`. Also instrument a `MainSidebar` mount-count probe (inject a `useEffect` counter) and capture INP/CLS/LCP via `WebVitalsProbe` (`NEXT_PUBLIC_PERF_TRACE=1`) or Lighthouse. Measure in `bun run dev` too and label build mode.
- **Done:** baseline artifact with numbers + build-mode labels.
- **Complexity:** Small.

---

## Phase 1 — Move persistent chrome into the layout (P0 fix) — units WP-1.1 … WP-1.6

**Objective:** `WorkshopShell` owns mount-once chrome; pages own their header. Eliminates RC-1.
**Requirements:** FR-1, FR-2, ARCH-1, UX-1, A11Y-1, SEC-1 (gate stays first).

### WP-1.1 — Create `WorkshopShell` (chrome-only server component)
- **New file:** `src/components/workshop/WorkshopShell.tsx`
- **Renders (persistent only):** `<main data-workshop-page-shell-root className="h-[100dvh] overflow-hidden text-ink">`, `<WorkshopGlassBackdrop/>`, `<AuthenticatedMainSidebar status={...}/>` (lift `AuthenticatedMainSidebar` from `WorkshopPageShell.tsx:93-` + `<Suspense fallback={<MainSidebarShellFallback/>}>`), `<WebVitalsProbe/>` (relocate from `WorkshopPageShell.tsx:176` — survives nav now), sidebar-width CSS vars (`getSidePanelWidthCssVariables` from `WorkshopPageShell.tsx:57-64`), content slot `<Suspense fallback={<WorkshopContentSkeleton/>}>{children}</Suspense>`, footer shell.
- **SEC invariant:** `WorkshopShell` is rendered by the layout ONLY after the gate passes (gate is first; see Phase 2/SEC-T1).

### WP-1.2 — Create `WorkshopRouteHeader` (page-owned header component)
- **New file:** `src/components/workshop/WorkshopRouteHeader.tsx`
- **Renders:** `WorkshopTitleHeader` with page-supplied `title/eyebrow/showEyebrow/hideTitle/breadcrumbs/titleSlot/actions/centerHeader/subHeader`. This is what each page renders as the first child of its content.

### WP-1.3 — `workshop/layout.tsx`: gate first, then `<WorkshopShell>`
- **File:** `src/app/workshop/layout.tsx`
- **Change:** gate logic (lines 18-39) stays **byte-for-byte first** and unchanged. After the gate passes (the final `return children` at line 39), wrap children: `return <WorkshopShell sidebarStatus={...}>{children}</WorkshopShell>`. Keep the `react-complex-tree` CSS import.
- **`sidebarStatus`:** the home page's `projectsBadgeCount` — wire via a client store write from `workshop/page.tsx` (read by `MainSidebar`), OR fetch the count in the layout (it already calls `getCurrentUserContext`; `receivedPendingInviteCount` would be an additional fetch — **open decision OPEN-1**, owner: impl lead, default: client store, impact: minor).

### WP-1.4 — Top-level pages: strip full shell, render header + content
- **Files (verified consumers of `WorkshopPageShell`):** `workshop/page.tsx`, `proposals/page.tsx`, `projects/page.tsx`, `publisher/page.tsx`, `settings/page.tsx`, `settings/{profile,workspace,users,feedback,upload-operations,scan-operations}/page.tsx`, `feedback/page.tsx`. **Confirmed NOT consumers:** `onboarding`, `components`, `templates`, `terms`.
- **Change per page:** replace `<WorkshopPageShell ...>` wrapper with `<WorkshopRouteHeader .../>` (page header) + the page's content. Move `canvasClassName` wash to the page's content wrapper `<div>`.
- **`WorkshopPageShell.tsx`:** after all consumers migrated, it is **deleted** (or, if a consumer pattern remains, reduced) — **decision resolved: delete it**; migrate the last consumer.

### WP-1.5 — Reconcile nested layouts (library + project) per the contract above
- **Files:** `library/layout.tsx`, `projects/[projectId]/layout.tsx`.
- **Change:** each stops rendering the full shell; renders `WorkshopRouteHeader` + (mini-sidebar for project) + children. Move `library-canvas-wash`/project padding to content wrappers.

### WP-1.6 — Loading files: content-only skeletons
- **Files:** `workshop/loading.tsx`, `proposals/loading.tsx`, `projects/loading.tsx`, `settings/loading.tsx`, `onboarding/loading.tsx`.
- **Change:** replace `StaticWorkshopLoadingShell` (mounts its own sidebar) with content-only skeletons. `StaticWorkshopLoadingShell.tsx` → reduce to content skeleton (drop `<MainSidebar/>`).

### Phase 1 validation gate
- `bun run type-check` + `bun run build` green.
- Production-build `authenticatedWorkshopTransition` e2e: `MainSidebar` mounts ONCE across `/workshop`↔`/workshop/projects`; dashboard skeleton absent on client nav.
- Exactly ONE `[data-workshop-page-shell-root]`; `ProjectMiniSidebar` present only under project subtree.
- SEC-1 denial tests pass (unauth→login; terms-pending→terms; dev-bypass unchanged).
- Existing shell-governance tests updated (see WP-1.7) and green.
- ⌘1–5 shortcuts work; focus restored.

### WP-1.7 — Update breaking tests (resolves P1-3)
- **Files:** `tests/vitest/project-dashboard-route-shell-ui.test.ts` (asserts `WorkshopPageShell` source strings at lines 45,49,52,54,55,57,63,69), `tests/vitest/estimate-sheet-route-loading.test.ts:17`, fixtures in `tests/vitest/project-dashboard-ui-fixtures.*`.
- **Change:** re-target assertions at the NEW owners: `WorkshopShell` (`data-workshop-page-shell-root`, `AuthenticatedMainSidebar`, `WorkshopContentSkeleton`) and `WorkshopRouteHeader`. Keep the governance intent (shell preamble must not contain `getCurrentUserContext`/`ensureDefaultWorkspace` — now trivially true since gate stays in layout). Re-assert `projectEstimatesPage` excludes the full old shell (now excludes `WorkshopShell` direct import; uses `WorkshopRouteHeader`).

**Complexity:** Large (many files; mechanical once `WorkshopShell`/`WorkshopRouteHeader` exist).

---

## Phase 2 — (REWRITTEN) Gate is NOT a perf problem; document, do not defer (resolves P0-2)

> **The original Phase 2 ("unblock the gate") is withdrawn — it was unsafe (SEC-T1/T2).** RC-2's blocking behavior is **correct and intentional**: the uncached reads ARE the security gate. There is nothing to "fix" for performance without weakening security.

**Objective:** Document the gate's intentional blocking; do NOT defer or Suspense-wrap it. Verify the gate stays synchronous and first.
**Units:** WP-2.1
- **WP-2.1:** In `workshop/layout.tsx`, add a code comment documenting that the `headers()`/`getCurrentUserContext()`/terms reads are the **sole production verifier** and MUST stay synchronous-first (cite `08_SECURITY_PRIVACY_THREAT_MODEL.md` SEC-T1/T2). No code behavior change. Confirm via static gate (SEC-1 AC #3) that no `await`/JSX precedes the gate.
- **Optional perf note:** if the gate's DB reads are *measured* to be slow (Phase 0 baseline), the safe optimization is to make the reads faster (caching `getCurrentUserContext` via React `cache()` where already done, indexing) — **never** to defer the decision. Out of scope to change here.
- **Done:** comment present; static gate passes.
- **Complexity:** Small.

---

## Phase 3 — Loading + prefetch polish
**Objective:** content skeletons for every leaf; verify prefetch/staleTimes.
**Units:** WP-3.1
- **WP-3.1:** Add content skeletons for leaves missing them (`publisher`, `projects/[projectId]/charts`, `projects/[projectId]/estimates` list). Now cheap (content-only). Verify `experimental.staleTimes` unchanged. Confirm sidebar nav `<Link>` prefetch behavior (hover-prefetch via `usePrefetchOnHover` stays).
- **Done:** each leaf shows a content skeleton; no blank frames.
- **Complexity:** Small–Medium.

---

## Phase 4 (OPTIONAL, owner-gated) — Evaluate `cacheComponents` + `<Activity>`
**Objective:** build-time instant-nav validation; React `<Activity>` could auto-solve remount.
**Units:** WP-4.1 (spike only)
- **WP-4.1:** Spike `cacheComponents:true` + `unstable_instant`; validate build; audit private/auth/data responses stay no-store; assess `<Activity>` for state preservation. **Separate change; owner-gated.** Note: enabling it removes `export const dynamic` validity and largely subsumes this fix.
- **Complexity:** Large. **Decision:** owner-gated.

---

## Open decisions register

| ID | Decision | Owner | Trigger | Impact if unresolved |
|---|---|---|---|---|
| OPEN-1 | `sidebarStatus.projectsBadgeCount` data-flow: client store vs layout fetch | impl lead | Phase 1 (WP-1.3) | Minor — pick client store as default |
| DEC-01 | Keep nested `/workshop/*` URLs | Philip (owner) | before/during Phase 1 | None technically; product ack |
| DEC-04 | Phase 4 cacheComponents | Philip (owner) | optional | None on Phases 1–3 |

## Parallelization
- Phase 0: direct.
- Phase 1: **sequential** (shared files). One owner.
- Phase 2: sequential (after P1; comment-only).
- Phase 3: parallel-safe across leaves AFTER Phase 1.
- Phase 4: independent spike.
