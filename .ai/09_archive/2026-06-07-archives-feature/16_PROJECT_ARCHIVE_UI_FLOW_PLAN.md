# Project Archive UI Flow Plan

**Date:** 2026-06-07 | Phase 1 | Plan: `.ai/03_plans/2026-06-07-archives-feature/`

## Information Architecture

**Preserve** existing "Your Projects" / "Projects shared to you" tabs. **Add** "Archived" as a third top-level tab. The existing tabs implicitly show active projects only (WHERE archived_at IS NULL). The Archived tab shows all archived projects accessible to the current user (owned + shared, WHERE archived_at IS NOT NULL).

## Archive Entry Points

| Entry | Component | Action |
|-------|-----------|--------|
| Card menu | `src/components/workshop/LiveProjectCard.tsx` | "Archive" option in overflow menu |
| Detail modal | `src/components/workshop/ProjectDetailsModal.tsx` | "Archive Project" button |
| Bulk toolbar | `src/components/workshop/BulkActionToolbar.tsx` | "Archive Selected" when projects selected in existing tabs |

## Restore Entry Points

| Entry | Component | Action |
|-------|-----------|--------|
| Archived card | `LiveProjectCard` in Archived tab | "Restore" button |
| Bulk toolbar | `BulkActionToolbar` in Archived tab | "Restore Selected" |

## Confirmation Modal

Reuse `BulkDestructivePreviewModal` pattern with **non-destructive** styling:
- Title: "Archive project?" (or "Archive N projects?")
- Body: "This project will be moved to the Archived tab. You can restore it at any time."
- Button: "Archive" (neutral #5D5D5D, NOT danger/red)
- **Simple confirm button** — NOT typed phrase. Typed confirmation reserved for destructive delete.

## Restore Modal

- Title: "Restore project?"
- Body: "This project will return to your project list."
- Button: "Restore"

## States

| State | Behavior |
|-------|----------|
| Empty Archived | "No archived projects. Projects you archive will appear here." |
| Loading | Skeleton cards during tab switch/initial load |
| Success | Toast: "Project [Name] archived" / "Project [Name] restored" |
| Error | Toast: "Failed to archive project. Please try again." |
| Unauthorized | Preview shows 0 eligible with "forbidden" issues |
| Stale preview | Execute returns stale_preview; user must re-run preview |

## Route Guards

- Direct URL to archived project: redirect to `/workshop/projects` with "Project Archived" notice
- Estimate routes under archived project: redirect with notice
- Chart route under archived project: redirect with notice

## Cross-Cutting Behavior

| Feature | Behavior when Project Archived |
|---------|-------------------------------|
| Homebase/recent | Excluded |
| Favorites | Hidden; re-appear on restore |
| Pending invites | Preserved; invite acceptance blocked |
| Shared links | Paused — show "Project Archived" |
| Collaboration lists | Archived projects hidden |
| AI read context | Excluded |

## Keyboard & Accessibility

- Tab navigation: arrow keys between all tabs including "Archived"
- Focus: returns to trigger element after modal close
- aria-live="polite" for archive/restore status messages
- aria-label includes project name (e.g., "Archive Project Alpha")
- Focus trap in confirmation modal; Escape dismisses

## Design System (BLOCKING)

- SF Pro, regular/medium only, 12px max, 10px controls, 8-9px labels
- Zero letter-spacing, rounded-xs/3px
- Phosphor regular outline icons
- Reuse `src/components/ui` primitives (Button, Badge, Modal, Toast)
- `bun run lint:design-system` must pass
