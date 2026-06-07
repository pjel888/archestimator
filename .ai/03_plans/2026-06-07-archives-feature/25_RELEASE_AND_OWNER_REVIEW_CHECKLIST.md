# Release and Owner Review Checklist

**Date:** 2026-06-07
**Plan:** `.ai/03_plans/2026-06-07-archives-feature/`

## Owner Review Gates (Before ANY Implementation)

- [ ] Philip approves multi-entity archive strategy
- [ ] Philip approves in-place archive approach (no global center in V1)
- [ ] Philip approves `can_edit_project` for archive (separate from `can_manage_project_access` for delete)
- [ ] Philip approves simple confirm button for archive (not typed phrase)

## Per-Phase Release Gates

### Phase 1 — Projects
- [ ] Migration `*_project_archive_state.sql` applied on linked Supabase `ebxxqidacheyapmmzavr` (exact-file, NOT `db push`)
- [ ] `archived_at`, `archived_by` columns exist on `projects`
- [ ] `preview_bulk_archive_projects`, `execute_bulk_archive_projects`, `preview_bulk_restore_projects`, `execute_bulk_restore_projects` RPCs callable
- [ ] Generated types updated + manual patches applied
- [ ] `bun run validate` passes
- [ ] `bun run build` passes
- [ ] `bun run lint:design-system` passes
- [ ] `bun run test:e2e` passes
- [ ] Archived tab renders on `/workshop/projects`
- [ ] Archive project → moves to Archived tab
- [ ] Restore project → returns to original tab
- [ ] Direct URL to archived project redirects
- [ ] Homebase excludes archived projects
- [ ] Favorites hide archived projects
- [ ] Delete flow still works independently
- [ ] Philip smoke-tests on staging

### Phase 2 — Estimate Sheets
- [ ] Migration applied, columns exist on `estimates`
- [ ] Estimate archive/restore RPCs callable
- [ ] `bun run validate` + `build` + `lint:design-system` pass
- [ ] Status filter renders on estimate list
- [ ] Archived sheet redirects from editor route
- [ ] Charts exclude archived sheets
- [ ] Export excludes archived sheets
- [ ] AI excludes archived sheet data
- [ ] Project totals exclude archived sheets
- [ ] TanStack Query invalidates correctly

### Phase 3 — Components
- [ ] Restore RPC migration applied
- [ ] `bun run validate` + `build` + `lint:design-system` pass
- [ ] Archived view in library shows only archived components
- [ ] Restore sets lifecycle_state to last pre-archive state (or 'available' if no history)
- [ ] Existing archive flow still works

### Phase 4 — Templates
- [ ] Migration applied, columns exist on `estimate_templates`
- [ ] `bun run validate` + `build` + `lint:design-system` pass
- [ ] Archived view in templates shows only archived templates
- [ ] Archived templates excluded from insertion list

### Phase 5 — Retention (Planning Only)
- [ ] Philip reviews retained-recipient architecture
- [ ] Legal review of retention model
- [ ] Product decision on commercial terms
- [ ] **NO code implementation without explicit approval**

## Rollback Decision Gates

| Trigger | Action |
|---------|--------|
| Migration fails on linked Supabase | Rollback: don't deploy code |
| `bun run validate` fails | Fix issues before proceeding |
| `lint:design-system` fails | Fix UI violations |
| Existing tests break | Fix regression before proceeding |
| Philip rejects archive UX | Rollback UI, keep schema (additive) |

## Provider/Schema Gates

- ⚠️ Do NOT use `supabase db push` (blocked by migration drift)
- ✅ Use exact-file linked query: `supabase db query --linked --file migration.sql`
- ✅ Verify remote migration history matches local after apply
- ✅ Do NOT touch SlateCamp or any non-Archestimator Supabase resource

## Final Docs

- [ ] Update `.ai/10_state/current-state.md` with implementation status
- [ ] Update `.ai/10_state/decisions.md` with final decisions
- [ ] Archive plan to `.ai/09_archive/store/2026-06-07-archives-feature-complete/`
