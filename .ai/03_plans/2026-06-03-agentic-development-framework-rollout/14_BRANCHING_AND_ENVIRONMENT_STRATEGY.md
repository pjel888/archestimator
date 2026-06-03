# Branching and Environment Strategy

**Date:** 2026-06-03

## Current branch evidence

main is the local and remote default branch; remote branches found: origin/main, origin/feat/share-page-client-review-ux-ui-overhaul, origin/teaser/prelaunch; local branches: main and teaser/prelaunch; no beta/staging/dev/release/hotfix branch exists yet.

## Recommended target branch model

Use Option A: `main` = protected production/default branch; `beta` = protected closed-beta/staging branch; `dev` = not created unless throughput requires; short-lived `feat/*`, `fix/*`, `hotfix/*`, `release/*`, `test/*`, and `spike/*` branches.

| Branch | Purpose | Source | Merge target | Protection | CI/CD gates |
|---|---|---|---|---|---|
| `main` | Protected production branch and GitHub default | Approved release/RC or hotfix PR | Production deployment target | Required checks, no force push, PR required except owner emergency | `validate`, `build`, e2e/perf smoke, provider evidence before production deploy |
| `beta` | New protected closed-beta/staging branch | Approved `feat/*`, `fix/*`, or `release/*` PR | `release/*` or `main` after gate | Required checks, no direct agent push | `validate`, `build`, e2e smoke, launch/provider proof relevant to beta |
| `feat/*` | Short-lived feature branches | `main` or `beta` depending approved target | `beta` first for beta-bound work; `main` only after explicit approval | CI required through PR | Current PR CI plus targeted tests |
| `fix/*` | Non-emergency bug fix | Branch containing bug | `beta` or `main` through PR | CI required | Reproduction/regression test plus standard gate |
| `hotfix/*` | Emergency production fix | `main` | `main`, then backmerge to `beta` if used | Minimal review; no opportunistic refactor | Critical path tests, build, rollback proof |
| `release/*` | Release candidate stabilization | `beta` | `main` | Protected during release window | Full validation, provider proof, manual smoke, release checklist |
| `test/*` / `spike/*` | Temporary QA/experiment | Any approved branch | No direct promotion; cherry-pick only reviewed work | Optional; delete after evidence | Targeted validation only |

## Source branch rules

- Start `feat/*` from `main` unless the work targets already-approved `beta` changes, then branch from `beta`.
- Start `fix/*` from the branch containing the bug.
- Start `hotfix/*` from `main`.
- Start `release/*` from `beta`.
- Start `test/*` or `spike/*` from the branch being investigated; never promote directly.

## Merge target rules

- `feat/*` -> `beta` first for beta-bound work; `main` only with explicit approval.
- `fix/*` -> affected branch through PR.
- `hotfix/*` -> `main`, then backmerge/cherry-pick to `beta` if used.
- `release/*` -> `main` after release proof.

## Promotion and backmerge rules

Promotion requires passing validation, run log, decision updates, provider proof where relevant, and rollback proof for production. Backmerge hotfixes promptly to prevent reintroducing bugs.

## Branch deletion and worktree safety

Delete merged short-lived branches after evidence is archived. Do not delete protected branches/worktrees without explicit approval. Always inspect `git worktree list` before branch deletion.

## GitHub protection rules by branch

| Branch | Required settings |
|---|---|
| `main` | PR required, required checks, force-push disabled, deletions disabled, conversation resolution, admin bypass decision |
| `beta` | PR required, required checks, force-push disabled, deletions disabled |
| `release/*` | PR required, required checks, freeze-window owner review |
| `hotfix/*` | Required checks; emergency review; no force push after PR opens |
| `feat/*` / `fix/*` | PR checks; no direct merge to production without approval |

## Environment mapping

| Environment | Source | Provider mapping |
|---|---|---|
| local | working tree | local `.env.local`, no provider claim |
| preview | feature/fix/spike PRs | Vercel preview; protected if sensitive |
| test | CI and local test harnesses | no production provider mutation |
| beta/staging | `beta` | Vercel beta/staging, Supabase staging/linked proof, Resend test/sandbox as approved |
| production | `main` | production Vercel/Supabase/Resend only after manual approval |

## CI/CD checks by branch

See `16_CI_CD_AND_RELEASE_GUARDRAILS.md`.

## Decision record

Keeping `main` as production and adding only `beta` fits current beta risk because it preserves the existing default branch and CI assumptions while adding a staging gate. A separate `production` branch is deferred because it would require coordinated migration of GitHub defaults, CI triggers, Vercel deployment source, docs, and agent prompts before proof that complexity is needed.
