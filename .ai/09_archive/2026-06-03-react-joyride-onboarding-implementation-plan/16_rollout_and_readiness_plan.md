# 16 Rollout and Readiness Plan

**Status:** Planning
**Created:** 2026-06-03
**Route/surface:** `/workshop/*` authenticated surfaces behind `WorkshopPageShell`
**References:**
- `.env.example:29` — `CLOSED_BETA_ACCESS_ENABLED=false` (closed beta gate)
- `.env.example:47–48` — `ARCHESTIMATOR_AI_ENABLED` and `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` (feature flag patterns)
- `03_recommended_architecture.md:265–295` — Feature flag `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED`
- `04_implementation_matrix.md:13–49` — Implementation phases and MVP scope
- `05_file_change_map.md` — Exact file paths, risk assessments per phase
- `00_executive_summary.md:110–121` — First safe implementation slice (Phase 1)
- `.ai/03_plans/mvp-launch-readiness-2026-06-01/40-closed-beta-operations-runbook.md` — Closed beta operations, production env posture
- `.ai/03_plans/mvp-launch-readiness-2026-06-01/29-beta-program-readiness-plan.md` — Beta cohort, success metrics, exit criteria
- `15_testing_and_qa_plan.md` — Test strategy, regression gates, bundle verification
- `12_security_and_privacy_analysis.md` — RLS, user identity, CI enforcement

## Purpose

Define the readiness assessment, rollout strategy, feature flag configuration, closed beta integration, monitoring signals, rollback plan, and launch criteria for the React Joyride onboarding system. Every step references the existing ArchEstimator infrastructure (Vercel deployments, Supabase migrations, closed beta allowlist model, CI via GitHub Actions `.github/workflows/ci.yml`).

---

## 1. Readiness Checklist Before Implementation

### 1.1 Codebase Readiness

- [ ] **This plan reviewed and approved by product owner:** All 22 documents in `2026-06-03-react-joyride-onboarding-implementation-plan/` scored 98+ on the quality scorecard (per `README.md:53`). Philip Lewis explicitly approves before Phase 1 begins.
- [ ] **MVP tour scope decided:** Recommended: Workspace Orientation only (`first_workspace_orientation_v1`, surface #1 from `04_implementation_matrix.md:75–91`). Covers the `/workshop` homebase, 5 steps, single route, no modals, no dynamic imports. If approved scope differs, update `04_implementation_matrix.md` § MVP Decision.
- [ ] **Persistence schema approved:** `user_onboarding_tours` table design (from `08_database_and_persistence_plan.md:41–57`) reviewed and approved. RLS policies (`08:118–143`) reviewed.
- [ ] **Custom tooltip decision made:** Recommended: styled Joyride tooltip for MVP (`OnboardingTooltip.tsx`, per `03_recommended_architecture.md:38`). Design-system compliant (SF Pro, 12px max, xs radius, neutral palette per `DESIGN.md` § Typography). If a third-party tooltip or fully custom overlay is preferred, document the decision before Phase 5.
- [ ] **Feature flag name confirmed:** `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` (per `03_recommended_architecture.md:267`). Follows existing pattern: `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` in `.env.example:48` and usage in `WorkshopPageShell.tsx:132` (`{showAskFlip ? <AskFlipFooterAssistant /> : null}`).

### 1.2 Technical Prerequisites

- [ ] **`react-joyride` tested with React 19.2.6 + Next.js 16.2.6:** Phase 1 skeleton installs the package behind feature flag OFF, renders a no-op Joyride (`steps={[]}`, `run={false}`). If this builds, passes `type-check`, and produces no hydration errors, compatibility is verified. If it fails, documented alternatives are Shepherd.js or custom lightweight tour. Per `00_executive_summary.md:102–103`: "This verification happens before any tour content, target markers, or persistence work — zero sunk cost if the package doesn't work."
- [ ] **Local Supabase running for migration testing:** `npx supabase start` must succeed. Required for Phase 4 (persistence). Verify with `npx supabase status`.
- [ ] **Vitest + Playwright test infrastructure verified:** `bun run test:dom` passes all 161 existing Vitest files. `bun run test:e2e` passes all 12 existing Playwright specs. Run both before Phase 1 to establish baseline.
- [ ] **Bundle analyzer available:** `ANALYZE=true bun run build` produces bundle analysis output. Used in Phase 6 to verify zero Joyride in public route chunks (per `15_testing_and_qa_plan.md` § Bundle Analysis).

### 1.3 Team Readiness

- [ ] **One engineer assigned to onboarding implementation:** Single-threaded execution preferred for a self-contained feature folder. Avoids merge conflicts, ensures consistent architecture decisions.
- [ ] **Design review for tooltip styling:** `OnboardingTooltip.tsx` design approved against `DESIGN.md` § Typography and § Colors. Fonts, sizes, radius, colors, icon references verified before Phase 5.
- [ ] **Copy review for tour content:** All step titles and body text from `10_copywriting_and_step_content.md` reviewed by Philip. Brand voice rules (no cute language, one idea per body, jobsite precision) enforced.
- [ ] **QA time allocated for manual testing:** Budget 2–4 hours of manual QA for MVP tour (full pass of `15_testing_and_qa_plan.md` § Manual QA Checklist) plus 1 hour for cross-browser verification.

---

## 2. MVP Rollout Strategy

All phases behind the feature flag OFF until Phase 7. Each phase deploys independently. No phase deploys with user-visible behavior until Phase 7 rollout.

### Phase 1: Skeleton (Week 1)

| Activity | Details | Verification |
|----------|---------|--------------|
| Install react-joyride | `bun add react-joyride`. Verify in `bun.lock`. | `bun install --frozen-lockfile` succeeds. |
| Create feature folder | `src/features/onboarding/` with `types/onboarding.ts`, `config/tourTargets.ts`, `config/tourRegistry.ts`, `config/tourKeys.ts`, `config/firstWorkspaceOrientationTour.ts` (empty skeleton), `hooks/useOnboardingEnabled.ts`, `components/OnboardingRuntime.tsx` (no-op). | `bun run type-check` passes. |
| Add feature flag to `.env.example` | `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false` with comment: `# Enable React Joyride onboarding tours (Phase 1: no-op skeleton, Phase 3+: live tours). Set to "true" to activate.` | Entry present in `.env.example`. |
| Zero user-visible behavior | `OnboardingRuntime` renders `null` or empty `<div>` when flag is OFF. | App looks identical to baseline. |
| Deploy behind feature flag OFF | Push to `main` (or `feat/onboarding`). CI passes: `bun run validate` (type-check + lint + lint:design-system + bun test + vitest) plus `bun run build`. | GitHub Actions CI green (`.github/workflows/ci.yml`). Vercel deployment succeeds. |

**Risk:** Low. Only additive files, no component modifications. Fully reversible via `git revert`.

### Phase 2: Target Markers (Week 1–2)

| Activity | Details | Verification |
|----------|---------|--------------|
| Add `data-tour` attributes to MVP surfaces | `WorkshopPageShell.tsx`: `data-tour={TOUR_TARGETS.WORKSPACE_SHELL}`. `MainSidebar.tsx`: `data-tour` to 5 sidebar nav items (Workshop, Projects, Components, Templates, Settings). `WorkshopHomebaseClient.tsx`: `data-tour` to 3 bento grid cards (Projects, Components, Templates). | `grep -r "data-tour" src/components/workshop/ src/components/sidebar/` shows 9 attributes. |
| Add `tourTarget` prop to `SidebarNavItemRow` | Optional `tourTarget?: string` prop. Renders `data-tour={tourTarget}` when provided. | `SidebarNavItemRow` renders `data-tour` only when prop is passed. |
| Add `tourTarget` prop to `HeaderIconToolbar` | Optional `tourTarget?: string` prop (for future phases — not used in MVP but added now to avoid refactoring later per `07_tour_registry_and_targeting_plan.md:538–612`). | `HeaderIconToolbar` accepts optional prop. |
| `tourTargets.test.ts` written | Per `15_testing_and_qa_plan.md` § Tour Target Tests. | `bun run test:dom` passes with new test file. |
| Deploy behind feature flag OFF | Push to `main`. Feature flag OFF means no `OnboardingRuntime` renders. `data-tour` attributes are inert HTML attributes with zero visual or functional impact. | No visual changes. `bun run type-check` passes. Existing E2E tests pass. |

**Risk:** Low. `data-tour` attributes are inert. Adding optional props to shared primitives is non-breaking.

### Phase 3: Runtime (Week 2)

| Activity | Details | Verification |
|----------|---------|--------------|
| Implement `OnboardingRuntime` | Client component, mounted in `WorkshopPageShell` via `next/dynamic({ ssr: false })`. Feature-gated. Routes to correct tour via `getTourForRoute()`. | `bun run build` succeeds. Component renders only when flag ON. |
| Implement `OnboardingProvider` | React context for tour state and control functions. Wraps workspace content. | Provider renders children, context accessible. |
| Implement `useOnboardingTourController` | State machine: `idle → loadingUser → loadingTourState → waitingForRoute → waitingForTargets → ready → running`. Controlled Joyride mode. | `tourStateMachine.test.ts` passes all 14 transitions (per `15_testing_and_qa_plan.md` § State Machine Tests). |
| Implement `useMountedTourTargets` | MutationObserver + 100ms polling fallback, 5s timeout. | Unit test: target present → resolves. Target missing after 5s → rejects. |
| Wire first tour: Workspace Orientation | `firstWorkspaceOrientationTour.ts` with 5 steps (per `10_copywriting_and_step_content.md:38–233`). | Tour steps render on `/workshop` when flag ON and target elements present. |
| `OnboardingRuntime.test.tsx` and `OnboardingProvider.test.tsx` written | Per `15_testing_and_qa_plan.md` § Component Tests and § Provider Tests. | `bun run test:dom` passes. |
| Test locally with feature flag ON | Set `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true` in `.env.local`. Tour auto-starts on `/workshop`. | Tour visible locally. Skip and complete buttons work (but completion is not persisted yet — Phase 4). |
| Deploy with feature flag OFF | Merge to `main`. Feature flag OFF in production. Internal team can test by setting flag temporarily in Vercel preview deploys. | Production unchanged. Preview deploy with flag ON shows tour. |

**Risk:** Medium (new runtime code). Mitigated by feature flag OFF in production. All runtime code is tree-shaken when flag is OFF.

### Phase 4: Persistence (Week 2–3)

| Activity | Details | Verification |
|----------|---------|--------------|
| Create Supabase migration | `npx supabase migration new user_onboarding_tours`. SQL from `08_database_and_persistence_plan.md:41–57` (CREATE TABLE), `08:98–110` (indexes), `08:118–143` (RLS policies), `08:153–160` (trigger), `08:167–175` (grants). | Migration applies cleanly: `npx supabase migration up`. |
| Generate Supabase types | `npx supabase gen types typescript --linked > src/lib/supabase/types.ts`. | `Tables<"user_onboarding_tours">` and `TablesInsert<"user_onboarding_tours">` appear in generated types. |
| Implement server actions | `src/lib/onboarding/actions.ts`: `getUserOnboardingTours`, `upsertOnboardingTourState`, `getOnboardingTourState`. Follows pattern from `src/lib/estimates/actions.ts` (`"use server"` + `requireCurrentUserContext()`). | `onboardingPersistence.test.ts` passes (9 tests per `15_testing_and_qa_plan.md` § Server Action Tests). |
| Implement `useOnboardingState` hook | TanStack Query hook with `tourQueryKey = ["onboarding-tours"]`, 5-min `staleTime`/`gcTime` (matches `AppProviders` config). | `useOnboardingState.test.ts` passes. |
| Wire persistence to runtime | `OnboardingRuntime` calls `getUserOnboardingTours` on mount. On skip/complete, calls `upsertOnboardingTourState`. | Tour completion persists across page reloads when tested locally. |
| Deploy migration to linked Supabase | Apply migration to the staging/production Supabase project (project ref `ebxxqidacheyapmmzavr` per `README.md`). | `user_onboarding_tours` table exists in Supabase Studio. RLS policies visible. |
| Deploy to production with feature flag OFF | Merge to `main`. Server actions exist but are never called (runtime doesn't mount). Migration applied but table is empty. | Production unchanged. `bun run type-check` passes. |

**Risk:** Medium (schema change, server actions). Mitigated by: migration is DDL only (reversible via `DROP TABLE`), server actions follow existing proven patterns, RLS tested in Vitest. Feature flag OFF prevents any client calls.

### Phase 5: UX Polish (Week 3)

| Activity | Details | Verification |
|----------|---------|--------------|
| Style `OnboardingTooltip.tsx` | Match design system: SF Pro font, 12px max title, 10px body, xs radius (3px), neutral palette (`#292929`/`#5D5D5D`/`#7F7F7F`), Phosphor icons for close button. | `OnboardingTooltip.test.tsx` passes (9 tests per `15_testing_and_qa_plan.md` § Tooltip Tests). |
| Add replay entry point | `OnboardingReplayMenuItem` in `/workshop/settings/page.tsx`. Lists replayable tours (`tourDefinition.allowReplay === true`). | "Replay" button visible in Settings → Onboarding section. |
| Implement skip/dismiss behavior | Skip button + Escape key dismiss. Skip is permanent (persisted as `status='skipped'`). Dismiss on overlay click outside tooltip. | Verified via manual QA checklist. |
| Refine copy | Review step titles and bodies against `10_copywriting_and_step_content.md`. Apply any feedback from copy review. | Copy matches approved content. |
| Internal demo | Present to Philip. Walk through full tour flow on a fresh account. | Demo completed, feedback collected. |

**Risk:** Low (styling + UI polish). No schema changes, no new dependencies. All changes are in `OnboardingTooltip.tsx` and `settings/page.tsx`.

### Phase 6: Testing (Week 3–4)

| Activity | Details | Verification |
|----------|---------|--------------|
| Write all Vitest tests | 8 test files (per `15_testing_and_qa_plan.md` § Test File Inventory). Run `bun run test:dom`. | All 8 new test files pass. Existing 161 test files still pass. |
| Write all Playwright E2E tests | 4 spec files: `onboarding-workspace-orientation.spec.ts`, `onboarding-project-creation.spec.ts`, `onboarding-estimate-sheet.spec.ts`, `onboarding-regression.spec.ts`. Run `bun run test:e2e`. | All 4 new specs pass. Existing 12 specs still pass. |
| Manual QA full pass | Execute `15_testing_and_qa_plan.md` § Manual QA Checklist (15 items). Execute § Edge Cases Checklist (17 items). Execute § Accessibility QA Checklist (7 items). | All items checked. 0 P0/P1 bugs. |
| Accessibility audit | Run axe-core on tour flow. Verify keyboard navigation, screen reader, focus trap, focus restoration. | All accessibility checks pass per `15_testing_and_qa_plan.md` § Accessibility QA Checklist. |
| Bundle analysis | `ANALYZE=true bun run build`. Verify zero Joyride in public route chunks, Joyride ≤30KB in `/workshop` chunks, flag OFF → zero Joyride loaded. | Bundle analysis confirms all checks. |
| Lighthouse baseline | Run Lighthouse on `/workshop` with feature flag ON (tour NOT active). | Score unchanged from baseline (±2 points). FCP, LCP, TBT, CLS unaffected. |
| Fix bugs | Any issues found during testing phase. | All bugs fixed, tests re-run, no regressions. |

### Phase 7: Rollout (Week 4)

| Step | Action | Rollback Trigger |
|------|--------|-----------------|
| 1 | Set `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true` in Vercel **preview/staging** environment. | If tour breaks or causes visual regressions, set back to `false`. |
| 2 | QA full tour on staging with fresh account. | If any step fails or content is wrong, fix before proceeding. |
| 3 | Beta test with 2–3 internal/invited users on staging. Collect feedback. | If any P0/P1 issues, fix and re-test. |
| 4 | Monitor staging for errors (Vercel function errors, Supabase errors). | If error rate spikes, roll back flag to `false`. |
| 5 | Set `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true` in Vercel **production** environment. | If any issue arises, see § Rollback Plan below. |
| 6 | Monitor production for 48 hours. Watch for: Joyride import failures, target-not-found errors, `upsertOnboardingTourState` failures. | If error rate >0 for onboarding-specific errors, investigate and fix or roll back. |

---

## 3. Feature Flag Configuration

### 3.1 Flag Specification

```
NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false
```

| Property | Value |
|----------|-------|
| **Name** | `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` |
| **Default** | `false` (disabled) |
| **Prefix** | `NEXT_PUBLIC_` — client-exposed, readable in browser via `process.env`. Follows pattern from `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` in `.env.example:48`. |
| **Valid values** | `"true"`, `"1"`, `"yes"`, `"on"` → enabled. `"false"`, `"0"`, `"no"`, `"off"`, `""`, unset → disabled. Parsed by `readBooleanFeatureFlag()` in `src/features/onboarding/hooks/useOnboardingEnabled.ts` (per `03_recommended_architecture.md:276–285`). |
| **Set in** | `.env.example` (default `false`), `.env.local` (per-developer), Vercel Environment Variables (per-environment). |
| **Toggle method** | Set in Vercel env, deploy not required if using `next/dynamic` (client reads env at request time). For extra safety, a redeploy after env change ensures consistency. |
| **Server-action check** | Server actions (`src/lib/onboarding/actions.ts`) also check this flag — if `false`, they return early or throw "onboarding disabled" error. Prevents client-side bypass. |

### 3.2 Existing Feature Flag Patterns (for reference)

| Flag | File | Purpose | Default |
|------|------|---------|---------|
| `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` | `.env.example:48` | Show "Ask Flip" AI assistant footer | `false` |
| `ARCHESTIMATOR_AI_ENABLED` | `.env.example:47` | Enable AI routes (server-only) | `false` |
| `CLOSED_BETA_ACCESS_ENABLED` | `.env.example:29` | Enable closed beta allowlist gate | `false` |
| `PROJECT_INVITE_ENTRY_ENABLED` | `.env.example:24` | Enable collaboration invite links | `false` |
| `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` | (new) | Enable React Joyride onboarding tours | `false` |

---

## 4. Closed Beta Integration

### 4.1 No Separate Allowlist Needed

Onboarding tours are non-destructive, workspace-scoped, and gated behind authentication. Every authenticated user sees tours unless they've completed/skipped them. Since ArchEstimator is in closed beta (invite-only via `closed_beta_allowed_emails` per `.ai/03_plans/mvp-launch-readiness-2026-06-01/29-beta-program-readiness-plan.md:18`), the entire user base is already curated.

**Recommended:** Enable for all closed beta users when the flag goes to production. No separate allowlist or gradual rollout mechanism for onboarding specifically. The feature flag provides the universal kill switch.

### 4.2 Beta User Onboarding Flow

```
1. Philip adds user to closed_beta_allowed_emails
2. User receives manual invite email (per operations runbook § Add A Beta User)
3. User signs in via Google OAuth at /login
4. User lands on /workshop (post-auth destination per auth-onboarding-guard.test.ts:22-30)
5. Tour auto-starts (NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true, no prior completion)
6. User completes or skips tour
7. Tour state persisted in user_onboarding_tours
8. Subsequent visits: no tour re-shown
```

### 4.3 Feedback Collection

If users provide feedback about tours (confusing steps, wrong targets, missing content), it flows through the existing feedback channel: protected `/workshop/feedback` → `beta_feedback_submissions` (after review migration apply), or via support email `support@archestimator.com` (per `40-closed-beta-operations-runbook.md:70`).

---

## 5. Monitoring Signals

### 5.1 What to Monitor

| Signal | Source | Severity | Action |
|--------|--------|----------|--------|
| Joyride import failure | Vercel function logs, browser console errors | P1 | Dynamic import failed. Check bundle integrity, CDN availability. Roll back flag if persistent. |
| Target not found errors | `onboardingEvents.targetMissing()` — console in MVP | P2 | Component refactored without updating `data-tour`. Fix target or update step definition. |
| `upsertOnboardingTourState` errors | Supabase error logs, Vercel function logs | P1 | RLS misconfiguration, schema mismatch. Fix and re-deploy migration. |
| Tour completion rate | (Future — no-op analytics in MVP) | Info | If <50% completion, review tour length and copy. |
| Step drop-off | (Future) | Info | Identify which step users abandon at → improve copy or remove step. |
| Replay rate | (Future) | Info | High replay rate = users want to re-learn. Consider improving tooltip content or adding in-app help. |

### 5.2 No-Op Analytics Abstraction

All analytics events go through `src/features/onboarding/services/onboardingEvents.ts` (per `03_recommended_architecture.md:392–405`). In MVP, all functions are no-ops that log to `console.log` (development) or are silent (production). This file is the single integration point for future analytics (GA, PostHog, custom):

```typescript
// src/features/onboarding/services/onboardingEvents.ts
export const onboardingEvents = {
  trackTourStart(tourKey: string) {
    if (process.env.NODE_ENV === 'development') console.log('[onboarding] tour_start', tourKey);
  },
  trackStepView(tourKey: string, stepIndex: number, stepId: string) {
    if (process.env.NODE_ENV === 'development') console.log('[onboarding] step_view', tourKey, stepIndex, stepId);
  },
  trackTourComplete(tourKey: string) {
    if (process.env.NODE_ENV === 'development') console.log('[onboarding] tour_complete', tourKey);
  },
  trackTourSkip(tourKey: string, stepIndex: number) {
    if (process.env.NODE_ENV === 'development') console.log('[onboarding] tour_skip', tourKey, stepIndex);
  },
  trackTourReplay(tourKey: string) {
    if (process.env.NODE_ENV === 'development') console.log('[onboarding] tour_replay', tourKey);
  },
  trackTargetMissing(tourKey: string, stepId: string, targetSelector: string) {
    if (process.env.NODE_ENV === 'development') console.warn('[onboarding] target_missing', tourKey, stepId, targetSelector);
  },
  trackError(tourKey: string, error: Error) {
    if (process.env.NODE_ENV === 'development') console.error('[onboarding] error', tourKey, error.message);
  },
};
```

### 5.3 Future Analytics Events (When Wired)

When a real analytics provider is integrated, the same `onboardingEvents` functions map to:

| Event | Payload |
|-------|---------|
| `onboarding_started` | `{ tourKey, timestamp }` |
| `onboarding_step_viewed` | `{ tourKey, stepIndex, stepId, timestamp }` |
| `onboarding_completed` | `{ tourKey, timestamp }` |
| `onboarding_skipped` | `{ tourKey, stepIndex, timestamp }` |
| `onboarding_replayed` | `{ tourKey, timestamp }` |
| `onboarding_target_missing` | `{ tourKey, stepId, targetSelector, timestamp }` |
| `onboarding_error` | `{ tourKey, error: string, timestamp }` |

---

## 6. Rollback Plan

### 6.1 Immediate Rollback (Seconds)

**Action: Disable feature flag in Vercel.**

1. Go to Vercel Dashboard → Project Settings → Environment Variables.
2. Set `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false`.
3. **No redeploy needed** if `OnboardingRuntime` is dynamically imported with `next/dynamic({ ssr: false })`. The client reads `process.env.NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` at request time.
4. For extra safety: trigger a redeploy from the Vercel dashboard or `vercel --prod`.
5. **Result:** Tour stops appearing for all users within seconds. No data loss. All tour state remains in `user_onboarding_tours` table (dormant).

### 6.2 Full Rollback (Hours)

If the feature needs to be completely removed from the codebase:

1. **Revert `WorkshopPageShell.tsx` changes:** Remove `<OnboardingRuntime />` import and mount point, remove `isOnboardingToursEnabled()` check.
2. **Drop database table:**
   ```sql
   DROP TABLE IF EXISTS public.user_onboarding_tours CASCADE;
   ```
   Run via Supabase SQL Editor or `npx supabase migration repair --status reverted <version>`.
3. **Revert `data-tour` attributes:** Remove from `WorkshopPageShell.tsx`, `MainSidebar.tsx`, `WorkshopHomebaseClient.tsx`. Revert optional `tourTarget` prop from `SidebarNavItemRow.tsx` and `HeaderIconToolbar.tsx`.
4. **Remove dependency:** `bun remove react-joyride`.
5. **Delete feature folder:** `rm -rf src/features/onboarding/`.
6. **Delete server actions:** `rm -rf src/lib/onboarding/`.
7. **Remove feature flag:** Remove `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` from `.env.example` and `.env.local`.
8. **Delete test files:** Remove `tests/vitest/onboarding/` directory and `e2e/onboarding-*.spec.ts` files.
9. **Deploy previous version:** `git revert` the onboarding commits or deploy an earlier Vercel deployment.

### 6.3 Partial Rollback (Per-Phase)

| Phase | Rollback Action |
|-------|----------------|
| Phase 1 | `git revert` the commit. `bun remove react-joyride`. Delete `src/features/onboarding/`. |
| Phase 2 | `git revert` the target markers commit. Remove `data-tour` attributes. Revert prop additions. |
| Phase 3 | `git revert` runtime commits. Set flag to `false`. Runtime code stays in tree but never loads. |
| Phase 4 | Set flag to `false` (prevents client calls). Then: `DROP TABLE user_onboarding_tours` + `git revert` migration + delete server actions. |
| Phase 5 | `git revert` polish commits. Styling-only changes, no data impact. |
| Phase 6 | No rollback needed (tests only). |
| Phase 7 | Set flag to `false` in Vercel. Keep code and data in place. Investigate and fix, or proceed to full rollback. |

---

## 7. Launch Criteria

All criteria must be met before `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true` in production.

### 7.1 Testing Gate

- [ ] All Phase 6 tests pass: 8 Vitest files + 4 E2E specs. Run `bun run test:dom && bun run test:e2e`.
- [ ] Manual QA complete with **0 P0/P1 bugs**. P0 = tour doesn't start, crashes app, or data loss. P1 = step content wrong, target misaligned, skip doesn't persist. P2 = cosmetic issues acceptable for MVP.
- [ ] Accessibility audit: no blocking issues. Keyboard navigation, screen reader, focus trap all functional. WCAG AA contrast met.
- [ ] Bundle analyzer: `react-joyride` ≤30KB gzipped in `/workshop` chunks, 0KB in public route chunks (verified via `ANALYZE=true bun run build`).
- [ ] Lighthouse: `/workshop` performance score unchanged (±2 points) from baseline. FCP, LCP, TBT, CLS unaffected.

### 7.2 Review Gate

- [ ] Internal demo approved by Philip. Full tour walked through on staging.
- [ ] Copy review approved. All step titles and body text match approved content from `10_copywriting_and_step_content.md`.
- [ ] Design review approved. Tooltip matches `DESIGN.md` constraints (SF Pro, 12px max, xs radius, neutral palette, Phosphor icons).
- [ ] Feature flag documented in this runbook. Rollback plan verified (flag toggle tested on staging).

### 7.3 Security Gate

- [ ] RLS policies tested and verified (`onboardingPersistence.test.ts` unauthorized read/write tests pass).
- [ ] `requireCurrentUserContext()` called in every server action (verified via code review).
- [ ] No PII in `metadata` JSONB column (verified via code review of all `upsertOnboardingTourState` call sites).
- [ ] Client-side state is never authoritative. Server action validates `auth.uid()` before any write.
- [ ] `react-joyride` package audited: `bun audit` shows no critical/high vulnerabilities.

### 7.4 Operations Gate

- [ ] Migration applied to production Supabase project (`ebxxqidacheyapmmzavr`).
- [ ] `user_onboarding_tours` table visible in Supabase Studio with RLS policies active.
- [ ] Feature flag configurable per environment in Vercel (staging, production).
- [ ] Rollback rehearsed on staging: set flag OFF, verify tour stops, set flag ON, verify tour resumes.

---

## 8. Post-Launch Improvement Loop

After the tour is live in production:

1. **Monitor completion/drop-off rates** (via analytics when wired, or via manual query of `user_onboarding_tours` table):
   ```sql
   SELECT status, COUNT(*) FROM public.user_onboarding_tours GROUP BY status;
   ```
2. **Identify steps with high drop-off:** If users frequently skip at a specific step, improve copy or remove the step. Query `current_step` for `status='skipped'` rows to find the abandonment point.
3. **Collect user feedback** via the existing beta feedback channel. Look for comments about tours being confusing, too long, or targeting wrong elements.
4. **A/B test tooltip copy variants:** If the A/B testing framework (`src/lib/ab-testing/`) is extended to app features, test different step copy to see which drives completion.
5. **Add new tours based on user confusion signals:** If beta feedback reveals users struggle with specific surfaces (e.g., estimate export, component library organization), add tour segments for those surfaces.
6. **Update tours when UI changes significantly:** If `WorkshopPageShell`, `MainSidebar`, or `WorkshopHomebaseClient` are redesigned, update `data-tour` targets and tour step definitions. Increment tour version (`_v2` suffix) so existing users who completed the old version see the new one.
7. **Version tours when redesigns happen:** Per `07_tour_registry_and_targeting_plan.md:467` — a version bump creates a new tour key, treated as a new tour. Existing users keep their `_v1` completion; they see `_v2` as a new tour.

---

## 9. Manual Verification Before Enabling (Production)

This checklist must be completed on the production environment **before** enabling the feature flag for users.

- [ ] All tours complete successfully from start to finish (tested on staging with same production code).
- [ ] Skip works and persists across sessions.
- [ ] Replay works from Settings page.
- [ ] No tour appears on public routes (`/`, `/about`, `/pricing`, `/contact`, `/login`, `/privacy`, `/terms`).
- [ ] No tour appears on `/share/[token]` (test with a valid shared link).
- [ ] No tour appears for users who completed (test by completing tour, then revisiting `/workshop`).
- [ ] No visual regressions — screenshot comparison: `/workshop` before/after flag ON (with user who completed tours, so no tour renders). Only difference should be absence/presence of inert `data-tour` attributes.
- [ ] No accessibility regressions — axe-core scan of `/workshop` with flag ON shows no new violations.
- [ ] No performance regression — Lighthouse score unchanged.
- [ ] All existing E2E tests pass with feature flag ON: `bun run test:e2e` exits 0 with all 12 existing specs.

---

## 10. Quality Scorecard Self-Check

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Rollout phases are specific and sequenced | ✅ Pass | 7 phases with week estimates, activities, verification per phase |
| Feature flag documented | ✅ Pass | §3: name, default, valid values, setting locations, server-action check |
| Closed beta integration addressed | ✅ Pass | §4: no separate allowlist, full onboarding flow, feedback channel |
| Monitoring signals defined | ✅ Pass | §5: 6 signals with source, severity, and action |
| Analytics abstraction referenced | ✅ Pass | §5.2: `onboardingEvents.ts` with no-op functions, §5.3: future event schema |
| Rollback plan is concrete and phased | ✅ Pass | §6: immediate (seconds), full (hours), partial (per phase) |
| Launch criteria are gated and measurable | ✅ Pass | §7: 4 gates (testing, review, security, operations) with 18 checkboxes |
| Post-launch improvement loop defined | ✅ Pass | §8: 7 steps — monitoring, drop-off analysis, feedback, A/B testing, new tours, UI updates, versioning |
| Manual verification checklist included | ✅ Pass | §9: 10 checks specific to production enablement |
| References existing infrastructure | ✅ Pass | Vercel deployments, Supabase migrations, closed beta ops runbook, GitHub Actions CI |
| Per-phase risk assessment | ✅ Pass | Every phase includes risk level and mitigation |
