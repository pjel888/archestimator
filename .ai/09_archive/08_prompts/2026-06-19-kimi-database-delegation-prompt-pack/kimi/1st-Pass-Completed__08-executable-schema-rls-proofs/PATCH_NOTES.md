# Patch Notes: Executable Schema/RLS Proofs

## Files changed

- `scripts/prove-membership-floor-triggers-postgres.mjs` (new)
- `package.json`

## What changed

### New proof script

Created `scripts/prove-membership-floor-triggers-postgres.mjs`, a self-contained local Postgres proof that:

- Boots a temporary Postgres instance.
- Creates a minimal schema mirroring the tables and helpers needed by the membership-floor triggers:
  - `public.profiles`
  - `public.workspaces`
  - `public.workspace_members`
  - `public.projects`
  - `public.project_members`
  - `public.collaboration_role` enum
  - `public.collaboration_role_rank`
  - `public.has_other_project_access_manager`
  - `public.enforce_workspace_owner_floor`
  - `public.enforce_project_manager_floor`
  - The two `before delete or update` triggers
- Seeds one workspace and one project with owner/admin/editor actors.
- Asserts the atomic floor behavior:
  - **Workspace**: last-owner delete blocked, last-owner demotion blocked, non-last owner delete allowed.
  - **Project**: last-manager delete blocked, last-manager demotion blocked, non-manager delete allowed, manager-status-preserving update allowed.
- Cleans up the temp instance on exit.

### package.json

Added script alias:

```json
"prove:membership-floor-triggers": "node scripts/prove-membership-floor-triggers-postgres.mjs"
```

## Verification

```bash
bun run prove:membership-floor-triggers
bun test tests/vitest/project-collaboration-schema.test.ts
bun test tests/vitest/security-findings-library-tooling-contracts.test.ts
bun run type-check
```

All passed.
