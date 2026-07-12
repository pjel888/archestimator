# Shipping Workflow

Load this reference only when the current user explicitly requests a commit,
push, pull request, or release-oriented handoff. It does not grant authority for
any Git, provider, test, build, browser, screenshot, or deployment action.

## Readiness

1. Confirm the requested implementation requirements are complete.
2. Read `git status --short --branch` and the final diff; preserve unrelated
   shared-worktree changes.
3. Run the cheapest decisive non-test checks applicable to the changed files.
4. Run tests, builds-as-gates, browser automation, screenshots, or broad QA only
   when the current user explicitly requested that evidence for this task.
5. Record any real validation gap without turning missing optional proof into an
   implementation blocker.

## Review

Use a fresh direct review for a bounded change. Invoke `ce-code-review` only
when the user requested review or a distinct material risk benefits from
independent judgment. Do not require reviewer tiers, line-count thresholds,
persona quotas, mandatory simplifier passes, or residual-work ceremonies.

## Git And PR Actions

- Perform only the exact Git action the current user requested.
- Do not create/switch branches or worktrees, stage, commit, push, open a PR, or
  deploy as an implied shipping step.
- When a commit is requested, follow the repository Lore Commit Protocol.
- When a PR is requested, summarize scope, evidence actually gathered, known
  residuals, and relevant operational notes. Do not invent test results,
  provider proof, monitoring requirements, or screenshots.

## Stop

Stop when the requested Git/PR handoff is complete and its evidence is reported.
Do not append an automatic CI, browser, release, or monitoring phase.
