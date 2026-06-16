---
title: Project Card Favorite Sheet Links
type: fix
date: 2026-06-16
---

# Project Card Favorite Sheet Links

## Summary

Update the `/workshop/projects` project card hover overlay so favorite estimate sheets read as direct sheet links, while keeping the visual favorite affordance reduced to the star icon.

## Problem Frame

The current large-card hover overlay labels the tray as "Favorite sheets" and renders sheet names as static text. Users expect the revealed favorite sheets to open the estimate sheets themselves, and the label text adds extra chrome in an already compact card.

## Requirements

- R1. The hover favorite-sheet tray retains the star icon as the only favorite-section marker.
- R2. Each visible favorite estimate sheet in the tray is a keyboard-focusable link to `/workshop/projects/<project_id>/estimates/<estimate_id>`.
- R3. The overlay preserves the existing card reveal behavior, visible sheet cap, empty-state behavior, and project Open navigation.
- R4. The change follows the existing SF Pro, 3px radius, neutral workshop design language.

## Key Technical Decisions

- **Use existing route shape:** Link favorite sheets to the estimate detail route already used elsewhere in the app, falling back to the estimate id as the route node id.
- **Keep the overlay local:** Limit implementation to `src/components/workshop/LiveProjectCard.tsx`; no repository or database changes are needed because favorite sheet summaries already include `id`, `project_id`, and display metadata.
- **Extend focused card tests:** Update existing project card tests rather than adding a broad browser suite for the same rendering contract.

## Implementation Units

### U1. Convert favorite sheet rows into links

- **Goal:** Replace static favorite sheet names in the tile hover overlay with `next/link` links and remove the text label beside the star icon.
- **Files:** Modify `src/components/workshop/LiveProjectCard.tsx`.
- **Patterns:** Follow the existing `Link` usage and compact focus-visible classes in the same component.
- **Test scenarios:** Favorite sheets render without the "Favorite sheets" label in tile hover; visible sheet names expose `link` roles with estimate-sheet hrefs; empty trays remain hidden/empty.
- **Verification:** Focused Vitest for project card layout/view-mode plus `bun run type-check` and `git diff --check`.

## Scope Boundaries

- No changes to favorite persistence, favorite sorting, favorite limits, project list data fetching, or estimate route behavior.
- No visual redesign of the project card beyond the requested hover overlay affordance.
