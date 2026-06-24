- 
  - Perform a Git-only repository synchronization and consolidation task. Do not create, edit, format, generate, restore, or delete any project files. Do not run coding agents, formatters, migrations, build tools, or commands that may modify the worktree.

    Primary objectives:
    1. Preserve every existing change with zero data loss.
    2. Commit and push all current worktree changes in meaningful batches.
    3. Merge the current working branch into `main` when applicable.
    4. Leave the repository on an up-to-date `main` branch that is pushed to the remote.
    5. Delete an outdated branch only after proving that all of its commits are safely contained in remote `main`.

    Mandatory safety rules:
    - Begin by inspecting the repository state: current branch, worktree status, staged and unstaged changes, untracked files, configured remotes, active worktrees, local branches, remote branches, upstream relationships, and commits ahead of or behind `main`.
    - Assume other coding agents may be changing the repository concurrently. Re-run `git status` and inspect the relevant diffs immediately before every staging, commit, merge, push, branch switch, or deletion.
    - Never discard, overwrite, clean, reset, restore, checkout over, or remove any worktree change.
    - Never use `git reset --hard`, `git clean`, forced checkout, forced branch deletion, `git push --force`, or `git push --force-with-lease`.
    - Do not amend or rewrite existing commits.
    - Do not modify files to resolve merge conflicts. If a merge, rebase, checkout, or pull would require file-content changes or risk losing work, stop that operation safely and report the exact blocker.
    - Do not use rebase unless it is demonstrably safe, unnecessary for conflict resolution, and does not rewrite shared history. Prefer a normal merge.
    - Do not delete any branch merely because it appears old. A branch may be deleted only after verifying that every commit unique to it is reachable from the successfully pushed remote `main`.
    - Preserve all untracked files. Include them in commits when they are legitimate repository changes; otherwise leave them untouched and explicitly report them.
    - Do not blindly merge every branch. Inspect other local and remote branches for commits not contained in `main`, but merge only branches that are clearly part of the completed work and can be integrated without conflict or file modification. Report uncertain, active, experimental, or unrelated branches instead of merging them.

    Commit batching requirements:
    - Inspect the staged and unstaged diffs without altering them.
    - Group changes into coherent commits based on their actual purpose, affected subsystem, and dependency relationships.
    - Stage explicit files or paths for each batch rather than indiscriminately staging unrelated concurrent changes.
    - Before committing each batch, verify that the staged diff contains only the intended changes.
    - After each commit, re-check the worktree because other agents may have added or changed files during the operation.
    - Continue until all legitimate current worktree changes are committed, or until a safety constraint prevents further action.

    Commit-message standard:
    Every commit message must be detailed, specific, and meaningful. Generic messages such as “updates,” “fixes,” “changes,” “WIP,” or “miscellaneous improvements” are prohibited.

    Use this structure for every commit:

    <type>(<scope>): <precise outcome-oriented summary>

    Context:
    - Explain why this change exists and the problem or requirement it addresses.

    Changes:
    - Describe the important files, components, behaviors, interfaces, or workflows affected.
    - Explain how the related changes form one coherent batch.

    Impact:
    - State the expected functional, architectural, operational, or user-facing effect.
    - Mention compatibility, migration, testing, deployment, or follow-up implications when evident from the diff.

    The subject line must be concise and imperative. The body must be comprehensive enough that a future maintainer can understand the purpose and boundaries of the commit without reopening the entire diff. Describe only what is supported by the actual changes; do not invent motivations, test results, or implementation details.

    Execution sequence:
    1. Inspect and document the complete Git state.
    2. Fetch remote references without modifying worktree files.
    3. Determine whether the current branch is `main`.
    4. Commit all current changes in coherent, carefully verified batches.
    5. Push the current branch to its configured remote branch.
    6. If already on `main`: 
       - Confirm local `main` is safely synchronized with remote `main`.
       - Push all new commits.
       - Do not perform a redundant self-merge.
    7. If currently on another branch: 
       - Record its exact branch name and final commit hash.
       - Confirm its commits are pushed.
       - Ensure switching to `main` will not overwrite or hide any worktree changes.
       - Switch to `main`.
       - Fetch and safely update local `main` from remote `main` using fast-forward-only behavior where applicable.
       - Merge the original branch into `main` using a normal, non-destructive merge.
       - Do not squash or rewrite history unless the repository explicitly requires it.
       - Push the updated `main`.
    8. Verify that remote `main` contains every commit from the original branch and every commit created during this task.
    9. Inspect all other local and remote branches for commits not reachable from `main`. 
       - Merge only clearly completed, relevant branches that can be integrated safely under these rules.
       - Do not guess about ambiguous branches.
       - Report any branch still ahead of `main`, including its unique commit count and latest commit.
    10. Delete the original outdated branch only after: 
        - remote `main` has been successfully pushed;
        - the original branch tip is confirmed reachable from remote `main`;
        - no worktree uses that branch;
        - no uncommitted data depends on it.
          Delete its remote counterpart only when the same containment checks pass and it is clearly safe to remove.
    11. Finish on local `main`.
    12. Perform a final fetch and verification that: 
        - local `main` and remote `main` point to the expected history;
        - the worktree has no uncommitted changes that were accidentally omitted;
        - no commits or untracked files were lost;
        - no unresolved merge, rebase, cherry-pick, or revert operation remains;
        - all remaining branches with unique commits are explicitly reported.

    Final report:
    Provide:
    - the starting branch;
    - the final branch;
    - every commit created, with full subject and short hash;
    - how the changes were divided into batches;
    - branches merged;
    - branches pushed;
    - branches deleted locally or remotely;
    - branches intentionally not merged and why;
    - confirmation that remote `main` contains the completed work;
    - the final `git status`;
    - any remaining risks, untracked files, divergent branches, or blockers.

    Do not claim zero data loss unless the final reachability, worktree, and remote verification checks support that conclusion.