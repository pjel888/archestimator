# 05 — UX, UI, and Accessibility Plan

This is a chrome-persistence refactor: the visible workshop chrome (sidebar, header container, footer) must look and behave identically before/after; only the *loading/transition behavior* improves. No visual redesign. Explicit non-goal: decorative redesign, marketing-UI drift, new design tokens.

## Information architecture & journeys (unchanged)
- Workshop IA: `/workshop` (home) + siblings (projects, library, proposals, publisher, settings) + nested (project subtree, library subtree).
- Primary journey: navigate between workshop areas via sidebar (⌘1–5) or clicks; the chrome must stay stable; only content swaps.

## State matrix (the fix changes Loading/Partial-success behavior; others unchanged)

| State | Current (per-page shell) | After (layout-owned shell) | Proof |
|---|---|---|---|
| Loading (client nav to leaf) | full-page or per-page shell remounts; sidebar flashes | persistent shell; content skeleton only | FR-2, e2e `overlayCount`/mount-count |
| Loading (full page load) | 9.3 KB dashboard skeleton may show | layout shell renders immediately; content streams | manual direct-URL load |
| Empty | page-owned empty states | unchanged | existing tests |
| Success | page renders | unchanged | existing |
| Partial success (streaming) | Suspense fallback per page | content Suspense fallback (no sidebar remount) | FR-2 |
| Error | existing `error.tsx` files | unchanged; consider shell-level boundary so content error does NOT blank chrome (P2 improvement) | WP-1.1 footer note |
| Permission denied | gate redirect | unchanged (SEC-1) | denial tests |
| Offline / slow net | global `RouteLoadingOverlay` + skeleton | unchanged; improved (chrome persists) | QA-7 |
| Conflict / retry | n/a (no mutations in scope) | n/a | — |
| Timeout / cancel | n/a | n/a | — |

## Accessibility acceptance criteria (WCAG 2.2 AA-aligned)
- **Keyboard:** ⌘1–5 shortcuts still navigate (verify post-Phase-1); Tab order through sidebar→header→content unchanged; focus restored after nav (existing `MainSidebar` focus-rescue stays).
- **Focus:** during content swap, focus must not jump to page top (chrome persists → focus target stable). Verify no focus trap created by the content Suspense.
- **Semantics:** `<main data-workshop-page-shell-root>` landmark persists (one landmark, not duplicated — P0-4 invariant); `MainSidebar` keeps its landmark/`aria-label`; content area keeps `aria-live` polite loading announcement (from `StaticWorkshopLoadingShell`'s pattern → preserve in content skeleton).
- **Live regions:** the loading `<output aria-live="polite">` in the content skeleton must announce; the persistent sidebar must not re-announce on every nav.
- **Headings:** per-page `<WorkshopRouteHeader>` title is the page `h1`; heading order unchanged.
- **Reduced motion:** `RouteLoadingOverlay` + any transitions respect `motion-reduce` (existing). No new motion introduced.
- **Contrast / non-color cues:** unchanged.
- **Zoom/reflow:** chrome persistence must not break at 200%/400% zoom; content slot remains scrollable.

## Action-level accessibility proof matrix

| Action | Keyboard path | Focus target/restoration | Accessible name / live-region | Proof type |
|---|---|---|---|---|
| Nav `/workshop`→`/workshop/projects` via ⌘2 | ⌘2 | focus stays in sidebar; content swaps | `aria-live` announces loading | e2e/Playwright |
| Nav via click sidebar link | Tab→Enter | link focus; restore to content on load | link `aria-label`/text | DOM assertion |
| Error in content | n/a | chrome persists; error region focusable | `error.tsx` role="alert" | existing tests |
| bfcache back/forward | browser gesture | `BfcacheHandler` restores nav-UI | overlay not stuck (overlayCount 0) | existing bfcache e2e |

## Visual QA gate (proportional per AGENTS.md)
Phase 1 changes interaction/routing/visual composition of the chrome → a **targeted browser proof** is justified (not just static): the existing `e2e/route-transition-performance.spec.ts` + a visual smoke that the 4 canvas washes still apply correctly and no double-sidebar appears. Full Storybook/impeccable audit is NOT required (deferred unless Philip requests it).

## Non-goals (explicit)
- No new design tokens, no redesign, no marketing-UI drift.
- No change to copy/terminology.
- No new decorative motion.
