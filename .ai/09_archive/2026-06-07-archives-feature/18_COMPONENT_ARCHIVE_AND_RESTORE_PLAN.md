# Component Archive and Restore Plan

**Date:** 2026-06-07 | Phase 3 | Plan: `.ai/03_plans/2026-06-07-archives-feature/`

## Existing Infrastructure

Components already have full archive support via `lifecycle_state = 'archived'`:

- **Schema:** `cost_library_items.lifecycle_state` (enum: draft|in_production|available|discontinued|archived), plus `lifecycle_state_changed_at`, `lifecycle_state_changed_by`
- **RPCs:** `preview_bulk_archive_library_components`, `execute_bulk_archive_library_components`, `set_cost_library_component_lifecycle_state`
- **Server actions:** `src/lib/component-library/actions.ts` wires all RPCs
- **Repository:** `src/lib/repositories/component-library-repository.ts` filters `lifecycle_state != 'archived'`
- **AI exclusion:** `src/lib/ai/read-context.ts` and `src/lib/ai/package-builder/` already exclude archived/discontinued items
- **UI:** `ComponentLibraryManager` has archive action in toolbar and `archivedIds` handling

**What's missing:** Restore flow and Archived Components view. Note: existing component archive uses typed confirmation (`ARCHIVE COMPONENT(S)` via `BulkDestructivePreviewModal`). This plan only adds restore (simple confirm button). Existing archive flow may keep typed phrase since it pre-dates the new "simple confirm" convention.

## New: Restore RPCs

```sql
preview_bulk_restore_library_components(target_workspace_id uuid, target_item_ids uuid[]) RETURNS jsonb
  -- Returns only currently-archived items as eligible

execute_bulk_restore_library_components(target_workspace_id uuid, target_item_ids uuid[], expected_preview_hash text, correlation_id uuid DEFAULT gen_random_uuid()) RETURNS jsonb
  -- Sets lifecycle_state to 'available' (existing bulk archive RPCs do not record pre-archive state, so precise restoration is deferred to future migration)
  -- Updates lifecycle_state_changed_at = now(), lifecycle_state_changed_by = auth.uid()
```

## New: Server Actions

Add to `src/lib/component-library/actions.ts`:
- `previewBulkRestoreLibraryComponents(input)` → calls `preview_bulk_restore_library_components`
- `executeBulkRestoreLibraryComponents(input)` → calls `execute_bulk_restore_library_components`

Follow existing preview→execute pattern. Simple confirm button (not typed phrase).

## New: UI — Archived Components View

In `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`:

- Add status filter: "Non-archived" (default, WHERE lifecycle_state != 'archived') / "Archived" (WHERE lifecycle_state = 'archived')
- In Archived view: "Restore Selected" action in toolbar
- Individual restore action on component cards in Archived view
- Confirmation: "Restore component?" with "Restore" button

## New: Repository Filter

Update `src/lib/repositories/component-library-repository.ts`:
- Default queries already filter `lifecycle_state != 'archived'` — correct
- Add parameter to include archived for the Archived view

## No Changes Needed

- **No new columns** — reuse existing lifecycle_state system
- **AI exclusion** — already handles lifecycle_state correctly
- **Package builder** — already rejects archived/discontinued items
- **Read context** — already excludes archived items

## Tests

- RPC contract: restore preview/execute return correct shape
- Server action: correct RPC called, error handling
- DOM: archived filter shows only archived components, restore works
- Repository: archived filter functions correctly
- AI exclusion: restore re-enables component for AI (regression test)
