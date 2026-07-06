# Requirements Specification

Stable IDs per category. Each requirement: statement, rationale, source, priority, dependencies, acceptance criteria (objective + testable), validation method, affected code areas, risks, status. Source strength: `brief` (user ask), `repo evidence`, `official docs` (local Next.js docs), `derived`, `owner-delegated planning decision`.

Source-strength legend applies to every requirement's `Source` field.

---

## UX requirements (UX)

### UX-01 — Loading skeleton for every dynamic/token-bearing route
- **Statement.** Every dynamic or authenticated route whose data may not be available at first paint must provide a route-level `loading.tsx` (or equivalent in-page `<Suspense>` with a skeleton) so navigation never shows a blank canvas.
- **Rationale.** Blank canvas on navigation harms perceived speed and CLS; Next.js `loading.js` fallback is prefetched for instant feedback (official docs, loading.md L42–52).
- **Source.** `brief` + `repo evidence` (`/invite/[token]`, `/workshop/publisher`, estimates list lack loading) + `official docs`.
- **Priority.** P1.
- **Dependencies.** ARCH-01 (skeleton taxonomy).
- **Acceptance criteria.**
  - AC-UX-01a: `/invite/[token]` renders a skeleton within 1 frame of navigation (Playwright: skeleton selector visible before resolved content).
  - AC-UX-01b: `/workshop/publisher` and `/workshop/projects/[projectId]/estimates` have a `loading.tsx` (or documented equivalent) using design-system `Skeleton`.
  - AC-UX-01c: No authenticated dynamic route shows a blank document during navigation in `e2e/route-transition-performance.spec.ts`.
- **Validation.** Playwright route-transition spec + new assertion; `rg "loading.tsx"` coverage table refreshed.
- **Affected areas.** `src/app/invite/[token]/`, `src/app/workshop/publisher/`, `src/app/workshop/projects/[projectId]/estimates/`.
- **Risks.** Over-applying loading to static routes (unnecessary). Mitigation: scope to dynamic/authenticated only.
- **Status.** Planned (Phase 1).

### UX-02 — Error boundary for every authenticated subtree
- **Statement.** Every authenticated subtree under `/workshop/*` must have a route-level `error.tsx` so runtime errors render an in-place recovery UI instead of escalating to `global-error.tsx` (full-page replacement).
- **Rationale.** Today, errors in `/workshop`, `/workshop/projects`, `/workshop/projects/[projectId]`, `/workshop/proposals`, `/workshop/settings`, `/workshop/onboarding` propagate to `global-error.tsx` — a jarring full-page failure.
- **Source.** `repo evidence` (only 8 error.tsx; workshop subtree uneven).
- **Priority.** P1.
- **Dependencies.** None.
- **Acceptance criteria.**
  - AC-UX-02a: Each named subtree has an `error.tsx` delegating to `WorkshopRouteErrorState` with a per-route `routeLabel`.
  - AC-UX-02b: Playwright `workshop-route-error-boundaries.spec.ts` extended to force an error in each subtree and assert in-place recovery UI (not full-page).
- **Validation.** Playwright error-boundary spec.
- **Affected areas.** `src/app/workshop/{page,error}.tsx`, `projects/`, `projects/[projectId]/`, `proposals/`, `settings/`, `onboarding/`.
- **Risks.** Masking errors that should surface. Mitigation: error.tsx still reports via `postClientErrorReport`.
- **Status.** Planned (Phase 1).

### UX-03 — Global transition overlay must not be the only feedback on skinned routes
- **Statement.** The `RouteLoadingOverlay` (full-screen blurred spinner) remains the global fallback, but routes that have a meaningful skeleton shape must prefer the skeleton via `loading.tsx`; the overlay is reserved for cross-shell transitions without a skeleton.
- **Rationale.** Roadmap rule L23: "Loading states must use design-system Skeleton. No spinners." The overlay is a documented exception for un-skeletonable transitions; it should not substitute for skeletons where skeletons exist.
- **Source.** `repo evidence` + `brief` ("best mounting").
- **Priority.** P2.
- **Dependencies.** UX-01.
- **Acceptance criteria.**
  - AC-UX-03a: Documented (in the new protocol) decision matrix: when overlay vs. skeleton vs. both.
  - AC-UX-03b: Overlay shows only when no skeleton boundary is available for the target route (verify via Playwright: skeleton routes do not show overlay, or overlay is suppressed).
- **Validation.** Playwright overlay-suppression assertion; protocol doc review.
- **Affected areas.** `src/components/ui/route-loading-overlay.tsx`, navigation store.
- **Risks.** Suppressing overlay too aggressively could remove feedback on slow networks. Mitigation: overlay appears after a debounce threshold even on skeleton routes (e.g., >200ms).
- **Status.** Planned (Phase 2, owner decision on exact threshold).

### UX-04 — Consistent loading-state taxonomy
- **Statement.** A single, documented taxonomy of loading states (route skeleton, section skeleton, inline spinner, overlay, progress, skeleton-text) governs which primitive is used where, so loading UX is consistent app-wide.
- **Rationale.** Today there are hand-rolled `animate-pulse` divs (activity loading) alongside `Skeleton`; no rule picks between them.
- **Source.** `derived` from audit.
- **Priority.** P2.
- **Acceptance criteria.** AC-UX-04a: Taxonomy section in the new protocol with a decision tree; AC-UX-04b: `activity/loading.tsx` migrated from hand-rolled divs to `Skeleton` (or documented exception).
- **Validation.** Doc review + lint/design check.
- **Status.** Planned (Phase 2/4).

### UX-05 — `viewport` export and LCP-image preload discipline
- **Statement.** Root layout exports `viewport`; LCP-critical images use `next/image` `preload`; LCP elements kept outside/above Suspense boundaries per Next.js streaming guidance.
- **Rationale.** `official docs` (streaming.md §LCP); `repo evidence` (no `viewport` anywhere).
- **Priority.** P2.
- **Acceptance criteria.** AC-UX-05a: `export const viewport` present in root layout; AC-UX-05b: agent rule codifies LCP-out-of-Suspense + image preload.
- **Validation.** `rg "export const viewport"`; build; agent-rule doc.
- **Status.** Planned (Phase 1/4).

---

## Accessibility requirements (A11Y)

### A11Y-01 — Loading states announce to assistive tech
- **Statement.** Every route/section loading state exposes `role="status"` (+ `aria-live="polite"` for primary route loading) and a meaningful `aria-label`; the overlay already does — extend to any loading UI that lacks it.
- **Rationale.** Screen-reader users must be informed of loading.
- **Source.** `repo evidence` (most loading.tsx have it; verify all) + WCAG 4.1.3.
- **Priority.** P1.
- **Acceptance criteria.** AC-A11Y-01a: Audit table shows every loading UI has `role`/`aria-live`/`aria-label`; AC-A11Y-01b: New/loading UIs gated by a lint or agent rule.
- **Validation.** DOM assertion tests; agent rule.
- **Status.** Planned (Phase 1/4).

### A11Y-02 — `aria-hidden` toggling on overlay does not trap focus
- **Statement.** While `RouteLoadingOverlay` sets `aria-hidden` on shell roots, focus management must remain correct (focus not lost, focus restored on navigation complete).
- **Rationale.** Overlay hides shell via `aria-hidden`; must not break keyboard/focus.
- **Source.** `repo evidence` (`route-loading-overlay.tsx:25`).
- **Priority.** P2.
- **Acceptance criteria.** AC-A11Y-02a: Playwright keyboard test navigates during transition and asserts focus lands correctly after.
- **Validation.** Playwright keyboard/focus test.
- **Status.** Planned (Phase 2; browser-only proof — interaction behavior).

### A11Y-03 — Reduced-motion respected
- **Statement.** All loading animations respect `prefers-reduced-motion` (`motion-reduce`). `Skeleton` and `Spinner` already do; hand-rolled `animate-pulse` divs must too.
- **Source.** `repo evidence` + WCAG 2.3.3.
- **Priority.** P2.
- **Acceptance criteria.** AC-A11Y-03a: No loading animation animates under `motion-reduce:reduce` (CSS audit + Playwright emulate reduced motion).
- **Status.** Planned (Phase 1/2).

---

## Architecture requirements (ARCH)

### ARCH-01 — Single canonical agent rule for performance/loading/mount
- **Statement.** Author `.ai/00_system/PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md` (flat file, no `rules/` subdir) + one-line pointer in `AGENTS.md` "Core rules"; reference (do not duplicate) `01_roadmap/27-*.md` numbers.
- **Rationale.** Canonical-map placement rule; avoids forking rules into tool adapter dirs.
- **Source.** `repo evidence` (`.ai/00_system/ai-folder-canonical-map.md`) + `brief`.
- **Priority.** P0 (foundational).
- **Acceptance criteria.**
  - AC-ARCH-01a: File exists at the exact path with the required sections (mount decision tree, streaming/Suspense law, prefetch law, dynamic-import law, budget pointers, "add a page/component" checklist, reduced-motion, a11y).
  - AC-ARCH-01b: `AGENTS.md` references it in Core rules.
  - AC-ARCH-01c: `bun run validate:agents` passes.
- **Validation.** `git diff --check`; doc review; `bun run validate:agents`.
- **Status.** Planned (Phase 4, IMPLEMENTATION-READY).

### ARCH-02 — Heavy client components opt out of critical-path SSR where a skeleton exists
- **Statement.** `EstimateSheetTree` and `EstimateSheetContent` must not SSR+hydrate on the critical estimate route when a skeleton (`EstimateSheetRouteSkeleton`) is available; use `next/dynamic` with an explicit `loading` (and evaluate `ssr:false` for the tree pane) or finer Suspense splitting.
- **Rationale.** Highest-leverage mount fix; ~5,000 LOC hydrating on critical path today.
- **Source.** `repo evidence` (`EstimateWorkspaceClient.tsx:27,30`).
- **Priority.** P1.
- **Acceptance criteria.** AC-ARCH-02a: Estimate route first-paint shows skeleton before full sheet hydrates; AC-ARCH-02b: `ANALYZE=true` build shows reduced critical-path JS or deferred hydration; AC-ARCH-02c: estimate CRUD latency unchanged (`estimates-crud-latency.spec.ts`).
- **Validation.** Bundle analyzer + Playwright shell-streaming + CRUD latency spec.
- **Status.** Planned (Phase 2). **Discovery-required sub-step:** confirm `ssr:false` on the tree doesn't break drag-and-drop hydration (react-complex-tree) — see `11_IMPLEMENTATION_PLAN.md` Phase 2 task.

### ARCH-03 — No `fetch` inside `useEffect` for server data on user-facing routes
- **Statement.** Migrate `SharePageComments.tsx` and `SharedLinkActivityFeed.tsx` raw-fetch-in-effect to TanStack Query (`useQuery`/`useSuspenseQuery`) with proper cache + dedupe; remove hand-rolled focus-refetch in `proposals-page-client.tsx:79` in favor of a documented revalidation strategy.
- **Rationale.** Anti-pattern; delays paint, no cache, no dedupe.
- **Source.** `repo evidence`.
- **Priority.** P1.
- **Acceptance criteria.** AC-ARCH-03a: No `fetch(` inside `useEffect` in those files (`rg`); AC-ARCH-03b: Share receiver FMP improves vs baseline (evaluator PERF-01).
- **Status.** Planned (Phase 2).

### ARCH-04 — Server/Client boundary minimal and justified
- **Statement.** The agent rule must codify: default Server Component; smallest `"use client"` boundary; server-only data/secrets out of client bundle; document every new client boundary's bundle impact.
- **Source.** `official docs` + `brief`.
- **Priority.** P0 (in the rule).
- **Acceptance criteria.** AC-ARCH-04a: Rule section exists; AC-ARCH-04b: A sample audit of 5 recent client components shows compliance or flagged exceptions.
- **Status.** Planned (Phase 4).

### ARCH-05 — Cache/freshness ownership documented per data path (future: Cache Components)
- **Statement.** Evaluate (do not mandate now) Cache Components + `unstable_instant` for instant navigation; until then, document cache owner/staleness/invalidation per major data path and keep `staleTimes` tuning deliberate.
- **Source.** `official docs` (instant-navigation.md, draft) + `repo evidence` (Cache Components off).
- **Priority.** P2 (rule now) / **owner-gated future** (Cache Components adoption).
- **Acceptance criteria.** AC-ARCH-05a: Rule section documents current cache model + the `unstable_instant` future path with adoption prerequisites.
- **Status.** Planned (Phase 4 rule + owner decision).

---

## Performance requirements (PERF)

### PERF-01 — Performance evaluator contract defined for every budget-bearing requirement
- **Statement.** For each route/operation with a budget (per `27-*.md`), define baseline, target, measurement command, fixture size, run count/flake policy, regression threshold, rollback trigger, evidence location.
- **Source.** `official docs` (performance-goal contract shape) + `repo evidence` (fragmented tooling).
- **Priority.** P0.
- **Acceptance criteria.** AC-PERF-01a: `09_PERFORMANCE...md` contains an evaluator table covering landing, share, workshop transition, estimate CRUD, library, charts, XLSX; each names the exact script/spec.
- **Status.** Planned (Phase 0, IMPLEMENTATION-READY as documentation).

### PERF-02 — Production RUM / Core Web Vitals telemetry (owner-gated)
- **Statement.** Emit CWV (LCP, INP, CLS, TTFB, FCP) from production clients to a chosen sink, free-tier-first (Cloudflare Workers Observability custom metric via `/api/internal/client-error`-style beacon, or GA4 custom events), with PII-safe payload and idle-deferred beacon.
- **Rationale.** Today there is zero production CWV signal; `WebVitalsProbe` is dev-only.
- **Source.** `repo evidence` + `brief` ("measure performance").
- **Priority.** P1 (planning) / **owner-gated** (sink decision).
- **Acceptance criteria.** AC-PERF-02a: Design doc names the sink, beacon endpoint, redaction rules, sampling, retention; AC-PERF-02b: Owner has selected the sink; AC-PERF-02c (implementation): beacon fires in prod, sample visible in sink.
- **Validation.** Design review; owner decision recorded; provider/dashboard readback (implementation phase).
- **Status.** Planned (Phase 0 design + owner decision; implementation deferred).

### PERF-03 — CI bundle budget graduated from advisory to gating (owner-gated)
- **Statement.** Plan a path to make `scripts/check-performance-budgets.mjs` non-advisory (set `PERF_BUDGET_STRICT=1` in CI) once baselines are stable; tighten the 350 KB default per route using `27-*.md` route budgets.
- **Source.** `repo evidence`.
- **Priority.** P2 / **owner-gated**.
- **Acceptance criteria.** AC-PERF-03a: Decision doc with timeline; AC-PERF-03b: After owner approval, CI gate is strict.
- **Status.** Planned (owner decision).

### PERF-04 — Authenticated route-transition coverage in CI
- **Statement.** Authenticated workshop transitions are skipped in CI today (no `PLAYWRIGHT_STORAGE_STATE`); define a safe CI auth fixture (seeded dev auth or bypass) so the perf suite covers authenticated routes.
- **Source.** `repo evidence` (CI skips authed scenarios).
- **Priority.** P2.
- **Acceptance criteria.** AC-PERF-04a: CI runs ≥1 authenticated transition scenario; results posted.
- **Status.** Planned (Phase 0/3; security review required for any CI auth bypass).

### PERF-05 — Reduced-motion and idle-deferred instrumentation codified
- **Statement.** Agent rule: instrumentation/analytics beacons use `requestIdleCallback`/`scheduler.postTask` and never add user-visible latency (mirrors `27-*.md` Global Rule 6/Enterprise Rule 6).
- **Source.** `repo evidence` (27-*.md L37, L123).
- **Priority.** P1 (in rule).
- **Status.** Planned (Phase 4).

---

## Reliability/operability requirements (REL)

### REL-01 — Soft-404 / mid-stream redirect handling for token routes
- **Statement.** `/share/[token]` and `/invite/[token]` must call `notFound()`/redirect **before** any `await`/Suspense to preserve real HTTP status where compliance/analytics need it; otherwise document the soft-404 noindex trade-off.
- **Source.** `official docs` (streaming.md "HTTP contract").
- **Priority.** P2.
- **Acceptance criteria.** AC-REL-01a: Audit + remediation list; AC-REL-01b: curl/`next.config` proxy check shows intended status for missing tokens.
- **Status.** Planned (Phase 2; needs browser/provider proof at implementation).

### REL-02 — Loading-state failure modes covered
- **Statement.** When a Suspense boundary never resolves (network drop), there must be a timeout/fallback to an error state (error boundary), not an infinite skeleton.
- **Source.** `derived`.
- **Priority.** P2.
- **Acceptance criteria.** AC-REL-02a: Adversarial scenario in matrix (network cut mid-stream) shows error UI, not perpetual skeleton.
- **Status.** Planned (Phase 2/3).

---

## Testing requirements (TEST)

### TEST-01 — Test execution matrix maps every requirement to evidence
- **Statement.** `12_TEST_AND_VALIDATION_STRATEGY.md` contains the matrix per the directive.
- **Source.** `brief` + directive.
- **Priority.** P0.
- **Status.** Planned (this pack).

### TEST-02 — Adversarial scenario matrix for loading/transition flows
- **Statement.** `19_RESEARCH...md` contains the UltraQA-style matrix for navigation/loading edge cases.
- **Source.** directive.
- **Priority.** P0.
- **Status.** Planned (this pack).

---

## Documentation/agent-rules requirements (DOC)

### DOC-01 — "Add a page" and "Add a component" checklists in the protocol
- **Statement.** The protocol contains two copy-paste checklists future agents load before adding a route or component.
- **Source.** `brief`.
- **Priority.** P0.
- **Status.** Planned (Phase 4).

### DOC-02 — Companion operational skill for loading-state verification (optional)
- **Statement.** Optionally add `.ai/11_skills/verify-loading-state-compliance.md` (repo-native Format B) so agents have a repeatable procedure.
- **Source.** `derived`.
- **Priority.** P3.
- **Status.** Optional.

---

## Shadow-path matrices (runtime loading/transition flows)

### Matrix S1 — Route navigation → loading UX

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Nav to `/workshop/projects/[id]` | Skeleton → dashboard | n/a | empty project → empty state | bad uuid → not-found | session expired → `/login` | DB slow → skeleton then content or error boundary | rapid double-click → interruptible nav (Next) | re-nav reuses cached (staleTimes 60s) | skeleton/content/error | route-transition spec |
| Nav to `/share/[token]` | skeleton → proposal | missing token → not-found (pre-suspend) | n/a | malformed token → not-found | password required → password route | API 5xx → error UI | n/a | n/a | skeleton/proposal/not-found/error | shared-link-receiver spec |
| Nav to `/invite/[token]` | **today: blank → content** (no loading) | invalid token → ? | n/a | n/a | n/a | network drop → ? | n/a | n/a | GAP today | **new spec needed** |
| Nav to `/workshop/publisher` | **today: overlay only** (no loading.tsx) | n/a | empty roster | n/a | auth → gate | error → error.tsx | n/a | n/a | overlay/error | extend error-boundary spec |
| Estimate sheet open | today: SSR+hydrate full sheet | n/a | empty estimate | n/a | n/a | slow → blocked paint | concurrent open? | n/a | today: full sheet paints together | shell-streaming spec + new |

### Matrix S2 — Mutation/loading interplay

| Flow | Happy | Optimistic pending | Error | Conflict/stale | Offline | Duplicate submit | Cancel |
|---|---|---|---|---|---|---|---|
| Estimate row edit | optimistic, <100ms | pending indicator | rollback + toast | refetch conflict | queue/offline toast | idempotency guard | abort |
| Proposal publish | progress state | spinner | error boundary | n/a | error | dedupe | n/a |

(Full per-flow detail deferred to implementation phases; the matrices above cover the planning-relevant surfaces.)

---

## Open decisions (OPEN)

- **OPEN-PERF-01:** RUM/CWV sink choice (Cloudflare Workers Observability custom metric vs. GA4 events vs. paid APM). Owner: Philip. Blocks PERF-02 implementation.
- **OPEN-ARCH-01:** Adopt Cache Components + `unstable_instant` now or later. Owner: Philip. Blocks ARCH-05 implementation at scale.
- **OPEN-PERF-02:** Tighten CI bundle budget to strict + per-route numbers. Owner: Philip. Blocks PERF-03.
- **OPEN-UX-01:** Global overlay threshold (ms) before showing on skeleton routes. Owner: Philip + design. Blocks UX-03.
- **OPEN-REL-01:** Whether token routes need real HTTP 404 (compliance) vs. soft-404 noindex (current). Owner: Philip. Blocks REL-01 remediation scope.
