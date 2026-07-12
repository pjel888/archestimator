# 05 — Blast Radius & Risk Analysis

**Date:** 2026-06-03 (refined)
**Source:** Enhanced from `14_blast_radius_analysis.md` and `17_risks_decisions_and_open_questions.md`

---

## Affected User Flows

| Flow | Impact | Severity |
|------|--------|----------|
| Authenticated user navigates to `/workshop` | Tour may auto-start (when flag enabled + tour not completed) | LOW |
| Authenticated user navigates between workshop routes | Tour controller checks route, may start/stop tours | LOW |
| Authenticated user completes/skips tour | Persistence write to Supabase | LOW |
| Authenticated user replays tour from Settings | Tour state reset | LOW |
| Public user visits landing, login, share, invite routes | **Zero impact** — onboarding runtime never loaded | NONE |
| Unauthenticated user attempts to access `/workshop` | Redirected to `/login` by existing auth gate — no change | NONE |

## Affected Modules

| Module | Type of Future Change | Potential Failure | Severity | Likelihood | Mitigation | Rollback |
|--------|----------------------|-------------------|----------|------------|------------|----------|
| `WorkshopPageShell` | Add `<OnboardingRuntime>` via dynamic import | Dynamic import fails, shell crashes | HIGH | LOW | ErrorBoundary around OnboardingRuntime | Remove dynamic import line |
| `MainSidebar` | Add `data-tour` attributes to nav items | Selector breaks, tour targets fail | LOW | LOW | target-not-found graceful skip | Remove data-tour attributes |
| `WorkshopHomebaseClient` | Add `data-tour` attributes to destination cards | Same as above | LOW | LOW | Same as above | Same |
| `HeaderIconToolbar` | Add `data-tour` attribute | Same as above | LOW | LOW | Same as above | Same |
| `NewProjectModal` | Add `data-tour` attributes (future tour) | Modal z-index conflicts with Joyride overlay | MEDIUM | MEDIUM | Pause tour when modal opens | Remove data-tour from modal |
| `supabase/migrations` | New `user_onboarding_tours` table | Migration fails, RLS misconfigured | MEDIUM | LOW | Follow 48 existing migration patterns, Vitest RLS tests | Drop table, revert migration |
| `src/lib/auth/session.ts` | No change — persistence reads user_id from existing `getCurrentUserContext()` | N/A | NONE | NONE | N/A | N/A |
| `src/app/providers.tsx` | **NO CHANGE** — onboarding NOT placed here | N/A | NONE | NONE | N/A | N/A |
| `src/proxy.ts` | **NO CHANGE** — auth gate unchanged | N/A | NONE | NONE | N/A | N/A |

## Route-Level Impact Table

| Route | Onboarding Active? | Risk | Notes |
|-------|-------------------|------|-------|
| `/` (landing) | **NO** | NONE | Public route — no onboarding runtime |
| `/login` | **NO** | NONE | Auth route — no onboarding runtime |
| `/about`, `/features`, `/pricing`, `/contact` | **NO** | NONE | Marketing routes |
| `/privacy`, `/terms` | **NO** | NONE | Legal routes |
| `/invite/[token]` | **NO** | NONE | Invite entry — public |
| `/share/[token]` | **NO** | NONE | Shared link viewer — public |
| `/beta/*` | **NO** | NONE | Beta access routes — public |
| `/workshop` | **YES (MVP)** | LOW | Workspace Orientation tour |
| `/workshop/projects` | Future | LOW | Project Creation tour (later) |
| `/workshop/projects/[projectId]` | Future | LOW | Project Dashboard (later) |
| `/workshop/projects/[projectId]/estimates` | Future | LOW | Estimates list (later) |
| `/workshop/projects/[projectId]/estimates/[nodeId]` | Future | MEDIUM | Estimate editor — complex UI, many targets |
| `/workshop/library` | Future | LOW | Component library tour (later) |
| `/workshop/settings/*` | Replay trigger only | LOW | Manual replay entry point |

## Public-Route Exclusion Table

| Route Prefix | Excluded? | Verification |
|-------------|-----------|-------------|
| `/login` | YES | Bundle analyzer: no Joyride in login chunk |
| `/share/` | YES | Bundle analyzer: no Joyride in share chunk |
| `/invite/` | YES | Bundle analyzer: no Joyride in invite chunk |
| `/beta/` | YES | Bundle analyzer: no Joyride in beta chunk |
| `/about`, `/features`, `/pricing`, `/contact` | YES | Bundle analyzer |
| `/privacy`, `/terms` | YES | Bundle analyzer |

## Shared-Link-Route Exclusion Table

| Route | Excluded? | Reasoning |
|-------|-----------|-----------|
| `/share/[token]` | YES | Public route — unauthenticated viewers must not load onboarding |
| `/api/share/[token]/*` | YES | API routes — no onboarding runtime |

## Risk Register (Top Risks)

See `12_OPEN_QUESTIONS_AND_DECISIONS.md` for full risk register with 13 risks. Top 3:

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| React Joyride + React 19.2/Next 16.2 incompatibility | HIGH | MEDIUM | Phase 1 skeleton verification before any Phase 2+ work |
| Annoying onboarding experience | HIGH | MEDIUM | Short tours, easy skip, permanent dismissal, opt-in replay |
| Z-index conflicts with sidebar/modals | MEDIUM | HIGH | Joyride `zIndex: 101`, pause on modal open |

## Concurrency Risks

| Scenario | Risk | Mitigation |
|----------|------|------------|
| Two tabs complete same tour simultaneously | Duplicate persistence rows | UNIQUE constraint on (user_id, tour_key, tour_version) enforces single row; ON CONFLICT upsert |
| Tab 1 starts tour while tab 2 completes it | Tab 1 shows stale state | TanStack Query `refetchOnWindowFocus` picks up completion on tab switch |

## Merge Conflict Risks

- `WorkshopPageShell` rarely modified — low conflict risk
- `MainSidebar` and `WorkshopHomebaseClient` may have concurrent changes in other branches — coordinate
- New `src/features/onboarding/` is a greenfield folder — zero conflict risk

## Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Tour target not in DOM when step advances | 5-second timeout, skip step, log warning |
| User rapidly clicks through steps | Joyride controlled mode throttles step transitions |
| User opens modal during tour | Tour pauses, resumes on modal close |
| User navigates away mid-tour | Tour controller detects route change, gracefully stops |
| User has no workspace yet (first login) | Tour shows after workspace bootstrap — verify `WorkshopPageShell` renders after profile creation |
| User refreshes page mid-tour | Tour re-checks persistence — if status='started', resumes at last step |
| Feature flag changed while user has active session | Takes effect on next page load (`NEXT_PUBLIC_*` is build-time) |
| JavaScript disabled | No tour (requires JS). App degrades gracefully — no onboarding, but app works. |
| Mobile/tablet viewport | Desktop-only guard. Onboarding runtime checks viewport width; skips if <1024px |

## Rollback Strategy

**Tier 1 — Feature Flag (instant):** Set `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false`. Redeploy. All onboarding runtime removed from client.

**Tier 2 — Code Revert (1 commit):** Revert the feature branch. Removes all onboarding code, `data-tour` attributes, and dynamic import. App returns to pre-onboarding state.

**Tier 3 — Database Revert (if migration applied):** Drop `user_onboarding_tours` table. No data dependencies — safe to drop.
