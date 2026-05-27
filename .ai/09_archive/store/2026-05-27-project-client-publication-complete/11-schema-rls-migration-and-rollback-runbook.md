# Schema RLS Migration And Rollback Runbook

**Date:** 2026-05-27
**Status:** Implemented migration runbook. Keep this aligned with `supabase/migrations/20260527120000_project_client_publication.sql` and linked remote verification.

## Migration Goal

Add a publication-specific schema without weakening current workspace/project/estimate RLS or Teamspaces collaboration policies.

## Implemented Migration Unit

The implemented foundation is:

```txt
20260527120000_project_client_publication
```

It creates:

- `project_publications`;
- `project_publication_events`;
- `can_manage_project_publication(uuid)`;
- `increment_project_publication_open(uuid)`;
- indexes for token hash, project/workspace lookup, publication status, expiry, event summaries.

Implemented simplification: snapshots are stored as `project_publications.snapshot_json` with `snapshot_version`; access attempts use metadata-only event rows plus signed access cookies instead of a separate access-attempt table.

## Table Relationship Rules

- `project_publications.workspace_id` references `workspaces`.
- `project_publications.project_id` references `projects`.
- `project_publication_events.publication_id` references `project_publications`.
- Every table that contains project data also stores `workspace_id` for scoped checks and easier auditing.

## RLS Rules

Enable RLS on every new table.

Management access:

- authenticated owner/admin can select publication summary for projects they manage;
- authenticated owner/admin can insert/update/turn off/create new link/update public page through server actions;
- editors/viewers cannot mutate V1 publication rows.

Receiver access:

- no anon direct table select;
- no anon insert into events;
- receiver route uses server-only resolver after token/password validation;
- service-role usage, if used, stays inside server resolver and returns whitelist DTOs only.

Events:

- event inserts are server-owned;
- browser clients do not insert directly;
- manager event summary is aggregated, not raw full telemetry by default.

## Grant/Revoke Checklist

Migration must explicitly verify:

- no `anon` select/insert/update/delete on publication tables;
- no `authenticated` direct insert into event table;
- helper functions are not executable by anon unless intentionally public and safe;
- token/password hash columns and encrypted token envelopes are not exposed through broad browser reads;
- core app tables do not gain anon reads.

## Index Checklist

Add indexes for:

- `project_publications(token_hash) unique where token_hash is not null`;
- `project_publications(workspace_id, project_id)`;
- `project_publications(status, expires_at)`;
- `project_publication_events(publication_id, created_at desc)`;
- rate-limit lookup keys if stored in Postgres.

## Generated Types

After migration:

```bash
npx supabase@2.98.2 gen types typescript --project-id ebxxqidacheyapmmzavr > src/lib/supabase/types.ts
```

Only claim generated types are current after verifying the command completed and reviewing the diff.

## Local Verification

Run targeted tests:

```bash
bunx vitest run tests/vitest/project-publication-schema.test.ts --maxWorkers=1
bunx vitest run tests/vitest/project-publication-actions.test.ts --maxWorkers=1
bun run validate
```

If local Supabase services are unavailable, document the gap and do not claim local runtime migration proof.

## Linked Remote Verification

Before claiming remote Supabase is updated:

1. Confirm linked project is Archestimator project `ebxxqidacheyapmmzavr`.
2. Apply migration through the approved Supabase flow.
3. Verify tables exist.
4. Verify RLS is enabled.
5. Verify anon direct access remains blocked.
6. Verify manager actions work for Philip's owner/admin account.
7. Verify receiver route can resolve only through server resolver.
8. Verify migration history.
9. Record evidence in the execution log.

If migration history diverges intentionally, use the established repair posture only after recording the reason and verifying live state.

## Rollback Posture

Schema rollback for public-link features is sensitive. Prefer forward-only mitigation unless no data exists.

Emergency disable sequence:

1. Disable UI entry through feature flag or server guard.
2. Mark all publications revoked or block resolver globally.
3. Stop resolving `/share/[token]`.
4. Preserve publication rows/events for incident analysis.
5. Patch code to hide `Public link`.
6. Repair RLS/grants if exposure is suspected.
7. Run remote verification that public resolution is blocked.

Destructive rollback:

- only if no real publication data exists, or after owner-approved data retention decision;
- must back up affected rows first;
- must verify generated types and tests after rollback.

## Migration Review Checklist

- [ ] No raw token column.
- [ ] Encrypted token envelope exists only if persistent copy is implemented and is never plaintext.
- [ ] No raw password column.
- [ ] RLS enabled on every new table.
- [ ] Anon grants absent or explicitly revoked.
- [ ] Authenticated grants scoped to safe actions only.
- [ ] Server resolver cross-checks workspace/project/publication/snapshot.
- [ ] Tests cover invalid, revoked, expired, and password states.
- [ ] Linked remote state verified separately from local migration files.
