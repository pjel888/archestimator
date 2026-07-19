---
description: Commit only explicitly authorized, task-owned changes in a shared worktree.
argument-hint: "[task-owned paths or batch description]"
---

# Grounded Commit Adapter

Invocation authorizes local commit creation only. It does not authorize push,
branch, rebase, merge, worktree, tag, release, or remote mutation.

1. Load `AGENTS.md` and
   `.ai/08_prompts/000_Git Commit Prompt/GIt-Commit-Prompt.md`.
2. Inspect branch, staged, unstaged, and untracked state plus the full diff of
   every candidate path.
3. Derive ownership from the current request, never from proximity or a blank
   argument. Blank input does not mean all changes.
4. Preserve unfamiliar staged and unstaged work. Never stash, reset, clean,
   restore, force, bypass hooks, or use broad staging.
5. Stage explicit task-owned paths or safely isolated hunks, inspect the full
   staged diff, and run required GitNexus change detection before source-symbol
   commits.
6. Commit coherent batches using current repository convention, then reread
   status and the created commit.
7. Report exact hashes, paths, evidence, remaining worktree state, skipped Git
   operations, and blockers. A clean worktree is not required.

`$ARGUMENTS` narrows the authorized batch; it never broadens ownership.
