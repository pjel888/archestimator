# 05 — UX, UI, and Accessibility Plan

> **PASS-2 AUDIT BANNER (2026-06-25).** This document has 1 HIGH correction and 7 MEDIUM corrections recorded in `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md`. Headlines: FAB-U01 (design-system linter `scripts/enforce-app-design-system.mjs` rules MUST be enumerated — `maxPx=12`, `labelLikeTextSizeLimitPx=9`, `secondaryTextSizeLimitPx=10`, scannedRoots = `src/app` + `src/components`, Publisher is NOT exempt, allowed border-radius = {3px, var(--radius-xs), var(--glass-*), inherit}, SF Pro regular/medium only, zero letter-spacing), FAB-U02 (reuse `src/components/ui/empty-state.tsx`), FAB-U03 (skeleton strategy: new `PublisherRosterSkeleton.tsx` or adapter from `ProjectsListSkeleton.tsx`), FAB-U04 (reuse `src/components/ui/toast.tsx`), FAB-U05 (specify date format — recommend `Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })`), FAB-U06 (specify number format — `Intl.NumberFormat('en-PH').format(count)`), FAB-U09 (mobile-redirect strategy unspecified — no existing pattern), FAB-U10 (i18n deferral MUST be explicit), FAB-U13 (copy-link pattern source = `ProjectPublicationHeader.tsx`), FAB-U14 (cognitive load = 7 columns + 4 tabs — document at-a-glance vs drill-down split). Read doc 18_ for full evidence.
>
> **UX/UI RESEARCH ADDENDUM (2026-06-25).** Read `19_UX_UI_RESEARCH_AND_REFINEMENT_2026-06-25.md` before implementation. It adds source-backed refinements from NN/g data-table/progressive-disclosure/empty-state guidance, Carbon data-table/filtering guidance, WAI-ARIA dialog guidance, WCAG 2.2, GOV.UK form-error/confirmation patterns, and Referrer-Policy references.

---

## Source-backed UX planning principles

- **Task-shaped roster.** Optimize the roster for find, compare, inspect/manage one publication, and act on selected publications. Do not expose every available field in the first viewport.
- **Progressive disclosure.** Keep the at-a-glance roster scannable; move raw events, opens, snapshot version, detailed recipient state, and advanced settings into the drawer or detail route.
- **State-specific empty states.** Empty, filtered-empty, disabled, permission-denied, and mobile fallback states each need their own status explanation and direct next action.
- **Permission-change clarity.** Rotate, revoke, password, sheet-scope, and recipient changes must show impact before the action and a truthful next step after completion.
- **Accessible form failure.** Publish, recipient, password, sheet-scope, and confirmation forms need inline messages plus an error summary; toast alone is not sufficient for validation failure.
- **Tablet is supported.** 768px portrait is a first-class builder viewport; only viewports below 768px use the desktop-first fallback.
- **Privacy by default.** Copy-link does not navigate. Any open/share affordance must not leak the authenticated workshop URL as the Referer header.

## Primary user journeys

### Journey J1 — First-time publish (Maya, architect owner)
1. Maya signs in, lands on `/workshop` homebase.
2. Clicks `Publisher` in sidebar → `/workshop/publisher` roster loads (< 1.2s).
3. Sees her 3 active projects' publications. One project has zero publications — empty state invites "Publish your first estimate".
4. Clicks `Publish` CTA → modal opens with project picker + sheet picker (reuses `SheetPickerList.tsx`).
5. Selects project, selects 2 of 3 sheets, optional password (min 4 chars), adds 1 recipient email.
6. Clicks `Publish` → toast confirms, roster updates with new row at top, `Copy link` button appears.
7. Total elapsed: < 30s. Zero surface switches.

### Journey J2 — Triage stale publications (Maya)
1. Maya opens Publisher → `Stale` filter tab.
2. Sees 2 publications with snapshot > 14 days behind.
3. Clicks row → drawer opens with `Stale snapshot` badge + `Republish` CTA.
4. Clicks `Republish` → snapshot regenerates from current estimate → badge clears.

### Journey J3 — Rotate after recipient offboarding (Maya)
1. Maya opens Publisher → filter by project → opens publication drawer.
2. Removes ex-contractor email from recipients → audit row written.
3. Clicks `Rotate link` → confirmation modal previews affected recipients.
4. Confirms → new token generated, old token stops working immediately, "Copy new link" toast appears.

### Journey J4 — Audit as workspace admin (Philip)
1. Philip opens Publisher → `Activity` tab.
2. Sees unified timeline: Rina commented on Lewis Residence, Jun (client) accepted Phase 1 proposal, Carlo was added to Baker Street as editor, Maya revoked a publication.
3. Filters by `Decision` event type → sees 5 client decisions in last 7 days.

### Journey J5 — Sheet-scope visibility (Rina, editor)
1. Rina opens Publisher → sees only publications for projects she can access.
2. Opens drawer → sees `canManagePublication: false` → manager actions disabled with tooltip "Ask an admin".
3. Can still see activity, recipients (read-only), comments.

### Journey J6 — Mobile fallback (any user)
1. User navigates to `/workshop/publisher` on phone (< 768px viewport).
2. Sees branded empty state: "Publisher is desktop-first. Open on a larger screen." + link back to `/workshop`.

## Secondary journeys

- J7: Manager toggles sheet access mode from `inherits-project` to `restricted`, then adds per-sheet members. (Phase 3)
- J8: Bulk revoke 5 stale publications. (Phase 4)
- J9: Recipient unsubscribes via one-click link in email. (Existing — `/api/share/[token]/unsubscribe`.)
- J10: Recipient hits lockout after 5 password attempts. (Existing — `isPasswordLocked`.)

## Information hierarchy

```
/workshop/publisher
├── WorkshopPageShell (title="Publisher", breadcrumbs=["Publisher"])
│   ├── PageHeader
│   │   ├── Title + count badge ("12 publications")
│   │   ├── Search input (project, recipient, sheet)
│   │   ├── Filter tabs (All | Active | Stale | Expired | Revoked | Drafts)
│   │   └── Publish CTA (managers only)
│   ├── Roster (DataTable)
│   │   ├── Column: Project name + cover thumbnail
│   │   ├── Column: Status / health badge (Active | Stale | Expired | Revoked)
│   │   ├── Column: Recipients (avatar stack + count)
│   │   ├── Column: Latest activity (comment/decision/open)
│   │   ├── Column: Sheets selected (count)
│   │   ├── Column: Actions (Copy link, Manage, Rotate, Revoke)
│   │   └── Row click → opens drawer
│   ├── Drawer (slide-over right)
│   │   ├── Publication summary card
│   │   ├── Tabs: Activity | Recipients | Sheets | Settings
│   │   ├── Activity tab: timeline
│   │   ├── Recipients tab: roster + add/remove +RecipientEmailComposer
│   │   ├── Sheets tab: SheetPickerList + access-mode toggle (Phase 3)
│   │   └── Settings tab: password, rotate, revoke, expiry
│   └── Empty state (when no publications match filter)
└── BulkActionToolbar (sticky bottom when N>0 rows selected)
```

### At-a-glance vs drill-down split

Primary roster columns are capped to 6 visible task columns:

| Primary column | Purpose | Secondary detail location |
|---|---|---|
| Publication / project | Find the right publication quickly | Drawer summary |
| Status / health | Compare publication risk | Drawer status history |
| Recipients summary | See who has access at a glance | Drawer Recipients tab |
| Latest activity | Triage what needs attention | Drawer Activity tab |
| Sheet scope | Confirm exposed estimate scope | Drawer Sheets tab |
| Actions | Copy/manage safe single-row actions | Drawer Settings tab |

Secondary fields move out of the default table: opens count, last-opened timestamp, snapshot version, days behind latest estimate, full recipient list, event metadata, and raw audit details. If the implementation uses expandable rows, the expansion must be secondary to the drawer and must not introduce a nested-card layout.

## State matrix

| State | Trigger | UI |
|---|---|---|
| **Loading** | Initial route hit | `PublisherRosterSkeleton` (or documented row-shape adapter from `ProjectsListSkeleton`) matching final row height ±4px |
| **Empty (no publications)** | Workspace has zero publications | `EmptyState` with `Publish your first estimate` CTA |
| **Empty (filtered)** | Filter returns zero rows | `EmptyState` with `Clear filters` CTA |
| **Feature disabled** | `ARCHESTIMATOR_PUBLISHER_ENABLED=false` | `EmptyState` explaining Publisher is not enabled yet; no broken stub |
| **Partial degradation** | One audit table unavailable | Timeline renders with `Partial` badge + tooltip |
| **Error (recoverable)** | Supabase transient error | Toast with `Retry` button; form validation errors stay inline + summary |
| **Error (unrecoverable)** | Renderer exception | `WorkshopRouteErrorState` boundary |
| **Permission denied** | User lacks workspace membership | Redirect to `/access-required` (existing pattern) |
| **Read-only access** | User can view but not manage publication | Manager controls disabled with tooltip + drawer explanation |
| **Locked** | User hits rate limit on recipient add | Toast: `Too many actions. Try again in N minutes.` |
| **Success (publish)** | Publish action completes | Toast: `Published. Copy link:` + copy button |
| **Success (rotate)** | Rotate completes | Toast: `New link generated. Old link revoked.` |
| **Success (revoke)** | Revoke completes | Toast: `Publication revoked.` + next step; only show undo if revoke is implemented as a true reversible mutation |
| **Confirm destructive** | Revoke / bulk-revoke / password-clear | `BulkDestructivePreviewModal` with affected recipients listed |
| **Offline / degraded network** | fetch fails | Toast: `Network error. Retrying…` + 1 auto-retry |
| **Mobile (< 768px)** | Narrow viewport | Branded empty state redirect to `/workshop` |

## Loading patterns

- **Roster**: SSR with RSC; no client loader. `<Suspense>` fallback is `PublisherRosterSkeleton`.
- **Drawer**: Lazy-loaded client component; opens with 200ms slide-over + 100ms content fade.
- **Timeline**: Paginated; "Load more" button shows `Spinner` during fetch.
- **Mutation feedback**: Optimistic state on action; toast on success; rollback + toast on failure.
- **Form validation**: inline field messages + top error summary; focus moves to summary on submit failure.

## Permission-change interaction rules

| Action | Required preview | Completion behavior |
|---|---|---|
| Publish | Project, sheets, optional password, initial recipient count | Toast with copy action; roster row appears at top |
| Add recipients | Emails to add, invalid emails, duplicate handling, cap of 50 per action unless D-ARCH-07 changes it | Toast with added count; inline errors for invalid addresses |
| Remove recipient | Recipient email and publication affected | Row removed; audit event visible in Activity |
| Rotate link | Old link invalidation, re-notification policy, affected recipients | New link copy action; no old-token UI flash |
| Revoke | Publication, affected recipients, receiver result | Status changes to revoked; no undo unless implemented as reversible |
| Password change/clear | Cookie/access impact and who must re-enter password | Credential version behavior matches doc 18/D-ARCH-08 |
| Sheet-scope change | Sheets exposed, snapshot behavior, recipient-cookie behavior | Snapshot/state updates; stale badge recalculated |
| Access-mode restrict | Users losing access and last-admin protection | If blocked by DB trigger, toast says `You can't remove the last admin` |

## Navigation patterns

- **Sidebar entry**: `Publisher` icon (Phosphor `ShareNetwork` or `PaperPlaneTilt`) between `Templates` and `Settings` in `MainSidebar`. Active state on `/workshop/publisher*`.
- **Breadcrumbs**: `Workspace / Publisher` (eyebrow hidden per current stub).
- **Deep links**: `/workshop/publisher?project=<id>&status=stale` opens pre-filtered roster.
- **Back / forward**: URL state-driven; works with browser history.
- **Cross-surface**: "Open in project" link in drawer → `/workshop/projects/[projectId]` (existing surface).

## Responsive behavior

| Viewport | Behavior |
|---|---|
| ≥ 1280px | Full 3-column: roster + drawer (open) + sidebar |
| 1024–1279px | 2-column: roster + drawer (slides over) |
| 768–1023px | 1-column: priority-column roster full-width, drawer = full page/detail route |
| < 768px | Empty state: "Desktop-first. Open on a larger screen." |

At 768px, the visible roster keeps only: publication/project, status/health, latest activity, and actions. Recipients and sheet scope may collapse into the row summary or detail page if space is constrained. This viewport must be validated explicitly because it is part of the PH/SEA tablet floor from doc 18.

## Keyboard navigation

| Key | Action |
|---|---|
| Tab / Shift-Tab | Move focus across roster rows, then toolbar |
| Enter / Space | Open drawer for focused row |
| Esc | Close drawer / modal |
| Cmd/Ctrl+K | Open command palette (existing workshop pattern) |
| `?` | Open keyboard-shortcut help (existing pattern) |
| `c` | Copy link for focused row |
| `r` | Rotate token for focused row (with confirmation) |

## Focus management

- Drawer open: focus moves to drawer's first interactive element.
- Drawer close (Esc or backdrop): focus returns to triggering row.
- Modal open: focus trapped; on close returns to triggering button.
- Toast: does not steal focus; appears in aria-live region.
- Validation failure: focus moves to the error summary, then field-level errors remain reachable in source order.

## Screen-reader semantics

- Roster: `<table>` with `<caption>` "Publications you manage", `<thead>` with column labels, `<tbody>` rows.
- Status badges: text-first badge with `aria-label` that describes state and severity; do not rely on emoji-only status.
- Drawer: `role="dialog" aria-labelledby="drawer-title" aria-modal="true"`.
- Timeline: `<ol>` with `<li>` per event; each event has `<time datetime="...">`.
- Toasts: `role="status" aria-live="polite"`.
- Bulk-action toolbar: `role="toolbar" aria-label="Bulk actions"`.

## Color and contrast

- Profile colors from `src/lib/collaboration/colors.ts` are pre-verified for WCAG AA 4.5:1 by `collaboration-colors-contrast.test.ts`. Publisher reuses these for recipient avatars.
- Status badge colors (Active / Stale / Expired / Revoked) must meet AA 4.5:1 against the surface token. Verify via `tests/vitest/collaboration-colors-contrast.test.ts` pattern.
- Dark mode: workshop does not currently ship dark mode; Publisher follows suit.

## Localization implications

- Phase 1 ships English-only. Strings extracted via existing i18n pattern (none currently — manual constants).
- Date / time formatting for absolute timestamps: `Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })`.
- Relative activity labels may use existing `Intl.RelativeTimeFormat` workshop pattern.
- Counts: `Intl.NumberFormat('en-PH').format(count)`.
- Currency: pesos (`₱`) — existing pattern.
- i18n is deferred for MVP; all strings must still live in named constants close to the component so extraction is straightforward later.

## Design-system reuse

| Component | Source | Publisher use |
|---|---|---|
| `WorkshopPageShell` | `src/components/workshop/WorkshopPageShell.tsx` | Direct |
| `WorkshopCollectionLayout` | `src/components/workshop/WorkshopCollectionLayout.tsx` | Direct |
| `DataTable` | `src/components/ui/data-table.tsx` | Direct |
| `Tabs` / `TabStrip` | `src/components/ui/tabs.tsx`, `tab-strip.tsx` | Filter tabs |
| `Modal` | `src/components/ui/modal.tsx` | Confirm destructive |
| `BulkDestructivePreviewModal` | `src/components/workshop/BulkDestructivePreviewModal.tsx` | Bulk actions |
| `BulkActionToolbar` | `src/components/workshop/BulkActionToolbar.tsx` | Bulk actions |
| `EmptyState` | `src/components/ui/empty-state.tsx` | Empty states |
| `Skeleton` | `src/components/ui/skeleton.tsx` | Loading |
| `Toast` | `src/components/ui/toast.tsx` | All toasts |
| `SearchInput` | `src/components/ui/search-input.tsx` | Search |
| `StatusBadge` / `Badge` | `src/components/ui/status-badge.tsx`, `badge.tsx` | Status pills |
| `Avatar` | `src/components/ui/avatar.tsx` | Recipient stack |
| `Tooltip` (toolbar-tooltip) | `src/components/ui/toolbar-tooltip.tsx` | Icon button hints |
| `IconButton` | `src/components/ui/icon-button.tsx` | Row actions |
| `DropdownMenu` | `src/components/ui/dropdown-menu.tsx` | Row overflow menu |
| `RecipientEmailComposer` | `src/components/workshop/publication/RecipientEmailComposer.tsx` | Add recipient |
| `SheetPickerList` | `src/components/workshop/publication/SheetPickerList.tsx` | Sheet selection |
| `SharedLinkActivityFeed` | `src/components/share/SharedLinkActivityFeed.tsx` | Timeline (extended) |

**Zero new UI primitives needed.** Every surface has a direct reuse.

## Design-system lint contract

Publisher is scanned by `scripts/enforce-app-design-system.mjs` because the script covers `src/app` and `src/components`; `/workshop/publisher` is not exempt.

Implementation must pass:

- `maxPx=12` for app/workshop text.
- `labelLikeTextSizeLimitPx=9`.
- `secondaryTextSizeLimitPx=10`.
- Allowed border radius only: `3px`, `var(--radius-xs)`, `var(--glass-*)`, or `inherit` unless the script is intentionally updated with evidence.
- SF Pro regular/medium only.
- Zero letter-spacing.
- No decorative hero, oversized cards, gradient-orb backgrounds, fake metrics, or marketing-page layout.

## Copy-link privacy contract

- `Copy link` uses the clipboard and does not navigate.
- Any future `Open share link` anchor uses `rel="noreferrer"` when it opens an external share surface.
- `/workshop/*` should be covered by D-OPS-01: `Referrer-Policy: no-referrer` or `same-origin`.
- Tests should assert raw tokens and authenticated workshop URLs are absent from logs, serialized props, and visible error messages.

## UX regressions to avoid

- Existing `ProjectPublicationHeader` and `ProjectTeamspaceHeader` modals stay working until Phase 4. Phase 1–3 must not break the project page header layout.
- Existing `/share/[token]` receiver route is untouched. Publisher is builder-side only.
- Existing `/workshop/settings/workspace` role management stays working. Publisher surfaces it; it does not replace it.

## User-facing documentation implications

- Update `.ai/06_specs/shared-link-and-publication-spec.md` post-Phase-1 with Publisher section.
- Update root `README.md` route table.
- Optional: in-app onboarding tooltip on first Publisher visit ("Publish your first estimate from here").

## Open UX decisions (deferred to Philip — see `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`)

- **D3** Sidebar placement: top-level `/workshop/publisher` (recommended) vs project-scoped `/workshop/projects/[id]/publisher` only vs both.
- **D4** Modal coexistence: Phase 4 consolidation vs permanent coexistence.
- **D6** Drawer vs full-page detail: drawer is recommended; full page is alternative if drawer feels cramped.
- **D7** Default sort: `latestActivityAt desc` (recommended) vs `publishedAt desc` vs `projectName asc`.
