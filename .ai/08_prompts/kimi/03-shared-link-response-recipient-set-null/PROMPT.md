# Kimi Prompt: Preserve Shared-Link Response Decisions On Recipient Delete

## Dedicated `/goal`

Task base folder: `03-shared-link-response-recipient-set-null`

```text
/goal Complete the Kimi task whose base folder is `03-shared-link-response-recipient-set-null`. Locate the current task folder under `.ai/08_prompts/kimi` by finding either `03-shared-link-response-recipient-set-null` or a folder ending in `__03-shared-link-response-recipient-set-null`; then follow that folder's `PROMPT.md`. Prepare the AC-MOD-04 migration so `shared_link_responses` decisions survive recipient hard-delete by changing the recipient FK to nullable `ON DELETE SET NULL`, with preflight, tests/proof, recovery notes, and same-folder reports. Do not apply provider SQL unless the launch `/goal` or latest coordinator message explicitly includes `provider-apply` and confirms project `ebxxqidacheyapmmzavr`.
```

## Objective

Preserve audit-relevant accept/decline/revision decisions when a shared-link recipient is removed.

## Background and evidence

- `supabase/migrations-pending-review/README.md:18` describes AC-MOD-04 as low risk and additive.
- `supabase/migrations-pending-review/AC-MOD-04_shared_link_responses_recipient_set_null.sql:7` says the current FK is `NOT NULL ... ON DELETE CASCADE`.
- `supabase/migrations-pending-review/AC-MOD-04_shared_link_responses_recipient_set_null.sql:13` says the sibling comments table already uses `ON DELETE SET NULL`.
- `supabase/migrations-pending-review/AC-MOD-04_shared_link_responses_recipient_set_null.sql:35` contains a decisions-at-risk preflight.
- `supabase/migrations-pending-review/AC-MOD-04_shared_link_responses_recipient_set_null.sql:52` drops `NOT NULL`.
- `supabase/migrations-pending-review/AC-MOD-04_shared_link_responses_recipient_set_null.sql:63` recreates the FK with `ON DELETE SET NULL`.
- `src/lib/publication/actions.ts` contains `removeSharedLinkRecipient`.

## Non-goals

- Do not implement soft-delete recipients in this task.
- Do not change modal UX unless a failing test proves the DB contract needs a UI adjustment.
- Do not apply provider SQL without confirmed target and preflight.
- Do not drop response rows.

## Required loop

Follow `../COMMON_KIMI_OPERATING_PROTOCOL.md`.

Loop cap: 5 iterations.

### DISCOVER

- Read startup docs.
- Read AC-MOD-04 pending SQL.
- Inspect `removeSharedLinkRecipient` and shared-link response tests.
- Inspect generated Supabase types if changing the migration or canonical schema.
- Record starting `git status --short`.

### PLAN

In `REPORT.md`, write:

- Whether the run is local-prep or authorized provider apply.
- Whether existing tests cover recipient deletion with responses.
- What proof demonstrates decisions remain after recipient deletion.
- How rollback is constrained if `recipient_id` becomes null.

### EXECUTE

Safe local work options:

- Improve or canonicalize the pending migration.
- Add a local SQL proof or Vitest contract that models delete behavior.
- Prepare an apply runbook.

Provider apply is allowed only with explicit `provider-apply`, confirmed target `ebxxqidacheyapmmzavr`, captured preflight, and post-check evidence.

### VERIFY

Potential checks:

```bash
bun test tests/vitest/project-publication-owner-modal-actions.test.ts
bun test tests/vitest/recipient-email-composer.test.tsx
bun run type-check
git diff --check
```

If a new SQL proof script is added, run that exact proof and capture output.

### REPORT

Update `REPORT.md`, `EVIDENCE.md`, and `CHECKLIST.md`. Add `PATCH_NOTES.md` for source changes.

### DECIDE

Complete only when:

- Preflight/apply/post-check is documented, or local-prep status is explicit.
- The survival invariant is tested or a clear proof gap is recorded.
- Rollback caveat is documented.

## Same-folder report contract

All status and evidence must stay in the current task folder, even if it already has a pass-result prefix.

Required files:

- `REPORT.md`
- `EVIDENCE.md`
- `CHECKLIST.md`
- `PATCH_NOTES.md`
- `PASS_STATUS.md`
- `PASS_HISTORY.md`
- `BLOCKERS.md` only if blocked

## Pass completion

Before final response, update `PASS_STATUS.md`, append `PASS_HISTORY.md`, and execute `../PASS_COMPLETION_PROTOCOL.md`.

If this is the first successful pass, rename this folder to:

```text
1st-Pass-Completed__03-shared-link-response-recipient-set-null
```

If blocked or failed on pass 1, rename this folder to one of:

```text
1st-Pass-Blocked__03-shared-link-response-recipient-set-null
1st-Pass-Failed__03-shared-link-response-recipient-set-null
```

On later passes, replace the existing leading pass prefix instead of stacking prefixes.
