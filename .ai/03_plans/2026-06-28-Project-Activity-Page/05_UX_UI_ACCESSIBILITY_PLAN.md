# 05 — UX / UI / Accessibility Plan

Treats `DESIGN.md` as alpha-stage guidance and defers to Philip on visual decisions. Reuses the dashboard chrome and existing UI primitives; does not introduce a new design-system layer.

## Primary user journeys

### Journey A — "What changed?"
1. User navigates to `/workshop/projects/{id}/activity` from the mini-sidebar.
2. Page loads with default scope = `whole-project`, no filters.
3. User scrolls; "Load more" paginates.
4. Optional: clicks "Refresh" to re-fetch latest.

### Journey B — "What did User A do?"
1. From Journey A, user opens the Actor dropdown.
2. Selects User A.
3. Timeline filters; URL becomes `?actor=<userId>`.
4. User shares the URL with another workspace member.

### Journey C — "What did the client do?"
1. From Journey A, user opens the Client dropdown.
2. Selects a recipient by display name.
3. Timeline filters; URL becomes `?client=<recipientId>`.
4. The displayed actor label is the recipient's `display_name`, never their email.

### Journey D — "What got deleted?"
1. From Journey A, user opens the Action filter.
2. Selects "Deletions".
3. Timeline shows only delete-class events (row deleted, node deleted, tab deleted, etc.).

### Journey E — "Zoom into one estimate"
1. From Journey A, user opens the Scope dropdown.
2. Selects estimate "ES-001 Estimate".
3. Timeline filters to that estimate's events + comments + responses + publications containing that estimate + collaboration audit rows that explicitly carry the selected `estimate_id`.
4. URL becomes `?scope=estimate:<estimateId>`.

## Information architecture

```
WorkshopPageShell (existing, server)
└── Project dashboard chrome (existing)
    ├── Header (existing)
    ├── Breadcrumbs (existing)
    └── Project Activity content area
        ├── Filter Row (sticky, client)
        │   ├── Scope selector (single-select)
        │   ├── Action multi-select chips
        │   ├── Actor dropdown
        │   ├── Client dropdown
        │   ├── "Edited by me" preset (one-click)
        │   ├── "Clear" button
        │   ├── "Refresh" button
        │   └── Result count (aria-live polite)
        ├── Partial-data banner (conditional)
        └── Activity timeline (client)
            ├── Empty state (conditional)
            ├── Loading skeleton (conditional)
            ├── Error state (conditional)
            ├── Permission-denied state (conditional)
            └── List of ActivityItemCard
                └── "Load more" button (cursor pagination)
```

## Screen and component states

| State | Trigger | Copy | Visual |
|---|---|---|---|
| Loading (initial) | Server Component prefetch in flight | (none) | Skeleton tiles matching dashboard density |
| Loading (pagination) | "Load more" clicked | (none) | Inline spinner on the button + sr-only "Loading more activity" |
| Empty (no activity ever) | All sources return 0 items, no filters | "No activity yet. As you and your client interact with this project, the history will appear here." | Empty-state illustration or icon |
| Empty (filtered) | Filters exclude everything | "No activity matches your filters." + "Clear filters" button | Same shell |
| Partial | `unavailableSources.length > 0` | "Some sources are temporarily unavailable. Showing partial data." + list of source names | Banner above the timeline |
| Error (initial) | Server Component throws | "We couldn't load activity right now." + "Try again" button | Error-state illustration or icon |
| Permission denied | `can_edit_project = false` | "You don't have access to this project's activity." | Inside chrome, no filter row |
| Success | Items render | (none) | Standard list |
| Disabled (Load more) | Already loading | (none) | Spinner + `aria-disabled` |

## Loading, empty, success, error, permission, offline, conflict, success

| State | Implementation notes |
|---|---|
| Loading | React 19 + Next.js 16 Suspense; route `loading.tsx` may stay as-is or be specialized |
| Empty | Distinguish "no activity at all" from "filters exclude everything" using total + filtered counts |
| Success | Default render |
| Error | Route `error.tsx` exists at the parent level; the page also handles in-component errors gracefully |
| Permission-denied | Server-driven; rendered client-side |
| Offline / slow network | Standard browser behavior; "Load more" may time out → friendly retry |
| Conflict | n/a (read-only) |

## Keyboard navigation

- Tab order: Filter row → timeline first item → Load more → Refresh.
- Dropdowns: arrow-key + Enter; Esc closes.
- Multi-select chips: Tab between chips, Enter/Space to toggle.
- "Load more": Enter/Space activates; focus stays on button.
- Clear: Enter/Space activates; focus moves to scope selector.
- Mobile Filters trigger: button exposes `aria-expanded` and `aria-controls`; Enter/Space opens the drawer.
- Mobile drawer: Esc and backdrop close it; focus returns to the Filters trigger; Apply keeps focus in the drawer until close, Clear resets controls without closing.
- Tablet overflow menu: follows menu-button semantics; actions remain keyboard-operable and do not hide required filter labels from assistive tech.

## Focus management

- On scope/filter change that resets the list, focus stays on the control that triggered the change.
- On "Load more" completion, focus stays on the button; the result count live-region announces the new total.
- On dropdown close (Esc), focus returns to the trigger.

## Screen-reader semantics

- Filter row: `<form role="search" aria-label="Filter project activity">`.
- Scope selector: `<select>` or custom `DropdownSelect` with `aria-label="Scope"`.
- Action multi-select: `<fieldset><legend>Actions</legend>` with checkbox chips, each `aria-checked`.
- Actor dropdown: `aria-label="Actor"`.
- Client dropdown: `aria-label="Client"`.
- Result count: `<p aria-live="polite" aria-atomic="true">Showing X of Y</p>`.
- Timeline: `<ol aria-label="Activity timeline">` of `<li>` items.
- Each `ActivityItemCard` exposes an accessible name via inner heading or `aria-label`.

## Color and contrast

- Use the neutral palette (`#292929` ink, `#5D5D5D`, `#7F7F7F`).
- Source badges: low-chip-color + icon + text. Never color-only.
- Deletions: warning icon + "Deleted" label.
- Decisions: icon for `approved`/`declined`/`requested_revision`.
- All text meets WCAG 2.2 AA contrast (≥ 4.5:1 for body, ≥ 3:1 for large text).

## Responsive behavior

- ≥ 1024px: filter row is one line, all controls visible.
- 768–1023px: filter row wraps; "Edited by me" and "Clear" collapse into an overflow menu.
- < 768px: filter row becomes a drawer toggled by a "Filters" button; timeline remains a single column.

## Mobile and tablet filter semantics

- Mobile Filters button: visible label "Filters", `aria-expanded`, `aria-controls="project-activity-filters"`, and a count badge for active filters.
- Drawer: labelled heading "Filters"; uses a focus trap while open; closes on Esc, backdrop click, Apply, or the close button; returns focus to the trigger.
- Drawer controls: Scope, Actions, User, Client, Edited by me, Clear, Apply. Clear resets all filters and keeps the drawer open; Apply writes URL filter state and closes.
- Tablet overflow: only secondary actions collapse. Scope, Actions, User, and Client remain directly discoverable or are reachable through a labelled menu button with `aria-haspopup="menu"`.

## Touch vs hover

- No hover-only interactions. Tooltips (if any) also open on focus and long-press.

## Reduced motion

- All animations gated behind `@media (prefers-reduced-motion: reduce)`. Skeleton pulse and spinner respect this.

## Localization

- Hard-coded strings for v1 in English. Pattern allows future i18n extraction. Date formatting uses `en-PH` locale via `Intl`.

## Copy / microcopy dictionary

| Token | Copy |
|---|---|
| `page.title` | "Activity" |
| `page.empty.never` | "No activity yet. As you and your client interact with this project, the history will appear here." |
| `page.empty.filtered` | "No activity matches your filters." |
| `page.error.generic` | "We couldn't load activity right now." |
| `page.error.retry` | "Try again" |
| `page.partial.banner` | "Some sources are temporarily unavailable. Showing partial data." |
| `permission.denied` | "You don't have access to this project's activity." |
| `filter.scope.label` | "Scope" |
| `filter.scope.whole_project` | "Whole project" |
| `filter.scope.project_only` | "Project (no estimate sheets)" |
| `filter.scope.estimate` | "Estimate:" |
| `filter.action.label` | "Actions" |
| `filter.action.all` | "All actions" |
| `filter.action.created` | "Created" |
| `filter.action.edited` | "Edited" |
| `filter.action.deleted` | "Deletions" |
| `filter.action.reordered` | "Reorganized" |
| `filter.action.shared` | "Shares" |
| `filter.action.commented` | "Comments" |
| `filter.action.decided` | "Decisions" |
| `filter.action.invited` | "Invites" |
| `filter.action.viewed` | "Views" |
| `filter.action.versioned` | "Versions" |
| `filter.action.system` | "System" |
| `filter.actor.label` | "User" |
| `filter.actor.me` | "Edited by me" |
| `filter.actor.all` | "All users" |
| `filter.client.label` | "Client" |
| `filter.client.all` | "All clients" |
| `filter.clear` | "Clear filters" |
| `filter.refresh` | "Refresh" |
| `result.count` | "Showing {shown} of {total}" |
| `load.more` | "Load more" |
| `source.estimate` | "Estimate" |
| `source.share` | "Shared link" |
| `source.comment` | "Client comment" |
| `source.decision` | "Client decision" |
| `source.collaboration` | "Collaboration" |
| `source.publication` | "Publication" |

## UX regressions to avoid

- The existing dashboard preview card (recent activity tile on `/workshop/projects/{id}`) must not change behavior. It still calls `listProjectActivityPage`.
- The mini-sidebar "Activity" item, if already present, must continue to point at this route.
- The existing estimate-sheet-scoped `activity-history.tsx` is untouched.

## UX risks

- **Information density**: rendering all six sources in one timeline may feel noisy. Mitigation: action filter chips let the user collapse noise; source badge is small but visible.
- **Client display name collisions**: two recipients with the same display name. Mitigation: disambiguate inside the dropdown with non-PII context such as publication title/date or a stable ordinal (`John (June 24 share)` / `John (2)`). Recipient email is never sent to the client DTO.
- **Estimate scope correctness**: when a publication contains multiple estimates, the estimate-scoped view must still show comments that targeted the selected estimate (via `estimate_id` column on the comment/response) and must exclude project-wide collaboration events unless they explicitly carry that `estimate_id`. Mitigation: see DATA section.
- **Sticky proof overclaim**: jsdom can prove structure/classes, not actual sticky scroll behavior. DOM tests assert the sticky token and row structure; manual/browser visual review verifies real sticky behavior and non-overlap.
