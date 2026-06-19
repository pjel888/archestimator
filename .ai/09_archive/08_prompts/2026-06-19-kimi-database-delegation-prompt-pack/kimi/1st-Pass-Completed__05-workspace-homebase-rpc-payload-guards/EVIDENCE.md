# Evidence: Workspace Homebase RPC Payload Guards

## Commands

### Targeted Vitest contract/guard pack

```bash
bunx vitest run tests/vitest/workshop-homebase-summary-rpc-contract.test.ts --maxWorkers=1
```

Output:

```
 RUN  v4.1.7 <repo>
 ✓ tests/vitest/workshop-homebase-summary-rpc-contract.test.ts (19 tests) 6ms
 Test Files  1 passed (1)
      Tests  19 passed (19)
```

### Type check

```bash
bun run type-check
```

Output:

```
$ tsc --noEmit
```

Exit code 0.

### Diff whitespace check

```bash
git diff --check
```

Exit code 0.

## Proof boundary

`local-only` — local Vitest + TypeScript checks ran; no linked/hosted provider or browser surface was exercised.

## Test cases

### Valid payloads
- Well-formed payload with all arrays populated correctly.
- Payload with extra fields on elements (e.g., `favorite_created_at`) to confirm guards are permissive of additional keys.

### Malformed payloads
- Non-object payload (`null`, array) → throws `workspace_homebase_summary invalid payload`.
- Missing top-level array (`recentProjects`) → throws `recentProjects is not an array`.
- Non-object array element in `recentProjects` → throws `workspace_homebase_summary invalid array element: recentProjects[0] is not an object`.
- Project record with missing `id` → throws `recentProjects[0].id must be a string`.
- Estimate record with numeric `project_id` → throws `recentEstimates[0].project_id must be a string`.
- Estimate node with string `sort_order` → throws `estimateNodes[0].sort_order must be a number`.
- Favorite ref missing `created_at` → throws `projectFavorites[0].created_at must be a string`.
- Nullable text field `client_name` set to a number → throws `favoriteProjects[0].client_name must be a string or null`.
