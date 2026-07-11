# 03 — Target UX/UI Design

> The target: make `/workshop/proposals` look and feel like `/workshop/projects`
> while preserving the nuances of proposal-specific information.

---

## 1. Design Principle

The proposals inbox is a **recipient-facing collection view**. Unlike the
projects page (which is owner-facing with create/edit/delete/DnD), the proposals
inbox is **read-only with a single action** (Review → redirect to `/share/[token]`).

The UX should borrow the projects page's **visual structure and interaction
patterns** (card grid, search, tabs, sort, view modes) but **not** its
owner-management affordances (DnD, bulk select, favorites, create/edit).

---

## 2. User Journeys

### Journey A — Recipient checks inbox and reviews a proposal
1. Recipient signs in → lands in `/workshop`.
2. Clicks "Proposals" (sidebar, ⌘4) → `/workshop/proposals`.
3. Sees a card grid of proposals (or empty state).
4. Scans cards — each shows project name, workspace, status chip, decision chip, sender, sent date, expiry, last activity.
5. Clicks "Review" on a card → `openRecipientProposalAction` → redirected to `/share/[token]`.
6. Reviews the proposal, makes a decision (Accept/Decline/Request Revision).
7. Returns to inbox (browser back) → decision chip reflects the choice after refresh.

### Journey B — Recipient searches for a specific proposal
1. Recipient has many proposals from multiple workspaces.
2. Types in the search bar → instant filter by project name, workspace, or project code.
3. Switches to "Decision submitted" tab to see only proposals they've already decided on.
4. Switches to card view (from list view) for a visual scan.

### Journey C — Recipient sees expired/revoked proposals
1. Recipient opens the inbox.
2. Switches to "Expired" or "Revoked" tab.
3. Sees cards with disabled "Review" buttons and "can no longer be reviewed" copy.
4. No token leak; no enumeration signal.

### Journey D — Empty state (no proposals)
1. New recipient signs in, has no proposals yet.
2. Sees a glass-card empty state (matching projects page pattern): icon, "No proposals yet", explanation that the inbox is keyed to their email, and a secondary "Not seeing a proposal? It may have been sent to a different email." line.

---

## 3. Screen Layout (Target)

```
WorkshopLayout
  └── WorkshopShell
        ├── MainSidebar (Proposals nav item, ⌘4)
        └── content section
              └── WorkshopRouteHeader (title "Proposals", breadcrumb, notifications, settings)
                    └── WorkshopCanvasWash
                          └── Suspense → ProposalsData (server fetch)
                                └── ProposalsPageClient (TanStack Query)
                                      └── WorkshopCollectionLayout
                                            ├── TreePanelHeader
                                            │     ├── Search input ("Search proposals")
                                            │     └── Toolbar: view-mode dropdown, sort dropdown
                                            ├── ProposalStatusTabs (toolbarPanel)
                                            │     All / New / Opened / Decision / Expired / Revoked
                                            └── Content
                                                  ├── ProposalCard[] (card grid)
                                                  │     OR ProposalListRow[] (list mode)
                                                  │     OR ProposalGroupSection[] (when grouping)
                                                  ├── ProposalCardGridSkeleton (loading)
                                                  ├── ProposalSearchEmptyState (no search results)
                                                  └── ProposalStatusEmptyState (no status results)
```

---

## 4. Component Design

### 4.1 ProposalStatusTabs

Mirror `ProjectStatusTabs` but with proposal-specific statuses:

| Tab | Filter | Count badge |
|---|---|---|
| All | (no filter) | total count |
| New | `status === "published" && !hasOpened && !decision` | count |
| Opened | `status === "published" && hasOpened && !decision` | count |
| Decision | `decision !== null` | count |
| Expired | `status === "expired"` | count |
| Revoked | `status === "revoked"` | count |

Uses `Tabs` with `variant="underline"` from `src/components/ui/tabs.tsx`.

### 4.2 ProposalCard (card mode — primary)

Mirrors `LiveProjectCard`'s glass-card visual language but with proposal-specific
content. Two-layer translucent card:

```
┌─────────────────────────────────────────┐
│  [hover: no controls — read-only]       │
│  ┌───────────────────────────────────┐  │
│  │  WORKSPACE NAME         [status]  │  │
│  │  Project Name                      │  │
│  │  [code] · v3 · Sent Jul 8          │  │
│  │  From Sender Name                  │  │
│  │                                    │  │
│  │  [decision chip] [expiry chip]     │  │
│  │  Last activity Jul 10              │  │
│  │                                    │  │
│  │  ┌─────────┐                       │  │
│  │  │ Review →│                       │  │
│  │  └─────────┘                       │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Card content (top to bottom):**
1. **Workspace name** — uppercase, tertiary color (same as current row).
2. **Status chip** — New/Opened/Decision submitted/Expired/Revoked with icon + tone (same logic as current `getProposalState`).
3. **Project name** — bold, primary text.
4. **Meta line** — project code (if present) · "v{snapshotVersion}" · "Sent {date}".
5. **Sender** — "From {senderDisplayName}" (if present).
6. **Decision chip** — Accepted/Declined/Revision requested (if decision exists).
7. **Expiry chip** — "Expires {date}" (if expiresAt exists and status is published).
8. **Last activity** — "Last activity {date}" in tertiary color.
9. **Review button** — `Button variant="brand" size="sm"`. Disabled when `status !== "published"`. Shows state label when disabled.

**Disabled state:** card has reduced opacity (`bg-surfaceMuted/45`), button shows state label, and a "can no longer be reviewed" note appears.

**Visual classes:** reuse `workshop-project-card-glass` pattern, `group` for hover, `REVEAL_ON_INTENT` pattern if any hover controls (likely none for V1 — read-only).

### 4.3 ProposalListRow (list mode)

A compact horizontal row (mirrors `LiveProjectCard` list mode):
```
[status-icon] Project Name · WORKSPACE    [chips]    Sent Jul 8    [Review →]
```

Single-line scan: status icon, project name, workspace (uppercase), status/decision chips, sent date, review button.

### 4.4 View Mode Toggle

- **Cards** (default) — auto-fill grid: `grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-3`
- **List** — single-column divided rows

Persisted to localStorage under `archestimator_proposals_view_mode_v1`.
Synced across tabs via `useSyncExternalStore` + custom events (same pattern as projects).

### 4.5 Sort Dropdown

Sort field options:
- Last activity (default, desc)
- Sent date (desc/asc)
- Project name (asc/desc)

Sort direction toggle with smart labels ("Newest first" / "A to Z").

### 4.6 Grouping (Optional)

Group-by dropdown:
- None (default)
- Workspace
- Status

When grouped, proposals are wrapped in `ProposalGroupSection` (mirrors `ProjectGroupSection`) — a collapsible section with a header showing the group name and count.

### 4.7 Search

Instant text search across: `projectName`, `workspaceName`, `projectCode`, `senderDisplayName`.
Uses `useDeferredValue` for non-blocking filtering (same as projects page).
Label: "Search proposals".

### 4.8 Empty States

**No proposals at all (genuine empty):**
Glass card (not dashed-border) with envelope icon, "No proposals yet", explanation, and secondary line: "Not seeing a proposal? It may have been sent to a different email." (absorbed from IA recovery plan).

**No search results:**
Glass card with magnifying-glass icon, "No search results for '{query}'", "Clear search" button.

**No status results:**
Glass card with folder icon, "No {status} proposals yet.", "Show all proposals" button.

### 4.9 Loading State

`ProposalCardGridSkeleton` — mirrors `ProjectsListSkeleton`: 8 skeleton cards in the large-card grid layout, plus skeleton search bar and toolbar row.

### 4.10 Error States

**Soft error (refresh failed):** inline amber banner with `WarningCircle` icon, message, and Retry button (same as current).

**Hard error (no data):** `ProposalsErrorState` — but restyled to match the projects page error pattern (centered card, not full-width).

---

## 5. Data Flow (Target)

**Preserve the current SSR-seed + TanStack Query pattern** (DEC-AUTO-002):

1. `ProposalsData` (server component) calls `listRecipientProposals()` and seeds `ProposalsPageClient` with `initialResult`.
2. `ProposalsPageClient` uses TanStack Query for refreshes (30s staleTime, window-focus refetch).
3. **Client-side filtering/sorting** — a `useReducer` (like `projectsPageClientReducer`) holds: search query, active status tab, sort field/direction, view mode, group-by. All filtering happens on the cached `rows` array.
4. No server-side filtering needed for V1 (≤50 rows).

---

## 6. Accessibility

- **Keyboard:** all CTAs (Review, Retry, search, tabs, dropdowns) are native buttons/inputs → Tab/Enter operable.
- **Focus management:** preserve existing `focusRetryAfterFailureRef` behavior. New CTAs must not move focus unexpectedly.
- **Screen-reader:** status chips carry text labels (not color-only). Cards use semantic `<article>` + `<h2>`. Tabs use the `Tabs` primitive's ARIA roles.
- **Non-color cues:** status chips carry icons + text labels in addition to color tones.
- **Reduced motion:** no new animations. `motion-reduce:transition-none` on any transitions.
- **Color contrast:** reuse existing color tokens (no new contrast risk).

---

## 7. Responsive Behavior

- **Desktop (md+):** card grid with auto-fill, 3-column metadata layout in cards.
- **Tablet (sm-md):** card grid with smaller min width, metadata wraps.
- **Mobile (<sm):** single-column cards, compact metadata, full-width Review button.
- List mode: single-column on all breakpoints.
- No new breakpoints; reuse Tailwind tokens.

---

## 8. Design-System Reuse

| Component | Source | Reuse for proposals |
|---|---|---|
| `WorkshopCollectionLayout` | `src/components/workshop/WorkshopCollectionLayout.tsx` | Primary shell — search + toolbar + tabs + content |
| `TreePanelHeader` | `src/components/ui/tree-panel-header.tsx` | Search + toolbar row |
| `Tabs` / `TabItem` | `src/components/ui/tabs.tsx` | Status tabs (`variant="underline"`) |
| `DropdownSelect` | `src/components/ui/dropdown-select.tsx` | View-mode, sort, group-by controls |
| `Button` | `src/components/ui/button.tsx` | Review button (`variant="brand"`), Retry, Clear search |
| `Skeleton` | `src/components/ui/skeleton.tsx` | Loading state |
| Glass-card classes | `workshop-project-card-glass` pattern | Card visual language |

**No new UI primitives needed for V1.** All controls reuse existing components.

---

## 9. UX Regressions to Avoid

- Do not remove the existing retry-focus behavior (`focusRetryAfterFailureRef`).
- Do not remove the window-focus refetch (TanStack Query `refetchOnWindowFocus: true`).
- Do not change the `openRecipientProposalAction` server-action form pattern.
- Do not expose the publication token in any client-visible state.
- Do not make disabled (expired/revoked) proposals look identical to active ones — the status chip and disabled button must clearly differentiate.
- Do not add owner-side affordances (create, edit, delete, DnD, favorites) to the recipient inbox.
