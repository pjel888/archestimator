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

## Additional requirements added by the improvement pass (2026-07-07)

These come from deeper evidence (route-cache lane + credential lane + CF cost lane). They are **correctness/release-relevant**, not polish, and are sequenced into Phase 1 before broad UX work per the Improve directive's "release-blocking hardening before broad UX" rule.

### ARCH-06 — Eliminate `/workshop` dashboard double-fetch
- **Statement.** After a mutation the dashboard must use exactly one revalidation path (either server `revalidatePath("/workshop")` OR client `router.refresh()`), not both, to avoid a double fetch.
- **Source.** `repo evidence` (`group-actions.ts:90`, `actions.ts:81`, `account-actions.ts:93`, `projects/actions.ts:861` + `WorkshopHomebaseClient` `router.refresh()`).
- **Priority.** P2 (perf).
- **Acceptance criteria.** AC-ARCH-06a: post-mutation network trace shows one RSC fetch, not two (PC-18).
- **Validation.** extend `route-transition-performance.spec.ts`.
- **Status.** Planned (Phase 2).

### ARCH-07 — Fix route revalidation gaps (correctness)
Three sub-findings (all P1 correctness):

#### ARCH-07a — Stale `revalidatePath("/workshop/components")` no-op
- **Statement.** `component-library/actions.ts:309` and `ai/package-builder/apply.ts:1896` call `revalidatePath("/workshop/components")` — **no such route** (real route is `/workshop/library/components`). These are no-ops; component edits don't server-invalidate the components route (currently masked by client `invalidateQueries`).
- **Source.** `repo evidence` (route-cache lane).
- **Priority.** **P1 (correctness).**
- **Acceptance criteria.** AC-ARCH-07a: grep returns zero `/workshop/components"` revalidatePath calls; correct `/workshop/library/components` is used (PC-11).
- **Status.** Planned (Phase 1).

#### ARCH-07b — `/workshop/proposals` has zero server-side revalidation
- **Statement.** No `revalidatePath("/workshop/proposals")` exists anywhere; relies 100% on client `invalidateQueries`. A Server Action mutating recipient proposals → hard refresh/new tab shows stale data.
- **Source.** `repo evidence`.
- **Priority.** **P1 (correctness).**
- **Acceptance criteria.** AC-ARCH-07b: relevant Server Actions call `revalidatePath("/workshop/proposals")` (PC-12).
- **Status.** Planned (Phase 1).

#### ARCH-07c — `/workshop/publisher` has zero server-side revalidation
- **Statement.** Same as ARCH-07b for `/workshop/publisher` — client-only invalidation; stale on hard refresh/new tab.
- **Source.** `repo evidence`.
- **Priority.** **P1 (correctness).**
- **Acceptance criteria.** AC-ARCH-07c: relevant Server Actions call `revalidatePath("/workshop/publisher")` (PC-13).
- **Status.** Planned (Phase 1).

### SEC-09 — RUM beacon must mirror `/api/internal/client-error` safety AND use a durable rate limiter
- **Statement.** The PERF-02 beacon (if Tier-2 custom Worker is chosen) must use same-origin + Fetch-Metadata gate, hard byte cap, whitelist+clamp, `no-store`, anonymous 204, query/fragment strip, and a **durable** rate limiter (D1 `security_rate_limit_events`), NOT the per-isolate in-memory `Map` the existing `client-error` uses (a known cross-isolate weakness).
- **Source.** `repo evidence` (`client-error/route.ts:6-7,40-55` per-isolate Map).
- **Priority.** P1 (security, if Tier-2 chosen).
- **Acceptance criteria.** AC-SEC-09a: beacon passes denial/redaction/rate-limit tests (PC-16); no per-isolate limiter.
- **Status.** Planned (Phase 0 design + PERF-02 impl).

### SEC-10 — Loading/transition UX must not regress `/share`+`/invite` `no-store` cache posture
- **Statement.** Any loading/error/skeleton change on `/share/[token]` or `/invite/[token]` must keep the proxy-enforced `private, no-store` cache headers; the agent rule (Phase 4) must forbid adding caching to token-bearing routes.
- **Source.** `repo evidence` (`request-proxy.ts:21,165`) + `official docs` (streaming.md HTTP contract).
- **Priority.** P1.
- **Acceptance criteria.** AC-SEC-10a: no cache header change on token routes; agent rule states the prohibition.
- **Status.** Planned (Phase 1/4).

### PERF-02 (refined) — Production RUM via Cloudflare Web Analytics (Tier 1) first
- **Statement.** *Updated 2026-07-07 from deeper CF research:* the default RUM sink is **Cloudflare Web Analytics** (free, cookie-free, reports LCP/INP/CLS, no Worker code). The custom Worker→Workers Logs beacon (original proposal) is now **Tier 2**, only if custom dimensions are needed. Paid APM rejected under free-tier posture. See `23_CLOUDFLARE_COST_AND_RESOURCE_BUDGET.md`.
- **Source.** `official docs` (Cloudflare Web Analytics, Workers Logs — cited URLs).
- **Priority.** P1 (planning) / **owner-gated** (Tier 1 vs Tier 2).
- **Acceptance criteria.** AC-PERF-02a: Tier-1 `beacon.min.js` snippet added (or Tier-2 beacon built); AC-PERF-02b: CWV visible in Web Analytics dashboard (Tier 1) or Workers Logs query (Tier 2).
- **Status.** Planned (owner confirms Tier 1 vs Tier 2).

---

## Open decisions (OPEN) — refined with owner / trigger / implementation impact

| ID | Decision | Owner | Deadline / trigger | Effect if unresolved | Source |
|---|---|---|---|---|---|
| OPEN-PERF-01 | RUM sink: **Web Analytics Tier-1 (default)** vs Tier-2 custom Worker beacon vs paid APM | Philip | Before PERF-02 implementation | Blocks PERF-02 impl; Tier-1 recommended (free, lowest risk) | `23_...md` |
| OPEN-ARCH-01 | Adopt Cache Components + `unstable_instant` now/later | Philip | Trigger: post-launch stability review | Blocks ARCH-05/F-INSTANT | `06_...md`, instant.md |
| OPEN-PERF-02 | Tighten CI bundle budget to strict + per-route numbers | Philip | Trigger: after Phase-0 baselines stable | Blocks PERF-03 strict mode | `09_...md` |
| OPEN-UX-01 | Global overlay threshold (ms) on skeleton routes | Philip + design | Before Phase-2 P2-T5 | Blocks UX-03 implementation | `05_...md` |
| OPEN-REL-01 | Token routes: real HTTP 404 vs soft-404 noindex | Philip | Before public crawl/indexing concerns | Blocks REL-01 remediation scope | streaming.md |

**Note:** ARCH-06, ARCH-07a/b/c, SEC-09, SEC-10 are **not** open decisions — they are internally resolvable fixes with clear evidence and are sequenced into Phase 1/2.

## Source-strength summary (per requirement category)

| Category | Source-strength pattern |
|---|---|
| UX-01..05 | `brief` + `repo evidence` + `official docs` (loading.md/streaming.md) |
| A11Y-01..03 | `repo evidence` + WCAG |
| ARCH-01..05 | `repo evidence` (canonical-map, source) + `official docs` + `brief` |
| **ARCH-06..07** | `repo evidence` (route-cache lane, file:line) — **highest strength** |
| PERF-01..05 | `official docs` (performance-goal) + `repo evidence` + `brief` |
| REL-01..02 | `official docs` + `derived` |
| SEC-01..08 | `repo evidence` + `derived` |
| **SEC-09..10** | `repo evidence` (credential/attack-surface lane) |
| TEST/DOC | `brief` + directive |

No requirement is presented as a direct source fact when it is inferred; `derived` is labeled explicitly.
