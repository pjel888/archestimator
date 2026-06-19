# Kimi Prompt: Split And Review T4 Shared-Link DB Hygiene

## Dedicated `/goal`

Task base folder: `07-t4-shared-link-db-hygiene`

```text
/goal Complete the Kimi task whose base folder is `07-t4-shared-link-db-hygiene`. Locate the current task folder under `.ai/08_prompts/kimi` by finding either `07-t4-shared-link-db-hygiene` or a folder ending in `__07-t4-shared-link-db-hygiene`; then follow that folder's `PROMPT.md`. Split and harden the pending T4 shared-link database hygiene pack into reviewable units with preflight, rollback, verification, and same-folder reports. Do not apply provider SQL unless the launch `/goal` or latest coordinator message explicitly includes `provider-apply` and confirms project `ebxxqidacheyapmmzavr`.
```

## Objective

Make the pending T4 database hygiene work safer to execute by splitting it into independent, reviewable units.

## Background and evidence

- `supabase/migrations-pending-review/README.md:20` lists T4 as index hygiene, RLS-on-events, telemetry retention, rate-limit GC, snapshot-size guardrail, and gated redundant-index drops.
- `supabase/migrations-pending-review/T4-database-pass.sql:15` adds a manager-read RLS policy for `project_publication_events`.
- `supabase/migrations-pending-review/T4-database-pass.sql:35` adds a public-feed covering index.
- `supabase/migrations-pending-review/T4-database-pass.sql:45` adds FK covering indexes.
- `supabase/migrations-pending-review/T4-database-pass.sql:60` proposes telemetry retention through `pg_cron`.
- `supabase/migrations-pending-review/T4-database-pass.sql:85` proposes scheduled GC for `security_rate_limit_events`.
- `supabase/migrations-pending-review/T4-database-pass.sql:97` sketches a snapshot-size guardrail.
- `supabase/migrations-pending-review/T4-database-pass.sql:111` gates redundant index drops on zero scans.
- `supabase/migrations-pending-review/T4-database-pass.sql:126` notes heavier OPT-7/OPT-10 follow-ups and says they are design-only.

## Non-goals

- Do not apply the whole T4 pack as one blob.
- Do not drop indexes without `pg_stat_user_indexes` and EXPLAIN evidence.
- Do not enable `pg_cron` or scheduled jobs without target confirmation.
- Do not implement OPT-7 or OPT-10 in this task.
- Do not claim advisor findings without live provider output.

## Required loop

Follow `../COMMON_KIMI_OPERATING_PROTOCOL.md`.

Loop cap: 5 iterations.

### DISCOVER

- Read startup docs.
- Read T4 SQL and pending-review README.
- Inspect live migrations for the touched tables.
- Search app reads for shared-link comments/activity where relevant.
- Record starting `git status --short`.

### PLAN

In `REPORT.md`, split T4 into units:

1. Additive RLS policy.
2. Additive public comment feed index.
3. Additive FK covering indexes.
4. Telemetry retention schedule.
5. Rate-limit GC schedule.
6. Snapshot size guardrail.
7. Redundant index drops, gated last.

For each unit, document preflight, rollback, proof, and whether provider access is required.

### EXECUTE

Safe local outputs:

- Split SQL files under pending review or a task-local runbook.
- Add missing preflight/post-check comments.
- Add tests or static checks only where useful.
- Create an execution order document.

Provider apply requires explicit `provider-apply`, confirmed project `ebxxqidacheyapmmzavr`, captured preflight, and unit-by-unit post-checks.

### VERIFY

For local documentation/migration prep:

```bash
git diff --check
```

If SQL files are created, run any available SQL lint/static check used by the repo or document that none exists.

### REPORT

Update all same-folder reports. State exactly which units are ready, deferred, or blocked.

### DECIDE

Complete when T4 is no longer a monolithic ambiguous pack and each unit has execution safety notes.

## Pass completion

Before final response, update `PASS_STATUS.md`, append `PASS_HISTORY.md`, and execute `../PASS_COMPLETION_PROTOCOL.md`.

If this is the first successful pass, rename this folder to:

```text
1st-Pass-Completed__07-t4-shared-link-db-hygiene
```

If blocked or failed on pass 1, rename this folder to one of:

```text
1st-Pass-Blocked__07-t4-shared-link-db-hygiene
1st-Pass-Failed__07-t4-shared-link-db-hygiene
```

On later passes, replace the existing leading pass prefix instead of stacking prefixes.
