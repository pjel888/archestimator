# 03 — Branching and Environment Model

**Plan date:** 2026-06-05
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.

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
| Preview | PR branch | CI + smoke as applicable |
| Staging/closed beta | `staging` | full CI + staging smoke + provider packet |
| Production staged | `main` deploy with no domain assignment | GitHub environment approval + smoke |
| Production current | promoted Vercel deployment | post-promote smoke + rollback proof |

## Rules

1. This plan merge is the last explicitly authorized direct-to-main AI merge.
2. Future AI agents do not edit `main` or `staging` directly.
3. Normal work targets `staging` by PR once staging exists.
4. Production receives only `staging`, `release/*`, or `hotfix/*` PRs.
5. `main` and `staging` require PR, checks, conversations resolved, no force-push, no delete.
6. Admin bypass is disabled only after emergency rollback is documented.

## Staging creation prerequisite

Do not create/protect `staging` until CI is re-enabled and at least one current CI run is green or a temporary advisory-only exception is explicitly accepted.
