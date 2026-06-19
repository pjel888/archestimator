# Evidence: T4 Shared-Link DB Hygiene

## Commands

### 1. Local Postgres proof harness

```bash
bun run prove:t4-shared-link-db-hygiene
```

Output:

```json
{
  "ok": true,
  "proof": "t4_shared_link_db_hygiene",
  "checks": [
    "P3 manager-read RLS policy exists on project_publication_events",
    "P3 authenticated SELECT grant exists and RLS allows only managers",
    "P4 public-feed partial index exists with is_internal = false predicate",
    "P5 FK covering indexes created and marked ready/valid",
    "P6 snapshot_size_bytes generated column tracks snapshot_json size",
    "P1 prunes project_publication_events and shared_link_events older than 180 days",
    "P7 prunes expired security_rate_limit_events by expires_at while keeping unexpired rows",
    "P2 drops redundant token-hash indexes only after zero-scan preflight",
    "Unique token-hash indexes survive P2 drops"
  ]
}
```

Exit code: `0`.

### 2. Diff whitespace check

```bash
git diff --check
```

Exit code: `0`.

### 3. Type-check

```bash
bun run type-check
```

Exit code: `0`.

```text
$ tsc --noEmit
```

## Proof boundary

`local-only` — verification used a local temp Postgres instance and static file review. No linked or hosted provider was mutated or checked.

## Unit evidence

- **P3**: `pg_policy` contains `project publication managers can read publication events`; authenticated has the required table `SELECT` grant, managers can read their event, and non-managers cannot.
- **P4**: `pg_indexes` shows `shared_link_comments_public_feed_idx` with predicate `is_internal = false`.
- **P5**: all four covering indexes exist and are ready/valid (`project_publications_published_by_idx`, `project_publications_workspace_idx`, `shared_link_events_recipient_idx`, `shared_link_recipients_invited_by_idx`).
- **P6**: `snapshot_size_bytes` generated column exists and returns a positive value for a non-empty `snapshot_json`.
- **P1**: old rows in `project_publication_events` and `shared_link_events` are pruned; the `pg_cron` schedule block remains commented.
- **P7**: expired rows in `security_rate_limit_events` are pruned by `expires_at < now()` while unexpired rows remain; the `pg_cron` schedule block remains commented.
- **P2**: preflight shows `idx_scan = 0` for both redundant indexes; after applying the unit the redundant indexes are gone and the unique token-hash indexes survive.

## Skipped checks

- Provider apply and post-check on project `ebxxqidacheyapmmzavr` were skipped because provider apply is OFF for this run.
- `pg_cron` schedule enablement was not tested locally because the local temp instance does not have the `pg_cron` extension.
