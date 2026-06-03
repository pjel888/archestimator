# 08 Testing Validation And Acceptance Plan

## Purpose

This document maps future verification work to current Archestimator test infrastructure.

## Existing Validation Commands

| Command | Purpose |
|---|---|
| `bun run type-check` | TypeScript compilation. |
| `bun run lint` | ESLint. |
| `bun run lint:design-system` | App/workshop design-system enforcement. |
| `bun run test` | Bun unit tests under `tests/unit/`. |
| `bun run test:dom` | Vitest jsdom tests under `tests/vitest/`. |
| `bun run validate` | type-check + lint + design-system + unit + DOM. |
| `bun run build` | Next.js build. |
| `bun run test:e2e` | Playwright E2E. |
| `bun run test:e2e:perf` | Route-transition perf smoke. |

CI runs validate, build, E2E, and route-transition perf.

## Existing Patterns To Follow

- Server action/RPC mocks: `tests/vitest/estimate-sheet-version-control-actions.test.ts`.
- RPC/schema contract tests: `tests/vitest/component-library-versioning-schema.test.ts`, `tests/vitest/project-publication-schema.test.ts`.
- UI table tests: `tests/vitest/project-estimates-table-inline-edit.test.tsx`.
- Library manager tests: `tests/vitest/component-library-manager-ui.test.tsx`.
- Destructive modal behavior: `tests/vitest/estimate-tree-context-menu.test.tsx`.
- Shared modal primitive: `tests/vitest/ui-modal-tooltip.test.tsx`.
- Publication management tests: `tests/vitest/project-publication-actions.test.ts`, `tests/vitest/project-publication-header.test.tsx`.
- Env-gated destructive E2E: `e2e/estimate-tree-dnd.spec.ts`, `e2e/workshop-project-specific-unlink-smoke.spec.ts`.

## Test Matrix By Layer

### Validation Helper Tests

Proposed files:

- `tests/vitest/bulk-action-validation.test.ts`
- `tests/vitest/storage-cleanup-allowlist.test.ts`

Scenarios:

- rejects empty id arrays;
- dedupes ids;
- rejects invalid UUIDs;
- enforces batch caps;
- validates typed confirmation phrase helper;
- validates project/component storage path allow-list;
- rejects traversal, double slash, wrong extension, wrong bucket.

### Server Action Tests

Proposed files:

- `tests/vitest/bulk-delete-projects-actions.test.ts`
- `tests/vitest/bulk-delete-estimate-sheets-actions.test.ts`
- `tests/vitest/bulk-archive-components-actions.test.ts`
- `tests/vitest/hard-delete-components-actions.test.ts`

Scenarios:

- calls `requireCurrentUserContext` / `ensureDefaultWorkspace`;
- rejects invalid ids before RPC;
- passes workspace/project ids to RPC;
- passes `acting_user_id` and `correlation_id`;
- maps RPC blockers into structured issues;
- revalidates exact paths;
- invalidates/returns storage warnings;
- never loops over individual single-delete actions.

### RPC / Migration Tests

Proposed files:

- `tests/vitest/bulk-delete-projects-schema.test.ts`
- `tests/vitest/bulk-delete-estimate-sheets-schema.test.ts`
- `tests/vitest/bulk-archive-components-schema.test.ts`
- `tests/vitest/mass-deletion-audit-schema.test.ts`

Scenarios:

- RPCs use `SECURITY DEFINER` and `SET search_path = public`;
- execute grants only to authenticated;
- preview RPC exists before execution RPC;
- `mass_deletion_events` has correlation and workspace indexes;
- `estimate_row_items(source_library_item_id)` and template reference indexes exist before hard delete;
- audit table does not store raw tokens/password hashes.

### React / Vitest Tests

Proposed files:

- `tests/vitest/project-bulk-delete-ui.test.tsx`
- `tests/vitest/project-details-delete-preview.test.tsx`
- `tests/vitest/estimate-sheet-bulk-delete-ui.test.tsx`
- `tests/vitest/library-component-bulk-archive-ui.test.tsx`
- `tests/vitest/bulk-destructive-preview-modal.test.tsx`

Scenarios:

- checkbox selection and clear selection;
- permission-disabled checkboxes;
- toolbar appears only when selection exists;
- preview loading skeleton;
- blockers disable confirm;
- typed confirmation enables execute;
- Escape behavior before execution;
- executing state disables controls;
- success clears selection and refreshes;
- storage warning toast renders;
- project details delete no longer uses `window.confirm`;
- archived components disappear only when filtering is implemented.

### Playwright E2E Tests

Proposed env-gated specs:

- `e2e/workshop-estimate-sheet-bulk-delete-smoke.spec.ts`
- `e2e/workshop-library-component-archive-smoke.spec.ts`
- `e2e/workshop-project-bulk-delete-smoke.spec.ts`
- `e2e/workshop-component-hard-delete-smoke.spec.ts` (Phase 6 only)

Destructive E2E gating flag:

- `ARCHESTIMATOR_E2E_MASS_DELETION=1`
- `ARCHESTIMATOR_DEV_AUTH_BYPASS=1`
- `ARCHESTIMATOR_DEV_AUTH_EMAIL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Each spec must:

- create isolated fixtures;
- avoid touching seeded demo projects unless specifically allowed;
- clean up in `afterEach`;
- verify residue counts for target and child tables;
- store screenshots/logs only under an env-provided artifact dir if needed.

### Design-System Lint Checks

Every UI phase must pass:

- `bun run lint:design-system`

Tests should assert:

- use of shared `Modal`;
- danger buttons through shared `Button`;
- no new `window.confirm` for mass deletion;
- no non-`rounded-xs` destructive modal markup.

### Performance Fixture Tests

Proposed:

- `tests/vitest/bulk-delete-preview-performance-contract.test.ts`
- `tests/vitest/bulk-archive-preview-performance-contract.test.ts`

These can be source/static tests initially:

- preview SQL uses aggregate counts;
- no server-action loop over selected ids;
- storage cleanup chunk size is bounded.

## Specific Acceptance Criteria

### Phase 1 Preview

- Preview returns eligible/not-found/forbidden/blocker buckets.
- Counts match fixture dependencies.
- Cross-workspace ids do not leak names.
- Active publication blockers are returned.

### Phase 2 Execution

- Execution reruns preview.
- Stale preview hash blocks execution.
- Audit row created.
- DB deletes/archive are set-based.
- Storage cleanup warning is returned without DB rollback.

### Phase 3 Estimate UI

- Single trash opens modal.
- Bulk toolbar uses existing selected ids.
- Active publication blocker prevents execute.
- Deleting current route redirects to estimate list.

### Phase 4 Library Archive UI

- Archive preview shows linked estimate/template counts.
- Archive hides archived components from default library and insertion after filtering changes.
- Existing estimate rows preserve snapshots.

### Phase 5 Project UI

- Project details delete uses preview modal.
- Bulk delete blocks active shared links.
- Sheet-only/pending cards cannot be selected.
- Success returns user to safe route.

### Phase 6 Hard Delete

- Hidden for non-admins.
- Blocked with any references.
- Deletes storage only from DB-derived allow-listed paths.

## Manual QA Checklist

- Select zero, one, and many targets.
- Try mixed allowed/forbidden targets.
- Try stale target after another tab deletes it.
- Try active shared link blocker.
- Confirm wrong typed phrase keeps button disabled.
- Confirm correct typed phrase executes once.
- Confirm double click does not double execute.
- Confirm storage cleanup warning is visible when mocked.
- Confirm archived component can no longer be inserted.
- Confirm existing estimate row snapshot still renders after archive.

## Definition Of Done

For each implementation phase:

- targeted tests pass;
- `bun run validate` passes;
- `bun run build` passes for backend/UI phases;
- relevant E2E passes or is skipped with documented env gate;
- design-system lint passes for UI phases;
- manual QA notes recorded for destructive flows;
- no source path outside intended phase scope changed unexpectedly.
