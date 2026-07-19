# Grounded Git Commit Workflow

## Outcome

Commit only the current task's evidenced changes in coherent batches without
absorbing, discarding, or rewriting unfamiliar shared-worktree work. Git
mutation is bounded by the user's exact authorization.

Invoking this prompt authorizes local commits only when the current user request
actually asks for commits. Push, fetch/pull that changes integration state,
branch switching, merge/rebase, branch creation/deletion, worktrees, tags,
releases, and remote mutation each require separate explicit authorization.
Skipped operations are reported; they are not inferred from a commit request.

## Grounding

Before any mutation inspect:

- current branch, status, staged/unstaged/untracked paths, and active Git
  operation state;
- the current user request and conversation-defined ownership;
- actual diffs for every candidate path;
- recent relevant history and repository commit conventions only as needed.

Never infer ownership from proximity, modification time, directory, or a dirty
worktree. Pre-existing staged changes, unrelated tracked files, untracked files,
generated artifacts, local state, and suspected secrets remain separate unless
the current request clearly owns them.

## Safety Invariants

- Preserve every unfamiliar change. Never reset, clean, restore, checkout over,
  stash, amend, rewrite history, force, bypass hooks, or alter Git configuration,
  credentials, signing, or hooks to make a commit succeed.
- Do not use `git add .`, `git add -A`, or `git commit -a`.
- Stage explicit owned paths or safely isolated hunks only.
- Do not unstage or rewrite unfamiliar pre-staged work.
- Do not create empty commits unless explicitly requested.
- Do not commit secrets, credentials, private URLs, runtime state, or ignored
  local artifacts.
- Run GitNexus `detect_changes()` before committing source-symbol changes when
  the repository contract requires it.

## Batch Contract

1. Derive candidate batches from the current task, actual diff, subsystem, and
   dependency boundaries.
2. Re-read status and candidate diffs immediately before staging.
3. Stage only explicit owned paths or safely isolatable hunks.
4. Inspect `git diff --cached --stat`, `git diff --cached --name-status`, and
   the full staged diff.
5. Confirm the staged diff contains one coherent purpose, no unfamiliar work,
   no secret material, and only evidence-backed claims.
6. Commit with the repository's current convention.
7. Re-check status and `git show --stat --oneline --decorate HEAD` after hooks
   and after the commit.
8. Repeat only for remaining authorized owned changes.

Mixed-purpose hunks that cannot be isolated safely are a batch blocker, not
permission to stage the whole file. If hooks fail or modify files, preserve the
output and resulting state, do not bypass or revert, and stop that batch for
diagnosis.

## Message Contract

Use an outcome-oriented subject:

`<type>(<scope>): <precise result>`

Add a body only when it improves future understanding:

- **Context:** the evidenced problem or requirement;
- **Changes:** the coherent implementation boundary;
- **Impact:** supported behavioral, architectural, migration, validation, or
  follow-up implications.

Describe only the actual diff and validation that actually ran. Do not invent
motivation, test results, compatibility claims, or production proof. Avoid
generic subjects such as `updates`, `fixes`, `changes`, `WIP`, or
`miscellaneous improvements`.

## Stop Conditions

Stop before mutation when ownership is ambiguous, staged state contains
unfamiliar work, a safe hunk boundary is unavailable, a secret is suspected, an
index/operation lock or concurrent drift appears, or the requested Git action is
not explicitly authorized.

For separately authorized push/integration/deletion, stop on divergence,
conflict, missing credentials, failed reachability/worktree checks, or any need
for force, stash, reset, content changes outside the owned task, or broader
history rewriting.

A clean worktree is not required. Success means every authorized intended batch
is grounded and committed, and every remaining change or skipped external
operation is explicitly reported.

## Final Report

Report:

- starting and final branch;
- each commit hash, subject, and exact committed paths;
- batch rationale;
- validation and hooks actually run with exact result;
- final `git status --short --branch`;
- remaining staged, unstaged, and untracked paths without claiming ownership;
- push/merge/switch/delete operations performed or skipped and their authority;
- blockers, evidence gaps, and remaining risk.

Do not claim zero data loss, remote containment, clean state, or passing
validation without fresh supporting Git or command evidence.
