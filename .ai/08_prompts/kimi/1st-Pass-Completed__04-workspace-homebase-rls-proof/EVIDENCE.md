# Evidence: Workspace Homebase RLS Proof

## Commands

### 1. Starting git status

```bash
git status --short
```

Output (truncated to task-relevant entries):

```
 M .ai/03_plans/2026-06-19-Projects-Page-Performance/LOOP_LEDGER.md
 M src/components/workshop/LiveProjectCard.tsx
 M supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql
?? .team/
?? tests/vitest/perf/projects-page-render-baseline.test.tsx
?? tests/vitest/project-publication-one-published-index.test.ts
?? tmp/
```

### 2. Local Postgres proof

```bash
bun run prove:workspace-homebase-summary
```

Exit code: `0`

Output:

```json
{
  "ok": true,
  "proof": "workspace_homebase_summary",
  "checks": [
    "same-workspace favorite isolation",
    "cross-tenant non-member denial",
    "anon execute denial",
    "optional publication and pending invite exclusion",
    "sheet-only collaborator RLS containment"
  ]
}
```

### 3. Type check

```bash
bun run type-check
```

Exit code: `0`

Output:

```
$ tsc --noEmit
```

### 4. Diff whitespace check

```bash
git diff --check -- scripts/prove-workshop-homebase-summary-postgres.mjs
```

Exit code: `0`

## Proof boundary

`local-only` — local Postgres proof harness ran with a temporary instance. No linked provider, hosted provider, browser, or production surface was exercised.

## Blocked infrastructure

None. Local PostgreSQL 16 (Homebrew) was available and the proof executed successfully.
