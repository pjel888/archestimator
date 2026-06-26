# 18 — Implementation Plan

> **Improve-Plan pass (2026-06-25)**: Phase 1 ships as one bundle behind feature flag `NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1`. Per-task rollout and rollback paths are specified in [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md). Phase 1 telemetry events needed to verify the fixes are specified in [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md).

## Phase 1: Persistence Honesty (P1 findings)

### Task 1.1: Wire component Delete to server-side archive
- **Finding**: F-01, F-06
- **Files**: `src/components/workshop/component-library/index.tsx` (delete handlers), `src/lib/component-library/actions.ts` (`executeBulkArchiveLibraryComponents` already exists)
- **Current**: `setLibraryItems(filter)` + `onLibraryDataChanged()` (false signal)
- **Desired**: Call `executeBulkArchiveLibraryComponents({ itemIds, expectedPreviewHash })` → on success, toast "archived" + `onLibraryDataChanged()`. Keep Undo as "Restore" which calls `changeCostLibraryComponentLifecycleState({ lifecycleState: "available" })`.
- **Tests**: integration test: delete → refresh → item not visible; undo → refresh → item visible.
- **Complexity**: M

### Task 1.2: Remove legacy NewComponentForm; route Edit through AddComponentModal
- **Finding**: F-03, F-05
- **Files**: `src/components/workshop/component-library/index.tsx`, `src/components/workshop/component-library/NewComponentForm.tsx` (delete or repurpose), `src/components/workshop/component-library-manager/AddComponentModal.tsx` (add edit mode)
- **Current**: Edit opens `NewComponentForm` pre-filled; save calls `createComponent()` (local-only)
- **Desired**: Edit opens `AddComponentModal` in edit mode; save calls `updateCostLibraryComponent`. All variant/attachment/history data preserved.
- **Complexity**: M

### Task 1.3: Wire Duplicate to server-side create
- **Finding**: F-03, F-05
- **Files**: `src/components/workshop/component-library/index.tsx`
- **Current**: `createComponent()` → local append
- **Desired**: Open `AddComponentModal` pre-filled with the component's fields + "(copy)" suffix on name. User reviews and saves → `createCostLibraryComponent`.
- **Complexity**: S

### Task 1.4: Replace "Live source" / "Read-through source" chips
- **Finding**: F-11
- **Files**: `src/components/workshop/component-library/index.tsx` (lines 517-523)
- **Current**: Chips say "Live source" and "Read-through source"
- **Desired**: Replace with "Snapshot copy" chip. On insert, toast: "Inserted a copy of [source name]. Changes to the source will not propagate."
- **Complexity**: S

### Task 1.5: Remove "New Template Group" affordance
- **Finding**: F-10
- **Files**: `src/components/workshop/component-library/index.tsx`
- **Current**: Toolbar button opens a name input → `customTemplateGroups` local append
- **Desired**: Remove the button entirely. Categories emerge from template creation. Existing `customTemplateGroups` state can be removed.
- **Complexity**: S

### Task 1.6: Add request-identity guard to project-source search
- **Finding**: F-04
- **Files**: `src/components/workshop/component-library/index.tsx`
- **Current**: search effect fires `searchReusableProjectSources` with no cancellation
- **Desired**: Stamp each request with a monotonic id; on response, check `if (requestId !== latestRequestId) return;` before writing to `projectSourceSearchResults`. Or use `AbortController`.
- **Tests**: deferred resolution in reverse order test.
- **Complexity**: S

## Phase 2: Terminology + UX Corrections (P2 findings)

### Task 2.1: Rename Project tab to "Project Components"
- **Finding**: F-02
- **Complexity**: S (string change)

### Task 2.2: Add folder Delete to sidebar context menu
- **Finding**: F-09
- **Files**: `src/components/workshop/component-library/tree/LibraryTree.tsx` (add delete action), `src/lib/component-library/actions.ts` (`deleteLibraryFolder` already exists)
- **Complexity**: S

### Task 2.3: Add "Manage in Library" deep link
- **Finding**: F-09 (alternative to 2.2)
- **Complexity**: S

### Task 2.4: Persist panel collapse state
- **Finding**: F-12 (partial)
- **Complexity**: S

## Phase 3: Accessibility + Performance (P2/P3 findings)

### Task 3.1: Increase hit target sizes to WCAG minimum
- **Finding**: 12-UX-UI-ACCESSIBILITY-AUDIT.md
- **Complexity**: S

### Task 3.2: Use thumbnailPath for sidebar images
- **Finding**: 14-PERFORMANCE-AUDIT.md
- **Complexity**: S

### Task 3.3: Extract giant reducer into tab-scoped hooks
- **Finding**: F-13
- **Complexity**: L

### Task 3.4: Add hover-prefetch dedup
- **Finding**: F-15
- **Complexity**: S

### Task 3.5: Fix folder-rename focus race
- **Finding**: F-14
- **Complexity**: M

## Phase 4: Mobile/tablet access (future)

### Task 4.1: Add responsive sidebar drawer for below-1024px
- **Finding**: F-12
- **Complexity**: XL
