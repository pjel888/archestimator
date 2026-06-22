# 08 — UX Interaction State Spec

## Layout boundary

| Context | MVP behavior |
|---|---|
| Expanded desktop sidebar | Shows Favorites header, favorite projects, nested favorite sheets, overflow line when derivable, empty hint when zero items. |
| Collapsed desktop sidebar | Preserve current behavior. Favorites tree does not render while collapsed. Header star remains visible at icon-column position. |
| Tablet/mobile | Preserve current route behavior. Do not squeeze the desktop favorites tree into mobile. |
| Dimensions | Preserve current `SIDEBAR_WIDTH_EXPANDED` / `SIDEBAR_WIDTH_COLLAPSED` / `SIDEBAR_PADDING` constants. Do not mix a width refactor into this task. |

---

## States

| State | Behavior | Accessibility/test expectation |
|---|---|---|
| Hydrating (client mount, query pending) | Render skeleton rows matching last-known `initialData` row count at the existing row height (`h-7`). If `initialData` is `undefined`, render nothing (no skeleton, no empty hint). NEVER show the empty hint before the query settles. | Skeleton rows are `aria-hidden="true"`. No live-region announcement. |
| Empty (query settled, zero results) | Remove skeleton. Show single-line hint: `Star a project to pin it here.` at project-depth indent. | Hint is static in-place copy, not a live-region. Not re-announced on re-render. |
| Has projects | Render up to 8 projects by `favoriteCreatedAt DESC`. Trim BEFORE inserting the new optimistic item. | Project links are keyboard focusable. Active link carries `aria-current="page"`. |
| Has sheets | Render up to 5 sheets per visible project by `favoriteCreatedAt DESC`. Always-expanded beneath parent — no per-project collapse affordance in MVP. Trim BEFORE inserting the new optimistic sheet. | Sheet links have distinct `href` and `title` values. `aria-current="page"` on the active sheet. |
| Overflow: projects | If the hidden count is honestly derivable from query data (`totalFavoriteProjectCount - 8`), show a non-interactive muted line `+[N] more` with inline text link `go to Projects` → `/workshop/projects`. If the count cannot be derived without an extra fetch, omit the line entirely — never invent a count. | `data-sidebar-favorite-project-overflow`. Not a link itself; only the inline phrase is a link. |
| Overflow: sheets | Same rule per project. Muted non-interactive line `+[N] more` beneath visible sheet rows when count is derivable. | `data-sidebar-favorite-sheet-overflow`. |
| Project pending (optimistic insert) | New project row inserts at TOP of list. Fade in (`opacity 0→1`, 120ms `ease-out`, no translate). Pre-allocate `h-7` before fade so no layout shift occurs. Trim list to 8 before/with insert. Star has `aria-pressed` set to optimistic value and `aria-busy="true"`. No visible text change on the sidebar item during pending. | Motion suppressed entirely under `prefers-reduced-motion`. |
| Project pending (optimistic remove) | Row fades out (100ms). Focus management rule applies — see Focus Management section. | Motion suppressed under `prefers-reduced-motion` (instant removal). |
| Estimate pending (optimistic insert, parent visible) | New sheet row inserts at TOP of parent's sheet list. Same fade-in and height pre-allocation as project insert. Trim to 5 before/with insert. | `aria-pressed` + `aria-busy="true"` on star. |
| Estimate pending (optimistic insert, parent non-favorited) | Row star updates (optimistic). Sidebar DOES NOT change. Advisory live-region fires: `Estimate favorited. Favorite the project to pin it in the sidebar.` | `data-sidebar-favorites-status` live region. Message cleared after 6 s. |
| Estimate pending (optimistic insert, parent favorited outside top-8) | Row star updates. Sidebar unchanged until parent enters visible set. No live-region for this case — sidebar silence is correct behavior per D5. | No announcement. |
| Failure (project or estimate) | Roll back every touched surface to pre-mutation state. Assertive live region fires: `Could not update favorite. Try again.` | `data-sidebar-favorites-alert` live region. Message cleared after 6 s. Color alone does not carry the error signal. |
| Reconcile (onSettled refetch) | Fresh server data replaces optimistic timestamp. List may reorder. No flash to empty during normal reconciliation. | No live-region on routine reconcile. |
| Unfavorite active route | Active item is removed immediately (optimistic). `aria-current` is not emitted for an unrendered link — no ghost entry. Page content is unaffected. If removal empties the section, the empty hint appears. Focus management rule applies. | QA-21. |

---

## Focus management

**Applies whenever an optimistic update or rollback removes a currently-focused favorite link.**

1. On removal, scan remaining `data-sidebar-favorite-project` and `data-sidebar-favorite-sheet` links in DOM order.
2. Move focus to the nearest remaining link **above** the removed item in DOM order.
3. If no link exists above it, focus the nearest remaining link **below**.
4. If the list is now empty, move focus to the Favorites section header element (give it `tabIndex={-1}` as a permanent focus-rescue target; it is not in the natural tab sequence).
5. Focus must never escape to `<body>`.

**Unfavorite-the-currently-active-route case:** the active item is removed optimistically (step 1 above applies). There is no ghost entry. `aria-current` is simply absent from an unrendered link. The page route does not change and page content is unaffected. Focus follows the steps above.

QA scenario: QA-18 (focus survival after optimistic remove), QA-21 (active-route unfavorite).

---

## Live-region architecture

Two separate live-region containers must be rendered inside the Favorites section, always present in the DOM regardless of state:

```
<!-- advisory: polite, for D5 estimate-under-non-favorited-project cue and similar -->
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  data-sidebar-favorites-status
  class="sr-only"
/>

<!-- failure: assertive, for mutation error -->
<div
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
  data-sidebar-favorites-alert
  class="sr-only"
/>
```

**Rules:**

| Rule | Detail |
|---|---|
| Polite message lifetime | Write message text, clear after ~6 s via `setTimeout`. |
| Assertive message lifetime | Write message text, clear after ~6 s via `setTimeout`. |
| Rapid toggles (polite) | Clear the previous polite message text to empty before writing the new one. This prevents screen readers from queuing stale messages. |
| Empty hint | Static in-place copy. NOT a live-region announcement. |
| Routine reconcile | No live-region text. |
| Skeleton / hydrating | No live-region text. |

**Required message copy:**

| Trigger | Region | Copy |
|---|---|---|
| Estimate favorited, parent not favorited (D5) | `data-sidebar-favorites-status` (polite) | `Estimate favorited. Favorite the project to pin it in the sidebar.` |
| Mutation failure, any surface | `data-sidebar-favorites-alert` (assertive) | `Could not update favorite. Try again.` |

QA scenario: QA-20 (SR dedup / no stacking on rapid toggle).

---

## Loading / hydration state

- `initialData` is populated from SSR props via `D3` / `D4` boundary.
- If `initialData` is defined: render skeleton rows (non-interactive, `aria-hidden="true"`) at `h-7` height matching the `initialData` item count, until the client query resolves.
- If `initialData` is `undefined`: render nothing in the favorites list area until the query resolves.
- The empty hint MUST NOT render until the query has settled with a confirmed zero-result response.
- Skeleton rows must match the existing row height and indent of live rows so no layout shift occurs on transition from skeleton to live data.

QA scenario: QA-17 (loading/skeleton check — no premature empty hint).

---

## Optimistic insert position and animation

| Property | Value |
|---|---|
| Insert position | TOP of list (timestamp DESC; new optimistic `favoriteCreatedAt = new Date().toISOString()` sorts above existing rows) |
| Trim timing | Trim list to cap (8 projects / 5 sheets per project) BEFORE or simultaneously with insert. List must never visibly show >8 / >5. |
| Fade in | `opacity: 0 → 1`, duration 120ms, `ease-out`. No translate. |
| Fade out (remove) | `opacity: 1 → 0`, duration 100ms. |
| Height | Pre-allocate `h-7` before opacity animation begins (no layout shift). |
| prefers-reduced-motion | Suppress all opacity transitions. Apply state change instantly. |
| Animation libraries | None. CSS transitions only. `motion-reduce:transition-none` utility consistent with existing sidebar pattern. |

---

## Nested sheet display

Sheets are **always-expanded** beneath their parent project row in MVP. There is no per-project collapse affordance. No expand/collapse toggle is added to project rows. Sheet rows indent to `pl-[52px]` (matching existing `getFavoriteLinkClassName` for depth `"sheet"`).

---

## Error and pending placement

| Signal | Placement |
|---|---|
| Pending (aria) | `aria-busy="true"` on star. `aria-pressed` reflects optimistic state. |
| Pending (visual) | Star's own visual affordance (existing). No sidebar text change. No spinner or inline banner. |
| Error copy | Assertive live region only (`data-sidebar-favorites-alert`). No inline sidebar banner. No toast outside the live region. |

---

## Empty-state visual spec

| Property | Value |
|---|---|
| Copy | `Star a project to pin it here.` |
| Depth / indent | Project depth — `pl-3` (matches `getFavoriteLinkClassName` project-depth left padding) |
| Font size | `text-[9px]` — matches existing favorite label size |
| Color | `#7F7F7F` (`text-tertiary`) — passive instructional copy; AA-exempt per DESIGN.md |
| Font weight | `font-normal` (400) |
| Leading | `leading-none` |
| Padding bottom | `pb-2` to match the existing list's bottom padding |
| Interactive | No. Non-interactive static text. |
| Live region | No. |

---

## Star color and semantic clarity

| Element | Color | Rationale |
|---|---|---|
| Favorites section header star (non-interactive) | `text-warning` (`#B45309`) | Retained from current implementation. Not part of the orange active-nav exception. If amber's cost-risk semantic ambiguity is escalated per DESIGN.md, Philip must approve an explicit token change; do not change autonomously. |
| Favorite link tiles, active (`aria-current="page"`) | `bg-orange-50`, icon/border in orange | Named active-nav exception per DESIGN.md Navigation section. |
| Inactive favorite link tiles | `text-tertiary` / `hover:bg-accent-soft hover:text-primary` | Existing `getFavoriteLinkClassName` neutral resting state. |
| Star button, pending | Existing visual affordance + `aria-busy="true"` | Color alone does not carry pending signal. |

The header star is `aria-hidden="true"` and receives no interactive role or tab stop.

---

## Overflow lines — visual spec

| Property | Value |
|---|---|
| Copy | `+[N] more` with inline linked phrase `go to Projects` for project overflow |
| Font size | `text-[9px]` |
| Color | `text-tertiary` (`#7F7F7F`) |
| Interactive | The surrounding line is not a link; only the `go to Projects` phrase is an `<a>` linking to `/workshop/projects` |
| Depth | Project-depth indent (`pl-3`) for project overflow; sheet-depth indent (`pl-[52px]`) for sheet overflow |
| Omission rule | If the hidden count cannot be derived from current query data without an extra fetch, omit entirely |
| Future hook | This line is the deferred entry point for a `/favorites` management surface |

---

## Selectors

| Selector | Element |
|---|---|
| `data-sidebar-favorite-project` | Each project row wrapper `<div>` |
| `data-sidebar-favorite-sheet` | Each sheet `<Link>` |
| `data-sidebar-favorite-project-overflow` | Project overflow muted line |
| `data-sidebar-favorite-sheet-overflow` | Sheet overflow muted line |
| `data-sidebar-favorites-status` | Polite live region (`role="status"`) |
| `data-sidebar-favorites-alert` | Assertive live region (`role="alert"`) |
| `data-sidebar-favorites-header` | Favorites section header element (focus-rescue `tabIndex={-1}` target) |

---

## Interaction rules

- Star controls remain `<button>` elements.
- Do not use color as the only pending or error signal.
- Keep all motion subtle and `prefers-reduced-motion`-safe; mirror the existing `motion-reduce:transition-none` pattern.
- Favorite link active state keeps the existing orange active-nav exception (DESIGN.md Navigation named exception).
- Use app-scale type (`text-[9px]` for sidebar labels) and compact copy throughout.
- The two live-region containers are always mounted; their text content is written and cleared programmatically, not by conditional rendering.

---

## Traceability

New UX requirements introduced or resolved in this revision map to the QA scenarios in
`10-ultraqa-adversarial-scenarios.md` (numbering is authoritative there):

| UX requirement | QA scenario in `10` | Validation |
|---|---|---|
| Loading/hydration state | (component coverage — no standalone QA) | Empty hint must not flash before the query settles; skeleton renders from `initialData` count. Asserted in `main-sidebar-favorites.test.tsx`. |
| Focus management | QA-18 | Focus moves to nearest remaining link, else the Favorites header; never escapes to `<body>`. |
| D5 live-region (required cue) | QA-04 / QA-07 | Polite region fires the required copy when an estimate is favorited under a non-favorited / hidden parent. |
| Live-region dedup | QA-20 | Rapid toggle clears the polite region before writing the next message; no stacking; failure uses the assertive region. |
| Unfavorite active route | QA-21 | Active-route item removed optimistically; no ghost; focus rescued; empty hint shows if needed. |
| Reconcile to server truth on navigation | QA-19 | `staleTime: 0` makes per-route remount/invalidation refetch; no flash to empty during normal reconcile. |
