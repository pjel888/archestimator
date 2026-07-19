---
description: Create a grounded pull request from already committed task-owned work.
argument-hint: "[base branch] [--draft]"
---

# Grounded Pull Request Adapter

Invoking this command authorizes one push of the current branch and one pull
request creation for already committed task-owned work. It does not authorize
commits, branch switching/creation/deletion, merge, rebase, force push, tags,
releases, or unrelated remote mutation.

1. Load `AGENTS.md` and
   `.ai/08_prompts/000_Git Commit Prompt/GIt-Commit-Prompt.md`.
2. Inspect current branch, mixed-worktree state, upstream, remote divergence,
   existing PRs, candidate commits, and the full base-to-head diff.
3. Stop if the current branch is the base branch, ownership is ambiguous, an
   existing PR conflicts, credentials are missing, remote divergence requires
   integration, or any force/history rewrite would be needed.
4. Preserve all local changes. A clean worktree is not required when the
   committed PR diff is grounded and unrelated local state remains untouched.
5. Use the repository PR template when present. Describe only the actual commits
   and validation that ran; distinguish local evidence from hosted proof.
6. Push the current branch without force, create the PR once, read back its URL,
   base, head, title, and draft state, then report the remaining worktree state.

Do not retry by rebasing, stashing, resetting, committing extra files, or
changing branches. Record the exact external boundary instead.
