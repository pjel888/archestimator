# Route and Overlay Inventory

## Audit Contract

- **Baseline:** `8aca41a3f06463ec53f59e20e7a53c92391b3a88`
- **Page discovery:** `rg --files src/app | rg '/page\.tsx$' | sort`
- **Observed active pages:** `72`
- **Breakdown:** `16` public/auth-boundary pages, `23` Admin pages, `33`
  Workshop pages.
- **Modal discovery:** direct `Modal`/`AppModal`/`Dialog`, native `<dialog>`,
  `role="dialog"`, and `aria-modal="true"` owners under Workshop/Support.
- **Stale rule:** any added, removed, or moved `page.tsx`, modal owner, overlay
  primitive, or route-protection rule invalidates this inventory before
  implementation.

Disposition vocabulary:

- `EXCLUDE_PUBLIC` — no Workshop Joyride import or instructional persistence.
- `EXCLUDE_ADMIN` — separate operator shell; preserve safe auth return only.
- `CORE_HOST` — may host auto-start orientation/on-demand runtime.
- `CENTER` — onboarding center/checklist/control surface.
- `CORE_GUIDE` — first-value route-local guide.
- `CONTEXT_GUIDE` — beta-v1 post-value guide.
- `HELP_ONLY` — audited; inline help/Support only, no beta-v1 Joyride flow.
- `SETTINGS` — Guidance & tours status/actions or Settings-owned support.
- `SUPPORT` — recovery destination; pause active tour before modal Support.
- `REDIRECT` — no target; preserve query only when the redirect already does.
- `RETURN_ONLY` — valid protected return destination, but no tour overlay.

## Public and Auth-Boundary Pages

| Source page | Route | Disposition | Decision |
| --- | --- | --- | --- |
| `src/app/page.tsx` | `/` | `EXCLUDE_PUBLIC` | Marketing entry; no Workshop runtime. |
| `src/app/new/page.tsx` | `/new` | `EXCLUDE_PUBLIC` | Public by repository contract; no Workshop runtime. |
| `src/app/about/page.tsx` | `/about` | `EXCLUDE_PUBLIC` | Marketing/content only. |
| `src/app/features/page.tsx` | `/features` | `EXCLUDE_PUBLIC` | Marketing/content only. |
| `src/app/pricing/page.tsx` | `/pricing` | `EXCLUDE_PUBLIC` | Marketing/content only. |
| `src/app/contact/page.tsx` | `/contact` | `EXCLUDE_PUBLIC` | Marketing/contact only. |
| `src/app/privacy/page.tsx` | `/privacy` | `EXCLUDE_PUBLIC` | Public legal surface. |
| `src/app/terms/page.tsx` | `/terms` | `EXCLUDE_PUBLIC` | Public legal surface. |
| `src/app/security/page.tsx` | `/security` | `EXCLUDE_PUBLIC` | Public trust surface. |
| `src/app/trust/page.tsx` | `/trust` | `EXCLUDE_PUBLIC` | Public trust surface. |
| `src/app/login/page.tsx` | `/login` | `EXCLUDE_PUBLIC` | Carries sanitized protected `next`; never mounts Joyride. |
| `src/app/signup/page.tsx` | `/signup` | `EXCLUDE_PUBLIC` | Request-access entry; never mounts Joyride. |
| `src/app/access-required/page.tsx` | `/access-required` | `EXCLUDE_PUBLIC` | Account-status boundary; no instructional state. |
| `src/app/invite/[token]/page.tsx` | `/invite/[token]` | `EXCLUDE_PUBLIC` | Token route; never store in onboarding events; accepted invite resolves a protected destination server-side. |
| `src/app/share/[token]/page.tsx` | `/share/[token]` | `EXCLUDE_PUBLIC` | Public recipient experience; no Workshop runtime. |
| `src/app/kimi3d/page.tsx` | `/kimi3d` | `EXCLUDE_PUBLIC` | Standalone public experiment; no Workshop runtime. |

## Admin Pages

Every Admin page is `EXCLUDE_ADMIN`. The auth sanitizer may return an
authorized platform operator to the exact protected path, but no
workspace-scoped onboarding state or Joyride chunk enters the Admin shell.

| Source page | Route |
| --- | --- |
| `src/app/admin/page.tsx` | `/admin` |
| `src/app/admin/today/page.tsx` | `/admin/today` |
| `src/app/admin/accounts/page.tsx` | `/admin/accounts` |
| `src/app/admin/accounts/[accountId]/page.tsx` | `/admin/accounts/[accountId]` |
| `src/app/admin/allowlist/page.tsx` | `/admin/allowlist` |
| `src/app/admin/analytics/page.tsx` | `/admin/analytics` |
| `src/app/admin/audit/page.tsx` | `/admin/audit` |
| `src/app/admin/communications/page.tsx` | `/admin/communications` |
| `src/app/admin/copilot/page.tsx` | `/admin/copilot` |
| `src/app/admin/data-quality/page.tsx` | `/admin/data-quality` |
| `src/app/admin/estimate-system/page.tsx` | `/admin/estimate-system` |
| `src/app/admin/financials/page.tsx` | `/admin/financials` |
| `src/app/admin/flags/page.tsx` | `/admin/flags` |
| `src/app/admin/notifications/page.tsx` | `/admin/notifications` |
| `src/app/admin/observability/page.tsx` | `/admin/observability` |
| `src/app/admin/privacy/page.tsx` | `/admin/privacy` |
| `src/app/admin/projects/page.tsx` | `/admin/projects` |
| `src/app/admin/projects/[projectId]/page.tsx` | `/admin/projects/[projectId]` |
| `src/app/admin/releases/page.tsx` | `/admin/releases` |
| `src/app/admin/saved-replies/page.tsx` | `/admin/saved-replies` |
| `src/app/admin/support/page.tsx` | `/admin/support` |
| `src/app/admin/users/page.tsx` | `/admin/users` |
| `src/app/admin/users/[userId]/page.tsx` | `/admin/users/[userId]` |

## Workshop Pages

| Source page | Route | Disposition | Decision |
| --- | --- | --- | --- |
| `src/app/workshop/page.tsx` | `/workshop` | `CORE_HOST` | Shell orientation host, dashboard progress, Getting started entry. |
| `src/app/workshop/getting-started/page.tsx` | `/workshop/getting-started` | `CENTER` | Replace redirect with checklist, recommendation, start paths, and on-demand guides. |
| `src/app/workshop/onboarding/page.tsx` | `/workshop/onboarding` | `REDIRECT` | Compatibility redirect to `/workshop/getting-started`. |
| `src/app/workshop/projects/page.tsx` | `/workshop/projects` | `CORE_HOST` | Project task destination; existing zero state owns Blank/Template/Guided sample. |
| `src/app/workshop/projects/[projectId]/page.tsx` | `/workshop/projects/[projectId]` | `HELP_ONLY` | Authorized dashboard context; no beta-v1 tour. Direct-estimate redirects remain authoritative. |
| `src/app/workshop/projects/[projectId]/estimates/page.tsx` | `/workshop/projects/[projectId]/estimates` | `CORE_GUIDE` | Estimate existence/creation task and route preparation. |
| `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` | `/workshop/projects/[projectId]/estimates/[nodeId]` | `CORE_GUIDE` | First-estimate hierarchy, area/row, total/save guide. |
| `src/app/workshop/projects/[projectId]/data/page.tsx` | `/workshop/projects/[projectId]/data` | `HELP_ONLY` | Inline help only after readable project facts; no beta-v1 tour. |
| `src/app/workshop/projects/[projectId]/charts/page.tsx` | `/workshop/projects/[projectId]/charts` | `REDIRECT` | Compatibility redirect to Data; never a target. |
| `src/app/workshop/projects/[projectId]/activity/page.tsx` | `/workshop/projects/[projectId]/activity` | `HELP_ONLY` | No tour until feed/permission state is truthful; Support remains available. |
| `src/app/workshop/projects/[projectId]/team/page.tsx` | `/workshop/projects/[projectId]/team` | `HELP_ONLY` | Inline access-scope help; no beta-v1 tour. |
| `src/app/workshop/projects/[projectId]/client-portals/page.tsx` | `/workshop/projects/[projectId]/client-portals` | `HELP_ONLY` | Manager-only portal roster; no beta-v1 tour. |
| `src/app/workshop/projects/[projectId]/client-portals/[portalId]/page.tsx` | `/workshop/projects/[projectId]/client-portals/[portalId]` | `HELP_ONLY` | Portal control center; preserve distinction from Client links. |
| `src/app/workshop/projects/[projectId]/client-portals/[portalId]/discussions/page.tsx` | `/workshop/projects/[projectId]/client-portals/[portalId]/discussions` | `HELP_ONLY` | Discussion inbox; no beta-v1 tour. |
| `src/app/workshop/library/page.tsx` | `/workshop/library` | `HELP_ONLY` | Blank Overview is never a Joyride target. |
| `src/app/workshop/library/components/page.tsx` | `/workshop/library/components` | `CONTEXT_GUIDE` | `library_reuse` only when content/state/capability is truthful. |
| `src/app/workshop/library/templates/page.tsx` | `/workshop/library/templates` | `CONTEXT_GUIDE` | `library_reuse` template step; capability-aware. |
| `src/app/workshop/library/templates/[templateId]/page.tsx` | `/workshop/library/templates/[templateId]` | `HELP_ONLY` | Editor is not a beta-v1 tour; ordinary inline help. |
| `src/app/workshop/components/page.tsx` | `/workshop/components` | `REDIRECT` | Compatibility redirect to Library; never a target. |
| `src/app/workshop/templates/page.tsx` | `/workshop/templates` | `REDIRECT` | Compatibility redirect to Library Templates. |
| `src/app/workshop/proposals/page.tsx` | `/workshop/proposals` | `HELP_ONLY` | Signed-in recipient inbox; no beta-v1 tour. |
| `src/app/workshop/publisher/page.tsx` | `/workshop/publisher` | `CONTEXT_GUIDE` | `client_sharing` only for eligible manager with valid content. |
| `src/app/workshop/publisher/preview/[projectId]/page.tsx` | `/workshop/publisher/preview/[projectId]` | `RETURN_ONLY` | Authenticated presentation preview; pause/omit tour overlay. |
| `src/app/workshop/feedback/page.tsx` | `/workshop/feedback` | `SUPPORT` | Dedicated recovery route with sanitized context only. |
| `src/app/workshop/settings/page.tsx` | `/workshop/settings` | `SETTINGS` | Primary Guidance & tours status/actions surface. |
| `src/app/workshop/settings/profile/page.tsx` | `/workshop/settings/profile` | `SETTINGS` | Account/profile/delete surface; no tour target; lifecycle integration applies. |
| `src/app/workshop/settings/workspace/page.tsx` | `/workshop/settings/workspace` | `SETTINGS` | Workspace settings; no beta-v1 tour. |
| `src/app/workshop/settings/organization/page.tsx` | `/workshop/settings/organization` | `SETTINGS` | Organization settings; no beta-v1 tour. |
| `src/app/workshop/settings/users/page.tsx` | `/workshop/settings/users` | `SETTINGS` | Platform access management; no workspace onboarding target. |
| `src/app/workshop/settings/feedback/page.tsx` | `/workshop/settings/feedback` | `SETTINGS` | Platform feedback review; no beta-user tour. |
| `src/app/workshop/settings/scan-overrides/page.tsx` | `/workshop/settings/scan-overrides` | `SETTINGS` | Operational settings; no tour. |
| `src/app/workshop/settings/upload-operations/page.tsx` | `/workshop/settings/upload-operations` | `SETTINGS` | Operational settings; no tour. |
| `src/app/workshop/terms/page.tsx` | `/workshop/terms` | `RETURN_ONLY` | Pre-shell legal gate; carries sanitized return intent; no Joyride before acceptance. |

## Modal and Focus Ownership Inventory

### Shared contract

`src/components/ui/overlays/dialog.tsx` and
`src/components/ui/overlays/modal.tsx` become the sole default modal lifecycle
publishers. They emit `opening` only for modal dialogs and
`closed_focus_restored` after opener restoration. Non-modal popovers do not
pause Joyride.

| Direct owner | Current mechanism | Implementation decision |
| --- | --- | --- |
| `src/components/support/SupportCenter.tsx` | `AppModal` | Covered by shared lifecycle; tour pauses before Support opens. |
| `src/components/workshop/BulkDestructivePreviewModal.tsx` | `Modal` | Covered by shared lifecycle. |
| `src/components/workshop/DeleteAccountDangerZone.tsx` | `Modal` | Covered by shared lifecycle; no resume during destructive confirmation. |
| `src/components/workshop/NewProjectModal.tsx` | `Dialog` | Covered by shared lifecycle. |
| `src/components/workshop/ProjectDetailsModal.tsx` | `Dialog` | Covered by shared lifecycle. |
| `src/components/workshop/WorkshopSettingsModal.tsx` | `Modal` | Covered; Settings closes and restores focus before a tour launch. |
| `src/components/workshop/EstimateSheetTree.tsx` | Multiple `Modal` instances | Covered by shared lifecycle. |
| `src/components/workshop/estimate-sheet/rows/cells.tsx` | `Modal` | Covered by shared lifecycle. |
| `src/components/workshop/estimate-tree/EstimateTreeMoveDialog.tsx` | `Modal` | Covered by shared lifecycle. |
| `src/components/workshop/component-library-manager/AddComponentModal.tsx` | `Modal` plus nested non-modal dialog region | Modal covered; nested non-modal region does not publish. |
| `src/components/workshop/component-library/NewTemplateModal.tsx` | `Modal` | Covered by shared lifecycle. |
| `src/components/workshop/library/templates-browse/ArchivedTemplatesDialog.tsx` | `Modal` | Covered by shared lifecycle. |
| `src/components/workshop/library/templates-browse/InsertIntoEstimatePicker.tsx` | `Modal` | Covered by shared lifecycle. |
| `src/components/workshop/dashboard/PublishedProjectQuickActions.tsx` | `Modal` | Covered by shared lifecycle. |
| `src/components/workshop/publication/RecipientEmailComposer.tsx` | Multiple `Modal` instances | Covered by shared lifecycle. |
| `src/components/workshop/publisher/PublisherProjectPicker.tsx` | `Dialog` | Covered by shared lifecycle. |
| `src/components/workshop/EstimateSheetContent.tsx` | `Modal` plus native `<dialog>` | Shared instances covered; native dialog adopts lifecycle adapter. |
| `src/components/workshop/ProposalExportPreviewDialog.tsx` | Native `<dialog>` | Add lifecycle adapter around `showModal`/close/restoration. |
| `src/components/workshop/component-library/CommandPalette.tsx` | Native `<dialog>` | Add lifecycle adapter around `showModal`/close/restoration. |
| `src/components/workshop/component-library/index.tsx` | Multiple native `<dialog>` instances | Add one local adapter used by every native dialog state. |
| `src/components/workshop/estimate-sheet/activity-history.tsx` | Native `<dialog>` instances | Add lifecycle adapter for both dialogs. |
| `src/components/workshop/ResizableSidePanel.tsx` | Custom `role="dialog" aria-modal="true"` | Publish lifecycle when the mobile drawer becomes modal. |
| `src/components/workshop/ManageGroupsPopover.tsx` | Non-modal `role="dialog"` | Do not publish global modal lifecycle; no guide targets controls while open. |

### Focus stop condition

Implementation is not accepted until every direct owner above is either covered
by the shared primitive or explicitly adapted, and source search finds no
unclassified modal owner:

```bash
rg -n '<(AppModal|Modal|Dialog)\b|<dialog\b|role="dialog"|aria-modal="true"' \
  src/app/workshop src/components/workshop src/components/support
```

Opening any classified application modal must leave no Joyride tooltip,
overlay, focus trap, or Escape listener active. Closing restores application
focus first; only a later explicit resume/start launches Joyride.
