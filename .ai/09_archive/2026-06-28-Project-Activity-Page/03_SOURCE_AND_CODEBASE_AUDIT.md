# 03 — Source and Codebase Audit

Evidence-based inventory of every existing surface the future implementation will touch, reuse, or extend. Each row records the exact repo-relative path, the relevant symbol or table, the current responsibility, why it matters for this feature, and whether it should be modified, extended, reused, or left unchanged.

## Existing route (target)

| Path | Symbol | Responsibility | Why relevant | Expected treatment |
|---|---|---|---|---|
| `src/app/workshop/projects/[projectId]/activity/page.tsx` | `ProjectActivityPage` (default export) | 15-line empty placeholder Server Component that only renders a `<section>` shell | This is the route to fill | **Modify**: replace with real Server Component that prefetches initial activity page |
| `src/app/workshop/projects/[projectId]/layout.tsx` | `ProjectLayout` (default export) | Wraps every child in `WorkshopPageShell` + `ProjectMiniSidebar` + chrome Suspense slots; passes `children` through | Already provides the dashboard chrome for free | **Reuse, unchanged** |
| `src/app/workshop/projects/[projectId]/loading.tsx` | Route loading | Existing fallback | **Reuse, unchanged** (consider route-level `activity/loading.tsx` if specific skeleton needed) |
| `src/app/workshop/projects/[projectId]/page.tsx` | `ProjectDashboardPage` | The project dashboard page that the brief tells us to adapt from; calls `listProjectActivityPage`, `countProjectEstimateSheetsForProject`, `listRecentProjectEstimateSheets`, `getProjectLocation`, `listCurrentWorkspaceProjectClientNames`, `canEditProject` in a single `Promise.all` wave | Reference for parallel server-side data fetching pattern | **Read-only reference**; copy the wave pattern, not the file |
| `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` | Estimate sheet editor route | Reference for nested project route patterns | Reference only | **Unchanged** |

## Existing dashboard UI (adaptation source)

| Path | Symbol | Responsibility | Treatment |
|---|---|---|---|
| `src/components/workshop/ProjectDashboardClient.tsx` | `ProjectDashboardClient` (~920 lines) | The client component that renders the dashboard after server prefetch; uses `WorkshopBreadcrumbs`, metadata strip, maps, recent estimates, activity preview | **Read-only reference** for chrome, header, spacing, and project-activity preview card |
| `src/components/workshop/ProjectMiniSidebar.tsx` | `ProjectMiniSidebar` | Renders project sub-navigation and already includes `href: /workshop/projects/${projectId}/activity` with label "Activity" | **Verify-only** unless later source changes remove the item |
| `src/components/workshop/WorkshopPageShell.tsx` | `WorkshopPageShell` | Top-level shell with title, breadcrumbs, actions slot | **Reuse, unchanged** |
| `src/components/workshop/ProjectChromeAsync.tsx` | `ProjectChromeAsync`, `ProjectHeaderChromeSkeleton` | Header actions (e.g. Share, Edit) loaded via Suspense | **Reuse, unchanged** |
| `src/components/workshop/ProjectEstimateMetadataStrip.tsx` | `ProjectEstimateMetadataStrip` | Center-header metadata strip | **Reuse, unchanged** |
| `src/components/workshop/WorkshopBreadcrumbs.tsx` | `WorkshopBreadcrumbs` | Breadcrumbs | **Reuse, unchanged** |
| `src/components/workshop/ProjectRouteContentFallback.tsx` | `ProjectRouteContentFallback` | Suspense fallback for project child content | **Reuse, unchanged** |

## Existing activity composer and types (canonical)

| Path | Symbol | Responsibility | Treatment |
|---|---|---|---|
| `src/lib/activity/index.ts` | barrel | Re-exports the activity module | **Reuse, unchanged** |
| `src/lib/activity/types.ts` | `ActivityViewModel`, `ActivitySource`, `ActivityAction`, `ActivityActor`, `ActivityTarget`, `ActivityChange`, `ActivityDelta`, `ActivityFact`, `ActivityRaw`, `EstimateActivityInput`, `SharedLinkActivityInput`, `CollaborationActivityInput` | Type contract for every rendered activity item | **Reuse, unchanged** |
| `src/lib/activity/activity-composer.ts` | `composeEstimateActivity`, `composeSharedLinkActivity`, `composeCollaborationActivity` | Pure functions converting raw rows into `ActivityViewModel` | **Reuse, unchanged** |
| `src/lib/activity/activity-formatters.ts` | `formatActivityActor`, `formatActivityFieldLabel`, `formatActivityValue` | Presentation helpers | **Reuse, unchanged** |
| `src/lib/activity/activity-copy-dictionary.ts` | copy dictionary | Title/summary copy for each action/source | **Reuse, unchanged** |
| `src/lib/activity/activity-visibility.ts` | visibility rules | Audience/visibility classification | **Reuse, unchanged** |
| `src/lib/activity/activity-fallback.ts` | fallbacks | Safety-net labels for missing/unknown fields | **Reuse, unchanged** |

## Existing repositories (data access)

| Path | Symbol | Responsibility | Treatment |
|---|---|---|---|
| `src/lib/repositories/project-activity-repository.ts` | `listProjectActivityPage`, `createEmptyProjectActivityPage`, `ProjectActivityItem`, `ProjectActivityPage`, `ProjectActivityCursor` | Project-scoped **estimate-events-only** activity with cursor pagination, actor-label resolution, dormant-version-type filtering | **Extend**: add a sibling `readProjectScopedActivityPage` (or similar) that returns multi-source `ActivityViewModel[]` for the new page; **do not change** existing `listProjectActivityPage` (still used by the dashboard preview card) |
| `src/lib/publisher/activity-repository.ts` | `readPublisherWorkspaceActivity`, `PublisherWorkspaceActivityResult` | Workspace-or-project-scoped **multi-source** activity joining `estimate_sheet_events` + `project_publications` + `shared_link_comments` + `shared_link_responses` + `shared_link_events` + `collaboration_audit_events`; recipient/profile label resolution; partial-source flag; cursor pagination | **Reuse the pattern**; for the new page either (a) extend this with stronger project-scoped filters + action/actor/recipient filters, or (b) extract a new `readProjectActivityFeed` repository that borrows the same multi-source merge logic. Option (b) is preferred to keep the Publisher surface untouched. See `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` for the decision. |
| `src/lib/repositories/workspace-repository.ts` | `getCurrentWorkspaceProject`, `listCurrentWorkspaceProjects`, `listCurrentWorkspaceProjectClientNames` | Workspace + project lookup + client-name listing | **Reuse** `getCurrentWorkspaceProject` for ownership check and `listCurrentWorkspaceProjectClientNames` for client-filter dropdown if needed; otherwise list recipients directly via `shared_link_recipients` |
| `src/lib/repositories/project-estimate-sheets-repository.ts` | `countProjectEstimateSheetsForProject`, `listRecentProjectEstimateSheets` | Estimate sheet lookup | **Reuse** for the scope dropdown (list of estimates in this project) |
| `src/lib/repositories/project-location-repository.ts` | `getProjectLocation` | Project coordinates | **Not used** by the activity page |
| `src/lib/publisher/permissions.ts` | `canReadPublisherRosterProject` | Publisher role gate | **Read-only reference**; project activity page uses `can_edit_project` / project membership, not publisher roster |

## Existing client UI patterns (for the filter row and list)

| Path | Symbol | Responsibility | Treatment |
|---|---|---|---|
| `src/components/workshop/estimate-sheet/activity-history.tsx` | `ActivityHistory` (~1819 lines) | Estimate-sheet-scoped activity history with: `ACTIVITY_FILTER_EVENT_TYPES` (filter dropdown source-of-truth), `ActivityFilterState`, scope tree, detail drawer | **Pattern reference only**. Reuse the filter-event-types dictionary and the chip-row pattern. **Do not import** — too estimate-sheet-specific. |
| `src/components/workshop/estimate-sheet/activity-history-model.ts` | `DEFAULT_ACTIVITY_FILTERS`, `ActivityFilterState`, `createActivityFilterKey`, `EstimateActivityScope` | Filter-state shape | **Pattern reference** for the URL-state serialization scheme |
| `src/components/workshop/estimate-sheet/activity-scope-tree.ts` | `ActivityScopeTree` | Scope tree (sheets hierarchy) | **Pattern reference** for the scope selector |
| `src/components/workshop/estimate-sheet/use-estimate-history-panel.ts` | `useEstimateHistoryPanel` | Hook for panel open/close + selection | **Not used** |

## Existing UI primitives (`src/components/ui/`)

| Primitive | Treatment | Why |
|---|---|---|
| `Button` | **Reuse** | Action buttons (clear filters, refresh) |
| `SearchInput` | **Maybe reuse** | If we add a basic search-by-label input in v2; **not v1** |
| `DropdownSelect` | **Reuse** | Scope selector, actor filter, client filter |
| `ControlField`, `ControlInput` | **Reuse** | Filter chip row layout if needed |
| `HeaderIconToolbar` | **Reuse** | Right-side toolbar |
| Existing project dashboard tiles/cards | **Pattern reference** | Visual chrome for tiles and chips |

## Database surface (read by the future repository)

| Table | Migration source | Project-scoped? | Treatment |
|---|---|---|---|
| `estimate_sheet_events` | `20260524132800_estimate_node_activity_history.sql` + `20260619105250_project_dashboard_activity_location.sql` | **Yes** — has `project_id` (not null, indexed by `(project_id, created_at desc, id desc)`) and `workspace_id`; RLS via `can_access_estimate(estimate_id)` | **Read-only**; primary internal-actor activity source |
| `project_publications` | `20260527120000_project_client_publication.sql` + `20260528220000_project_shared_link_overhaul.sql` + `20260620064601_project_publication_activity_target_labels.sql` + `20260621133000_shared_link_atomic_publish_and_digest_slot.sql` | **Yes** — `project_id`, `workspace_id`, `status`, `snapshot_version`, `published_at`, `activity_target_labels_json` | **Read-only**; joins recipient/comment/response/activity back to project |
| `shared_link_comments` | `20260528220000_project_shared_link_overhaul.sql` + `20260621042221_shared_link_event_context.sql` | Indirect via `publication_id` | **Read-only**; client comment source |
| `shared_link_responses` | `20260528220000_project_shared_link_overhaul.sql` + `20260621042221_shared_link_event_context.sql` | Indirect via `publication_id` | **Read-only**; client decision source |
| `shared_link_events` | `20260528220000_project_shared_link_overhaul.sql` + `20260601011500_resend_shared_link_delivery_webhooks.sql` + `20260621042221_shared_link_event_context.sql` | Indirect via `publication_id` | **Read-only**; client open/view/click source |
| `collaboration_audit_events` | `20260527115342_project_invite_entry_tokens.sql` creates table/indexes; `20260614152946_explicit_internal_table_deny_policies.sql` revokes direct access and adds restrictive deny policy | **Yes** — `project_id`, `estimate_id`, `actor_user_id`, `metadata` | **RPC-only read**; invite/role audit source via new scoped security-definer RPC |
| `shared_link_recipients` | `20260528220000_project_shared_link_overhaul.sql` + `20260531175141_shared_link_recipient_unsubscribe.sql` + `20260601145000_lock_down_shared_link_recipient_credentials.sql` | Indirect via `publication_id` | **Read-only**; recipient display-name resolution for client filter dropdown and actor label |
| `profiles` | (auth/account) | n/a | **Read-only**; actor display-name resolution (already done in existing repositories) |
| `estimates` | `20260527072220_auth_account_data.sql` (and prior) | **Yes** — `project_id` | **Read-only**; estimate-name resolution for scope dropdown |
| `mass_deletion_events`, `account_security_events`, `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`, `security_rate_limit_events`, `component_library_telemetry_events` | various | Workspace/account-level | **Out of scope for v1** (see `02_FEATURE_BRIEF_AND_SCOPE.md` non-goals and `14_RISK_REGISTER.md` RISK-09) |

## Existing permissions / RLS context

| Function / policy | Used by | Treatment |
|---|---|---|
| `public.can_edit_project(project_id)` | `ProjectDashboardPage` canEdit check; `project_locations` RLS | **Reuse** as the gate for "can see this project's activity" |
| `public.can_access_estimate(estimate_id)` | `estimate_sheet_events` RLS | **Reuse** as the implicit RLS gate when reading estimate events |
| Publisher publication RLS | Publisher surface | **Read-only reference** |
| `canReadPublisherRosterProject` (`src/lib/publisher/permissions.ts`) | Publisher | **Not used**; activity page is project-scoped, not publisher-roster-scoped |

## Test surface (where to add tests)

| Path | Current | Treatment |
|---|---|---|
| `tests/vitest/` (115 files) | Existing DOM/unit/integration tests | Add `tests/vitest/project-activity-page/repository.test.ts`, `tests/vitest/project-activity-page/client.test.tsx`, `tests/vitest/project-activity-page/filters.test.tsx`, and a security denial test |
| `tests/vitest/estimate-sheet-activity-history.test.tsx` (or similar) | Existing estimate-sheet activity tests | **Read-only reference** for assertion shape |
| `tests/vitest/publisher-activity-repository.test.ts` (if present) | Existing publisher repository tests | **Read-only reference** |
| `e2e/` (7 spec files) | Playwright E2E specs | **No new E2E spec required for v1** (per `02` non-goals and the repo's proportional verification policy). If interaction risk emerges in implementation, add a narrow `e2e/project-activity.spec.ts` later. |

## Configuration and types

| Path | Treatment |
|---|---|
| `src/lib/supabase/types.ts` (generated) | **Regenerate/update after RPC migration** so the repository can call `read_project_collaboration_audit_events(...)` type-safely |
| `package.json` | **Unchanged** (no new deps) |
| `tailwind.config.*`, `src/app/globals.css` | **Unchanged** for v1; visual style reuses existing tokens |
| `DESIGN.md` (alpha) | **Reference**; defer to Philip on visual decisions; do not block on design-system grounds |

## Tooling and validation commands (from `package.json` scripts)

- `bun run type-check` (tsc --noEmit)
- `bun run lint`
- `bun run lint:design-system`
- `bun run lint:design`
- `bun run test` (Bun unit)
- `bun run test:dom` (Vitest jsdom)
- `bun run validate` (type-check + lint + design-system + design lint + unit + dom)
- `bun run build`

Implementation will run focused subsets during TDD and the broader `validate` gate before declaring done.

## What is genuinely missing (must be created by implementation)

1. New server component body for `src/app/workshop/projects/[projectId]/activity/page.tsx`.
2. New client component directory `src/components/workshop/project-activity/` (canonical name; may be renamed by implementer) containing:
   - The main page client component
   - Scope selector
   - Filter row (action multi-select, actor dropdown, client dropdown)
   - Activity timeline list
   - Empty / loading / error / partial states
3. New scoped collaboration-audit RPC migration + generated Supabase type update.
4. New authenticated pagination Route Handler for Load more.
5. New (or extended) project-scoped multi-source activity repository in `src/lib/repositories/` (e.g. `project-activity-feed-repository.ts`) that returns `ActivityViewModel[]` + cursor + `partial` flag + `unavailableSources[]` + `counts`.
6. New filter-state URL serialization helpers (small).
7. New Vitest tests (repository/client/route-handler/security/migration).

## What is *not* missing

Everything else. The composer, the dashboard chrome, the activity tables, the normal-source RLS, the UI primitives, and the existing dashboard prefetch pattern cover the rest.
