# Agent Worktree and Branch Playbook

- Inspect `git status --short --branch` and `git worktree list` first.
- Prefer one write-capable agent per worktree/branch.
- Use short-lived `feat/*`, `fix/*`, `hotfix/*`, `release/*` branches.
- Do not delete branches/worktrees in automated agent runs unless explicitly authorized.
- Use root-level `git add -A` only when staging intended docs/source scope; inspect `git status --short` first.
- Commit coherent batches with evidence.
- Push; do not auto-merge to main unless Philip explicitly authorizes.
