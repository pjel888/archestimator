# 11 — Implementation Plan

This is the authoritative execution guide for the future implementation AI. It assumes `02` through `10` have been read.

## Phase order

| Phase | Goal | Depends on |
|---|---|---|
| Phase 0 | Pre-implementation proof checks | — |
| Phase 1 | Scoped RPC migration + repository (data access) with unit tests | Phase 0 |
| Phase 2 | URL state + scope + filter helpers | Phase 1 |
| Phase 3 | Server Component route + loading skeleton | Phase 1 |
| Phase 4 | Client Component (filter row + timeline + states) | Phase 2, Phase 3 |
| Phase 5 | Sidebar nav verification + visual polish | Phase 4 |
| Phase 6 | Adversarial QA + a11y + performance verification | Phase 5 |
| Phase 7 | Final gate: focused checks + `bun run validate` known-red handling + `bun run build` + manual QA | Phase 6 |

## Phase 0 — Pre-implementation discovery

### P0-T1: PROOF-REQUIRED — Verify collaboration-audit direct table denial and RPC need
- **Goal:** Confirm `collaboration_audit_events` cannot be read directly by authenticated client context and therefore requires the scoped RPC migration in WP-0.
- **Search scope:** `supabase/migrations/20260614152946_explicit_internal_table_deny_policies.sql`, `src/lib/supabase/types.ts`, and a local/provider SQL proof if available.
- **Stop condition:** Confirm direct table grants are revoked and restrictive deny policy exists.
- **Expected evidence:** Migration filename + optional local/provider denial output.
- **Complexity:** Small.
- **Parallelization:** Parallel-safe with P0-T2.

### P0-T2: VERIFY-ONLY — Confirm ProjectMiniSidebar "Activity" nav item remains present
- **Goal:** Confirm the mini-sidebar already has an "Activity" link pointing at `/workshop/projects/{id}/activity`; static source inspection in this revision found it present.
- **Search scope:** `src/components/workshop/ProjectMiniSidebar.tsx`.
- **Complexity:** Small.
- **Parallelization:** Parallel-safe with P0-T1.

### P0-T3: Re-read owner-delegated decisions ODD-01..ODD-12
- **Goal:** Ensure implementation follows the owner-delegated planning decisions in `02_FEATURE_BRIEF_AND_SCOPE.md`.
- **Complexity:** Trivial.
- **Parallelization:** Independent.

## Phase 1 — Repository (server-only)

### WP-0: Add collaboration-audit scoped RPC migration

**Objective:** Add `read_project_collaboration_audit_events(...)` as a security-definer RPC authorized by `can_edit_project(target_project_id)`, keep direct table access denied, update generated Supabase types, and include rollback/fix-forward SQL.

**Requirements covered:** DATA-01, SEC-04, TEST-03.

**File paths:**
- `supabase/migrations/<timestamp>_project_activity_collaboration_audit_rpc.sql`
- `src/lib/supabase/types.ts` (generated update)
- tests under `tests/vitest/project-activity-page/` for migration/schema assertions

**Implementation notes:**
- Do not grant direct select on `public.collaboration_audit_events`.
- Grant RPC execute to `authenticated` only.
- Return display-safe columns only: `id`, `project_id`, `estimate_id`, `actor_user_id`, `event_type`, `metadata`, `created_at`, and count metadata if implemented in SQL.
- Add `(project_id, created_at desc, id desc)` index only if EXPLAIN shows the existing `(project_id, created_at desc)` index is insufficient.
- Record local/provider proof: authorized editable project succeeds; unauthorized project fails or returns no rows; direct table read remains denied.

**Complexity:** Medium.

---

### WP-1: Create `src/lib/repositories/project-activity-feed-repository.ts`

**Objective:** A server-only repository exposing `readProjectActivityFeed({ projectId, scope, filters, cursor, limit, includeCounts })` that returns `{ items: ActivityViewModel[], nextCursor, partial, unavailableSources, counts }`.

**Requirements covered:** FR-01, FR-02, FR-03, FR-04 (data path), FR-05 (data path), FR-06 (data path), FR-07 (data path), FR-09, FR-10; DATA-01..DATA-04; SEC-01, SEC-04; PERF-03, PERF-04.

**New file path:** `src/lib/repositories/project-activity-feed-repository.ts`

**Public contract (expected):**

```ts
export type ProjectActivityFeedScope =
  | { kind: "whole-project" }
  | { kind: "project-only" }
  | { kind: "estimate"; estimateId: string };

export type ProjectActivityFeedFilters = {
  actions?: readonly ProjectActivityActionBucket[];   // derived action buckets
  actorUserId?: string | "me" | null;
  recipientId?: string | null;
};

export type ProjectActivityFeedCursor = string; // opaque

export type ProjectActivityFeedPage = {
  items: ActivityViewModel[];
  nextCursor: ProjectActivityFeedCursor | null;
  partial: boolean;
  unavailableSources: ProjectActivityFeedSourceName[];
  counts: {
    loadedCount: number;
    filteredTotalCount: number;
    scopeTotalCount: number;
  };
};

export async function readProjectActivityFeed(args: {
  projectId: string;
  scope?: ProjectActivityFeedScope;      // default: { kind: "whole-project" }
  filters?: ProjectActivityFeedFilters;  // default: {}
  cursor?: ProjectActivityFeedCursor | null;
  limit?: number;                        // default 20, max 50
  includeCounts?: boolean;                // true for initial/filter fetches
}): Promise<ProjectActivityFeedPage>;
```

**Implementation notes:**
- Import `import "server-only"` at the top.
- Use `createSupabaseServerClient()`.
- Mirror `readPublisherWorkspaceActivity`'s pattern for: parallel `Promise.all` over sources, label bulk-resolution, partial-source flag, cursor encoding. Do not reuse its direct `collaboration_audit_events` query; use the new RPC.
- For `estimate` scope:
  - `estimate_sheet_events`: filter `estimate_id = scope.estimateId`.
  - `shared_link_comments`/`responses`: filter `estimate_id = scope.estimateId`.
  - `shared_link_events`: filter via metadata where possible; if not feasible, fall back to "show all events for publications containing this estimate" and accept that non-estimate-scoped events may appear (note as `ASSUMP-04` in `15`).
  - `collaboration_audit_events`: include only rows whose `estimate_id = scope.estimateId`; exclude project-wide rows unless future schema explicitly ties them to the selected estimate.
- For `project-only` scope:
  - Exclude `estimate_sheet_events` entirely.
  - Include project-level sources scoped to the project; exclude collaboration audit rows with an `estimate_id`.
- For `whole-project` scope:
  - Include all six sources scoped to the project.
- Strip every PII field per `08` minimization matrix.
- Validate `projectId` is a UUID; throw on invalid.
- Return exact `counts.filteredTotalCount` and `counts.scopeTotalCount` for the result-count live region and empty-state branching.

**Tests:** `tests/vitest/project-activity-page/repository.test.ts` — see `12`.

**Dependencies:** WP-0.

**Exit criteria:** All repository unit tests green; type-check clean; lint clean.

**Complexity:** Large.

---

### WP-2: Add `listProjectEstimatesForDropdown`, `listProjectMembersForDropdown`, `listProjectRecipientsForDropdown` repository helpers

**Objective:** Provide data for the three dropdowns (scope, actor, client).

**Requirements covered:** FR-04, FR-06, FR-07.

**File paths:** Add as small exported functions inside `src/lib/repositories/project-activity-feed-repository.ts` or a sibling `*-dropdowns.ts`.

**Implementation notes:**
- `listProjectEstimatesForDropdown(projectId)` — `select id, name, sheet_code from estimates where project_id = ? order by name`.
- `listProjectMembersForDropdown(projectId)` — `select profile.id, profile.display_name, profile.email from project_members ... join profiles` (strip email before sending to client).
- `listProjectRecipientsForDropdown(projectId)` — join `shared_link_recipients` via publications on this project; only include recipients on **active** publications (ODD-03); strip email; duplicate display names use non-PII disambiguators such as publication title/date or a stable ordinal.

**Tests:** `tests/vitest/project-activity-page/dropdowns.test.ts`.

**Complexity:** Medium.

**Parallelization:** Parallel-safe with WP-1's write path after the API contract is fixed.

## Phase 2 — URL state + scope + filter helpers (client-logic, framework-free)

### WP-3: `src/components/workshop/project-activity/url-state.ts`

**Objective:** Pure functions `parseActivityUrlSearchParams(URLSearchParams): ActivityPageState` and `serializeActivityPageState(ActivityPageState): URLSearchParams`.

**Requirements covered:** FR-08.

**Implementation notes:**
- Allowlist validation for every param.
- `scope` pattern: `whole-project | project-only | estimate:<UUID>`.
- `action` is a comma-separated list of buckets from a known enum.
- `actor` is a UUID or the literal `me`.
- `client` is a UUID.
- No `cursor` param in the shareable URL. Cursor is transient state used only by the pagination loader.

**Tests:** `tests/vitest/project-activity-page/url-state.test.ts`.

**Complexity:** Small.

**Parallelization:** Parallel-safe with WP-1, WP-2.

---

### WP-4: `src/components/workshop/project-activity/action-classes.ts`

**Objective:** Pure function `deriveActionBucket(activity: ActivityViewModel): ProjectActivityActionBucket` and a multi-select predicate `matchesActionFilter(activity, selected)`.

**Requirements covered:** FR-05.

**Implementation notes:**
- Mapping table per `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` "Action-class derivation".

**Tests:** unit test with fixture `ActivityViewModel` per source × action.

**Complexity:** Small.

**Parallelization:** Parallel-safe with WP-3.

## Phase 3 — Server Component route + loading skeleton

### WP-5: `src/app/workshop/projects/[projectId]/activity/page.tsx` (rewrite)

**Objective:** Real Server Component that performs ownership + permission + initial prefetch.

**Requirements covered:** FR-01, FR-02, ARCH-01, ARCH-02, ARCH-03, ARCH-05; SEC-01.

**Implementation notes:**
- Mirror `src/app/workshop/projects/[projectId]/page.tsx` shape:
  - `await params` → `projectId`
  - `getCurrentWorkspaceProject` → ownership
  - `redirect(/workshop?removedProject=...)` for valid UUID with no project; `notFound()` otherwise
  - `canEditProject` gate
- Read URL search params via `searchParams: Promise<{ [key: string]: string | string[] | undefined }>` (Next.js 16 async searchParams).
- Parse via `parseActivityUrlSearchParams`.
- `Promise.all` over:
  - `readProjectActivityFeed`
  - `listProjectEstimatesForDropdown`
  - `listProjectMembersForDropdown`
  - `listProjectRecipientsForDropdown`
- Pass to `<ProjectActivityClient initialData={...} dropdowns={...} projectId={...} canEdit={...} currentUserId={...} />`.
- Use `traced`/`withPerfTraceRequest` for server-timing instrumentation.
  - Include `counts` in the initial props.

**Dependencies:** WP-1, WP-2, WP-3.

**Exit criteria:** type-check + lint clean; route renders in dev with seeded data; manual browser smoke.

**Complexity:** Medium.

---

### WP-5b: Add authenticated pagination loader

**Objective:** Add a narrow GET Route Handler for Load more cursor pagination without making cursor part of the shareable URL.

**Expected path:** `src/app/api/projects/[projectId]/activity/route.ts`

**Implementation notes:**
- Authenticate and authorize with the same project/edit gate as the page.
- Parse and validate `scope`, `action`, `actor`, `client`, `cursor`, and `limit`.
- Call `readProjectActivityFeed({ projectId, scope, filters, cursor, limit, includeCounts: true })`.
- Return only the display-safe DTO, including the exact count contract (`loadedCount`, `filteredTotalCount`, `scopeTotalCount`).
- Set no cross-user cache headers.

**Tests:** route-handler denial and malformed-cursor tests in `tests/vitest/project-activity-page/security.test.ts`.

---

### WP-6: `src/app/workshop/projects/[projectId]/activity/loading.tsx`

**Objective:** Project-activity-specific skeleton.

**Requirements covered:** UX-05.

**Complexity:** Small.

**Parallelization:** Parallel-safe with WP-5.

## Phase 4 — Client Component (filter row + timeline + states)

### WP-7: `src/components/workshop/project-activity/ProjectActivityClient.tsx`

**Objective:** The interactive Client Component. Owns URL state and renders all subcomponents.

**Requirements covered:** FR-04..FR-09, FR-11; UX-01..UX-08; A11Y-01..A11Y-06.

**Subcomponents (each its own file under the same directory):**
- `FilterRow.tsx`
- `ScopeSelect.tsx`
- `ActionMultiSelect.tsx`
- `ActorSelect.tsx`
- `ClientSelect.tsx`
- `ResultCount.tsx`
- `ActivityTimeline.tsx`
- `ActivityItemCard.tsx`
- `PartialDataBanner.tsx`
- `EmptyState.tsx` (covers both `never` and `filtered`)
- `ErrorState.tsx`
- `PermissionDeniedState.tsx`
- `LoadMoreButton.tsx`

**Implementation notes:**
- `"use client";` on line 1 of each file that needs it.
- Use `useRouter` and `useSearchParams` from `next/navigation`.
- On filter change: build new URL → `router.replace(url, { scroll: false })`.
- On "Load more": call the authenticated loader with current filters and `nextCursor`; append items to local list state; do not mutate the URL with cursor.
- On "Clear": reset all filters → `router.replace`.
- On "Refresh": clear local cursor/items and `router.replace` current filter URL.
- `actor=me` is resolved to `currentUserId` server-side at prefetch time and stored as a derived state client-side for display.
- Result count renders `Showing {localItems.length} of {counts.filteredTotalCount}` and empty-state logic uses `counts.scopeTotalCount`.

**Dependencies:** WP-1, WP-2, WP-3, WP-4, WP-5.

**Tests:** `tests/vitest/project-activity-page/client.test.tsx`, `tests/vitest/project-activity-page/filters.test.tsx`.

**Complexity:** Extra Large. Consider splitting the implementation across multiple PRs if scope pressure emerges.

## Phase 5 — Sidebar nav verification + visual polish

### WP-8: Confirm / adjust `ProjectMiniSidebar` Activity item

**Objective:** Ensure the mini-sidebar "Activity" item exists and links to `/workshop/projects/{id}/activity`.

**Requirements covered:** UX-01.

**Complexity:** Small.

---

### WP-9: Visual polish pass

**Objective:** Compare side-by-side with the project dashboard. Match chrome, spacing, typography.

**Complexity:** Small.

**Parallelization:** After WP-7 lands.

## Phase 6 — Adversarial QA + a11y + performance verification

### WP-10: Run adversarial QA matrix

See `12_TEST_AND_VALIDATION_STRATEGY.md` UltraQA matrix.

### WP-11: Run a11y audit

- axe assertions in DOM tests
- Manual keyboard-only walkthrough
- Manual screen-reader spot check (VoiceOver)

### WP-12: Run performance evaluator

- `bun run build && bun run start`
- 20-run authenticated Playwright timing fixture on initial route TTFB
- Compute p50 as median of samples 10/11 and p95 as nearest-rank sample 19 after sorting
- Compare against budget (≤ 300ms p50, ≤ 600ms p95)
- Record artifact

## Phase 7 — Final gate

### WP-13: Run `bun run validate`

- First run focused checks: `bun run type-check`, `bun run lint`, `bun run lint:design-system`, `bun run lint:design`, and `bun run test:dom -- project-activity-page`.
- Then run `bun run validate`.
- If `bun run validate` fails only in documented pre-existing unrelated suites from `.ai/10_state/current-state.md` FAST PATH, record failing files/counts and require every project-activity focused check plus build to pass.
- Do not report the gate as simply "green" unless it exits 0.

### WP-14: Run `bun run build`

- Clean exit 0
- Bundle size within budget (≤ 10 KB additional gzipped)

### WP-15: Manual QA via browser

- Sign in, navigate to `/workshop/projects/<id>/activity`
- Try each filter
- Try each scope
- Try "Load more"
- Try "Refresh"
- Try invalid URL params
- Try permission-denied ( spectator account if available )

## Verification per task (summary)

Every task ends with:
- type-check + lint clean
- focused Vitest test(s) green (when applicable)
- `git diff --check` clean
- evidence captured in `.ai/05_logs/` or as a path in `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`

## Phase exit gates

| Phase | Gate |
|---|---|
| 1 | Repository tests green |
| 2 | Helper unit tests green |
| 3 | Route renders with seeded data; type-check + lint green |
| 4 | Client component tests + a11y assertions green |
| 5 | Visual review side-by-side with dashboard |
| 6 | Adversarial QA matrix closed; a11y clean; performance within budget |
| 7 | Focused project-activity checks pass; `bun run build` clean; `bun run validate` exits 0 or fails only in documented pre-existing unrelated suites with evidence; manual QA pass |

## Rollback considerations

- Revert the implementation commits.
- Roll back the scoped RPC migration using the SQL in `07_DATA_DATABASE_API_NETWORK_PLAN.md` if it landed.
- No provider state to clean.
- See `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`.

## Documentation updates

- None required for v1.
- If implementation diverges from this plan, update this plan pack in place.
