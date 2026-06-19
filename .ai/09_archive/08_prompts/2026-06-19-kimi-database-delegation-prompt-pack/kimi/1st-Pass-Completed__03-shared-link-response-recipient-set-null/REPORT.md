# Report: Shared-Link Response Recipient SET NULL

Status: 1st pass completed (local-prep; provider apply off)

## Goal

Preserve response decisions when shared-link recipients are hard-deleted by changing `shared_link_responses.recipient_id` to nullable with `ON DELETE SET NULL` (AC-MOD-04).

## Starting worktree

```text
 M package.json
 M supabase/migrations-pending-review/AC-MOD-04_shared_link_responses_recipient_set_null.sql
?? scripts/prove-shared-link-response-recipient-set-null-postgres.mjs
```

(Other unrelated changes in the checkout were preserved.)

## Plan

- Keep the run local-prep; do not apply to the linked Supabase project.
- Keep the pending-review migration fail-closed when replacing the recipient FK, so an unexpected live FK name does not silently leave `ON DELETE CASCADE` in place.
- Add a local Postgres proof harness (`scripts/prove-shared-link-response-recipient-set-null-postgres.mjs`) that builds a minimal shared-link schema, applies the migration, deletes the recipient, and asserts the response row survives with `recipient_id = NULL` and the FK action is `SET NULL`.
- Wire the proof script into `package.json` so it is discoverable and reproducible.
- Run the proof script and a targeted publication-actions test; record pre-existing unrelated failures separately.
- Update same-folder reports and mark pass complete.

## Changes

- `supabase/migrations-pending-review/AC-MOD-04_shared_link_responses_recipient_set_null.sql`
  - Keeps `DROP CONSTRAINT shared_link_responses_recipient_id_fkey` without `IF EXISTS` so migration drift fails visibly.
- `scripts/prove-shared-link-response-recipient-set-null-postgres.mjs` (new)
  - Local proof harness for AC-MOD-04.
- `package.json`
  - Added `prove:shared-link-response-recipient-set-null` script.

## Result

- The migration text is canonicalized and ready for human DBA review/maintenance-window apply.
- The local proof harness passes and verifies the survival invariant and FK action.
- No provider SQL was applied.
- No app source changes were required; the existing confirmation dialog before removing a recipient with a decision already ships the UI half of AC-MOD-04.

## Residual risk

- The migration remains in `migrations-pending-review`; a human must run preflight, apply it to project `ebxxqidacheyapmmzavr`, and move it into `supabase/migrations/` with a timestamp prefix.
- After provider apply, `src/lib/supabase/types.ts` must be regenerated (`bun run gen:types`) so `shared_link_responses.recipient_id` reflects `string | null`.
- Rollback to `NOT NULL` is only possible if no retained row has a NULL `recipient_id`; the migration file already documents this caveat.
