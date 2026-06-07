# Testing and Verification Plan: Archives Feature

This document outlines the testing strategy and verification steps for the Archestimator Archives feature.

## Existing Test Commands

Use these baseline commands to ensure no regressions:
- `bun run validate`: Full validation suite (lint, typecheck, tests)
- `bun run test:dom`: Vitest DOM component tests
- `bun run test:e2e`: Playwright end-to-end tests
- `bun run lint:design-system`: Design system constraint verification

## Unit Tests

Target: `tests/vitest/projects-page-access-tabs.test.tsx` (extend existing test) and new archive-specific tests in `tests/vitest/`

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| **Active List Exclusion** | Query projects with `archived_at IS NULL` | Archived projects are not returned in default (non-Archived-tab) queries. |
| **Archived List Inclusion** | Query projects with `archived_at IS NOT NULL` | Only archived projects are returned. |
| **Independent Search** | Search for "Project A" in existing tabs vs Archived tab | Search results are scoped to the current tab's filter. |
| **Tab Counts** | Verify count logic for existing tabs and Archived tab | Counts accurately reflect the database state for each filter. |
| **Archive Role Check** | Attempt archive with `can_view` but not `can_edit_project` | Action is rejected with a 403 Forbidden error. |
| **Restore Role Check** | Attempt restore with `can_view` but not `can_edit_project` | Action is rejected with a 403 Forbidden error. |
| **Delete Distinction** | Verify `deleteProject` server action still removes rows | Archive sets a timestamp; Delete removes the record entirely (via `execute_bulk_delete_projects` RPC). |
| **RLS Verification** | Direct SQL update attempt by unauthorized user | Supabase RLS prevents `UPDATE` on `archived_at` for non-editors. |

## Vitest / DOM Tests

Target: `tests/vitest/projects-page-access-tabs.test.tsx` (extend existing test)

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| **Tab Rendering** | Render `ProjectsPageClient` | Existing tabs ("Your Projects"/"Projects shared to you") plus "Archived" tab are visible and accessible. |
| **Archive Trigger** | Click Archive button on `LiveProjectCard` | The `BulkArchivePreviewModal` (or extended `BulkDestructivePreviewModal`) opens with the correct project context. |
| **Modal Content** | Inspect archive confirmation modal copy | Uses non-destructive language: "Archive project?" and "You can restore it later." |

## E2E Tests (Playwright)

Target: `e2e/archives.spec.ts`

- **Archive/Restore Flow**:
  1. Create a new project.
  2. Archive the project via the card menu.
  3. Verify it disappears from the default (non-Archived) tabs.
  4. Switch to the "Archived" tab.
  5. Verify the project appears there.
  6. Restore the project.
  7. Verify it returns to its original tab.
- **Direct Access Redirect**:
  1. Archive a project.
   2. Attempt to navigate directly to `/workshop/projects/[projectId]`.
   3. Verify redirect to `/workshop/projects` with an "Archived" status message (or appropriate detail view handling).

## Verification Commands

- `bun run type-check`: Ensure no type regressions in project interfaces.
- `bun run lint`: Verify code style and design system alignment.
- `bun run build`: Ensure the production build succeeds with new routes/components.

## Smoke Tests (Manual QA Checklist)

- [ ] Archive a project from the project list card.
- [ ] Archive a project from the project details modal.
- [ ] Bulk archive 3 projects from the list view.
- [ ] Restore a project from the Archived tab.
- [ ] Bulk restore 3 projects from the Archived tab.
- [ ] Verify archived projects do not appear in "Recent Projects" on Homebase.
- [ ] Verify archived projects do not appear in "Favorites" on Homebase.
- [ ] Verify a favorited project hides from Homebase when archived and reappears when restored.
- [ ] Verify pending invites are still visible in the project members list after restore.

## Archive-Specific Focused Tests

| Feature | Test Case | Expected Result |
|---------|-----------|-----------------|
| **Homebase** | Check Recent/Favorites lists | Archived projects are filtered out. |
| **Favorites** | Archive a favorited project | Project is hidden from favorites; reappears on restore. |
| **Invites** | Archive project with pending invites | Invites remain in DB; visible/actionable after restore. |
| **Shared Links** | Access a shared link for an archived project | Link returns a "Project Archived" state (paused, not revoked). |
| **Accessibility** | Trigger archive/restore actions | `aria-live` region announces "Project archived" or "Project restored". |
| **Focus Management** | Close Archive modal | Focus returns to the button that opened the modal. |

## Pass/Fail Definitions

- **Pass**: All automated tests green; manual smoke tests confirm UI/UX requirements; no RLS bypasses.
- **Fail**: Any test failure; archived projects leaking into active views; destructive language in archive flow.

## Alternative Verification

If E2E tests are blocked by environment issues, use **Manual RPC Verification**:
- Manually invoke `preview_bulk_archive_projects` and `execute_bulk_archive_projects` RPCs via the Supabase SQL Editor and verify the `archived_at` column and UI response.

## Future Schema Commands

When applying schema changes:
- `npx supabase migration list`: Verify the archive migration is applied.
- `npx supabase gen types typescript --project-id ebxxqidacheyapmmzavr > src/lib/supabase/types.ts`: Update types (plus manual patches for new RPCs).
- **RLS Proof**: `SELECT * FROM projects WHERE archived_at IS NOT NULL` as a non-member user (should return 0 rows).
