# Agent Run Log, Evidence, and Memory Protocol

## Run log filename
`.ai/05_logs/YYYY-MM-DD-<task-slug>-<mode>-run.md`.

## Required sections
Goal, mode, branch/commit, dirty worktree before/after, source-of-truth read, commands with exit codes, graph/GitNexus evidence, files changed, validation evidence, provider/manual proof status, bugs/blockers, `.ai` updates, commit/push status, final status.

## Evidence formats
- Command: `[exit N] command — purpose — key output`.
- Graph: tool, query/base, result summary, failures.
- Test: command, result, count, skips/failures.
- Provider proof: source, timestamp, screenshot/log/path; local-only evidence must be labeled local-only.

## Memory updates
Update `.ai/10_state` only for true project reality; `.ai/04_tasks` for active task packets; `.ai/15_Bugs` for blockers; `.ai/09_archive` only after verified completion.

## Language rule
Do not say implemented/enforced/launched/ready when only planned, local-only, or provider-proof pending.
