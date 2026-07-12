# 14 — Blast Radius Analysis

> React Joyride onboarding tours for Archestimator workspace
> Status: pre-implementation analysis
> Date: 2026-06-03

---

## All Likely Files Touched in Future Implementation

### New files (no blast radius — additive only)

| Path | Category | Phase |
|------|----------|-------|
| `src/features/onboarding/components/OnboardingRuntime.tsx` | Runtime | 3 |
| `src/features/onboarding/components/OnboardingTourController.tsx` | Runtime | 3 |
| `src/features/onboarding/components/OnboardingBeacon.tsx` | UI | 5 |
| `src/features/onboarding/components/OnboardingTooltip.tsx` | UI | 5 |
| `src/features/onboarding/components/OnboardingProgressBar.tsx` | UI | 5 |
| `src/features/onboarding/components/OnboardingStepContent.tsx` | UI | 5 |
| `src/features/onboarding/components/TourTargetWrapper.tsx` | Wrapper | 3 |
| `src/features/onboarding/tours/first-workspace-orientation.ts` | Tour definition | 4 |
| `src/features/onboarding/tours/index.ts` | Tour registry | 4 |
| `src/features/onboarding/tours/types.ts` | Types | 1 |
| `src/features/onboarding/hooks/useOnboardingTourState.ts` | Hook | 4 |
| `src/features/onboarding/hooks/useTourAutoStart.ts` | Hook | 5 |
| `src/features/onboarding/hooks/useTargetWaiter.ts` | Hook | 3 |
| `src/features/onboarding/stores/onboarding-ui-store.ts` | Zustand | 3 |
| `src/features/onboarding/styles/onboarding.css` | Styles | 5 |
| `src/lib/onboarding/feature-flags.ts` | Config | 1 |
| `src/lib/onboarding/actions.ts` | Server action | 4 |
| `src/lib/onboarding/types.ts` | Types | 4 |
| `supabase/migrations/XXXXXXXXXXXXXX_user_onboarding_tours.sql` | Migration | 4 |
| `tests/vitest/onboarding/rls.test.ts` | Test | 4 |
| `tests/vitest/onboarding/actions.test.ts` | Test | 4 |
| `tests/vitest/onboarding/tour-definitions.test.ts` | Test | 4 |
| `tests/vitest/onboarding/tour-state.test.ts` | Test | 4 |
| `tests/vitest/onboarding/feature-flags.test.ts` | Test | 4 |
| `tests/vitest/onboarding/target-waiter.test.ts` | Test | 5 |
| `tests/vitest/onboarding/onboarding-runtime.test.tsx` | Test | 5 |
| `tests/vitest/onboarding/store.test.ts` | Test | 5 |
| `e2e/onboarding-first-workspace.spec.ts` | E2E | 7 |
| `e2e/onboarding-skip-complete.spec.ts` | E2E | 7 |
| `e2e/onboarding-persistence.spec.ts` | E2E | 7 |

### Modified files (have blast radius)

| File | Change | Risk | Phase |
|------|--------|------|-------|
| `package.json` | Add `react-joyride` dependency | MEDIUM | 1 |
| `bun.lock` | Auto-updated by `bun install` | LOW (auto) | 1 |
| `src/components/workshop/WorkshopPageShell.tsx` | Add `OnboardingRuntime` dynamic import + feature flag | MEDIUM | 3 |
| `src/components/sidebar/MainSidebar.tsx` | Add `data-tour` attributes to sidebar elements | VERY LOW | 2 |
| `src/components/sidebar/SidebarNavItemRow.tsx` | Optional `tourTarget` prop (additive) | VERY LOW | 2 |
| `src/components/workshop/WorkshopHomebaseClient.tsx` | Add `data-tour` attributes to bento grid tiles | VERY LOW | 4 |
| `.env.example` | Add `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false` | NONE | 1 |
| Additional components (later phases — see implementation matrix below) | `data-tour` attributes only | VERY LOW | 5+ |

---

## Blast Radius Table

Each entry is scored across three dimensions:
- **Severity:** How bad is the failure if it occurs? (NONE / LOW / MEDIUM / HIGH / CRITICAL)
- **Likelihood:** How likely is the failure? (NONE / VERY LOW / LOW / MEDIUM / HIGH)
- **Risk Score:** Severity × Likelihood (guidance only)

| Area | Files/Routes | Type of Change | Potential Failure | Severity | Likelihood | Mitigation | Rollback |
|------|-------------|----------------|-------------------|----------|------------|------------|----------|
| **Package** | `package.json`, `bun.lock` | Add `react-joyride` dependency | Build failure (version conflict with React 19.2.4), transitive dependency clash | HIGH | LOW | Test `bun install && bun run build` immediately after adding dependency. Pin exact version. Check peer dependency compatibility with React 19. | `bun remove react-joyride` |
| **Workshop Shell** | `WorkshopPageShell.tsx` | Add `dynamic()` import, feature flag guard | Shell fails to render → white screen on ALL workshop routes | **CRITICAL** | VERY LOW | Feature flag OFF by default. `try/catch` around dynamic import → graceful fallback to `null`. Suspense boundary already exists in shell (line 107). `dynamic()` pattern already used safely for modals. | Revert `WorkshopPageShell.tsx` (single file), feature flag stays off |
| **Sidebar** | `MainSidebar.tsx` | Add `data-tour` attributes to nav items | No functional change — HTML `data-*` attributes are inert by spec | LOW | VERY LOW | `data-tour` attributes are not interpreted by the browser. They only exist as CSS selector hooks. No render path depends on them. No prop drilling changes (attributes added directly to JSX elements). | Revert file |
| **Sidebar Item** | `SidebarNavItemRow.tsx` | Add optional `tourTarget?: string` prop (default `undefined`) | Component still renders identically when prop is omitted → backward compatible | LOW | VERY LOW | Prop is optional (`tourTarget?: string`). When omitted, no `data-tour` attribute rendered — identical to current behavior. Existing callers don't need changes. | Revert file |
| **Homebase** | `WorkshopHomebaseClient.tsx` | Add `data-tour` attributes to bento grid tiles | No visual change → data attributes are inert | LOW | VERY LOW | Same as sidebar — `data-tour` attributes are purely CSS selector hooks. No behavior change. | Revert file |
| **Database** | `user_onboarding_tours` table | New table + unique constraint + indexes + RLS policies | Migration failure (syntax error, constraint conflict). RLS too restrictive (policies block legitimate access). RLS too permissive (no policies → default-deny makes table inaccessible) | MEDIUM | LOW | Test migration locally (`supabase db reset` + `supabase db push`). Verify RLS with Vitest test suite. Unique constraint prevents duplicate state rows. | Drop table, revert migration |
| **Server Actions** | `src/lib/onboarding/actions.ts` | New `'use server'` functions | Wrong user data exposed (if `requireCurrentUserContext()` is omitted or bypassed). SQL injection via `tour_key` | HIGH | VERY LOW | RLS enforces `auth.uid() = user_id` at DB level (defense in depth). Server action derives `user_id` from `requireCurrentUserContext()`, never from client input. `tour_key` validated against known tour registry. | Revert file (new file, no existing callers) |
| **Supabase Types** | `src/lib/supabase/types.ts` | Auto-regenerated from DB schema | Type mismatch with existing code (if type regeneration changes existing interfaces) | LOW | LOW | Types are generated from actual DB schema via `supabase gen types`. Only additive (new table types added, nothing removed). Existing interfaces unchanged. | Re-generate types from DB (or revert and regenerate) |
| **Auth Flow** | `proxy.ts`, `src/lib/auth/*` | **No change** | None — onboarding does not modify auth middleware, login flow, session refresh, or callback handlers | NONE | NONE | N/A | N/A |
| **Public Routes** | `/`, `/about`, `/features`, `/pricing`, `/contact`, `/login`, `/privacy`, `/terms`, `/auth/callback` | **No change** | None — onboarding code is never imported, bundled, or executed on public routes | NONE | NONE | Tree-shaking + route gating + CSP headers → triple guarantee | N/A |
| **Share Routes** | `/share/[token]/`, `src/components/share/*` (11 files) | **No change** | None — share routes use their own component tree (`src/components/share/*`), never import `WorkshopPageShell` | NONE | NONE | Route isolation + CSP enforcement (`next.config.ts` line 77-88) + bundle verification | N/A |
| **Invite Routes** | `/invite/[token]/` | **No change** | None — invite routes use their own layout | NONE | NONE | N/A | N/A |
| **API Routes** | `src/app/api/*` | **No change** | None — API routes don't render components | NONE | NONE | N/A | N/A |
| **Tests** | `tests/vitest/onboarding/*`, `e2e/onboarding-*.spec.ts` | New test files (additive) | Test failures from false positives or flaky selectors | LOW | LOW | Tests are additive (new files, no existing test modifications). E2E tests gated behind `ARCHESTIMATOR_E2E_ONBOARDING=1` flag (matching existing pattern for mutating E2E specs). | Delete test files |
| **ENV** | `.env.example` | Add `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false` | None — new optional flag, default disabled | NONE | NONE | Default: `false`. Doesn't affect existing env parsing. Backward compatible with existing `.env` files. | Remove line |

---

## Routes Affected

| Route | Impact | Risk | Notes |
|-------|--------|------|-------|
| `/workshop/` (homebase) | `OnboardingRuntime` may render (feature-gated). `data-tour` attributes on sidebar and bento grid tiles. | LOW | First workspace orientation tour targets live here. |
| `/workshop/projects/` | `OnboardingRuntime` may render. Sidebar tour targets only. | LOW | Project creation tour targets (Phase 2+). Phase 1: no project-tour targets. |
| `/workshop/projects/[id]/estimates/` | `OnboardingRuntime` may render. Sidebar targets only. | LOW | Estimate tour targets (Phase 3+). Phase 1: no estimate-tour targets. |
| `/workshop/projects/[id]/estimates/[nodeId]/` | `OnboardingRuntime` may render at shell level. `data-tour` on estimate sheet UI (Phase 3+). | MEDIUM | Estimate sheet is the most complex page. Tour targets must not interfere with inline editing or drag-and-drop. Phase 1: no targets here. |
| `/workshop/library/` | `OnboardingRuntime` may render. Sidebar targets only. | LOW | Library tour targets (Phase 4+). Phase 1: no library-tour targets. |
| `/workshop/templates/` | `OnboardingRuntime` may render. Sidebar targets only. | LOW | Templates page is simpler relative. |
| `/workshop/settings/profile/` | `OnboardingRuntime` may render. No tour targets planned. | VERY LOW | |
| `/workshop/settings/workspace/` | `OnboardingRuntime` may render. No tour targets planned. | VERY LOW | |
| `/workshop/feedback/` | `OnboardingRuntime` may render. No tour targets planned. | VERY LOW | |
| `/workshop/onboarding/` | Existing route (redirects to settings). May be repurposed or removed. | LOW | Decision needed: repurpose or remove. Currently redirects. |
| **All public routes** | Zero impact. Code never loaded. | **NONE** | Verified via route isolation + tree-shaking + bundle analysis. |

---

## Shared UI Primitives Affected

Archestimator's design system enforces a strict component hierarchy (see `DESIGN.md` and `scripts/enforce-app-design-system.mjs`). Onboarding must not break this hierarchy.

| Primitive | Change | Risk | Why low risk |
|-----------|--------|------|-------------|
| **MainSidebar** | `data-tour="..."` attributes on sidebar elements | VERY LOW | Data attributes are inert HTML — no render, style, or behavior impact. Not visible to users. Not tested by design-system linter (it only checks font/size/radius/spacing). |
| **SidebarNavItemRow** | Optional `tourTarget?: string` prop | VERY LOW | Backward compatible: prop defaults to `undefined`. When omitted, component renders identically to current behavior. TypeScript ensures callers don't break (optional parameter). |
| **WorkshopHomebaseClient** | `data-tour="..."` on bento grid tiles | VERY LOW | Same as MainSidebar — inert data attributes. |
| **HeaderIconToolbar** | Optional `tourTarget` prop (Phase 5+) | VERY LOW | Same pattern as SidebarNavItemRow. |
| **EmptyState** | No code change. Tour step may *reference* it via `data-tour` selector. | NONE | EmptyState component unchanged. Tour references the rendered DOM, not the component source. |
| **Button** | **No change** | NONE | |
| **Modal** | **No change** | NONE | |
| **Toast** | **No change** | NONE | |
| **Badge** | **No change** | NONE | |
| **Card** | **No change** | NONE | |
| **SearchInput** | **No change** | NONE | |
| **All other `src/components/ui/*`** | **No change** | NONE | Onboarding uses data attributes as CSS selectors. No component modifications needed. |

**Design-system compliance:** The design-system linter (`bun run lint:design-system`) enforces font, size, radius, and spacing constraints. Since `data-tour` attributes don't affect any of these properties, the linter will not flag them. Onboarding tooltip styles must match the design system (SF Pro, 12px max, xs-only radius, zero letter-spacing, neutral palette — see `DESIGN.md`) but these are self-contained in `onboarding.css` and the tour component files, not in shared primitives.

---

## Database Objects Affected

| Object | Type | Change |
|--------|------|--------|
| `user_onboarding_tours` | Table | **NEW** — stores tour state per user per tour |
| `user_onboarding_tours_user_id_tour_key_idx` | Unique index | **NEW** — enforces one state row per user per tour |
| `user_onboarding_tours_user_id_idx` | Index | **NEW** — speeds up `WHERE user_id = ...` queries |
| Various RLS policies | Policy | **NEW** — SELECT, INSERT, UPDATE policies (see doc 12) |
| `auth.users` | Table (Supabase managed) | **UNCHANGED** — foreign key reference from `user_onboarding_tours.user_id`, no modification to `auth.users` |
| All 40+ existing tables | Tables | **UNCHANGED** — no migration modifies existing tables |

**Migration impact on existing data:** The migration adds one new table with no dependencies on existing data. It does not alter any existing tables, columns, constraints, or policies. Zero downtime. Can be applied independently of code deployment.

---

## Auth Flows Affected

| Auth flow | Change? | Details |
|-----------|---------|---------|
| Google OAuth login | **NO** | Unchanged |
| Magic link login | **NO** | Unchanged |
| Auth callback (`/auth/callback/`) | **NO** | Unchanged |
| Session refresh | **NO** | Unchanged |
| Sign out | **NO** | Unchanged |
| Dev auth bypass | **NO** | Unchanged (`ARCHESTIMATOR_DEV_AUTH_BYPASS` path unchanged) |
| Invite entry (`/invite/[token]/`) | **NO** | Unchanged |

OnboardingRuntime checks auth state (user must be authenticated to render), but it uses existing session data — it does not modify the auth flow. If the user is unauthenticated, `OnboardingRuntime` simply renders nothing (or the shell itself prevents rendering — `WorkshopPageShell` is only accessible via protected `/workshop` routes).

---

## Tests Affected

### Existing tests: No breakage expected

All onboarding changes are either:
1. **Additive** (new files, new test files)
2. **Inert HTML attributes** (`data-tour` — not interpreted by any test)
3. **Gated behind feature flag** (off by default in CI)

**Verification:** Existing test suite (`bun run validate` → 115 Vitest files + 2 Bun test files + ESLint + tsc) should pass without modification.

### New tests added

| File | Type | Test count (estimated) | Phase |
|------|------|----------------------|-------|
| `tests/vitest/onboarding/rls.test.ts` | Integration (Supabase local) | 4-6 | 4 |
| `tests/vitest/onboarding/actions.test.ts` | Integration | 4-6 | 4 |
| `tests/vitest/onboarding/tour-definitions.test.ts` | Unit | 3-5 | 4 |
| `tests/vitest/onboarding/tour-state.test.ts` | Integration | 3-5 | 4 |
| `tests/vitest/onboarding/feature-flags.test.ts` | Unit | 2-3 | 4 |
| `tests/vitest/onboarding/target-waiter.test.ts` | Unit (jsdom) | 4-6 | 5 |
| `tests/vitest/onboarding/onboarding-runtime.test.tsx` | Component (RTL) | 4-6 | 5 |
| `tests/vitest/onboarding/store.test.ts` | Unit | 3-5 | 5 |
| `e2e/onboarding-first-workspace.spec.ts` | E2E (Playwright) | 3-5 | 7 |
| `e2e/onboarding-skip-complete.spec.ts` | E2E (Playwright) | 3-5 | 7 |
| `e2e/onboarding-persistence.spec.ts` | E2E (Playwright) | 3-5 | 7 |
| **Total** | | **~36-57 tests** | |

### E2E test gating

Following the existing pattern for mutating E2E specs (from `README.md`):

```bash
ARCHESTIMATOR_E2E_ONBOARDING=1  # Gate for onboarding E2E specs
```

E2E specs are skipped in CI unless explicitly enabled — matching the pattern used for `ARCHESTIMATOR_E2E_MUTATING_DND`, `ARCHESTIMATOR_E2E_COLLABORATION`, etc.

---

## Public Routes That Must Remain Unaffected

This section provides the **verification checklist** for each public route. When QA'ing the implementation, verify:

| Route | How to verify no onboarding impact |
|-------|-----------------------------------|
| `/` (landing) | `ANALYZE=true bun run build` → inspect landing chunk → zero `react-joyride` imports. Lighthouse unchanged. No `data-tour` attributes visible in DOM. |
| `/about` | Same verification as landing. Static page, no workshop shell. |
| `/features` | Same. |
| `/pricing` | Same. |
| `/contact` | Same. |
| `/login` | Same. Auth page — onboarding should never appear here. |
| `/privacy` | Same. |
| `/terms` | Same. |
| `/share/[token]` | **Critical check.** Share pages have enforced CSP (`next.config.ts` line 77-88). Verify no CSP violation reports for `react-joyride`. Verify zero Joyride in share bundle. Verify share page renders identically with flag ON vs OFF. |
| `/invite/[token]` | Invite entry page uses its own layout. Verify no onboarding code. |
| `/auth/callback` | API route — cannot render components. Verify no regression. |
| `/api/*` | API routes — no components. Verify no regression. |

---

## Rollback Strategy

### Immediate rollback (minutes) — zero deploy needed

```bash
# Option A: Feature flag (if already deployed with flag)
# Set in Vercel environment variables:
NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false
# No redeploy needed if flag is already in production env vars.
# OnboardingRuntime becomes `null` immediately on next page load.
```

```bash
# Option B: Quick code revert (single file)
# Only if WorkshopPageShell change is the issue:
# Remove these 4 lines from WorkshopPageShell.tsx:
#   import { isOnboardingToursEnabled } from '@/lib/onboarding/feature-flags';
#   const OnboardingRuntime = ...
#   <OnboardingRuntime />
# Deploy. All other changes (data-tour attributes, new files) are inert.
```

### Full rollback (hours) — complete removal

```bash
# 1. Code
git revert <commit-hash>  # Revert all onboarding commits
# Or manually:
rm -rf src/features/onboarding/
rm -rf src/lib/onboarding/
# Revert modifications to WorkshopPageShell.tsx, MainSidebar.tsx, etc.

# 2. Database
supabase db push  # or manually:
# DROP TABLE IF EXISTS user_onboarding_tours CASCADE;

# 3. Dependencies
bun remove react-joyride

# 4. Deploy previous version
# Vercel: Promote previous production deployment
# Or: git push the reverted state
```

### Why rollback is low-risk

1. **Feature flag is the first line of defense** — no code changes needed to disable.
2. **All new files are additive** — deleting them doesn't break anything.
3. **Modified files have minimal changes** — `data-tour` attributes are inert; `WorkshopPageShell` change is 3-4 lines.
4. **Database is independent** — the table can exist without the code, and vice versa (code gracefully handles missing table via TanStack Query error state).
5. **No migration modifies existing tables** — dropping `user_onboarding_tours` has zero side effects.

---

## Feature Flag Strategy

Following the existing pattern of environment-gated features in Archestimator:

```typescript
// src/lib/onboarding/feature-flags.ts
export function isOnboardingToursEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED === 'true';
}
```

### Flag lifecycle

| Environment | Default value | Rationale |
|-------------|--------------|-----------|
| `.env.example` | `false` | Disabled by default for new developers |
| Local dev | `true` (opt-in via `.env.local`) | Enable for development and testing |
| CI (GitHub Actions) | `false` (or omitted) | Tests should pass regardless of flag state; onboarding-specific tests set their own env |
| Staging (Vercel preview) | `true` | Test with real data before production |
| Production | `true` (after Phase 7 verification) | Gradual rollout: team first, then all users |

### Why `NEXT_PUBLIC_` prefix?

`NEXT_PUBLIC_` variables are inlined at build time and available in browser bundles. This allows the `isOnboardingToursEnabled()` check to work in both server and client contexts, and enables tree-shaking of the entire onboarding code path when the flag is `false`.

**Trade-off:** The flag value is visible in client-side JavaScript (anyone can inspect `process.env` in DevTools). This is acceptable because:
- The flag doesn't expose secrets (it's a boolean feature toggle).
- An attacker knowing `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true` gains no advantage.
- The flag controls UX, not security — actual security is enforced by RLS + `requireCurrentUserContext()`.

### Comparison to existing feature flags

```typescript
// Existing patterns from .env.example:
CLOSED_BETA_ACCESS_ENABLED=false              // Server-side flag (not NEXT_PUBLIC_)
PROJECT_INVITE_ENTRY_ENABLED=false            // Server-side flag (not NEXT_PUBLIC_)
NEXT_PUBLIC_ASK_FLIP_UI_ENABLED              // Client-exposed flag (matching pattern)
ARCHESTIMATOR_AI_ENABLED                      // Server-side flag (not NEXT_PUBLIC_)
```

`NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` follows the same pattern as `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` — a client-exposed flag for a UI feature that needs tree-shaking at build time.

---

## Safe Implementation Slices

Each phase is independently deployable and reversible:

```
Phase 1: Zero User Impact
├── Add react-joyride to package.json
├── Create src/lib/onboarding/feature-flags.ts
├── Create src/features/onboarding/tours/types.ts
├── Add NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false to .env.example
├── Create skeleton directory structure (empty files)
└── RISK: Build only (bun install + bun run build must pass)
     ROLLBACK: bun remove react-joyride, delete 2 new files

Phase 2: Inert Attributes
├── Add data-tour attributes to MainSidebar.tsx
├── Add optional tourTarget prop to SidebarNavItemRow.tsx
└── RISK: None (inert HTML attributes, backward-compatible prop)
     ROLLBACK: Revert 2 files

Phase 3: Runtime Behind Flag (OFF by default)
├── Create OnboardingRuntime.tsx (dynamic import in WorkshopPageShell)
├── Create Zustand store (onboarding-ui-store.ts)
├── Create useTargetWaiter hook
├── Create TourTargetWrapper component
└── RISK: LOW (feature flag off → OnboardingRuntime is null)
     ROLLBACK: Remove import from WorkshopPageShell.tsx

Phase 4: Persistence
├── Create supabase migration (user_onboarding_tours table + RLS)
├── Create src/lib/onboarding/actions.ts (server actions)
├── Create TanStack Query hooks
├── Create first tour definition (first-workspace-orientation.ts)
├── Add data-tour attributes to WorkshopHomebaseClient.tsx
├── Create Vitest tests for RLS, actions, tour definitions
└── RISK: LOW-MEDIUM (new DB table, RLS must be correct)
     ROLLBACK: Drop table, revert migration, delete action files

Phase 5: Polish
├── Create OnboardingTooltip, OnboardingBeacon, OnboardingProgressBar
├── Create onboarding.css (design-system compliant)
├── Create useTourAutoStart hook
├── Create additional test files
└── RISK: LOW (UI polish, no behavior change)
     ROLLBACK: Delete component files

Phase 6: Full Test Coverage
├── Complete Vitest test suite
├── Run manual QA on staging
├── Bundle analysis verification (ANALYZE=true)
└── RISK: NONE (tests only)
     ROLLBACK: N/A

Phase 7: Rollout
├── Set NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true on staging
├── Internal team dogfooding
├── Create E2E tests
├── Gradual production rollout (team → all users)
└── RISK: LOW (flag can be turned off instantly)
     ROLLBACK: Set flag to false in Vercel env vars
```

---

## Summary

| Dimension | Assessment |
|-----------|-----------|
| Files changed (modified) | 5-7 existing files, all with minimal/inert changes |
| Files added (new) | ~30 new files, all additive |
| Highest risk change | `WorkshopPageShell.tsx` dynamic import (CRITICAL severity, VERY LOW likelihood) |
| Most likely failure | Package version conflict (build fails, caught immediately) |
| Easiest rollback | Feature flag → instant disable, zero deploy |
| Database impact | 1 new table, 0 modifications to existing tables |
| Auth flow impact | None |
| Public route impact | None (triple guarantee: tree-shaking + route isolation + CSP) |
| Test suite impact | Existing tests unaffected. ~36-57 new tests added. |
| Team safety | Each phase is independently deployable and reversible with feature flag |
