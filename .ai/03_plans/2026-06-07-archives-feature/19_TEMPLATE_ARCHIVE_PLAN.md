# Template Archive Plan

**Date:** 2026-06-07 | Phase 4 | Plan: `.ai/03_plans/2026-06-07-archives-feature/`

## Data Model

- `archived_at TIMESTAMPTZ NULL`, `archived_by UUID NULL` on `estimate_templates` table
- **Decision:** Simple boolean archive (archived_at), NOT lifecycle state. Templates are simpler than components and don't need a full state machine.

## RPCs

```sql
preview_bulk_archive_templates(target_workspace_id uuid, target_template_ids uuid[]) RETURNS jsonb
execute_bulk_archive_templates(target_workspace_id uuid, target_template_ids uuid[], expected_preview_hash text, ...) RETURNS jsonb
preview_bulk_restore_templates(target_workspace_id uuid, target_template_ids uuid[]) RETURNS jsonb
execute_bulk_restore_templates(target_workspace_id uuid, target_template_ids uuid[], expected_preview_hash text, ...) RETURNS jsonb
```

All follow existing preview→execute pattern. Workspace-scoped (templates are workspace-level, not project-level).

## Auth

- Workspace editor for archive/restore (same gate as template creation/edit)

## UI

In `/workshop/templates` via `TemplateLibraryManager`:
- Status filter: "Active Templates" (default, WHERE archived_at IS NULL) / "Archived Templates" (WHERE archived_at IS NOT NULL)
- Archive action: row menu on template card
- Bulk archive: selection toolbar
- Restore action: in Archived view
- Confirmation: simple confirm button (not typed phrase)

## Repository

Update `src/lib/repositories/component-library-repository.ts`:
- Template list query: `WHERE archived_at IS NULL` for default view
- Parameter to include archived for the Archived view

## Template Insertion Filter

When inserting a template into an estimate:
- Exclude archived templates from the available template list
- Restore re-enables the template in the insertion list

## Minimal Blast Radius

Templates are standalone: they affect the `/workshop/templates` page, template insertion into estimates, and AI template search (AI read-context and package-builder query `estimate_templates`). No cross-cutting effects on charts, export, or publication.

## Tests

- Migration contract: archived_at, archived_by columns exist
- RPC contract: preview/execute return correct shape
- Server action: correct RPC called
- DOM: status filter, archive/restore actions
- Repository: template list excludes archived
- Insertion: archived templates excluded from available list
