# 02 — Feature Brief and Scope

## Source brief (verbatim, lightly paragraph-broken for readability)

> /visual-ralph /visual-qa /hallmark /high-end-visual-design /impeccable /subagent-driven-development /dispatching-parallel-agents /autopilot /ulw-loop /ultrawork /ultragoal /ultraqa
>
> http://localhost:3000/workshop/projects/0139e1e5-951d-4f2f-9081-6c953d288d8a/activity
>
> lets work on filling out this activity page of the project. this is the just a new page.
>
> lets make sure that we adapt the ui of the project dashboard page.
>
> Lets be sure to be able to add the necessary things here.
>
> THis page will basically be the homepage of the "Activity history" of the project. so users must be able to select if a user wants to see the history of the whole project, of just the project (without the estimate sheet activity history) or select an estimate sheet and see its activity history.
>
> users must also be able to filter out things like only show deletion history, only show editing history, etc etc.
>
> user must also be able to see like per user so lets say only show activities by user A.
>
> users should also be able to filter and see only activities by the client lets say a shared link has been sent to the client and then the cliend opened it or commended it etc etc.
>
> this is not A CODING TASK. THIS IS NOT A CODING TASK. THIS IS A PLANNING/AUDIT/REASDINESS TASK AND ALL DOCUMENT S MUST BE PUT in '/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-06-28-Project-Activity-Page'

The leading slash-command tokens (`/visual-ralph`, `/ultrawork`, `/autopilot`, etc.) are interpreted as suggestions for the eventual implementation run, not as instructions for this planning run. This planning run is non-coding.

## Interpretation

Build a planning package for a new authenticated dashboard page at `/workshop/projects/{projectId}/activity` that serves as the **project activity history home**. The page aggregates audit activity across the project from multiple existing sources:

1. Estimate sheet events (estimate tree, rows, tabs, named versions, sheet metadata)
2. Project-level events (project_publications / shares)
3. Shared link activity (client opens, views, comments, decisions)
4. Collaboration audit (invites, role changes)

The page must let the user choose **scope**, **action type**, **actor (internal user)**, and **client (shared-link recipient)** filters, then paginate through the merged timeline.

The page must visually adapt to the project dashboard's chrome (header, mini-sidebar, breadcrumbs, metadata strip) already established in `src/app/workshop/projects/[projectId]/layout.tsx` and `src/components/workshop/ProjectDashboardClient.tsx`.

## Primary user jobs

- "What changed in this project recently, across everything?" (overview)
- "What did User A do this week?" (per-actor audit)
- "What did the client do with the latest shared link?" (per-client audit, recipient-safe)
- "What got deleted?" (action filter)
- "What happened in this specific estimate sheet?" (per-estimate scope)

## Primary personas

- **Owner / editor** (architect, estimator, contractor) — needs internal-only detail including actor identities, exact timestamps, change fields.
- **Workspace admin** — needs the same plus invite/role audit.
- The page is **internal-only**. Recipients/clients never land on `/workshop/projects/{projectId}/activity`. Client activity is *visible to* internal users; clients themselves use `/share/[token]/*`.

## Scope (in scope for v1)

1. Authenticated route `/workshop/projects/{projectId}/activity` with the project dashboard chrome.
2. Scope selector: `whole-project` | `project-only` | `estimate:{estimateId}`.
3. Action filter (multi-select, URL-state): `{all, created, edited, deleted, reordered, shared, commented, decided, invited, ...}`.
4. Actor filter (single-select dropdown of internal workspace members).
5. Client filter (single-select dropdown of shared-link recipients on this project's publications).
6. Merged, deduplicated, stable-paginated timeline that reuses the existing activity composer (`src/lib/activity/`).
7. Server Component prefetch + Client Component filter/scope/pagination interactivity.
8. Empty / loading / error / permission-denied / partial-source states.
9. A11y: keyboard-operable filter controls, focus restoration, ARIA live region for result count change, reduced-motion respect.
10. Reuse `src/components/workshop/ProjectMiniSidebar`, `WorkshopPageShell`, `WorkshopBreadcrumbs`, `ProjectChromeAsync`, and `ProjectEstimateMetadataStrip` already in the project layout.
11. Reuse `src/components/ui/` primitives (`Button`, `SearchInput`, `DropdownSelect`, etc.).

## Non-goals (out of scope for v1)

- **No** real-time live updates (Supabase Realtime channels). Page uses request-time fetch + manual refetch.
- **No** full-text search across activity bodies. Filter chips + dropdowns only for v1.
- **No** change-diff visual inspector (the estimate-sheet activity-history already has one; do not duplicate at project level for v1).
- **No** CSV/Excel export of the activity timeline.
- **No** public/client-facing view. Internal dashboard only.
- **No** AI summarization ("Ask Flip") of activity.
- **No** cross-project activity (workspace-wide feed). That stays in the Publisher surface.
- **No** `mass_deletion_events`, `account_security_events`, `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`, `security_rate_limit_events`, or `component_library_telemetry_events` in v1. These are workspace/account-level rather than project-scoped, and surfacing them risks the wrong data bleeding into a project page. They are listed in `14_RISK_REGISTER.md` (RISK-09) as a v2 decision.
- **No** broad schema redesign or denormalized activity table. v1 does require one scoped migration for the `collaboration_audit_events` read RPC because the table is intentionally denied to direct API reads (see `07_DATA_DATABASE_API_NETWORK_PLAN.md`).
- **No** new dependencies.
- **No** changes to public share routes or public share APIs.

## Owner-delegated product decisions

Philip delegated planning authority for this revision. The decisions below are safe, reversible v1 defaults and should not block implementation unless new implementation-time evidence contradicts them.

| ID | Decision | Resolution | Owner | Impact if reversed |
|---|---|---|---|---|
| ODD-01 | Default scope | `whole-project` (matches "homepage of activity history" framing in the brief) | Owner-delegated product | Default landing filter changes; no architecture change |
| ODD-02 | Actor filter boundary | Project members only (matches `project_members` boundary) | Owner-delegated product | One extra repository call if changed to all workspace members |
| ODD-03 | Client filter boundary | Recipients on active project publications only | Owner-delegated product | One extra `where` clause if reversed |
| ODD-04 | Mass-deletion action source | No `mass_deletion_events` in v1; surface only project-scoped deletion events already present in included sources | Owner-delegated product/security | Would require workspace-level table review and broader threat model |
| ODD-05 | Adjacent edit collapsing | No deduplication for v1; each event row renders | Owner-delegated product | UI density only |
| ODD-06 | Canonical URL state | Scope and filters are canonical URL state; pagination cursor is transient | Owner-delegated engineering | Sharing a loaded page reproduces filters and first page, not appended pages |
| ODD-07 | Action filter mode | Multi-select | Owner-delegated product | UI control choice only |
| ODD-08 | "Edited by me" preset | Yes, as `actor=me` resolved server-side | Owner-delegated product | Trivial |
| ODD-09 | Recipient identity display | Display name only. Duplicate names use non-PII disambiguators such as publication date/title or a stable ordinal; email is never sent to the client DTO. | Owner-delegated security | Reversal would require security approval and DTO changes |
| ODD-10 | Estimate-sheet named versions | Do not surface `sheet_version_created` / `sheet_restored_as_copy` in v1; they remain dormant like `listProjectActivityPage` | Existing engineering precedent | Reversal removes one filter |
| ODD-11 | Activity page access | v1 is editor/workspace-member gated via `can_edit_project`; read-only project viewers see permission denied | Owner-delegated product/security | Widening to read-only viewers requires threat-model and RLS updates |
| ODD-12 | Collaboration audit access path | Keep six-source feed and add a scoped security-definer RPC; direct table reads remain denied | Owner-delegated engineering/security | Excluding collaboration audit would remove invite/role history from v1 |

## Deletion criteria (if Philip rejects the direction)

If the page direction is rejected after implementation, the entire feature can be deleted by:

1. Deleting `src/app/workshop/projects/[projectId]/activity/page.tsx` content (route folder can remain as a 404).
2. Deleting the new client component (e.g. `src/components/workshop/project-activity/`).
3. Removing the authenticated pagination loader route.
4. Removing the project-activity multi-source repository file (or reverting it to the estimate-only `listProjectActivityPage` baseline).
5. Removing the collaboration-audit RPC migration with its rollback, or applying the documented fix-forward rollback migration if it already landed.
6. Removing the nav entry from `ProjectMiniSidebar` if implementation changed it.
7. Removing the tests added for this feature.

The blast radius is one route, one authenticated loader route, one client component directory, one repository file, one scoped RPC migration, generated types, and tests. See `10_BLAST_RADIUS_AND_DEPENDENCIES.md`.

## Source authority decisions

| Source | Authority | Decision |
|---|---|---|
| User brief | Highest for product intent | Followed verbatim, lightly interpreted in the "Interpretation" section above |
| `AGENTS.md` | Highest for repo rules | Standing DB mandate observed; the scoped migration stays inside project `ebxxqidacheyapmmzavr` and does not touch unrelated provider projects |
| `.ai/10_state/current-state.md` FAST PATH | Highest for stage | Pre-launch closed-beta MVP → fast iteration bias; proportional verification |
| Existing source code | Highest for implementation reality | Reuse existing composer, repositories, dashboard chrome |
| `.ai/06_specs/` and `.ai/09_archive/` historical plans | Lower authority | Read for context; do not auto-reactivate |
