---
description: Compatibility alias for the grounded pull request workflow.
argument-hint: "[base branch] [--draft]"
---

# Grounded PR Compatibility Adapter

Follow `.cursor/commands/pr.md`, `AGENTS.md`, and
`.ai/08_prompts/000_Git Commit Prompt/GIt-Commit-Prompt.md` exactly.

Invocation authorizes one non-force push of the current branch and one pull
request creation for already committed task-owned work. It does not authorize
commits, branch changes, merge, rebase, history rewrite, tags, releases, or any
unrelated remote mutation. Preserve mixed-worktree state and stop at divergence,
missing credentials, ambiguous ownership, or any need for broader authority.
