# Kimi Prompt: One Published Publication Per Project

## Dedicated `/goal`

Task base folder: `02-one-published-publication-per-project`

```text
/goal Complete the Kimi task whose base folder is `02-one-published-publication-per-project`. Locate the current task folder under `.ai/08_prompts/kimi` by finding either `02-one-published-publication-per-project` or a folder ending in `__02-one-published-publication-per-project`; then follow that folder's `PROMPT.md`. Prepare the one-live-publication database guarantee from the pending AC-MOD-06 migration with duplicate preflight, recovery notes, tests or proof where local-only evidence is possible, and same-folder reports. Do not apply provider SQL unless the launch `/goal` or latest coordinator message explicitly includes `provider-apply` and confirms project `ebxxqidacheyapmmzavr`.
```

## Objective

Prepare the partial unique-index migration that guarantees at most one `status = 'published'` publication row per project.

## Background and evidence

- `supabase/migrations-pending-review/README.md:18` lists AC-MOD-06 as medium risk because duplicates must be reconciled first.
- `supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql:7` notes the current index is non-unique.
- `supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql:20` says preflight is mandatory.
- `supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql:25` contains the duplicate-detection query.
- `supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql:57` creates the partial unique index concurrently.
- `supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql:67` notes a later app-side atomic replacement RPC/transaction follow-up.

## Non-goals

- Do not silently apply SQL to a provider.
- Do not reconcile live duplicates without explicit current environment confirmation.
- Do not change publication business behavior outside the database guarantee.
- Do not implement the optional atomic replacement RPC in this task unless explicitly added after the migration prep is complete.

## Required loop

Follow `../COMMON_KIMI_OPERATING_PROTOCOL.md`.

Loop cap: 5 iterations.

### DISCOVER

- Read `AGENTS.md`.
- Read `.ai/10_state/current-state.md` FAST PATH.
- Read pending migration README and AC-MOD-06 SQL.
- Inspect publication code enough to understand create/rotate behavior:
  - `src/lib/publication/actions.ts`
  - relevant `tests/vitest/project-publication-*` files
- Record starting `git status --short`.

### PLAN

Write in `REPORT.md`:

- Whether this run is local-prep only or has an authorized provider target.
- Exact SQL preflight to run if provider access is available.
- How duplicate rows would be reported and reconciled.
- How the migration should become canonical under `supabase/migrations/` if approved.
- Rollback and post-check plan.

### EXECUTE

Safe default work:

- Improve the pending migration comments/checklist if needed.
- Add local tests or static contract tests only if they improve confidence.
- Prepare an apply runbook in this folder.

Provider apply is allowed only if all of these are true:

- The launch `/goal` or latest coordinator message explicitly includes `provider-apply`.
- The target project is confirmed as `ebxxqidacheyapmmzavr`.
- Credentials are already available.
- Preflight output is captured.
- Duplicate reconciliation is reviewed before destructive updates.
- The result is documented in `EVIDENCE.md`.

### VERIFY

Recommended local checks:

```bash
bun test tests/vitest/project-publication-owner-modal-actions.test.ts
bun run type-check
git diff --check
```

If adding only documentation/runbook content, `git diff --check` and targeted path review are enough.

### REPORT

Update same-folder reports. If provider SQL was not run, say so clearly.

### DECIDE

Complete only when Kimi has either:

- Produced a complete local apply/preflight/runbook package, or
- Applied against the authorized project with captured preflight, post-check, and recovery evidence.

## Required same-folder artifacts

- `REPORT.md`: plan, decisions, whether provider work happened.
- `EVIDENCE.md`: preflight/post-check output or local-only proof boundary.
- `CHECKLIST.md`: acceptance status.
- `PATCH_NOTES.md`: required if any repo files changed.
- `BLOCKERS.md`: required if duplicates, credentials, or target ambiguity block safe apply.
- `PASS_STATUS.md`: required every pass and must agree with the final folder prefix.
- `PASS_HISTORY.md`: required every pass and append-only.

## Pass completion

Before final response, update `PASS_STATUS.md`, append `PASS_HISTORY.md`, and execute `../PASS_COMPLETION_PROTOCOL.md`.

If this is the first successful pass, rename this folder to:

```text
1st-Pass-Completed__02-one-published-publication-per-project
```

If blocked or failed on pass 1, rename this folder to one of:

```text
1st-Pass-Blocked__02-one-published-publication-per-project
1st-Pass-Failed__02-one-published-publication-per-project
```

On later passes, replace the existing leading pass prefix instead of stacking prefixes.
