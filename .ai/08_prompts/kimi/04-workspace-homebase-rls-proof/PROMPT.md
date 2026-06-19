# Kimi Prompt: Make Workspace Homebase RPC Proof Exercise RLS

## Dedicated `/goal`

Task base folder: `04-workspace-homebase-rls-proof`

```text
/goal Complete the Kimi task whose base folder is `04-workspace-homebase-rls-proof`. Locate the current task folder under `.ai/08_prompts/kimi` by finding either `04-workspace-homebase-rls-proof` or a folder ending in `__04-workspace-homebase-rls-proof`; then follow that folder's `PROMPT.md`. Upgrade the local `workspace_homebase_summary` Postgres proof so it exercises RLS-relevant behavior instead of relying only on manual filters and broad grants. Write all reports in the current task folder.
```

## Objective

Increase confidence that the `security invoker` RPC behaves correctly under the RLS conditions it depends on in production.

## Background and evidence

- `scripts/prove-workshop-homebase-summary-postgres.mjs:152` creates local proof tables.
- `scripts/prove-workshop-homebase-summary-postgres.mjs:227` grants `select on all tables in schema public to authenticated`.
- The proof currently validates query logic, but it does not fully prove table-level RLS interaction for `projects`, `estimates`, `estimate_nodes`, or favorites.
- `.ai/10_state/current-state.md` says the RPC proof exists and was local-only; no linked provider apply was performed.
- `supabase/migrations/20260618184856_workspace_homebase_summary.sql` is the RPC migration to inspect.

## Non-goals

- Do not rewrite the RPC unless a proof failure demonstrates a real bug.
- Do not apply provider migrations.
- Do not build a full production clone of every RLS policy if a minimal faithful fixture proves the target invariant.
- Do not weaken existing proof cases.

## Required loop

Follow `../COMMON_KIMI_OPERATING_PROTOCOL.md`.

Loop cap: 5 iterations.

### DISCOVER

- Read startup docs.
- Read `scripts/prove-workshop-homebase-summary-postgres.mjs`.
- Read `supabase/migrations/20260618184856_workspace_homebase_summary.sql`.
- Inspect collaboration/RLS migrations only enough to mirror relevant behavior.
- Record starting `git status --short`.

### PLAN

In `REPORT.md`, define:

- Which tables need RLS enabled in the harness.
- Which minimal policies mirror production access.
- Which scenario proves no project-wide estimate leakage.
- Whether sheet-only collaborator visibility is included.

### EXECUTE

Expected file scope:

- `scripts/prove-workshop-homebase-summary-postgres.mjs`
- Possibly `package.json` only if a script alias is missing and justified.

Recommended proof additions:

- Enable RLS on relevant tables.
- Set role/context in a way that exercises `auth.uid()`.
- Add a user with project access but sheet-limited estimate access.
- Assert they see the allowed project container but not unauthorized estimates/nodes.
- Preserve existing cross-tenant and anon execute denial cases.

### VERIFY

Run:

```bash
bun run prove:workspace-homebase-summary
bun run type-check
```

If the proof needs local Postgres/Docker and the environment cannot run it, document the exact blocker and run syntax check/static review as a fallback.

### REPORT

Update same-folder reports and add `PATCH_NOTES.md` for source changes.

### DECIDE

Complete only when the proof output demonstrates RLS-relevant scenarios or `BLOCKERS.md` explains why local infrastructure prevents it.

## Pass completion

Before final response, update `PASS_STATUS.md`, append `PASS_HISTORY.md`, and execute `../PASS_COMPLETION_PROTOCOL.md`.

If this is the first successful pass, rename this folder to:

```text
1st-Pass-Completed__04-workspace-homebase-rls-proof
```

If blocked or failed on pass 1, rename this folder to one of:

```text
1st-Pass-Blocked__04-workspace-homebase-rls-proof
1st-Pass-Failed__04-workspace-homebase-rls-proof
```

On later passes, replace the existing leading pass prefix instead of stacking prefixes.
