# 01 Requirements and Acceptance Criteria

## User request distilled

The Projects page must expose two clear tabs:

1. **Your Projects** — projects owned by the current user's workspace/current account context.
2. **Projects shared to you** — projects where the user participates through an invitation/collaboration role such as editor or viewer.

The task is a UI/data-flow refinement, not a new collaboration system. The existing repository already returns owned, shared, sheet-only, and pending-invite records from `listCurrentWorkspaceProjects()`; implementation should reuse that foundation.

## Functional requirements

| ID | Requirement | Evidence / implementation target |
|---|---|---|
| FR-01 | `/workshop/projects` must always show exactly two access tabs: `Your Projects` and `Projects shared to you`. | Replace current `PROJECT_ACCESS_FILTER_OPTIONS = ["all", "owned", "shared"]` in `src/components/workshop/projects-page-client.tsx`. |
| FR-02 | `Your Projects` must include only items where `item.accessKind === "owned"`. | `ProjectListItem.accessKind` exists and is normalized from bare `Tables<"projects">` to `owned`. |
| FR-03 | `Projects shared to you` must include all visible non-owned access kinds: `project-member`, `sheet-member`, and `pending-invite`. | `ProjectAccessKind` is `"owned" | "pending-invite" | "project-member" | "sheet-member"` in `LiveProjectCard.tsx`. |
| FR-04 | Tab labels should optionally show counts but must preserve the exact requested visible copy. | Recommended labels: `Your Projects` and `Projects shared to you`, with count badges inside each tab. |
| FR-05 | Search must filter only the active tab's collection and must keep existing searchable fields. | Preserve search by name, client, project code, location, owner/shared status, role, invite code, inviter label, estimate name, shared sheet count, and shared-link status. |
| FR-06 | View-mode controls must continue to work across both tabs and keep existing localStorage behavior. | Preserve `PROJECT_VIEW_MODE_STORAGE_KEY` and `useSyncExternalStore` pattern. |
| FR-07 | The Add Project action must remain visible and must create projects for `Your Projects`; it must not appear as the action for empty `Projects shared to you`. | Keep existing `NewProjectModal` action, but tab-aware empty states should avoid suggesting create as a solution for missing shared invitations. |
| FR-08 | Pending invite cards must appear in `Projects shared to you` and keep their Accept action. | Existing `LiveProjectCard` already renders pending-invite accept forms when `accessKind === "pending-invite"`. |
| FR-09 | Users with no owned projects but at least one shared project should land on `Projects shared to you`. | Prevents an invited collaborator from seeing an empty owned tab after accepting an invite. |
| FR-10 | The shared-project favorite defect must not ship into the new shared tab experience. | Either suppress favorite buttons for non-owned project cards or implement a tested data-model-safe shared favorite flow. Low-risk recommendation: suppress for non-owned in this task. |
| FR-11 | Existing bulk project deletion semantics must be preserved and reconciled with active tab visibility. Selection state persists in `selectedProjectIds` Set across tab switches. `selectableDisplayProjectIds` and `selectedVisibleProjectIds` derive from tab-filtered display list. `openProjectDeletePreview()` uses full `projectItems` (not `displayProjects`) for authorization. | `canSelectProjectForDeletion`, `getProjectDeletionDisabledReason`, `BulkActionToolbar`, and all bulk delete state machinery remain intact. See implementation sequence Steps 4.5 and 6.5. |

## Non-functional requirements

| ID | Requirement | Pass/fail check |
|---|---|---|
| NFR-01 | No new dependency. | `package.json` and lockfile unchanged. |
| NFR-02 | No database migration required for tabs. | `supabase/migrations/` unchanged. |
| NFR-03 | Preserve server-rendered route data loading. | `src/app/workshop/projects/page.tsx` still calls `listCurrentWorkspaceProjects()` once and passes results into `ProjectsPageClient`. |
| NFR-04 | Keep product UI within Archestimator design system. | `bun run lint:design-system` passes; no font sizes above app limits in `/workshop` UI. |
| NFR-05 | Avoid performance regression. | Project categorization uses memoized arrays derived from existing props; no new network request, no client fetch loop. |
| NFR-06 | Keep backward compatibility with legacy bare `Tables<"projects">` props. | `normalizeProjectListItem()` remains or equivalent fallback maps bare projects to owned owner access. |

## UX/UI requirements

- Tabs should sit between the toolbar and scrollable card grid by using `WorkshopCollectionLayout.toolbarPanel` instead of rendering inside the scroll body.
- Tabs should be visible even when one side has zero items, so the user understands there are two project contexts.
- `Your Projects` empty state should lead to project creation.
- `Projects shared to you` empty state should explain invitation-based access, not project creation.
- Search empty states must mention the active tab: e.g. no owned projects match / no shared projects match.
- The active tab should be visually obvious with existing `rounded-xs`, `border-hairline`, `bg-white`, `bg-surfaceMuted`, `text-ink`, and `text-tertiary` patterns.
- Counts should be small and neutral, using app text sizes (`text-[8px]` to `text-[10px]`).

## Security requirements

- Do not broaden access rules in the UI. The tabs must only categorize records already returned by `listCurrentWorkspaceProjects()` and Supabase RLS/access logic.
- Do not fetch arbitrary projects client-side.
- Do not expose owner workspace IDs, invitation tokens, or private collaborator details beyond existing card summaries.
- If favorite behavior is changed for shared projects, server action authorization must prove the user can access the shared project before inserting a favorite row. Avoid that broader change unless explicitly tested.

## Performance requirements

- Use `useMemo` for `projectItems`, tab partitions, search-filtered lists, counts, and view-mode class decisions.
- No extra Supabase query, no API route, no polling, no migration.
- Tab switching should be local state only.

## Data/migration requirements

No schema migration is required for the tab feature. The data source already returns mixed access kinds. The only data-related caution is the shared favorite bug: `project_favorites` has a composite relationship to `projects(id, workspace_id)`, and current favorite reads/writes filter by the current workspace. That makes favoriting externally owned shared projects unsafe without a separate design.

## Accessibility requirements

- Use `role="tablist"`, `role="tab"`, and `role="tabpanel"` only if implementing the full tab pattern.
- Each tab must have a stable `id`, `aria-selected`, and `aria-controls` pointing to the panel.
- The active panel must have `aria-labelledby` pointing back to the active tab.
- Keyboard support: `ArrowLeft`, `ArrowRight`, `Home`, and `End` should move focus and activate the target tab.
- Counts inside tabs must not obscure the accessible name. Use visible label plus count text or `aria-label` such as `Your Projects, 3 projects`.
- Do not rely on color alone; active state should include border/background/selected ARIA state.

## Acceptance criteria

| ID | Pass/fail check |
|---|---|
| AC-01 | `/workshop/projects` renders a tablist with exactly two tabs named `Your Projects` and `Projects shared to you`. |
| AC-02 | The old `All`, `Owned`, and `Shared` access filter is removed from the Projects page. |
| AC-03 | Owned projects appear only under `Your Projects`. |
| AC-04 | `project-member`, `sheet-member`, and `pending-invite` cards appear only under `Projects shared to you`. |
| AC-05 | Switching tabs does not reset view mode preference. |
| AC-06 | Search filters only the active tab and produces tab-specific empty copy. |
| AC-07 | When no owned projects exist but shared projects exist, the shared tab is active by default. |
| AC-08 | When no shared projects exist, the shared tab still exists and shows an empty state explaining that invited projects will appear there. |
| AC-09 | Pending invite cards in the shared tab still show Accept/Expired behavior. |
| AC-10 | Add Project remains available from the toolbar and from the owned-tab empty state only. |
| AC-11 | Shared project cards do not expose a broken favorite action. Either no star is shown for non-owned cards, or shared favorites are fully implemented and tested. |
| AC-12 | DOM tests cover mixed owned/shared lists, only-shared lists, empty shared tab, search-within-tab, and accessibility roles. |
| AC-13 | `bun run type-check`, `bun run lint`, `bun run lint:design-system`, focused DOM tests, and `bun run validate` pass. |
| AC-14 | No source files outside the identified blast radius change unless implementation discovers a documented reason. |

## Explicit non-goals

- Do not add `All` as a third tab.
- Do not add route-level query params for active tab unless requested later.
- Do not add persisted tab preference; view-mode persistence already exists and should remain the only localStorage change.
- Do not alter collaboration invitation creation, acceptance, revocation, or role assignment.
- Do not add new Supabase tables/functions/RLS policies for this tab feature.
- Do not change project detail permissions.
- Do not change shared-link publication behavior.

## Assumptions and validation

| Assumption | Status | Evidence / validation path |
|---|---|---|
| `pjel888/archestimator` is the intended repo. | Validated | GitHub installed repo search returned exact private repo `pjel888/archestimator` with default branch `main`. |
| Projects page route is `/workshop/projects`. | Validated | `src/app/workshop/projects/page.tsx` exists and renders `ProjectsPageClient`. |
| Existing data source returns both owned and shared projects. | Validated | `listCurrentWorkspaceProjects()` queries current workspace projects, project memberships, sheet memberships, pending invitations, and appends shared/pending items. |
| Existing access-kind values are sufficient for tab categorization. | Validated | `ProjectAccessKind` includes `owned`, `pending-invite`, `project-member`, and `sheet-member`. |
| Pending invites belong under the shared tab. | Assumed / product-aligned | The current card UX labels pending invites as access-related and the user request mentions projects shared through invites. Implementation should confirm with Philip only if pending invites must be separated later. |
| Shared project favorites are not required for this task. | Assumed / risk-controlled | User asked for tabs, not favorites. Existing favorite action is unsafe for external shared projects, so suppressing the control is the recommended low-risk behavior. |
