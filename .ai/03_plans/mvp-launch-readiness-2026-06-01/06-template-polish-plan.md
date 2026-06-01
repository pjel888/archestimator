# 06 — Template Polish Plan

**Date:** 2026-06-01

## Current State

`/workshop/templates` is a template browsing workspace with:
- **Template list:** 3 seed templates (Condo Fit-Out Starter, Powder Room Basic, Roof Deck Lounge) from `src/lib/component-library/estimate-templates.ts` plus any DB-created templates
- **Insertion:** Via estimate sidebar Templates tab — copies template nodes and rows atomically via `insert_estimate_template_into_estimate_with_history`
- **Template source:** Immutable during insertion; rows get `source_snapshot` with `sourceTemplateId`
- **RLS:** Workspace-scoped, authenticated reads

**Key architectural note:** Templates are **estimate-structure bundles** (Group Nodes, Area Nodes, estimate row item snapshots), NOT cost-library rows. Tables: `estimate_templates`, `estimate_template_nodes`, `estimate_template_row_items`.

## Gap Analysis

| Area | Current | Gap |
|------|---------|-----|
| **Template list UX** | Basic list | No search, no category grouping, no preview before select |
| **Template preview** | No preview | User can't see template structure (rooms, rows, costs) before inserting |
| **Template detail** | No detail view | Can't see which areas/groups are in a template, row counts, totals |
| **Empty states** | No empty state | "No templates" state missing when no templates exist |
| **Loading states** | Route-level skeleton | No skeleton for template list content |
| **Seed templates** | 3 hardcoded in TypeScript | Templates should come from Supabase for admin CRUD; seed data may be stale |
| **Error states** | No explicit error state | Silent failure on template load |
| **Template insertion UX** | Drag or click from sidebar | No confirmation dialog with preview; no feedback after insert |
| **Design-system compliance** | Passes lint generically | Templates page may use ad-hoc styles |

## Implementation Tasks

### P0 — Must fix before MVP launch

1. **Add template preview / detail view**
   - Click a template card → opens detail modal or expands card with:
     - Template name, description, total cost
     - Group/Area tree preview (flattened list of areas with row counts)
     - Per-area row count and subtotal
     - Total row count and grand total
   - "Insert into estimate" action with confirmation
   - Files: `src/components/workshop/TemplatesPageClient.tsx`, new `TemplatePreviewModal` or expandable card

2. **Add empty and error states**
   - Empty: "No estimate templates yet." with suggested first action
   - Error: "Could not load templates. Try again." with retry button
   - Loading: Skeleton cards while data loads
   - Files: `src/components/workshop/TemplatesPageClient.tsx`

3. **Improve template insertion feedback**
   - After insert from sidebar: show toast "Template '{name}' inserted with {N} rows"
   - After insert from template page: navigate to estimate or show success state
   - Files: `src/components/workshop/EstimateSheetContent.tsx` (sidebar insertion), `src/components/workshop/TemplatesPageClient.tsx`

### P1 — Should fix before MVP launch

4. **Move seed templates to Supabase**
   - Create migration that inserts seed templates into live workspace for Philip's profile
   - Keep `estimate-templates.ts` as fallback for when tables don't exist
   - Seed: Condo Fit-Out Starter, Powder Room Basic, Roof Deck Lounge
   - Files: New migration, `src/lib/component-library/estimate-templates.ts`

5. **Design-system visual audit**
   - Same checks as component library: SF Pro, regular/medium, ≤12px, xs radius, zero tracking
   - Template cards should use `library-card` component token
   - Files: `src/components/workshop/TemplatesPageClient.tsx`

### P2 — Nice to have

6. **Template search/filter**
   - Search by template name, area names, description
   - Client-side filtering of loaded templates
   - Files: `src/components/workshop/TemplatesPageClient.tsx`

## Acceptance Criteria

- [ ] Click a template → see detail/preview with group/area tree, row counts, total cost
- [ ] "Insert into estimate" action with confirmation
- [ ] Empty state renders when no templates exist
- [ ] Error state renders with retry on failed load
- [ ] Loading skeleton renders during data fetch
- [ ] Toast confirms successful template insertion
- [ ] Seed templates moved to Supabase migration (with TypeScript fallback)
- [ ] Design-system lint passes with 0 violations
- [ ] No text exceeds 12px font size
- [ ] All border radius is xs (3px)

## Files Likely Touched

- `src/components/workshop/TemplatesPageClient.tsx` — main template page
- `src/components/workshop/EstimateSheetContent.tsx` — sidebar insertion feedback
- `src/lib/component-library/estimate-templates.ts` — seed data (keep as fallback)
- `src/lib/repositories/component-library-repository.ts` — template data fetching
- New milestone: `supabase/migrations/..._seed_templates.sql` — DB seed

## Impact-Analysis Targets

Bebefore editing, run impact analysis on:
- `TemplatesPageClient` — blast radius ~3 components
- `insertEstimateTemplateIntoEstimate` — blast radius ~5 callers
- `getCurrentWorkspaceEstimateTemplates` — blast radius ~3 callers

## Tests

- Vitest: Template preview renders group/area/row counts
- Vitest: Empty state renders
- Vitest: Error state renders with retry
- Vitest: Toast fires on successful insert
- E2E: Browse templates → preview → insert → verify estimate has new rows
