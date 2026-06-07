# UI/UX and Accessibility Plan: Archives Feature

This document defines the user experience, visual design, and accessibility requirements for the Archestimator Archives feature.

## User Journeys

1. **Archiving a Project**: A user wants to declutter their project list. They select "Archive" from a project card, confirm the action in a non-destructive modal, and the project moves to the "Archived" tab.
2. **Restoring a Project**: A user needs to access an old project. They switch to the "Archived" tab, find the project, and click "Restore". The project returns to its original tab ("Your Projects" or "Projects shared to you").
3. **Discovering Archived Projects**: A user looks for a missing project and finds it by switching to the "Archived" tab in the navigation.

## Screen and Component Impact

- **Projects Page (`src/app/workshop/projects/page.tsx`)**: Server wrapper — passes new `includeArchived` parameter. The client component `src/components/workshop/projects-page-client.tsx` preserves existing "Your Projects"/"Projects shared to you" tabs and adds a third "Archived" tab.
- **LiveProjectCard (`src/components/workshop/LiveProjectCard.tsx`)**: Added "Archive" action to the overflow menu or as a secondary action.
- **ArchivedProjectCard**: A variant of the project card for the Archived tab, featuring a "Restore" action.
- **BulkActionToolbar**: Updated to include "Archive" (in default/non-Archived tabs) and "Restore" (in Archived tab) actions.
- **ProjectDetailsModal**: Added "Archive" button to the settings or header area.

## Information Architecture

The project list will use a tabbed interface following the existing pattern in the application:
- **Existing Tabs**: "Your Projects" and "Projects shared to you" remain unchanged.
- **New Tab (Archived)**: Added as a third top-level tab.
- **Implicit Active Filter**: The existing tabs show projects where `archived_at` IS NULL (active only).
- **Archived Tab**: Displays projects where `archived_at` IS NOT NULL.

## Entry Points

### Archive Actions
- **Individual**: "Archive" option in the `LiveProjectCard` menu.
- **Bulk**: "Archive" button in the `BulkActionToolbar` when one or more projects are selected in a default (non-Archived) tab.
- **Detail**: "Archive Project" button within the `ProjectDetailsModal`.

### Restore Actions
- **Individual**: "Restore" button on the project card within the Archived tab.
- **Bulk**: "Restore" button in the `BulkActionToolbar` when one or more projects are selected in the Archived tab.

## States

- **Empty (Archived)**: "No archived projects. Projects you archive will appear here."
- **Loading**: Skeleton states for project cards during tab switching or initial load.
- **Success**: Toast notification: "Project [Name] archived" or "Project [Name] restored".
- **Error**: Toast notification: "Failed to archive project. Please try again."

## Keyboard and Focus Behavior

- **Tab Navigation**: Use arrow keys to move between tabs including the "Archived" tab (W3C APG pattern).
- **Focus Return**: After closing an archive/restore modal, focus must return to the button that triggered it.
- **List Updates**: When a project is archived, focus should move to the next item in the list or the tab itself if the list becomes empty.

## Accessibility Requirements

- **ARIA Semantics**: Use `role="tablist"`, `role="tab"`, and `role="tabpanel"`.
- **Descriptive Labels**: Archive/restore buttons must include the project name (e.g., `aria-label="Archive Project Alpha"`).
- **Status Announcements**: Use an `aria-live="polite"` region for success/failure messages.
- **Visual Cues**: Do not rely on color alone to indicate archived state. Use a "Archived" badge or icon.
- **Modals**: Implement focus traps and ensure the `Escape` key dismisses the confirmation modal.

## Copy and Content

- **Archive Confirmation**:
  - Title: "Archive project?"
  - Body: "This project will be moved to the Archived tab. You can restore it at any time."
  - Action: "Archive" (Neutral styling)
- **Restore Confirmation**:
  - Title: "Restore project?"
  - Body: "This project will be moved back to your Active projects list."
  - Action: "Restore"
- **Empty Archived State**: "No archived projects" with a hint about how to archive.

## Design System Alignment (CRITICAL)

Follow `DESIGN.md` constraints strictly:
- **Typography**: SF Pro font. Regular/Medium weights only.
- **Font Sizes**: 12px max for headings, 10px for body/controls, 8-9px for labels.
- **Spacing**: Zero letter spacing.
- **Border Radius**: `rounded-xs` (3px) only.
- **Icons**: Phosphor regular outline style.
- **Colors**:
  - Strong: `#292929`
  - Default: `#5D5D5D`
  - Subtle: `#7F7F7F`
- **Primitives**: Reuse `src/components/ui` (Button, Badge, Modal, Toast). Do not write raw Tailwind classes for standard components.

## Archive vs. Delete Distinction

| Feature | Archive | Delete |
|---------|---------|--------|
| **Visual Style** | Neutral / Subtle | Danger / Red |
| **Confirmation** | Simple click ("Archive") | Typed phrase ("DELETE PROJECT") |
| **Data Impact** | Hidden from view (Reversible) | Permanently removed (Irreversible) |
| **Copy** | "Archive project?" | "Permanently delete project?" |
