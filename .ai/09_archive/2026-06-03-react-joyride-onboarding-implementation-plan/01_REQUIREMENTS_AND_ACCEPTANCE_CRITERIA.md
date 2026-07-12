# 01 — Requirements & Acceptance Criteria

**Feature:** React Joyride Onboarding System for ArchEstimator
**Date:** 2026-06-03 (refined)
**Source:** Compiled from existing plan docs 00, 01, 02, 09, 11, 12, 17

---

## Requirement Priority Legend

| Label | Meaning |
|-------|---------|
| **MUST** | Non-negotiable for MVP. Blocks implementation if missing. |
| **SHOULD** | Strongly recommended. May be deferred to later phase with documented risk. |
| **COULD** | Nice to have. Explicitly deferred to post-MVP. |
| **OUT_OF_SCOPE** | Explicitly excluded. Will not implement. |

---

## Functional Requirements

### FR-1: Route-Scoped Tour Segments
**Priority:** MUST
**MVP:** Workspace Orientation tour only
**Later:** Project Creation, Estimate Sheet, Component Library tours

The onboarding system MUST support multiple independent tour segments, each scoped to a specific `/workshop` route. Tours MUST NOT span across routes in a single continuous flow for MVP.

**Acceptance Criteria:**
- [ ] AC-FR1-1: When user navigates to `/workshop`, the Workspace Orientation tour activates
- [ ] AC-FR1-2: When user navigates to `/workshop/projects`, the Project Creation tour activates (future)
- [ ] AC-FR1-3: Navigating away from a tour's route gracefully terminates the current tour
- [ ] AC-FR1-4: Each tour is independently completable/skippable

### FR-2: Versioned Tour Keys
**Priority:** MUST

Tour definitions MUST use versioned key strings (e.g., `workspace.orientation.v1`). When a tour is updated in a future release, incrementing the version ensures existing users who completed the old version are not forced to re-take it.

**Acceptance Criteria:**
- [ ] AC-FR2-1: Tour keys follow the pattern `{segment}.{name}.v{version}`
- [ ] AC-FR2-2: Changing a tour's step content increments its version
- [ ] AC-FR2-3: Users who completed `workspace.orientation.v1` are not shown `workspace.orientation.v1` again
- [ ] AC-FR2-4: Users who completed `workspace.orientation.v1` ARE eligible for `workspace.orientation.v2` when released

### FR-3: Per-User Completion Persistence
**Priority:** MUST

Tour completion state MUST be persisted per authenticated user via Supabase. Once a user completes or skips a tour (specific key + version), that tour MUST NOT auto-show again.

**Acceptance Criteria:**
- [ ] AC-FR3-1: After completing a tour, refreshing the page does not restart the tour
- [ ] AC-FR3-2: After skipping a tour, subsequent logins do not auto-show it
- [ ] AC-FR3-3: Completion state survives browser close, cache clear, and device change (server-authoritative)
- [ ] AC-FR3-4: Two browser tabs see consistent state after first tab completes

### FR-4: Manual Replay
**Priority:** MUST

Users MUST be able to manually replay any completed/skipped tour. Replay is opt-in only — never auto-triggered.

**Acceptance Criteria:**
- [ ] AC-FR4-1: A "Replay tour" action is accessible from Settings or Help menu
- [ ] AC-FR4-2: Activating replay resets the tour state and starts from step 1
- [ ] AC-FR4-3: Replay does not create a new persistence row — updates existing

### FR-5: Skip & Dismiss
**Priority:** MUST

Every tour step MUST have a clearly visible "Skip tour" action. Skipped tours are permanently dismissed for that version. Users can still replay manually.

**Acceptance Criteria:**
- [ ] AC-FR5-1: "Skip tour" button is visible on every step
- [ ] AC-FR5-2: Clicking "Skip" immediately dismisses the tour and persists `status: 'skipped'`
- [ ] AC-FR5-3: Pressing Escape key also skips the tour
- [ ] AC-FR5-4: Skipped tours do not auto-show on subsequent logins

### FR-6: Feature Flag Gating
**Priority:** MUST

The entire onboarding system MUST be gated behind `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false` (default). When `false`, zero onboarding code executes at runtime.

**Acceptance Criteria:**
- [ ] AC-FR6-1: With flag `false`, the app behaves identically to pre-onboarding state
- [ ] AC-FR6-2: With flag `false`, `react-joyride` is not loaded into the client bundle
- [ ] AC-FR6-3: With flag `true`, onboarding runtime activates for eligible users
- [ ] AC-FR6-4: Flag change takes effect on next page load (no server restart required for `NEXT_PUBLIC_*`)

### FR-7: Workspace-Only Scope
**Priority:** MUST

Onboarding runtime MUST only execute on authenticated `/workshop` routes. MUST NOT load on public routes (`/`, `/login`, `/share`, `/invite`, `/about`, `/pricing`, `/contact`, `/privacy`, `/terms`).

**Acceptance Criteria:**
- [ ] AC-FR7-1: Public route bundles do not contain `react-joyride` code (verify with bundle analyzer)
- [ ] AC-FR7-2: Visiting `/login` as signed-out user loads zero onboarding JS
- [ ] AC-FR7-3: Visiting `/share/[token]` loads zero onboarding JS
- [ ] AC-FR7-4: Visiting `/workshop` as authenticated user loads onboarding runtime (when flag enabled)

---

## Non-Functional Requirements

### NFR-1: Performance — Bundle Size
**Priority:** MUST

React Joyride (lazy-loaded) MUST NOT increase the initial workspace bundle by more than 35KB gzipped. When feature flag is `false`, bundle size MUST be identical to pre-onboarding.

**Acceptance Criteria:**
- [ ] AC-NFR1-1: `ANALYZE=true bun run build` shows Joyride only in workspace chunks, not public page chunks
- [ ] AC-NFR1-2: Joyride chunk ~25-30KB gzipped (package ~50KB parsed)
- [ ] AC-NFR1-3: Feature flag `false` → tree-shaken, zero additional bytes

### NFR-2: Performance — Lazy Loading
**Priority:** MUST

Onboarding runtime MUST use `next/dynamic` with `ssr: false`. MUST NOT block initial page render or hydration.

**Acceptance Criteria:**
- [ ] AC-NFR2-1: `OnboardingRuntime` uses `dynamic(() => import('...'), { ssr: false })`
- [ ] AC-NFR2-2: Server-rendered HTML does not contain onboarding markup
- [ ] AC-NFR2-3: Lighthouse TBT (Total Blocking Time) does not increase by >50ms on `/workshop`

### NFR-3: Security — RLS Enforcement
**Priority:** MUST

`user_onboarding_tours` table MUST have RLS enabled. Users MUST only read/write their own rows. Server actions MUST verify user identity via `getCurrentUserContext()`.

**Acceptance Criteria:**
- [ ] AC-NFR3-1: RLS policy: `auth.uid() = user_id` for SELECT/INSERT/UPDATE
- [ ] AC-NFR3-2: No DELETE policy — rows persist for audit
- [ ] AC-NFR3-3: Vitest test proves user A cannot read user B's tour rows
- [ ] AC-NFR3-4: Vitest test proves unauthenticated requests are rejected

### NFR-4: Compatibility
**Priority:** MUST

System MUST work with the current stack: Next.js 16.2.6, React 19.2.6, TypeScript 6.0.3, Bun, Tailwind CSS v4. React Joyride compatibility MUST be verified during Phase 1 skeleton.

**Acceptance Criteria:**
- [ ] AC-NFR4-1: `bun run build` succeeds with Joyride installed
- [ ] AC-NFR4-2: No hydration errors with `next/dynamic` SSR-disabled wrapper
- [ ] AC-NFR4-3: No TypeScript errors from Joyride types

---

## UX/UI Requirements

### UX-1: Short Tours
**Priority:** MUST
**MVP:** Workspace Orientation: 4-6 steps max
**Later:** Each additional tour: 4-6 steps max

### UX-2: Progressive Disclosure
**Priority:** MUST
Tours introduce features incrementally. First tour teaches workspace navigation only — not project creation, estimate editing, or component library.

### UX-3: Design System Compliance
**Priority:** MUST
All onboarding UI (tooltips, beacons, overlays) MUST follow ArchEstimator's design system:
- Font: SF Pro, regular/medium weights only
- Max font size: 12px in app/workshop
- Border radius: xs (3px) only
- Colors: neutral palette (`#292929`, `#5D5D5D`, `#7F7F7F`)
- Letter spacing: 0em
- Icons: Phosphor regular outline weight
- Verified by `bun run lint:design-system`

**Acceptance Criteria:**
- [ ] AC-UX3-1: `bun run lint:design-system` passes with zero violations from onboarding components
- [ ] AC-UX3-2: Tooltip text does not exceed 12px
- [ ] AC-UX3-3: All corners use 3px radius
- [ ] AC-UX3-4: Icons use Phosphor regular outline weight

### UX-4: Non-Intrusive
**Priority:** MUST
Tours MUST NOT block the user from using the app. User can interact with app elements outside the current tour target. Skip is always accessible.

### UX-5: Task-Based, Not Feature Tour
**Priority:** MUST
Onboarding MUST focus on helping the user reach first meaningful success: understand workspace destinations, create a project, understand the estimate tree/sheet, and know where components live. NOT a generic "here's every button" tour.

---

## Accessibility Requirements

### A11Y-1: Keyboard Navigation
**Priority:** MUST
Users MUST be able to navigate tours entirely via keyboard: Tab between controls, Enter/Space to activate, Escape to skip.

### A11Y-2: Screen Reader Support
**Priority:** MUST
Tour steps MUST announce via ARIA live regions. Tooltip content MUST be readable by screen readers. Focus MUST move to the tooltip on step change.

### A11Y-3: Focus Management
**Priority:** MUST
On tour start: focus moves to tooltip. On step change: focus returns to tooltip. On tour end/dismiss: focus returns to the last focused element.

### A11Y-4: Reduced Motion
**Priority:** MUST
If user has `prefers-reduced-motion: reduce`, disable Joyride beacon animation and spotlight transitions. Use instant appear/disappear.

### A11Y-5: WCAG AA Target
**Priority:** SHOULD
Onboarding components SHOULD meet WCAG 2.1 AA: sufficient color contrast (4.5:1 for text, 3:1 for UI components), visible focus indicators, no content flashing >3 times/second.

---

## Data/Persistence Requirements

### DATA-1: Schema
**Priority:** MUST
Table: `user_onboarding_tours` with columns: `id` (uuid PK), `user_id` (uuid FK → auth.users), `workspace_id` (uuid FK nullable), `tour_key` (text), `tour_version` (integer default 1), `status` (text: not_started/started/completed/skipped), `current_step` (integer nullable), timing fields (started_at, completed_at, skipped_at, last_seen_at — all timestamptz nullable), `metadata` (jsonb default '{}'), `created_at`, `updated_at`.

See `08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md` for full schema, RLS policies, and unique constraint `(user_id, workspace_id, tour_key, tour_version)`.

### DATA-2: No Client-Side Authority
**Priority:** MUST
The client MUST NOT be the source of truth for completion state. localStorage is transient fallback only. Supabase is authoritative.

---

## Explicit Non-Goals

- **NO** public route tours (`/`, `/login`, `/share`, `/invite`, etc.)
- **NO** analytics/event tracking integration
- **NO** tour builder/admin UI
- **NO** marketing attribution
- **NO** stored tour analytics/A/B testing on tour variants
- **NO** auto-playing tours — always user-dismissible
- **NO** cross-route continuous tours for MVP
- **NO** mobile-specific tours (desktop-first for closed beta)
- **NO** custom animation engine (use Joyride defaults, customize styles only)

---

## Assumptions

1. **React Joyride is compatible with React 19.2 / Next 16.2.** Verified during Phase 1 skeleton. If incompatible, plan switches to alternative.
2. **Supabase is the authoritative persistence layer.** Already active with 48 migrations and RLS on all user-data tables.
3. **`WorkshopPageShell` remains the authenticated shell wrapper.** Currently at `src/app/workshop/page.tsx` — verify during implementation.
4. **`NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` follows the existing feature flag pattern** used by `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` and `ARCHESTIMATOR_AI_ENABLED`.
5. **Users are authenticated before reaching `/workshop`.** The `proxy.ts` middleware enforces this.
6. **Desktop-only for closed beta.** Per owner decision: Chrome + Edge desktop supported for beta.

---

## Definition of "Implementation-Ready"

A document is implementation-ready when:
- All claims reference exact file paths, component names, or route names in the current repo
- No "TBD" without owner and blocking status
- No vague instructions like "update relevant files"
- All acceptance criteria are binary pass/fail
- All risks have severity, likelihood, mitigation, and rollback
- An engineer could implement directly without asking clarifying questions

## Definition of "Done" for Future Implementation

The onboarding feature is DONE when:
1. All MUST requirements are implemented and verified
2. All acceptance criteria pass with evidence (test output, manual QA screenshots, build artifacts)
3. `bun run validate` passes with zero new failures
4. Full test suite passes (unit + DOM + E2E as applicable)
5. Feature flag gates the system correctly (on/off)
6. No public routes are affected
7. Design-system linter passes
8. RLS policies are tested and verified
9. Plan is archived to `.ai/09_archive/store/`
10. `.ai/10_state/current-state.md` is updated
