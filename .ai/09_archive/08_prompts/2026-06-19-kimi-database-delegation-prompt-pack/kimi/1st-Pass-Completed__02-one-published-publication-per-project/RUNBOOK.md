# AC-MOD-06 Apply Runbook: One Published Publication Per Project

## Scope

This runbook applies the partial unique index guarantee for `public.project_publications`:

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
  project_publications_one_published_per_project_idx
  ON public.project_publications (project_id)
  WHERE status = 'published';
```

## Authority gate

Provider apply is authorized only when the coordinator message explicitly includes `provider-apply` and confirms target project `ebxxqidacheyapmmzavr`. This runbook is otherwise local-prep only.

## Preconditions

- [ ] Target project confirmed: `ebxxqidacheyapmmzavr`.
- [ ] Supabase CLI or psql credentials are available.
- [ ] A maintenance window is acceptable (the `CREATE UNIQUE INDEX CONCURRENTLY` avoids long locks but still consumes resources).
- [ ] Migration file reviewed: `supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql`.

## Step 0 — Duplicate preflight

Run exactly:

```sql
SELECT project_id, count(*) AS live_rows
FROM public.project_publications
WHERE status = 'published'
GROUP BY project_id
HAVING count(*) > 1;
```

Expected result: **zero rows**.

If rows are returned, do NOT proceed to Step 1 until Step 0b is complete and re-check returns zero.

## Step 0b — Reconcile duplicates (only if Step 0 returned rows)

Review the affected `project_id` values and rows before running. Keep the newest `published_at` row per project; revoke older duplicates.

```sql
BEGIN;
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY project_id ORDER BY published_at DESC, id DESC) AS rn
  FROM public.project_publications
  WHERE status = 'published'
)
UPDATE public.project_publications p
SET status = 'revoked',
    revoked_at = now(),
    updated_at = now()
FROM ranked
WHERE p.id = ranked.id AND ranked.rn > 1;
COMMIT;
```

Re-run Step 0; it must return zero rows.

## Step 1 — Create the partial unique index

Run outside a transaction because `CONCURRENTLY` cannot run inside one:

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
  project_publications_one_published_per_project_idx
  ON public.project_publications (project_id)
  WHERE status = 'published';
```

If your migration runner wraps statements in a transaction, either:
- run this statement outside the runner, or
- remove `CONCURRENTLY` (accepts a brief lock; the table is small).

## Post-check

```sql
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'project_publications'
  AND indexname = 'project_publications_one_published_per_project_idx';
```

Expected result: **one row**.

## Canonicalize migration history

After successful apply, move the reviewed file into the canonical migration folder with a fresh timestamp prefix:

```bash
mv supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql \
   supabase/migrations/<YYYYMMDDhhmmss>_one_published_publication_per_project.sql
```

Then run `supabase db push` or equivalent so the migration is recorded in the project's migration history.

## Rollback

If anything goes wrong after creation:

```sql
DROP INDEX CONCURRENTLY IF EXISTS public.project_publications_one_published_per_project_idx;
```

Rolling back removes the guarantee but does not delete any data.

## Evidence to capture

- [ ] Step 0 output (or `local-only` note if not run).
- [ ] Step 0b reconciliation output, if applicable.
- [ ] Step 1 command and exit status.
- [ ] Post-check output.
- [ ] Final migration filename under `supabase/migrations/`.
