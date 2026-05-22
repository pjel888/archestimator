# Component Library Templates Plan

Status: implemented through Phase 4 on 2026-05-22.

This plan adds reusable estimate templates to Archestimator. A template is an estimate-structure bundle: Group Nodes, Area Nodes, and copied estimate row items. Templates are not component rows and must not be stored in `cost_library_items`.

## Phases

1. Route-local Templates tab in `/workshop/components` — implemented.
2. Supabase persistence for workspace-scoped templates — implemented as migration `20260522091621_component_library_templates.sql` plus typed repository normalization and static fallback before rollout.
3. Live estimate insertion that copies template structure into `estimate_nodes` and `estimate_row_items` — implemented through the estimate sidebar Templates tab, add buttons, ID-only drag/drop payloads, and `insertEstimateTemplateIntoEstimate`.
4. Verification, browser smoke, and code review — in the active review-fix loop until the final review is clean.

## Guardrails

- Keep `/workshop/components` left tree folder-only.
- Keep categories, suppliers, and custom tab behavior intact.
- Preserve the active two-kind estimate tree contract: `group` and `area`.
- Preserve UUID row-id insertion requirements.
- Enable RLS for new Supabase tables and use explicit grants when exposing tables through the Data API.
- Template insertion must pass only `templateId` from the client. The server calls `public.insert_estimate_template_into_estimate` so persisted workspace templates are copied atomically inside Postgres.
- The migration seeds the shipped default templates for existing workspaces. Static template data is only a relation-missing fallback before migration rollout, not an empty-table fallback after migration.

## Linked Execution Artifacts

- `.omx/context/component-library-templates-20260522T090734Z.md`
- `.omx/plans/prd-component-library-templates.md`
- `.omx/plans/test-spec-component-library-templates.md`
