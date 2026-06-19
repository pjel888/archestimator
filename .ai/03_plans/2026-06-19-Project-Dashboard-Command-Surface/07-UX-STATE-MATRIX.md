# UX State Matrix

Date: 2026-06-19
Status: required before UI implementation

## Surface Material Map

| Zone | Material | Rules |
|---|---|---|
| Route shell | Existing workshop canvas/glass | No route-local white slab. |
| Identity rail | Glass chrome with flat controls | Preserve edit behavior; no nested blur. |
| Workbench shell | One glass owner | Children use transparent/plain rows or paper only for legibility. |
| Recent sheets | Plain ledger rows | Dense, focusable, no card grid. |
| Current published link | Compact status row/panel | One primary action, one secondary manage path. |
| Estimate activity | Plain timeline rows | Day grouping only when useful. |
| Location | Text controls plus optional map viewport | Map is a viewport, not decorative background. |

## Phase 1 Placeholder Rules

| Slot | Phase 1 behavior |
|---|---|
| Recent sheets | Real data or real empty state. |
| Current published link | Real current-publication status or unpublished state. |
| Estimate activity | May be hidden or show honest "Estimate activity arrives in the next slice" copy. No fake events. |
| Location | Shows address context and "No exact pin saved" when coordinates are absent. No fake map or pin. |

## Recent Sheets

| State | Visible content | Actions | Accessibility |
|---|---|---|---|
| Loading | 3-5 skeleton ledger rows | None | `aria-busy` on module. |
| Empty | "No estimate sheets yet" plus create/open-estimates action | One primary route to estimates | Native link/button. |
| Rows | Sheet name/code, updated time, optional project context omitted because route is project-scoped | Open row link | Row link has accessible name with sheet and updated time. |
| Missing deep link | Same row content | Link to estimate-level fallback | Do not hide row. |
| Deleted/stale route | Row omitted if source query excludes it; otherwise disabled stale copy | Manage/open estimates | Non-color stale label. |
| Error | Compact inline retry/copy | Retry if client-side, otherwise link to estimates | Error text is readable, not icon-only. |

## Current Published Link

| State | Visible content | Primary action | Secondary action |
|---|---|---|---|
| Loading | Skeleton status line and action slots | None | None |
| Unpublished | "No client link published" | Manage/create link | None |
| Published active | Current link state, selected estimate count, password badge, open count/timestamp when present | Copy link | Open link, manage |
| Published no opens | Same as active, "No opens yet" | Copy link | Manage |
| Password-enabled | Password badge, no password value | Copy link | Manage |
| Revoked/expired/stale | Clear inactive/stale label | Manage | Open/copy hidden or disabled |
| Copy success/error | Inline feedback and polite live region | Retry copy on error | Manage |

Recipient email/display name is hidden by default. Showing it requires a new product decision.

## Estimate Activity

| State | Visible content | Actions | Notes |
|---|---|---|---|
| Not implemented in Phase 1 | Honest deferred copy or omitted module | None | Must not look broken. |
| Loading | Timeline skeleton rows | None | Does not block other modules. |
| Empty | "Activity appears after estimate edits" | Optional link to estimates | One row, not a card. |
| Rows | Time, event label, actor label, sheet code/name, compact summary | Optional row link | No raw ids or payloads. |
| More pages | `Load more` row | Load more | Pending and terminal states defined. |
| Actor unknown/deleted | "Unknown user" or "System" | None | Do not expose email fallback unless approved. |
| Deleted/renamed sheet | Historical label if available | Optional safe fallback link | No broken link. |
| Error | Inline recovery copy | Retry | No raw database error. |

Module label should be "Estimate activity" unless share/collaboration activity is later added.

## Location

| State | Visible content | Actions |
|---|---|---|
| No address/no pin | "No project address or exact pin" | Edit project details; set pin only in Phase 3 |
| Address-only | Address text and "No exact pin saved" | Set exact pin in Phase 3 |
| Exact pin saved | Coordinates/address text and map when enabled | Edit pin, clear pin |
| Edit mode | Map click/drag when available, coordinate fields or keyboard alternative | Save, cancel, clear |
| Dirty/unsaved | Unsaved indicator | Save/cancel |
| Save pending | Disabled save with pending feedback | Cancel only if safe |
| Save error | Field-level error | Retry/cancel |
| Bad coordinates | Validation message | Correct fields |
| Map disabled | Text coordinate/address panel | Edit with fields if authorized |
| Tile/style failure | Text coordinate/address panel and provider error copy | Retry/disable map |
| No WebGL | Text coordinate/address panel | Edit with non-map controls |
| Attribution constrained | Attribution remains visible or map does not render | None |

## Accessibility Contract

- Module names are stable accessible names: `Recent sheets`, `Published link`, `Estimate activity`, `Location`.
- Focus order follows visual reading order on desktop and mobile.
- Copy/save feedback uses polite live regions.
- Permission, validation, and provider failures are text-first.
- Map read/save is never pointer-only.
- Reduced transparency uses solid surface fallbacks.
- Reduced motion removes transform choreography that is not needed for state.
