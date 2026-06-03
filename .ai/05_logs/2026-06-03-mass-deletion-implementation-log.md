# 2026-06-03 Mass deletion implementation log

## Summary

Implemented preview-first destructive workflows for:

- bulk and single project deletion;
- bulk and single estimate-sheet deletion;
- reversible bulk component archive.

The work adds SQL RPC/audit contracts, server action wrappers, storage cleanup allowlists, shared destructive modal/toolbar components, UI wiring, and regression tests.

## Evidence

- TDD red-first contract tests were added, observed failing, then made green.
- `bunx vitest run tests/vitest/bulk-action-validation.test.ts tests/vitest/storage-cleanup-allowlist.test.ts tests/vitest/mass-deletion-contract.test.ts tests/vitest/mass-deletion-action-contract.test.ts tests/vitest/mass-deletion-ui-contract.test.ts --maxWorkers=1` — 14/14 passing.
- `bunx vitest run tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/component-library-manager-ui.test.tsx tests/vitest/projects-page-shared-access.test.tsx --maxWorkers=1` — 29/29 passing.
- `bun run lint:design-system` — passed.
- `bun run validate` — passed; 166 Vitest files, 1295 passing, 2 skipped.
- `bun run build` — passed.

## Visual smoke

Local Playwright smoke against `http://127.0.0.1:3025/workshop/components` and `/workshop/projects` returned login redirects because this worktree has no local Supabase/auth bypass credentials. Screenshots were written under `.omx/artifacts/` for the auth-blocked result; UI confidence therefore rests on design-system lint and DOM regression suites rather than authenticated browser proof.

## Remaining release gate

`supabase/migrations/20260603160000_mass_deletion_governance.sql` is committed as repo code but was not applied to a linked Supabase environment in this worktree. Apply it through the approved migration path before using live destructive controls in a provider-backed environment.
