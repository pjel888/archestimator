# Common Kimi Operating Protocol

This protocol applies to every prompt in `.ai/08_prompts/kimi/*/PROMPT.md`.

## Required startup

Before doing task work, Kimi must read:

1. `AGENTS.md`
2. The FAST PATH block at the top of `.ai/10_state/current-state.md`
3. The task folder's `PROMPT.md`
4. The task folder's `CHECKLIST.md`
5. `../COMMON_KIMI_OPERATING_PROTOCOL.md`
6. `../PASS_COMPLETION_PROTOCOL.md`
7. `../PROOF_BOUNDARIES.md`
8. `../COORDINATION_MATRIX.md`

Kimi should pull deeper `.ai` docs only when the task risk requires them. Do not linear-read long state logs.

## Dedicated `/goal`

Use this shape when launching a task:

```text
/goal Complete the Kimi task whose base folder is <base-folder>. Locate the current task folder under .ai/08_prompts/kimi by finding either <base-folder> or a folder ending in __<base-folder>; then follow that folder's PROMPT.md exactly. Run the DISCOVER -> PLAN -> EXECUTE -> VERIFY -> REPORT -> DECIDE -> MARK PASS loop until verified complete or blocked by a documented safety boundary. Write all task reports into the current task folder. Before final response, update PASS_STATUS.md, append PASS_HISTORY.md, and rename the task folder using PASS_COMPLETION_PROTOCOL.md, for example 1st-Pass-Completed__<base-folder>.
```

Task-specific `/goal` text may name the base folder, but it must not depend on the unprefixed task folder path after pass 1.

## Autopilot loop

Kimi should keep going without asking for permission on clear, local, reversible work.

Loop steps:

1. `DISCOVER`: inspect the named files, current worktree status, current tests, and any prior same-folder reports.
2. `PLAN`: write a short local plan in `REPORT.md` before source edits. Include file scope, risks, and verification.
3. `EXECUTE`: make the smallest coherent change. Preserve unrelated work.
4. `VERIFY`: run the narrowest command that proves the claim. Add broader checks only when the prompt requires them or risk justifies them.
5. `REPORT`: update `REPORT.md`, `EVIDENCE.md`, `CHECKLIST.md`, `PASS_STATUS.md`, and `PASS_HISTORY.md`.
6. `DECIDE`: continue, stop complete, stop failed, or stop blocked. Do not claim completion from intent.
7. `MARK PASS`: update `PASS_STATUS.md` and rename the task folder with the pass-result prefix from `PASS_COMPLETION_PROTOCOL.md`.

Default iteration cap: 5 loops. Stop earlier when verified complete.

## Multi-agent conflict protocol

Assume multiple coding agents are in the same checkout.

Before editing:

- Run `git status --short`.
- Read the exact files to be edited.
- If a file has unrelated changes, preserve them.
- If another agent is editing the same file and the conflict is not trivially avoidable, stop and write `BLOCKERS.md`.

Never:

- Run `git reset --hard`, `git checkout --`, or destructive cleanup.
- Revert unrelated changes.
- Move or delete another agent's report.
- Claim provider proof from local-only evidence.

## Database safety boundaries

Archestimator's intended Supabase project is `ebxxqidacheyapmmzavr`.

Allowed by default:

- Local repo edits.
- Local tests.
- Draft migrations under review.
- Local SQL proof scripts.
- Preflight SQL text and apply checklists.

Not allowed unless the launch `/goal` or latest coordinator message explicitly includes `provider-apply`, confirms target project `ebxxqidacheyapmmzavr`, and Kimi has the needed credentials/context:

- Production writes.
- Touching unrelated Supabase projects.
- Enabling paid add-ons such as PITR.
- Irreversible destructive data loss.
- Printing secrets.
- Deployment or provider changes.

## Required same-folder reports

Kimi must keep reports in the task folder:

- `REPORT.md`: narrative status, decisions, changed files, residual risk.
- `EVIDENCE.md`: commands, outputs, proof boundary, skipped checks with reasons.
- `CHECKLIST.md`: task-specific acceptance checklist, checked as completed.
- `PATCH_NOTES.md`: required only when source files changed.
- `BLOCKERS.md`: required only when blocked.
- `PASS_STATUS.md`: required for every pass, even when no source files changed.
- `PASS_HISTORY.md`: append-only history required for every pass; never rewrite older entries.

## Pass-completion folder prefix

At the end of each pass, Kimi must mark the task folder for later double-checking.

Use this format:

```text
<ordinal>-Pass-<Result>__<base-folder>
```

Examples:

- `1st-Pass-Completed__01-workspace-homebase-rpc-fallback`
- `1st-Pass-Blocked__02-one-published-publication-per-project`
- `2nd-Pass-Completed__01-workspace-homebase-rpc-fallback`

Rules:

- `Result` is exactly one of `Completed`, `Blocked`, or `Failed`.
- The base folder is the original task slug without any pass prefix.
- On later passes, replace the existing leading pass prefix; do not stack prefixes.
- Rename only the task folder Kimi owns.
- If the environment prevents safe folder rename, leave the folder in place and record the failure in `PASS_STATUS.md` and `BLOCKERS.md`.
- Update `PASS_STATUS.md` before renaming so the status travels with the folder.
- Append `PASS_HISTORY.md` before renaming so older pass evidence survives later status rewrites.

## Completion audit

Before claiming complete, Kimi must prove:

- The prompt's explicit scope was preserved.
- All acceptance checklist items are checked.
- Every changed behavior has verification evidence.
- Reports are in the same folder.
- `PASS_STATUS.md` exists and agrees with the folder prefix.
- `PASS_HISTORY.md` contains the completed, blocked, or failed pass entry.
- No unrelated work was reverted or hidden.
- Remaining risks are specific and bounded.
