# Workshop dashboard list source research

Date: 2026-07-25

Surface: authenticated `/workshop` dashboard list redesign

Task-owned quality profile: `Q0_CONTRACT_ONLY` — source-only investigation; no executable or generated behavior and no product tests changed. The inherited shared worktree contains unrelated higher-profile changes that this read-only task did not validate.

Snapshot: current worktree at `6b37e0e4ad00`. Concurrent uncommitted redesign edits already exist in `WorkshopDashboard.tsx`, `RecentProjectsList.tsx`, `RecentSheetsList.tsx`, and `src/app/workshop/loading.tsx`; implementation must reread and preserve them.

## Evidence and recommendations

### Data authority

| Data | Current dashboard source and type | Recommendation |
| --- | --- | --- |
| Dashboard projects and estimate sheets | `/Users/philiplewis/archestimator/src/app/workshop/page.tsx:113-127` loads `getWorkshopHomebaseData()` and passes it at `:146-151`. `/Users/philiplewis/archestimator/src/lib/repositories/workspace-repository.ts:276-333` defines `WorkshopProjectSummary`, `WorkshopEstimateSummary`, and `WorkshopHomebaseData`. | Reuse these summary types for the current recent lists. Do not describe this payload as all workspace data. |
| Complete accessible project inventory | `/Users/philiplewis/archestimator/src/lib/repositories/workspace-repository.ts:1493-1497` exposes `listCurrentWorkspaceProjects()`. Its D1 path reads every owned project at `:1537-1544`, every accessible project estimate sheet at `:1650-1669`, and returns owned/shared/pending project items at `:1787-1802`. | If the redesign truly requires all projects or all sheets, reuse this repository query and adapt its result server-side. Its `WorkshopProjectListItem` is currently private at `:337-353`; do not duplicate that contract in the dashboard. |
| Homebase scope limit | `/Users/philiplewis/archestimator/src/lib/repositories/workspace-repository.ts:390-391` caps homebase items at 12. The query loads 12 recent owned-workspace projects at `:2215-2223`, then merges accessible recent/favorite estimates and project backfills at `:2284-2359`. | Treat `homebase.projects` and `homebase.estimates` as recent/favorite projections, not complete totals. The redesign currently renders their lengths as “Project Count” and “Sheet Count” at `/Users/philiplewis/archestimator/src/components/workshop/dashboard/WorkshopDashboard.tsx:107-108` and `:164-167,224-227`; neither is an authoritative workspace-wide total. |
| Recent components | `/Users/philiplewis/archestimator/src/lib/repositories/component-library-repository.ts:1850-1855` defines `LibraryDashboardSpotlight`; `getLibraryDashboardSpotlight()` at `:2310-2351` returns non-archived counts and the five most recently updated non-archived components. The dashboard’s trimmed structural contract is `/Users/philiplewis/archestimator/src/components/workshop/dashboard/lib.ts:18-30`. | Keep the existing spotlight query and trimmed row fields for the dashboard. It is deliberately best-effort and becomes `null` on error at `/Users/philiplewis/archestimator/src/app/workshop/page.tsx:27-37`. |

### Reusable list and favorite surfaces

- Keep `/Users/philiplewis/archestimator/src/components/workshop/dashboard/RecentProjectsList.tsx:36-91` and `/Users/philiplewis/archestimator/src/components/workshop/dashboard/RecentSheetsList.tsx:38-110` as the dashboard-owned list shells. They render the complete arrays they receive, while the repository payload remains capped/recent.
- `/Users/philiplewis/archestimator/src/components/workshop/dashboard/FavoritesTree.tsx:39-51` is reusable only for the live favorite hierarchy. Its row styling and row implementations are private at `:35-36` and `:220-339`; it is not a generic flat-list primitive.
- Project favorite persistence and optimistic sidebar-cache updates belong to `/Users/philiplewis/archestimator/src/hooks/use-toggle-project-favorite.ts:16-38`; estimate favorites belong to `/Users/philiplewis/archestimator/src/hooks/use-toggle-estimate-favorite.ts:26-67`. Both call the guarded D1 actions at `/Users/philiplewis/archestimator/src/lib/workshop/actions.ts:66-135`.
- The dashboard’s project and sheet favorite controls are private at `/Users/philiplewis/archestimator/src/components/workshop/dashboard/RecentProjectsList.tsx:93-166` and `/Users/philiplewis/archestimator/src/components/workshop/dashboard/RecentSheetsList.tsx:112-198`. Reuse their canonical hooks and payload shapes. Do not cast `WorkshopEstimateSummary` to the richer `ProjectEstimateListRow` expected by `/Users/philiplewis/archestimator/src/components/workshop/ProjectEstimateFavoriteButton.tsx:32-67`.
- `/Users/philiplewis/archestimator/src/components/workshop/library/overview/RecentComponentCard.tsx:24-45` is reusable for full `LibraryOverviewComponent` records, but the dashboard spotlight intentionally lacks its brand, supplier, price, image, and lifecycle fields. Reuse its route helper, not the card, for the trimmed dashboard row.
- The current trimmed component row is private inside `/Users/philiplewis/archestimator/src/components/workshop/dashboard/WorkshopDashboard.tsx:39-84`; keep that small row shape instead of importing the richer Library overview card.

### Safe destinations

| Surface | Safe href |
| --- | --- |
| Project row | `projectHref(id)` → `/workshop/projects/${id}` from `/Users/philiplewis/archestimator/src/components/workshop/dashboard/lib.ts:41-43`. |
| Estimate-sheet row and Continue card | `estimateHref(estimate)` → `/workshop/projects/${project_id}/estimates/${firstNodeId ?? id}` from `/Users/philiplewis/archestimator/src/components/workshop/dashboard/lib.ts:49-57`; the estimate-id fallback is resolved by `/Users/philiplewis/archestimator/src/lib/repositories/workspace-repository.ts:3575-3650`. |
| Projects card arrow | `/workshop/projects`, wired at `/Users/philiplewis/archestimator/src/components/workshop/dashboard/WorkshopDashboard.tsx:133-144`. |
| Estimate Sheets card arrow | The current safe fallback chain is: most-recent sheet via `estimateHref(continueEstimate)`; otherwise the first available project’s `/workshop/projects/${id}/estimates`; otherwise `/workshop/projects`. It is computed at `/Users/philiplewis/archestimator/src/components/workshop/dashboard/WorkshopDashboard.tsx:109-113` and wired at `:193-204`. There is no workspace-wide estimate-sheet index route. |
| Templates card arrow | `/workshop/library/templates`, passed at `/Users/philiplewis/archestimator/src/components/workshop/dashboard/WorkshopDashboard.tsx:246-254` and rendered by `/Users/philiplewis/archestimator/src/components/workshop/dashboard/ImageDestinationCard.tsx:64-75`. |
| Library card arrow | `/workshop/library`, passed at `/Users/philiplewis/archestimator/src/components/workshop/dashboard/WorkshopDashboard.tsx:255-261` and rendered by `/Users/philiplewis/archestimator/src/components/workshop/dashboard/LibraryHubCard.tsx:32-53`. |
| Recent component row | `getComponentDetailsHref(id)` → `/workshop/library/components?component=${id}` from `/Users/philiplewis/archestimator/src/components/workshop/library/component-route-state.ts:1-8`. This is safer and more exact than the current generic row destination at `/Users/philiplewis/archestimator/src/components/workshop/dashboard/WorkshopDashboard.tsx:52-77`; the components manager consumes and validates the route state at `/Users/philiplewis/archestimator/src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:2166-2173` and `:2405-2459`. |

## Risks

| Severity | Risk | Recommendation |
| --- | --- | --- |
| P0 | The current redesign labels capped homebase lengths as “Project Count” and “Sheet Count” and labels the lists without “Recent”; shared non-favorite projects are also not guaranteed in this projection. | Use `listCurrentWorkspaceProjects()` for complete inventory, or restore explicit recent wording and avoid presenting array lengths as totals. |
| P1 | Pulling the complete project query into `/workshop` duplicates a heavier multi-wave projects-page load and returns a private inferred item type. | Decide whether completeness is actually required; if yes, export one repository-owned DTO or add a narrow complete-dashboard projection rather than copying types/SQL. |
| P1 | The Estimate Sheets card has no matching workspace-wide index, so its arrow may open one sheet, one project’s sheet list, or Projects depending on data. | Keep the documented safe fallback chain, but do not imply that the arrow opens all sheets unless a real aggregate route is added. |
| P1 | Project favorite optimistic hrefs currently use the estimates index at `/Users/philiplewis/archestimator/src/components/workshop/dashboard/RecentProjectsList.tsx:113-123`, while the project row uses the project root and the server favorite projection uses the project root at `/Users/philiplewis/archestimator/src/lib/repositories/workspace-repository.ts:2440-2456`. | Standardize future dashboard favorite payloads on `projectHref(id)` so optimistic and refetched sidebar links do not change destination. |
| P1 | Current recent component rows discard the component id in navigation by linking only to the components index. | Use `getComponentDetailsHref(component.id)` so each row opens the validated inspector route state. |
| P2 | Four dashboard/redesign files are already modified by another contributor. | Reread their current contents and diff immediately before any implementation; do not overwrite or revert concurrent work. |

Location convention: `/Users/philiplewis/archestimator/.ai/02_audits/README.md:1-5` assigns dated product/UX/technical research to this folder and requires evidence, severity, recommendation, and date.
