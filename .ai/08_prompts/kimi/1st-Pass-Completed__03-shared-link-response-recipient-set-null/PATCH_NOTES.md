# Patch Notes: Shared-Link Response Recipient SET NULL

## Files changed

- `supabase/migrations-pending-review/AC-MOD-04_shared_link_responses_recipient_set_null.sql`
  - Keeps the FK replacement fail-closed: `DROP CONSTRAINT shared_link_responses_recipient_id_fkey`.
- `scripts/prove-shared-link-response-recipient-set-null-postgres.mjs` (new)
  - Local Postgres proof harness for AC-MOD-04.
- `package.json`
  - Added script: `prove:shared-link-response-recipient-set-null`.

## What is NOT changed

- No provider SQL was applied.
- No application source code was changed; the recipient-removal confirmation dialog already ships in `src/lib/publication/actions.ts`.
- No generated Supabase types were edited; type regeneration is required after provider apply.

## Apply runbook (for human DBA)

1. Review `supabase/migrations-pending-review/AC-MOD-04_shared_link_responses_recipient_set_null.sql`.
2. Run the preflight query to count decisions at risk.
3. Apply the migration in a maintenance window against project `ebxxqidacheyapmmzavr`.
4. Run the post-check query to confirm `confdeltype = 'n'`.
5. Move the file into `supabase/migrations/` with a fresh timestamp prefix.
6. Regenerate types: `bun run gen:types`.
