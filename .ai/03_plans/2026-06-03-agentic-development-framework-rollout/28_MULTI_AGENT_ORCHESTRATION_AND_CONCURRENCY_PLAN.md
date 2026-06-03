# Multi-Agent Orchestration and Concurrency Plan

## Model
Lead agent owns scope, task split, integration, validation, final report. Builder agents edit disjoint scopes. Reviewer/auditor agents are read-only unless separately assigned.

## File ownership
- One write owner per file at a time.
- Shared policy files require sequential edits, not parallel edits.
- Workers report desired edits before touching shared files.

## Worktree/branch isolation
Use worktrees for parallel write-capable agents. Keep read-only critique in current tree if no writes occur. Capture branch/commit before and after.

## Dirty worktree handling
Record dirty files before work. Never overwrite unrelated changes. If unrelated dirt blocks safe edits, create blocker and stop/widen only with authority.

## Handoff format
Task id, owner, mode, files owned, changes made, validation, risks, bugs, commit hash if any, unresolved questions.

## Stop conditions
Overlapping edit conflict, missing authority, provider/admin action, same blocker repeated, validation unable to run with no safe substitute.

## Hermes
Hermes may orchestrate only after a payload defines authority, memory, routing, run-log, and evidence rules.
