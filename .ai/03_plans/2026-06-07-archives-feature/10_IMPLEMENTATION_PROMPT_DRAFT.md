# Implementation Prompt Draft — Archives Feature

**Date:** 2026-06-07
**Plan folder:** `.ai/03_plans/2026-06-07-archives-feature/`

> This is a future handoff prompt for an implementation agent (Codex, Claude Code, OpenCode, etc.). It references the complete plan package and provides exact instructions for implementing the Archives Feature.

---

## Implementation Prompt

```
You are implementing the Archestimator Archives Feature — a reversible archive/restore flow for workspace projects.

## BEFORE YOU START (MANDATORY READING)

1. Read the complete plan package: `.ai/03_plans/2026-06-07-archives-feature/`
   - Start with `00_INDEX.md` for scope and decisions
   - Read `02_CODEBASE_RESEARCH.md` for codebase evidence
   - Read `03_ARCHITECTURE_AND_DESIGN_PLAN.md` for proposed architecture
   - Read `04_IMPLEMENTATION_SEQUENCE.md` for step-by-step execution
   - Read `05_BLAST_RADIUS_AND_RISK_ANALYSIS.md` before editing any file

2. Verify the plan against current repo reality:
   - Files may have changed since the plan was written (2026-06-07)
   - Check that referenced file paths still exist
   - Check that referenced RPCs and types still match
   - If significant drift is found, update `02_CODEBASE_RESEARCH.md` and report

3. Run these commands before any implementation:
   ```bash
   git status --short --branch
   git branch --show-current
   ```

4. Use GitNexus/code-review-graph tools BEFORE source edits:
   - `gitnexus_impact` on every symbol you plan to modify
   - `code-review-graph get_impact_radius` to understand blast radius
   - `code-review-graph detect_changes` before committing
   - Report HIGH/CRITICAL risk findings before proceeding

5. Read local Next.js docs before route/framework changes:
   - `node_modules/next/dist/docs/` — this version has breaking changes from standard Next.js

6. Re-read `AGENTS.md` for project rules and conventions.

## SCOPE

**V1: Workspace projects only.**
- Archive: set `archived_at = now()`, `archived_by = auth.uid()` on `projects` table
- Restore: set `archived_at = NULL`, `archived_by = NULL`
- UI: Preserve existing "Your Projects"/"Projects shared to you" tabs + add "Archived" tab; archive/restore actions on cards and toolbar
- Route guards: redirect archived project pages to `/workshop/projects` with notice
- Homebase/favorites/collaboration: exclude archived projects

**OUT OF SCOPE for V1:**
- Do NOT archive estimate sheets, templates, or component library items
- Do NOT modify project deletion flow
- Do NOT add lifecycle state machine (simple boolean archive is sufficient)
- Do NOT add new dependencies or packages
- Do NOT modify provider settings, secrets, or environment variables

## IMPLEMENTATION ORDER (from 04_IMPLEMENTATION_SEQUENCE.md)

### Phase 1 — Baseline & Tests-First Scaffolding
- Run GitNexus impact analysis on all symbols that will change
- Write FAILING tests for archive/restore before any production code
- Tests to write (TDD — RED first):
  - Archive RPC contract test
  - Restore RPC contract test
  - Active list excludes archived projects
  - Archived view shows only archived projects
  - Archive requires can_edit_project (unauthorized → forbidden)
  - Restore requires can_edit_project
  - RLS prevents unauthorized archive/restore

### Phase 2 — Database Migration
- Create additive migration: `ALTER TABLE projects ADD COLUMN archived_at TIMESTAMPTZ, ADD COLUMN archived_by UUID`
- Create partial indexes on `archived_at`
- Create RPCs: `preview_bulk_archive_projects`, `execute_bulk_archive_projects`, `preview_bulk_restore_projects`, `execute_bulk_restore_projects`
- Follow exact pattern from `supabase/migrations/20260603160000_mass_deletion_governance.sql`
- **STOP GATE:** Before applying migration to linked Supabase, get explicit confirmation. Use exact-file linked query, NOT broad `db push`.
- After migration apply: update generated types, add manual type patches for new RPCs

### Phase 3 — Server Actions & Repository Filters
- Add archive/restore functions to `src/lib/projects/actions.ts` (`previewBulkArchiveProjects`, `executeBulkArchiveProjects`, etc. — following existing naming convention)
- Add archive/restore action types to `src/lib/mass-deletion/bulk-action.ts` (simple confirm button, NOT typed phrase — archive is non-destructive; typed confirmation reserved for delete)
- Update `src/lib/repositories/workspace-repository.ts`:
  - `listCurrentWorkspaceProjects(includeArchived = false)`
  - `getWorkshopHomebaseData` — filter recent projects to active only

### Phase 4 — UI
- Add "Archived" tab to `src/components/workshop/projects-page-client.tsx` (alongside existing "Your Projects"/"Projects shared to you" tabs)
- Add archive action to `src/components/workshop/LiveProjectCard.tsx`
- Add archive action to `src/components/workshop/BulkActionToolbar.tsx`
- Create archive confirmation modal (extend `BulkDestructivePreviewModal` or create new)
- Add restore action in Archived view
- Add empty states, status messages
- **BLOCKING:** All UI must pass `bun run lint:design-system`

### Phase 5 — Route Guards & Homebase
- Add archived-project redirect guard to project route pages
- Add guard to estimate and chart routes
- Update homebase, favorites, collaboration semantics

### Phase 6 — Publication
- Handle archived project publications (return "project archived" state)
- Pause (don't revoke) active shared links

### Phase 7 — Validation
- `bun run validate` (type-check + lint + design-system + unit + dom)
- `bun run build`
- `bun run test:e2e`
- Update `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md`

## RULES (NON-NEGOTIABLE)

### Development
- **TDD:** Write failing test FIRST, watch it FAIL, then write minimal production code
- **NEVER delete failing tests** to make builds pass — fix the code
- **NEVER use `as any`, `@ts-ignore`, or `@ts-expect-error`** to suppress type errors
- **NEVER modify production source** without first writing the failing test
- **Reuse shared primitives:** check `src/components/ui/` before creating new components
- **No feature-local button/search/icon-button class strings** — use shared primitives

### Design System (BLOCKING if violated)
- SF Pro font, regular/medium weights only
- 12px maximum font size
- rounded-xs / 3px border radius only
- Zero letter spacing
- Phosphor regular outline icon style
- Colors: strong #292929, default #5D5D5D, subtle #7F7F7F
- Run `bun run lint:design-system` after every UI change

### Security
- Server-authoritative archive/restore — validate via RPC, not client
- Client-side filtering is UI convenience, NOT a security boundary
- Every RPC must validate `auth.uid()` and workspace/project membership
- Archive/restore requires `can_edit_project` (same as delete)

### Database
- Additive migration only: `ALTER TABLE ADD COLUMN IF NOT EXISTS`
- Use exact-file linked Supabase apply
- Do NOT use broad `supabase db push` (blocked by migration history drift)
- Update generated types after migration

### Git
- Commit after each phase with descriptive messages
- Do NOT merge to main or staging automatically
- Push to scoped branch (`feat/archive-projects` or `codex/archive-projects`)

## STOP GATES

Stop implementation immediately if any of these occur:

1. Migration fails to apply on linked Supabase
2. Design-system lint fails (fix before continuing)
3. Any existing test fails after changes (investigate, fix, or report)
4. GitNexus impact analysis returns HIGH/CRITICAL risk on a symbol you haven't accounted for

## AFTER COMPLETION

1. Update `.ai/10_state/current-state.md` with implementation status
2. Update `.ai/10_state/decisions.md` with any new decisions made during implementation
3. Archive this plan folder to `.ai/09_archive/store/2026-06-07-archives-feature-complete/`
4. Create bug plans in `.ai/15_Bugs/` for any issues discovered
5. Run full validation: `bun run validate && bun run build`
6. Commit with: `git commit -m "feat(projects): implement archive/restore flow for workspace projects"`
7. Push to origin

## MERGE POLICY

- **Do NOT merge to main automatically.**
- Create a PR against `staging` if the staging branch exists and PR workflow is approved.
- Only merge to main if Philip's implementation prompt explicitly authorizes it.
- Default repo policy: scoped branches → PR → review → merge.

## QUESTIONS / BLOCKERS

If you encounter decisions not covered by the plan:
1. Check `12_OPEN_QUESTIONS_AND_DECISIONS.md` for resolved decisions
2. Check `13_TRACEABILITY_MATRIX.md` for requirement-to-implementation mapping
3. If still unresolved, create a dated bug/decision record in `.ai/15_Bugs/`
4. Do NOT make unilateral architectural decisions — ask or document the gap
```
