# Evidence: One Published Publication Per Project

## Preflight

Not run against a provider. This pass is local-prep only because the launch `/goal` did not include `provider-apply` or an explicit project target.

The duplicate-detection SQL is captured in the pending migration and in `RUNBOOK.md`:

```sql
SELECT project_id, count(*) AS live_rows
FROM public.project_publications
WHERE status = 'published'
GROUP BY project_id
HAVING count(*) > 1;
```

## Commands

```bash
$ bun test tests/vitest/project-publication-one-published-index.test.ts
bun test v1.3.14 (d1632b29)
tests/vitest/project-publication-one-published-index.test.ts:
(pass) AC-MOD-06 one published publication per project > requires a duplicate preflight before creating the partial unique index [2.68ms]
(pass) AC-MOD-06 one published publication per project > documents a duplicate reconciliation step that keeps the newest published row [0.04ms]
(pass) AC-MOD-06 one published publication per project > creates a partial unique index on project_id for published rows only [0.02ms]
(pass) AC-MOD-06 one published publication per project > includes a post-check to confirm the index exists [0.03ms]
(pass) AC-MOD-06 one published publication per project > includes a rollback statement to drop the partial unique index [0.02ms]
(pass) AC-MOD-06 one published publication per project > references the existing non-unique index that the migration hardens [0.01ms]
(pass) AC-MOD-06 one published publication per project > warns that the migration must not be auto-applied and requires preflight [0.03ms]
 7 pass
 0 fail
 20 expect() calls
Ran 7 tests across 1 file. [167.00ms]

$ bun run type-check
$ tsc --noEmit
(exit 0)

$ git diff --check
(exit 0)
```

## Proof boundary

`local-only` — static source/migration review plus a local Vitest contract test and TypeScript type-check. No provider or browser surface was exercised.

## Post-check

Provider/local DB apply did not happen. The post-check SQL is documented in the pending migration and in `RUNBOOK.md`:

```sql
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'project_publications'
  AND indexname = 'project_publications_one_published_per_project_idx';
```
