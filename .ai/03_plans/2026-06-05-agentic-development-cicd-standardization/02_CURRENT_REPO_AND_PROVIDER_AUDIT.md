# 02 — Current Repo and Provider Audit

**Plan date:** 2026-06-05
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.

## Audit method

The audit used code-review graph MCP, `.ai` source-of-truth docs, `.github/workflows/ci.yml`, `package.json`, `vercel.json`, archived framework docs, read-only GitHub CLI/API, read-only Vercel CLI, and OMX Team read-only worker evidence.

## Repo shape

| Item | Count / fact |
|---|---:|
| Code graph files | 502 |
| Code graph nodes | 4,630 |
| Code graph edges | 69,902 |
| Source TS/TSX files under `src` | 338 |
| App page/route/handler/layout files | 52 |
| API route files | 16 |
| Supabase migrations | 80 |
| Test/e2e files | 199 |
| Vitest files | 182 |
| E2E files | 13 |

Current stack from `package.json`: Next.js `16.2.6`, React/React DOM `19.2.6`, TypeScript `^6.0.3`, Tailwind `^4.3.0`, Supabase JS `2.106.2`, Supabase SSR `0.10.3`, TanStack Query `5.100.14`, Zustand `5.0.14`, Vitest `^4.1.7`, Playwright `^1.60.0`.

## Current CI facts

`.github/workflows/ci.yml` has one `validate` job running checkout, setup Bun, install, `bun run validate`, `bun run build`, Playwright Chromium install, `bun run test:e2e`, and `bun run test:e2e:perf`.

GitHub API/CLI found:

| Check | Result |
|---|---|
| Workflow list | `CI disabled_manually 277898857` |
| Recent workflow runs | only old May 18 failures returned; no June 5 run evidence for current `main` commits |
| Actions enabled | `true` |
| Allowed actions | `all` |
| Default workflow permissions | `read` |
| SHA pinning required | `false` |

Implication: the workflow file exists, but GitHub-hosted CI cannot be treated as an active gate until re-enabled/proven.

## Current GitHub protection facts

| Surface | Result |
|---|---|
| Repo | `pjel888/archestimator`, private, default `main` |
| Viewer permission | `ADMIN` |
| `main` protected | `false` |
| Branch protection endpoint | 403 requiring GitHub Pro or public repo |
| Rulesets endpoint | 403 requiring GitHub Pro or public repo |
| Open PRs | none at audit time |

Implication: required checks/reviews cannot currently be platform-enforced for this private repo.

## Current Vercel facts

`vercel.json` disables all Git-triggered deployments:

```json
{"git":{"deploymentEnabled":false}}
```

Vercel read-only inspect found production deployment `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv`, target `production`, `READY`, created 2026-06-04T18:04Z / 2026-06-05 02:04 Manila, aliases including `archestimator.com` and `www.archestimator.com`, Node Version `24.x`, and deployment config preserving `git.deploymentEnabled:false`.

## Existing agent framework boundary

`.ai/03_plans/2026-06-03-agentic-development-framework-rollout/README.md` is an archived completion pointer. The actual packet is in `.ai/09_archive/store/2026-06-03-agentic-development-framework-rollout/`. Its completion report explicitly defers global GitHub/ruleset/provider enforcement. This new folder is the separate enforcement and CI/CD standardization plan.

## Missing governance files

Current `.github` contains only `.github/workflows/ci.yml`. Missing: PR template, CODEOWNERS, issue templates, release-production workflow, governance job/script, Playwright artifact upload, and required-check documentation.

## Risk summary

| Risk | Severity |
|---|---:|
| CI workflow disabled manually | Critical |
| `main` unprotected and protection unavailable | Critical |
| Missing PR template/CODEOWNERS | High |
| Vercel Git auto-deploy disabled but manual release proof not standardized | Medium |
| Actions allowed all and no SHA pinning requirement | Medium |
| Many active local `codex/*` worktrees | Medium |
