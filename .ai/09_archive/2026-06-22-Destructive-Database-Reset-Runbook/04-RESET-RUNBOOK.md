# 04 Reset Runbook

This is a future execution runbook. It is not approval to run the reset.

## Phase 0A: Confirm Preparation Authority

Required before backup/export, manifest generation, or rollback-only dry run:

- Gate 1 owner instruction from [10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md](10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md);
- project ref confirmed as `ebxxqidacheyapmmzavr`;
- evidence location chosen;
- raw backup/export destination is outside the repo;
- no current ambiguity about preserving Auth users;
- plan pack reviewed.

Stop if any item is missing.

## Phase 1: Reconfirm Live Provider State

Run read-only checks:

- list projects and confirm display name/ref, with `ebxxqidacheyapmmzavr` as the mandatory project ref;
- read Postgres version;
- count `auth.users`;
- exact-count every `public` table;
- count target Storage objects by bucket and bytes by bucket;
- list Edge Functions;
- retry branch listing if relevant, but do not depend on branches;
- summarize `supabase_migrations.schema_migrations`;
- verify all public tables still have RLS enabled;
- capture public function baseline including owner, `search_path`, execute grants, and definition hash;
- capture RLS policies and Storage policies.

Persist sanitized output under the future evidence location, not raw secrets.

Optional provider naming add-on:

- if separately authorized, normalize the display name to `archestimator`;
- verify the ref remains `ebxxqidacheyapmmzavr`;
- record sanitized evidence;
- do not combine this with custom-domain, vanity-subdomain, project creation,
  project transfer, or project deletion work.

## Phase 2: Build The Manifest

Build two manifests from current live state:

- database table manifest;
- Storage object manifest.

Each public table must be labeled with the action vocabulary from [11-RESET-MANIFEST-AND-DRY-RUN-TEMPLATE.md](11-RESET-MANIFEST-AND-DRY-RUN-TEMPLATE.md):

- preserve;
- reset-explicit-delete;
- reset-by-parent-delete;
- update-null;
- decision-required;
- negative-manifest-excluded.

Each target Storage object must be labeled:

- preserve;
- export then delete;
- rejected by allow-list;
- decision-required.

The manifest must contain expected pre-counts and post-counts.

Any unresolved `decision-required` row is no-go for Gate 2.

## Phase 3: Backup And Export

Before destructive execution:

- create logical database backup;
- create Storage object export;
- verify backup hash;
- verify database restore into local or throwaway target;
- verify Storage sample restores from each non-empty selected bucket;
- save row-count and object-count snapshots;
- run `bun run launch:check-supabase-backup` with sanitized backup-list input if that evidence is available;
- record known gap if Supabase backup-list evidence cannot be collected.

Stop if backup/export/restore proof is missing.

## Phase 4: Transaction Dry Run

Future executor writes a reviewed reset script from the manifest.

Dry-run rules:

- use a transaction;
- set and record conservative lock and statement budgets;
- use explicit table names;
- do not include `auth`, `storage`, `realtime`, or `supabase_migrations`;
- calculate counts before and after inside the transaction;
- `ROLLBACK` at the end;
- compare deltas to manifest;
- save sanitized transcript.

If using `TRUNCATE`, justify it table by table. PostgreSQL `TRUNCATE` takes `ACCESS EXCLUSIVE` locks, can cascade, and does not fire `ON DELETE` triggers. Variant A defaults to ordered `DELETE`; use `TRUNCATE` only after manifest review proves it is safer.

If using any `CASCADE`, list every reached table in the manifest with expected deltas and reviewer signoff.

## Phase 4B: Confirm Destructive Execution Authority

Required after Phase 4 passes and before any committed destructive command:

- Gate 2 owner instruction from [10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md](10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md);
- chosen reset variant recorded;
- project ref confirmed as `ebxxqidacheyapmmzavr`;
- Storage deletion scope recorded;
- every decision-required item resolved;
- maintenance/offline posture chosen;
- backup/export bundle created and verified;
- restore rehearsal completed;
- transaction dry run completed with rollback;
- post-reset verification owner assigned;
- plan pack and Gate 1 evidence reviewed.

Stop if any item is missing.

## Phase 5: Execute Database Reset

Only after Phase 4 rollback dry run passes and Phase 4B Gate 2 authority is complete:

- keep maintenance/offline posture active;
- rerun the critical pre-counts immediately before execution;
- run the reviewed reset script;
- commit once;
- save post-counts;
- verify `auth.users` count unchanged;
- verify preserve tables unchanged or changed only as expected;
- verify `profiles.default_workspace_id` is null for Variant A if workspaces were deleted;
- verify reset target tables are zero rows or expected seed counts.

Do not run schema migrations in the same execution step.

## Phase 6: Execute Storage Cleanup

Only after database commit:

- use Storage API/tooling, not table mutation against `storage.objects`;
- group deletes by bucket;
- chunk deletes, defaulting to 100 paths per chunk unless current tooling proves a better limit;
- keep one active delete batch per bucket unless the manifest justifies more concurrency;
- retry failed batches at most 3 times with bounded backoff;
- persist failed/rejected/missing paths for targeted resume;
- apply path allow-list rules;
- record removed, failed, rejected, and missing object counts;
- verify bucket object counts after cleanup.

Expected Variant A object post-counts if Storage cleanup is chosen:

- `component-images`: 0 app objects, unless explicitly preserved;
- `project-images`: 0 app objects;
- `component-attachments`: 0 app objects.

If cleanup fails, do not roll back database rows blindly. Record the failure and use the export/manifest for targeted retry.

## Phase 7: Post-Reset Provider Verification

Run:

- exact public row counts;
- `auth.users` count;
- preserved table counts;
- Storage bucket object counts;
- RLS-enabled table check;
- public function baseline comparison for owner, `search_path`, grants, `SECURITY DEFINER`, and definition hash;
- Storage policy check;
- linked readiness SQL if still applicable:
  - `bun run launch:supabase-readiness`
  - `bun run launch:check-supabase-linked-readiness` with captured JSON

Regenerate Supabase types only if schema changed. A pure data reset should not require `bun run gen:types`.

## Phase 8: App Smoke Verification

Minimum app flows:

- existing Auth user logs in;
- closed-beta access still works;
- `/workshop` follows the canonical null-workspace behavior in [12-POST-RESET-UX-CONTRACT.md](12-POST-RESET-UX-CONTRACT.md);
- default workspace is created or selected through current app flow;
- `/workshop/projects` empty state renders;
- create a new project;
- upload/remove a project image;
- create an estimate sheet;
- create/rename/reorder/delete estimate nodes;
- add/edit/delete estimate row items;
- render empty library state and create a library folder/component/price option if the reset leaves library empty;
- insert library component into estimate;
- publish/share a project and revoke/rotate link;
- verify old public share tokens fail closed;
- verify old project/estimate/invite links fail closed;
- create a collaboration invite if email/invite flags are configured;
- verify notifications/activity/AI/audit surfaces do not crash on empty/nulled refs.

Browser automation is not mandatory for this plan pack. Future execution should choose the smallest proof that establishes the reset did not break app workflows. Auth login, share/invite routes, and Storage upload/delete need real-surface manual or automated proof unless an equivalent application-level proof is recorded.

## Phase 9: Record Evidence

Update future execution evidence with:

- exact commands run with secrets redacted;
- backup/export hash metadata;
- restore rehearsal evidence;
- pre/post table counts;
- pre/post Storage counts;
- Auth count unchanged proof;
- RLS/function/storage policy checks;
- app smoke result;
- known gaps and residual risk.

Do not update `.ai/10_state/current-state.md` unless project reality changed and the owner wants that durable state recorded.
