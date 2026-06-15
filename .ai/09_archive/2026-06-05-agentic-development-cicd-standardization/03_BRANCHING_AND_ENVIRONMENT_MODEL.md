# 03 — Branching and Environment Model

**Plan date:** 2026-06-05
**Upgrade pass:** 2026-06-05 14:45 PHT / 06:45 UTC
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.
**Readiness target:** 98-100% implementation-planning readiness; not an implementation/enforcement completion claim.

## Target branch model

| Branch/pattern | Purpose | Direct pushes after policy | Deploy target |
|---|---|---:|---|
| `main` | production source of truth | No | staged Vercel production + promote |
| `staging` | closed-beta/pre-production integration | No | staging/preview deployment |
| `codex/*` | AI task branches | only own branch | preview only |
| `feat/*` | feature branches | only own branch | preview only |
| `fix/*` | bug-fix branches | only own branch | preview only |
| `docs/*` | docs-only branches | only own branch | no deploy unless desired |
| `hotfix/*` | urgent production fixes | controlled | staged production after checks |
| `release/*` | release candidates | controlled | staged production candidate |

## Why `codex/*` is first-class

The current repo already has many local Codex branches. Governance must recognize `codex/*` explicitly instead of forcing AI branches into `feat/*`.

## Environment mapping

| Environment | Source | Gate |
|---|---|---|
| Local | worktree branch | targeted validation |
| Preview | PR branch or manual Vercel CLI preview deployment | CI + smoke as applicable |
| Staging/closed beta | `staging` plus an explicit manual preview/staging deployment while Git deploys remain disabled | full CI + staging smoke + provider packet |
| Production staged | `main` deploy with no domain assignment | GitHub environment approval + smoke |
| Production current | promoted Vercel deployment | post-promote smoke + rollback proof |

## Manual preview/staging deploy rule while Vercel Git deploys are disabled

Because `vercel.json` currently keeps `git.deploymentEnabled:false`, a `staging` branch by itself will not create a trustworthy hosted staging surface. Until branch-specific Vercel Git deployment is explicitly re-enabled after protected-branch proof, staging proof must use a manual Vercel CLI deployment from the approved `staging` SHA or a clearly named preview deployment URL recorded in the PR/provider packet.

Accepted staging proof must include: source SHA, deployment URL/id, environment used, smoke commands/results, Vercel error-log check, and the statement that it is not production alias promotion.

## Rules

1. This plan pack and the 98-100 docs-only upgrade pass are explicitly authorized planning updates; future AI implementation should not edit `main` directly without a new explicit owner prompt.
2. Future AI agents do not edit `main` or `staging` directly.
3. Normal work targets `staging` by PR once staging exists.
4. Production receives only `staging`, `release/*`, or `hotfix/*` PRs.
5. `main` and `staging` require PR, checks, conversations resolved, no force-push, no delete.
6. Admin bypass is disabled only after emergency rollback is documented.

## Staging creation prerequisite

Do not create/protect `staging` until CI is re-enabled and at least one current CI run is green or a temporary advisory-only exception is explicitly accepted.

## Current advisory staging status

On 2026-06-05 08:47Z, `origin/staging` was created from the then-current
`origin/main` SHA `07110b9fd5bd8a41890f5e4eaa2fdc14d0aefd1a` under the
temporary advisory-only exception. Branch-bootstrap closeout keeps
`origin/staging` fast-forwarded with `origin/main`; verify live with
`git rev-list --left-right --count origin/main...origin/staging`. GitHub API
proof reported `staging protected:false`.

This does **not** satisfy Phase D protection, required checks, hosted staging,
or release proof. It only gives Mac mini and MacBook Pro agents a shared
integration branch name to target by PR once the PR workflow is active. Agents
still must not direct-edit `main` or `staging`; use scoped task branches first.
<!-- 98-100-UPGRADE:START -->
## Branch protection invariants

1. `main` and `staging` require PRs, stable required checks, no force-push, and no deletion once GitHub capability exists.
2. Required check names must match workflow job names exactly.
3. Admin bypass can be disabled only after an emergency bypass/rollback record exists.
4. Merge queues/`merge_group` may be added later, but not before stable CI.
5. `codex/*` branches may be pushed by agents, but production-impacting changes merge only through PR.

## Branch model acceptance fixtures

Future governance tests should include valid `codex/* -> staging`, invalid `codex/* -> main`, valid `staging -> main`, invalid docs-only/source mismatch, emergency `hotfix/*` with bypass record, and stale proof older than current SHA.
<!-- 98-100-UPGRADE:END -->
