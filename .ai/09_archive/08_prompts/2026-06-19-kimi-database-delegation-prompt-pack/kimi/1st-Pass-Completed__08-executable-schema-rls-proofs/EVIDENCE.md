# Evidence: Executable Schema/RLS Proofs

## Commands

### 1. New local Postgres proof

```bash
bun run prove:membership-floor-triggers
```

Exit code: `0`

Output:

```json
{
  "ok": true,
  "proof": "membership_floor_triggers",
  "checks": [
    "workspace last-owner delete blocked",
    "workspace last-owner demotion blocked",
    "workspace non-last owner delete allowed",
    "project last-manager delete blocked",
    "project last-manager demotion blocked",
    "project non-last manager delete allowed",
    "project manager-status-preserving update allowed"
  ]
}
```

### 2. Existing text-contract tests

```bash
bun test tests/vitest/project-collaboration-schema.test.ts
```

Exit code: `0`
Result: `4 pass, 0 fail`

```bash
bun test tests/vitest/security-findings-library-tooling-contracts.test.ts
```

Exit code: `0`
Result: `6 pass, 0 fail`

### 3. Type check

```bash
bun run type-check
```

Exit code: `0`

### 4. Diff whitespace check

```bash
git diff --check -- scripts/prove-membership-floor-triggers-postgres.mjs package.json
```

Exit code: `0`

## Proof boundary

`local-only` — local Postgres proof harness and existing Vitest text-contract tests ran. No linked provider, hosted provider, browser, or production surface was exercised.

## Behavior proven

Allowed cases:
- A workspace non-owner admin can be deleted.
- A project non-manager editor can be deleted.
- Updating a workspace/project owner row to the same owner role succeeds.
- Updating a project owner row to owner role succeeds.

Denied cases:
- Deleting the last workspace owner is blocked.
- Demoting the last workspace owner to admin is blocked.
- Deleting the last project owner/admin is blocked.
- Demoting the last project owner/admin to editor is blocked.
