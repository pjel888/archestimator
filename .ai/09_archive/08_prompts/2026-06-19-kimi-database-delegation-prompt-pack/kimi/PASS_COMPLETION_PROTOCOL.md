# Pass Completion Protocol

This protocol makes each Kimi pass easy to double-check later. It applies to every task folder under `.ai/08_prompts/kimi`.

## Required outcome

At the end of every pass, Kimi must:

1. Update the task folder's `PASS_STATUS.md`.
2. Append the same final pass summary to `PASS_HISTORY.md`.
3. Ensure `REPORT.md`, `EVIDENCE.md`, and `CHECKLIST.md` match the final status.
4. Create or update `PATCH_NOTES.md` if source, tests, scripts, migrations, or docs changed.
5. Create or update `BLOCKERS.md` from `BLOCKERS_TEMPLATE.md` if the pass is blocked.
6. Rename the task folder by prepending the pass-result prefix.

## Prefix format

Use:

```text
<ordinal>-Pass-<Result>__<base-folder>
```

Allowed results:

- `Completed`
- `Blocked`
- `Failed`

Examples:

- `1st-Pass-Completed__01-workspace-homebase-rpc-fallback`
- `1st-Pass-Blocked__02-one-published-publication-per-project`
- `1st-Pass-Failed__04-workspace-homebase-rls-proof`
- `2nd-Pass-Completed__01-workspace-homebase-rpc-fallback`

## Ordinal rules

- Pass 1 uses `1st`.
- Pass 2 uses `2nd`.
- Pass 3 uses `3rd`.
- Pass 4 and later use `<number>th`, for example `4th`.

## Base-folder rules

The base folder is the original task folder slug without any pass prefix.

Examples:

- Base folder: `01-workspace-homebase-rpc-fallback`
- After pass 1 complete: `1st-Pass-Completed__01-workspace-homebase-rpc-fallback`
- After pass 2 complete: `2nd-Pass-Completed__01-workspace-homebase-rpc-fallback`

Do not stack prefixes:

- Bad: `2nd-Pass-Completed__1st-Pass-Completed__01-workspace-homebase-rpc-fallback`
- Good: `2nd-Pass-Completed__01-workspace-homebase-rpc-fallback`

## Safe rename procedure

Before renaming:

1. Run `git status --short --branch`.
2. Confirm the task folder is the only folder being renamed.
3. Confirm all reports are written in the task folder.
4. Confirm `PASS_STATUS.md` states the intended final prefix.
5. Confirm `PASS_HISTORY.md` contains a newly appended entry for this pass.

Rename with a normal filesystem move from the Kimi environment. If shell is available, this is the shape:

```bash
mv ".ai/08_prompts/kimi/<current-folder>" ".ai/08_prompts/kimi/<ordinal>-Pass-<Result>__<base-folder>"
```

If the destination folder already exists, stop and write `BLOCKERS.md`. Do not merge folders by guessing.

## `PASS_STATUS.md` required fields

Every pass must leave these fields:

```markdown
# Pass Status

Base folder: `<base-folder>`
Current folder before rename: `<current-folder>`
Intended folder after rename: `<ordinal>-Pass-<Result>__<base-folder>`
Pass number: `<number>`
Result: `<Completed|Blocked|Failed>`
Proof boundary: `<canonical label from PROOF_BOUNDARIES.md>`
Reports updated: `REPORT.md`, `EVIDENCE.md`, `CHECKLIST.md`, `PASS_HISTORY.md`, `PATCH_NOTES.md` if applicable, `BLOCKERS.md` if applicable
Final verification command(s): `<commands or skipped-check rationale>`
Timestamp: `<ISO-8601 or local timestamp>`

## Summary

<brief outcome>

## Remaining risk

<specific residual risks or "None known from the recorded proof boundary">
```

Use the canonical proof-boundary enum in `PROOF_BOUNDARIES.md`. Do not invent new labels inside a task folder.

Initial `PASS_STATUS.md` templates must stay neutral. They should not preselect `Completed`, `Blocked`, or `Failed`; Kimi chooses the result only after verification or blocker analysis.

## `PASS_HISTORY.md` required entry

Append one entry per finished pass. Never rewrite or delete older entries.

```markdown
## Pass <number> - <Completed|Blocked|Failed> - <timestamp>

- Folder before rename: `<current-folder>`
- Folder after rename: `<ordinal>-Pass-<Result>__<base-folder>`
- Proof boundary: `<canonical label from PROOF_BOUNDARIES.md>`
- Verification: `<commands or skipped-check rationale>`
- Reports updated: `<files>`
- Summary: `<brief outcome>`
- Remaining risk: `<specific residual risks or "None known from the recorded proof boundary">`
```

If the pass is blocked before any source edits, still append an entry with the blocker and authority needed.

## `BLOCKERS.md` required fields

Use `BLOCKERS_TEMPLATE.md` when blocked. At minimum, record:

- Blocker summary
- Safety boundary or missing authority
- Evidence collected
- Recovery attempted
- Exact owner/coordinator decision needed
- Next safe action

## Blocked or failed passes

Use `Blocked` when Kimi cannot safely continue because of missing authority, same-file conflicts, missing provider credentials, destructive risk, unavailable required infrastructure, or an owner decision.

Use `Failed` when Kimi attempted the task but verification failed and the iteration cap or repeated-failure rule stops the pass.

Blocked and failed passes still require:

- `PASS_STATUS.md`
- `PASS_HISTORY.md`
- `REPORT.md`
- `EVIDENCE.md`
- `CHECKLIST.md`
- `BLOCKERS.md` for blocked
- `PATCH_NOTES.md` if anything changed

## Lead review contract

The lead should be able to inspect the renamed folder and answer:

- Which pass number was this?
- Did Kimi complete, block, or fail?
- What proof boundary supports the claim?
- Which commands ran?
- What files changed?
- What remains risky?
- Is the folder name consistent with `PASS_STATUS.md`?
