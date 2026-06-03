# 17 — Risks, Decisions, and Open Questions

> React Joyride onboarding tours for Archestimator workspace
> Status: pre-implementation risk assessment
> Date: 2026-06-03

---

## Risk Register

Each risk includes the exact codebase locations it touches, mitigation strategy, and the decision required before implementation proceeds.

---

### Risk 1: Package Compatibility with React 19.2 / Next.js 16.2

| Field | Detail |
|---|---|
| **Why it matters** | `react-joyride` may have issues with React 19.2's concurrent rendering features or Next.js 16.2's `"use client"` / SSR boundary enforcement. A broken Joyride render could crash the entire `WorkshopPageShell` (line 60, `/src/components/workshop/WorkshopPageShell.tsx`), which wraps ALL authenticated routes in Archestimator. |
| **Severity** | **HIGH** |
| **Likelihood** | **MEDIUM** — `react-joyride`'s latest stable release targets React 18.x. React 19 introduced breaking changes to ref handling, Strict Mode double-mounting, and the removal of legacy context. Next.js 16.2's bundled React 19.2.4 (see `package.json` peer dep) means Joyride is running on a version it may not have been tested against. |
| **Mitigation** | (1) Phase 1 skeleton installs `react-joyride` behind `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false` — zero runtime impact even if broken. (2) Manual verification: mount Joyride in the `WorkshopPageShell` client boundary and verify no console errors, DOM breakage, or sidebar (z-100) collisions. (3) If incompatible: evaluate `react-joyride` v2 alpha, or alternative packages (`reactour` — lighter, React 19 compatible; `shepherd.js` — battle-tested, framework-agnostic; `intro.js-react` — mature, more opinionated styling). This plan's architecture (tour registry, target constants, persistence schema) is package-agnostic and survives a swap. |
| **Decision needed** | Phase 1 must confirm compatibility before ANY Phase 2+ investment. If Joyride fails compatibility check, architect selects an alternative BEFORE target markers are placed. |
| **Owner** | Implementer |

---

### Risk 2: SSR / Client Boundary Issues

| Field | Detail |
|---|---|
| **Why it matters** | Joyride uses `document.querySelector`, DOM measurement APIs, and `ResizeObserver` — all unavailable in React Server Components (RSC). Archestimator's `WorkshopPageShell` (line 60) is a server component (`async function WorkshopPageShell`). If Joyride is imported directly, Next.js 16.2 will reject the build with an SSR error. |
| **Severity** | **HIGH** |
| **Likelihood** | **LOW** — The `OnboardingRuntime` component is explicitly designed as a client-only wrapper using `dynamic(() => import('...'), { ssr: false })`. Archestimator already uses this pattern for `MainSidebar` (`"use client"` directive at line 1 of `src/components/sidebar/MainSidebar.tsx`) and for the Copilot floating button (`EstimateCopilotFloatingButton`). The pattern is proven in this codebase. |
| **Mitigation** | Wrap `OnboardingRuntime` import in `next/dynamic` with `{ ssr: false }`. Mount it inside `WorkshopPageShell`'s `Suspense` boundary (already present for content loading, lines 44-58). Add a top-level React ErrorBoundary around `OnboardingRuntime` so any Joyride crash does not kill the workspace shell. |
| **Decision needed** | None — mitigation is a proven pattern already in use within this codebase. |
| **Owner** | Implementer |

---

### Risk 3: Missing Target Risk

| Field | Detail |
|---|---|
| **Why it matters** | Joyride steps reference DOM targets via `data-tour` attributes (e.g., `data-tour="sidebar.workshop"` on `MainSidebar` nav item). If the target element is not mounted when Joyride tries to advance, the step fails silently or throws. Archestimator uses heavy code-splitting: `WorkshopHomebaseClient` (722 lines) and `EstimateWorkspaceClient` are client-only components loaded on demand. Sidebar items like the Workshop link (`MainSidebar.tsx` line 44, nav item `id: "workshop"`) may not render until after hydration. |
| **Severity** | **MEDIUM** |
| **Likelihood** | **MEDIUM** — Common in Next.js apps with code-splitting and `use client` boundaries. The `WorkshopHomebaseClient` destination tiles (lines 55-64 in `WorkshopHomebaseClient.tsx`) render after the server-rendered shell, meaning targets inside that component won't exist when Joyride starts. |
| **Mitigation** | (1) `useMountedTourTargets` hook watches for target availability via `MutationObserver` OR periodic `requestAnimationFrame` polling. (2) Configurable timeout (default: 5 seconds). (3) If target is not found within timeout: skip the step, log a warning to `onboardingEvents`, and continue the tour. (4) Centralized target constants in `src/features/onboarding/config/tourTargets.ts` prevent silent selector drift. (5) Tour steps can declare a `requiresMount` flag to skip until target is ready. |
| **Decision needed** | Accept 5-second target timeout. Missing target = skip step, log event, continue tour. Do NOT block the tour indefinitely. |
| **Owner** | Implementer |

---

### Risk 4: Design System Violation

| Field | Detail |
|---|---|
| **Why it matters** | Archestimator enforces a **strict design system** (verified by `scripts/enforce-app-design-system.mjs`): SF Pro fonts (regular/medium only), max 12px font size in app, xs-only border radius (3px), neutral palette (`#292929` / `#5D5D5D` / `#7F7F7F`), zero letter-spacing, Phosphor Icons (regular weight outline). Default Joyride styles use different fonts, larger radii, different colors, and emoji-based controls. Violations will be caught by the design-system linter (`bun run lint:design-system`). |
| **Severity** | **MEDIUM** |
| **Likelihood** | **HIGH** — Default Joyride beacon, tooltip, and overlay use Material-like styling that will clash with Archestimator's strict system. Joyride's default tooltip is a fixed-style modal with white background, rounded corners, and system fonts. |
| **Mitigation** | **MVP (Phase 3):** Use Joyride's `styles` prop to override fonts (`fontFamily: "SF Pro"`), colors (`textColor: "#292929"`), background, border-radius (`3px`), and overlay color. This gets the tour working with acceptable visuals. **Phase 5 UX Polish:** Build a custom `OnboardingTooltip` component (in `src/features/onboarding/components/OnboardingTooltip.tsx`) using Joyride's `tooltipComponent` prop. The custom tooltip uses Archestimator's `Button` primitive (from `src/components/ui/button.tsx`), `Badge`, Phosphor icons, and Tailwind v4 utility classes. This gives full control over every pixel. |
| **Decision needed** | MVP uses styled Joyride `styles` options. Phase 5 evaluates custom tooltip if overrides are insufficient. |
| **Owner** | Implementer + Design review |

---

### Risk 5: Z-Index Conflict

| Field | Detail |
|---|---|
| **Why it matters** | Archestimator's component tree uses layered z-indices: the `MainSidebar` has a collapsed/expanded overlay, the "Ask Flip" Copilot floating button has its own z-layer, modal dialogs (`ProjectDetailsModal`, `NewProjectModal`, `ProposalExportPreviewDialog`) appear at z-30, and the route-loading overlay (`useNavigationRouter` hook in `src/hooks/use-navigation-router.ts`) has its own z-index. Joyride's spotlight overlay and tooltip default to z-100, which may be too low relative to the sidebar. |
| **Severity** | **MEDIUM** |
| **Likelihood** | **HIGH** — Joyride's default `zIndex: 100` will be eclipsed by sidebar elements. The `MainSidebar` uses Tailwind v4 classes; its overlay likely appears above z-100 in expanded-on-mobile mode. If the Joyride tooltip is behind the sidebar, users cannot click "Next" and the tour is effectively broken. |
| **Mitigation** | (1) Set Joyride `zIndex` to **101** as a shared constant in `src/features/onboarding/config/tourRegistry.ts`. This places the spotlight and tooltip above all current Archestimator UI layers. (2) Pause the tour when any modal opens. Detect modal state via the tour controller's route awareness hook. (3) Explicitly test: sidebar collapsed (icon-only), sidebar expanded (hover), sidebar mobile overlay. |
| **Decision needed** | Joyride `zIndex = 101` as a constant in tour config. All current Archestimator UI layers sit at or below z-100. |
| **Owner** | Implementer |

---

### Risk 6: Persistence / RLS Risk

| Field | Detail |
|---|---|
| **Why it matters** | The `user_onboarding_tours` table will store per-user tour state. Incorrect RLS (Row-Level Security) policies could (a) expose one user's tour state to another, or (b) prevent the authenticated user from writing their own tour state. Archestimator uses RLS on ALL user-data tables (per `README.md`: "RLS everywhere"). A misconfigured policy is a security regression. |
| **Severity** | **MEDIUM** — Read exposure is a privacy violation (tour completion data is low sensitivity, but RLS failure is a pattern break). Write failure blocks the tour from persisting — users see the same tour every login. |
| **Likelihood** | **LOW** — Archestimator has 48 existing migrations with RLS, all proven. The pattern is well-established: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` + `CREATE POLICY ... USING (auth.uid() = user_id);`. The `requireCurrentUserContext()` server-action guard (from `src/lib/auth/session.ts`) adds a second layer of server-side enforcement. Vitest RLS tests already exist for other tables (e.g., `tests/vitest/security/`). |
| **Mitigation** | (1) Follow the exact RLS pattern from existing Archestimator migrations. (2) Write Vitest RLS tests before deploying migration (test: user A cannot read user B's tour rows; unauthenticated requests rejected; authenticated user can upsert own row). (3) Verify locally with `npx supabase start`. |
| **Decision needed** | None — mitigation is standard testing, matching established Archestimator patterns. |
| **Owner** | Implementer |

---

### Risk 7: Annoying Onboarding Experience

| Field | Detail |
|---|---|
| **Why it matters** | Users may find tours intrusive, skip them immediately, or develop negative associations with Archestimator. This is the **most common cause of onboarding failure** across SaaS products. A bad onboarding experience is worse than no onboarding. Archestimator targets construction professionals (contractors, estimators) who are task-focused and may resent guided tours. |
| **Severity** | **HIGH** |
| **Likelihood** | **MEDIUM** — Can be mitigated with UX guardrails: short tours, easy skip, permanent dismissal. Without these, likelihood is HIGH. |
| **Mitigation** | (1) **Short tours** — 4-6 steps max (MVP Workspace Orientation has 5 steps). (2) **Easy skip** — prominent "Skip tour" button on every step, not hidden. (3) **Never auto-show twice** — once skipped, the `user_onboarding_tours.status = 'skipped'` flag persists permanently. (4) **Replay is opt-in** — a manual "Replay tour" action in Settings (never auto-triggered). (5) **Respect "don't show again"** — skip is permanent for that tour version. (6) **Progressive disclosure** — don't tour everything at once. MVP is Workspace Orientation only. Future tours are separate, route-scoped, and independently skippable. (7) **Visual consistency** — the custom tooltip (Phase 5) will feel like a native Archestimator element, not a third-party popup. |
| **Decision needed** | Skip auto-hides permanently. Completed auto-hides permanently. Replay only via explicit user action (Settings menu item). Never auto-resume a skipped or completed tour. |
| **Owner** | Product Owner + Implementer |

---

### Risk 8: Multi-Route Tour Fragility

| Field | Detail |
|---|---|
| **Why it matters** | Some onboarding systems attempt cross-route tours (e.g., "start on /workshop, navigate to /workshop/projects, then /workshop/library"). Archestimator's route structure under `/workshop/*` (see `src/app/workshop/` directory tree in README: `/workshop`, `/workshop/projects`, `/workshop/projects/[projectId]/estimates/[nodeId]`, `/workshop/library`, `/workshop/templates`, `/workshop/settings/*`) could tempt a designer to build a "grand tour." Cross-route tours break on navigation (state lost, targets not ready after route change, Joyride doesn't handle SPA navigation natively). |
| **Severity** | **MEDIUM** |
| **Likelihood** | **MEDIUM** (if cross-route tours were attempted) — but this plan explicitly prohibits them, making likelihood LOW. |
| **Mitigation** | **Route-scoped tours only.** Each tour segment lives on exactly ONE route. The tour registry (`src/features/onboarding/config/tourRegistry.ts`) maps route patterns to tour keys. `OnboardingRuntime` selects the active tour based on `usePathname()` from Next.js navigation. When the user navigates away, the tour pauses/resumes based on route matching. No cross-route tours in MVP or beyond. |
| **Decision needed** | Route-scoped tours only. Never build cross-route tours. This is an architectural constraint. |
| **Owner** | Architect |

---

### Risk 9: Mobile UX Risk

| Field | Detail |
|---|---|
| **Why it matters** | The `MainSidebar` (`src/components/sidebar/MainSidebar.tsx`) is hidden on screens `< 1024px` (Tailwind `lg` breakpoint). The sidebar is collapsed to icon-only by default and shows labels only on hover/expand. Half the MVP Workspace Orientation steps point at sidebar targets (`sidebar.workshop`, `sidebar.projects`, `sidebar.library`, `sidebar.templates`). On mobile, these targets do not render in the DOM, so Joyride cannot find them. |
| **Severity** | **LOW** — Construction professionals overwhelmingly use desktop (AutoCAD, Bluebeam, estimating software are desktop-first). Mobile usage during closed beta is expected to be near zero. |
| **Likelihood** | **HIGH** for mobile users — the tour will skip sidebar steps (which is the correct mitigation). |
| **Mitigation** | (1) Conditionally skip sidebar-targeted steps when `window.innerWidth < 1024` (detected via `useMountedTourTargets` hook). Show only the content-area steps (WorkshopHomebaseClient destination tiles). (2) OR: Defer mobile tours entirely — `OnboardingRuntime` renders `null` on viewports `< 1024px`. (3) In either case, the tour completion state is saved, so the user doesn't see the tour later on desktop. |
| **Decision needed** | Mobile: skip sidebar steps, show content-only tour. OR defer mobile tours entirely. **Recommended:** defer mobile tours. Construction pros use desktop. Mobile tour UX is an edge case not worth MVP investment. |
| **Owner** | Product Owner |

---

### Risk 10: Accessibility Risk

| Field | Detail |
|---|---|
| **Why it matters** | Archestimator has accessibility requirements (outlined in document `11_accessibility_plan.md`). Joyride's default accessibility — focus trapping, Escape key dismissal, ARIA labels on tooltip — may not fully meet WCAG 2.1 AA requirements for tooltip contrast, screen reader announcements, or keyboard navigation within multi-step tours. |
| **Severity** | **MEDIUM** |
| **Likelihood** | **LOW** — Joyride has built-in accessibility features: focus management (traps focus inside tooltip), `aria-label` on close/skip buttons, `role="dialog"` on tooltip, Escape key dismisses. The custom tooltip component (Phase 5) can enhance with: proper heading hierarchy, `aria-live` announcements on step change, visible focus indicators using Archestimator's existing focus ring styles (from `src/components/ui/` primitives). |
| **Mitigation** | (1) Accept Joyride defaults for MVP (Phases 1-4). (2) Phase 5 custom tooltip applies Archestimator's existing accessibility patterns. (3) Phase 6 includes an accessibility QA pass: keyboard-only navigation through all tours, screen reader verification (macOS VoiceOver), color contrast audit of tooltip content against overlay. (4) Respect `prefers-reduced-motion` — disable spotlight animation, beacon pulse, and step transitions when the user has reduced motion enabled (already detected in `MainSidebar.tsx` line 74-76). |
| **Decision needed** | Accept Joyride defaults for MVP. Enhance in custom tooltip if needed. |
| **Owner** | Implementer + Accessibility reviewer |

---

### Risk 11: Bundle / Performance Impact

| Field | Detail |
|---|---|
| **Why it matters** | `react-joyride` is approximately 20-25KB gzipped. If it ends up in Archestimator's public route bundles (`/`, `/login`, `/about`, `/pricing`, `/contact`), it adds unnecessary weight for unauthenticated users who never see the tour. The `/workshop` route already loads many client components (sidebar, tree, charts, copilot) — adding Joyride to an already-heavy bundle. |
| **Severity** | **LOW** |
| **Likelihood** | **LOW** — Dynamic import with `{ ssr: false }` keeps Joyride out of server bundles. The `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false` flag combined with dynamic import means Joyride is never fetched when the feature is off. Archestimator already uses this pattern for the Copilot (behind `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED`, line 56 of `WorkshopPageShell.tsx`). Bundle analyzer verification (`ANALYZE=true bun run build`) will confirm Joyride stays in `/workshop` chunks only. |
| **Mitigation** | (1) Dynamic import via `next/dynamic(() => import(...), { ssr: false })` keeps Joyride out of initial server bundle. (2) Feature flag prevents even the dynamic import module from loading. (3) `ANALYZE=true bun run build` verification at end of Phase 1 confirms Joyride does not leak into public route bundles. (4) Joyride's internal `react-floater` dependency is tree-shaken to only the spotlight feature used. |
| **Decision needed** | Acceptable bundle impact for a workspace-only feature. |
| **Owner** | Implementer |

---

### Risk 12: Technical Debt from Inert Attributes

| Field | Detail |
|---|---|
| **Why it matters** | Adding `data-tour` attributes to UI components (e.g., `data-tour="sidebar.workshop"` on the `MainSidebar` Workshop nav item at line 32, or `data-tour="homebase.projects"` on destination tiles in `WorkshopHomebaseClient.tsx` line 55) creates inert markup that persists even if the onboarding feature is removed. In a worst-case scenario, 50+ `data-tour` attributes scatter across the component tree with no runtime consumer. |
| **Severity** | **LOW** |
| **Likelihood** | **LOW** — These attributes have zero JS/CSS side effects. They don't trigger renders, affect layout, or appear in the accessibility tree. They are pure data annotations. |
| **Mitigation** | (1) All target values are string constants in `src/features/onboarding/config/tourTargets.ts`, making them discoverable via grep. (2) If onboarding is removed, a single grep for `data-tour` finds every instance for cleanup. (3) The `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` feature flag can disable the runtime without removing attributes — they're "sleep mode" debt. (4) Archestimator's strict file-change tracking (GitNexus, `.ai/` plans) means the target attribute locations are documented in `05_file_change_map.md`. |
| **Decision needed** | Accept minimal technical debt from inert `data-tour` attributes. Centralized constant references make cleanup trivial. |
| **Owner** | Implementer |

---

### Risk 13: Future Maintainability

| Field | Detail |
|---|---|
| **Why it matters** | Archestimator's UI is in active development. The `WorkshopPageShell`, `MainSidebar`, and `WorkshopHomebaseClient` are all subject to change. New routes under `/workshop/*` (see roadmap in `.ai/01_roadmap/README.md`) may rearrange navigation and workspaces. Tours that reference these UIs will become stale — targets disappear, copy describes old workflows, new features are untoured. |
| **Severity** | **MEDIUM** |
| **Likelihood** | **MEDIUM** — UIs change. It's inevitable. The question is whether the tour system can survive change gracefully. |
| **Mitigation** | (1) **Versioned tour keys** — e.g., `"workspace.orientation.v1"`, `"workspace.orientation.v2"`. When the UI changes significantly, increment the version. Old version stays `completed` for users who already saw it. New version is a clean tour for all users. (2) **Target-missing logs** — `onboardingEvents` (even in no-op mode) alerts to stale selectors. (3) **Tour registry** maps routes to current-version tours; old versions are archived but retained for state lookup. (4) Documentation: `07_tour_registry_and_targeting_plan.md` records the target-to-component mapping, making impact analysis possible before UI refactors. |
| **Decision needed** | Tour versioning as part of the architecture. Every tour key includes a version suffix from day one. |
| **Owner** | Product Owner + Maintainer |

---

## Open Questions

### Blocking (Must Answer Before Phase 2)

These questions must have decisions recorded before `data-tour` attributes are placed on components (Phase 2 target markers). Answers shape the entire implementation.

#### Q1: MVP Tour Scope — Workspace Orientation Only, or Include Project Creation?

**Context:** The `04_implementation_matrix.md` lists four tours: Workspace Orientation (5 steps), Project Creation (5 steps), Estimate Sheet (6 steps), Component Library (6 steps). The MVP could ship all four, or just Workspace Orientation.

**Recommendation:** Workspace Orientation only. It covers the highest-value discovery (sidebar → homebase → navigation), has the fewest dependencies, and proves the architecture end-to-end. Additional tours can be added incrementally without architectural changes.

**Owner:** Product Owner  
**Deadline:** Before Phase 2 starts

---

#### Q2: Custom Tooltip — Build Now or Defer to Phase 5?

**Context:** Phase 3 can use Joyride's `styles` prop to achieve 80% design-system compliance (fonts, colors, radius). Phase 5 builds a custom `OnboardingTooltip` component with full control. Building the custom tooltip in Phase 3 delays the first working tour by 1-2 days but eliminates rework.

**Recommendation:** Defer to Phase 5. Styled Joyride in Phase 3 gets the tour working and testable. The custom tooltip is a UX polish item that can be swapped in later without changing tour definitions, step sequences, or persistence. The `tooltipComponent` prop makes the swap seamless.

**Owner:** Design + Product Owner  
**Deadline:** Before Phase 3 starts

---

#### Q3: Mobile Tours — Support or Defer?

**Context:** As described in Risk 9, the sidebar is hidden on mobile (`< 1024px`). Construction professionals use desktop. Mobile tours require conditional step logic and a separate step sequence for small viewports.

**Recommendation:** Defer mobile tours. Render `null` on viewports `< 1024px`. Save tour state as "skipped" so the user isn't nagged on mobile and doesn't lose their tour when they switch to desktop. Construction is a desktop industry; mobile onboarding has near-zero ROI for closed beta.

**Owner:** Product Owner  
**Deadline:** Before Phase 2 starts

---

### Non-Blocking (Can Answer Later)

These questions do not block implementation but should be answered before production rollout (Phase 7).

#### Q4: Tour Analytics — Wire Up Immediately or Defer?

**Context:** `src/features/onboarding/services/onboardingEvents.ts` is designed as a no-op abstraction. It can log events to console (dev), send to an analytics service (production), or remain silent. No existing analytics framework exists in the workspace (landing page has GA/Clarity with consent gate, but the workspace is analytics-free).

**Recommendation:** Defer. Keep `onboardingEvents` as a no-op with structured event signatures. Wire it to an analytics service only when Archestimator has a workspace analytics strategy.

**Owner:** Product Owner + Analytics  
**Deadline:** Before Phase 7

---

#### Q5: A/B Test — Tour vs No Tour?

**Context:** Archestimator has an A/B testing framework in `src/lib/ab-testing/`. An experiment could test whether the onboarding tour improves first-session completion rates, time-to-first-project, or feature discovery. However, the closed beta audience is too small for statistically significant results.

**Recommendation:** Not in MVP. Closed beta sample size is insufficient for A/B testing. Revisit when Archestimator has 100+ weekly active users.

**Owner:** Product Owner  
**Deadline:** N/A (post-launch)

---

#### Q6: Tour Localization — Needed for PH Market?

**Context:** Archestimator's primary market is the Philippines (PH) construction industry. Filipino/AEC professionals primarily work in English. All app UI, measurement units, and domain terminology are in English. The `README.md` stack shows no i18n framework (no `next-intl`, `react-i18next`, or similar).

**Recommendation:** English only for MVP. The app is English-first. Tour copy matches the existing UI language. If localization becomes a product requirement, the tour registry architecture supports translated step arrays via locale keys.

**Owner:** Product Owner  
**Deadline:** N/A (post-launch)

---

## Decision Log

All decisions made in response to the above risks and questions should be recorded here before Phase 1 implementation begins.

| ID | Decision | Made By | Date | Status |
|----|----------|---------|------|--------|
| D01 | (pending) React Joyride compatibility confirmed | Implementer | — | Awaiting Phase 1 |
| D02 | Joyride `zIndex = 101` as tour config constant | Implementer | — | Approved in plan |
| D03 | Route-scoped tours only. No cross-route tours. | Architect | — | Approved in plan |
| D04 | Tour versioning: every key includes version suffix | Architect | — | Approved in plan |
| D05 | Skip = permanent; Complete = permanent; Replay = opt-in only | Product Owner | — | Awaiting approval |
| D06 | (pending) MVP scope: Workspace Orientation only | Product Owner | — | Awaiting decision |
| D07 | (pending) Custom tooltip deferred to Phase 5 | Design + PO | — | Awaiting decision |
| D08 | (pending) Mobile tours deferred | Product Owner | — | Awaiting decision |
| D09 | Tour analytics deferred | Product Owner | — | Non-blocking |
| D10 | A/B testing deferred (small sample) | Product Owner | — | Non-blocking |
| D11 | English only for MVP | Product Owner | — | Non-blocking |

---

## Summary

| Risk | Severity | Mitigation Confidence | Status |
|------|----------|----------------------|--------|
| Package compatibility | HIGH | Phase 1 verification gate | ⚠️ Needs verification |
| SSR/client boundary | HIGH | Proven dynamic import pattern | ✅ Mitigated |
| Missing targets | MEDIUM | Timeout + skip + log | ✅ Mitigated |
| Design system violation | MEDIUM | Phase 5 custom tooltip | ⚠️ Phase 5 needed |
| Z-index conflict | MEDIUM | zIndex 101 constant | ✅ Mitigated |
| Persistence/RLS | MEDIUM | Standard RLS testing | ✅ Mitigated |
| Annoying onboarding | HIGH | Short tours, permanent skip, opt-in replay | ⚠️ Needs UX review |
| Multi-route fragility | MEDIUM | Route-scoped only | ✅ Mitigated |
| Mobile UX | LOW | Defer mobile; construction = desktop | ⚠️ Needs decision |
| Accessibility | MEDIUM | Joyride defaults + Phase 6 QA | ⚠️ Needs QA |
| Bundle impact | LOW | Dynamic import + flag gate | ✅ Mitigated |
| Technical debt | LOW | Inert attributes, grep-cleanable | ✅ Mitigated |
| Maintainability | MEDIUM | Versioned tour keys | ✅ Mitigated |

**Go/No-Go:** ALL HIGH-severity risks must have confirmed mitigation before Phase 7 rollout. Three HIGH risks (package compatibility, annoying onboarding, SSR boundary) — two are mitigated by architecture, one requires Phase 1 verification. No blocking HIGH risks remain unresolved.
