# 02 - Feature Brief And Scope

## Product Context

The estimate sheet is the core MVP workspace for building, editing, organizing, and pricing project estimates. It must support realistic professional projects where users may have thousands of row items and deeply nested area/group structures.

The sheet uses two component types that share the same editing surfaces (AddComponentModal, EditComponentModal, Inline row editing) but have fundamentally different identity and mutation behavior. See `22_COMPONENT_INTEROPERABILITY_SPEC.md` for the full identity contract and surface matrix.

## Users

- Architect or estimator editing quantities, unit costs, suppliers, categories, and row descriptions.
- Project owner reviewing large estimates and moving rows between areas.
- Collaborator watching cursors and activity while another user edits.
- Operator exporting proposal packages.
- Agent or future automation lane manipulating the same estimate data through safe APIs.

## Core Workflows

- Open a project estimate URL directly.
- Switch between tabs.
- Select or navigate branches and areas.
- Expand and collapse area groups.
- Search rows and area names.
- Filter by supplier/category/value.
- Group or sort rows within areas.
- Edit quantity/cost/name/supplier/category fields.
- Insert blank rows, library components, templates, and project-specific components.
- **Add Component via modal** — creates library components with variants/images/catalogue metadata.
- **Edit Component via modal** — edits row/project components. Different behavior for library-linked vs project-level rows.
- **Inline scalar editing** — row override/update path with fan-out for project-level components.
- **Inline variant pill** — library replacement for linked rows, row update for project rows.
- Move rows between areas.
- Delete and restore rows or nodes.
- Open row details and activity history.
- Preview/export proposals.
- Observe collaboration cursors without interrupting editing.

## Component Type Scope

### In Scope
- Both component types (Project Level, Library Level) must work correctly across Add/Edit/Inline surfaces.
- Variant selection, persistence, and display must work for both types.
- Thumbnail upload/preview must route to correct image endpoint per component type.
- Project-component fan-out must apply to matching instances.
- Duplicate-name suppression must be active in create mode only (not edit mode).
- Image URL normalization through broker routes.
- Source snapshot text normalization must tolerate null-ish values.
- Fan-out performance at scale (target: O(1) graph index, not O(N) tree-walk).

### Out of Scope
- Library-master edit mode from estimate sheet (separate product decision).
- Durable project-component variant table independent of estimate rows (post-MVP).
- "Convert to Project Component" or "Link to Library Component" explicit UX (current multi-step flow accepted for MVP).

## Non-Goals For This Plan

- No visual redesign of the sheet.
- No new paid Cloudflare services.
- No replacement of D1, TanStack Query, Zustand, React, or Next.js.
- No migration back to Supabase.
- No implementation in this plan pack (except Phase 0 measurement artifacts).
- No destructive provider operations.
- No branch or worktree creation.

## Success Criteria

The future implementation succeeds only when all are true:

### Performance
- Direct estimate route opens within budget for target large fixture.
- Typing into a visible row remains responsive and preserves focus.
- Search/filter/group no longer blocks input on thousands of rows.
- Editing one row does not recompute or rerender unrelated branches beyond explicit budget.
- Expanding many sibling branches deduplicates/coalesces network work.
- D1 queries use proven indexes and report bounded `rows_read`.
- Virtualized rows and branches show no blank gaps or lost focus under mixed row heights.
- Optimistic rollback remains correct under concurrent edits and failures.
- Existing user-visible behavior is preserved unless explicitly changed by a later product decision.

### Component Interoperability
- AddComponentModal supports both create (library) and edit (row/project) modes.
- Edit mode suppresses duplicate-name warnings for both component types.
- Edit-mode image uploads use correct endpoint (project vs library).
- Variant selection persists through edit-mode save for both types.
- Project-level row updates fan out to matching instances.
- Variant pill routes to correct action (row update vs library replacement).
- At stress scale, fan-out completes without blocking the main thread.

## Scale Targets

Logical fixture tiers:

| Tier | Shape | Purpose |
|---|---|---|
| Small | 5 areas x 10 rows = 50 rows | Current fast regression smoke. |
| Medium | 10 areas x 20 rows = 200 rows | Existing rough jsdom baseline tier. |
| Large | 10 areas x 50 rows = 500 rows | Current upper jsdom baseline tier. |
| Stress | 50 areas x 50 rows = 2,500 rows | Main MVP scale proving ground. |
| Limit | 100 areas x 50 rows = 5,000 rows | Current production row cap. |
| Over-limit | 1,501 nodes or 5,001 rows | Truncation and load-limit proof. |

## Scope Boundaries

In scope:
- Route load and route transition performance.
- D1 query shape, indexes, and proof artifacts.
- TanStack Query keys and invalidation.
- Active estimate client state shape.
- Row edit hot paths.
- Totals and derived values.
- Search, filter, group, sort, facets.
- Subtree loading and hydration.
- Virtualization contracts.
- **Component type interoperability across Add/Edit/Inline surfaces.**
- **Variant selection, persistence, and fan-out performance.**
- Tests, benchmark scripts, browser proof, and observability.

Out of scope:
- Proposal export full-data architecture except where current sheet state feeds preview.
- Component library broad search architecture except row insertion picker impact.
- Marketing/public pages.
- Historical Supabase migrations.
- Hosted provider mutations during planning.
- **Library-master edit mode from estimate sheet.**
- **Durable project-component variant table.**
