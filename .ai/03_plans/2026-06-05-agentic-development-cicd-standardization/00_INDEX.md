# 00 — Index and Status Contract

**Plan date:** 2026-06-05
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.

## Status

`PLAN_PACK_COMPLETE_WHEN_COMMITTED` for this docs-only plan pack.

This means the target model is planned and audited. It does **not** mean GitHub Actions has been re-enabled, `main` is protected, Vercel Git auto-deploy is enabled, or closed beta is generally ready.

## Audited baseline

| Surface | Current fact | Plan consequence |
|---|---|---|
| Git baseline | `origin/main` at `7dce7a3c2dfa1ae7dd5d33d638313802316e8023` after final rebase/audit refresh | Future implementation must re-fetch before acting. |
| Working branch | `codex/2026-06-05-agentic-cicd-planning` | Planning was isolated from active Codex worktrees. |
| Code graph | 502 files, 4,630 nodes, 69,902 edges, updated 2026-06-05 11:50 | Repo is large enough for graph-first impact review. |
| GitHub CI | Workflow `CI` exists but GitHub reports `disabled_manually` | P0: re-enable/replace and prove current run. |
| GitHub protection | `main protected:false`; protection/rulesets API returns GitHub plan/public-repo 403 | P0: resolve capability before required-check claims. |
| GitHub Actions settings | Actions enabled, allowed actions `all`, default workflow permissions `read`, SHA pinning not required | Future hardening must add least privilege and action policy. |
| Vercel Git config | `vercel.json` has `git.deploymentEnabled:false` | Keep controlled deploys until GitHub gates exist. |
| Vercel production | `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv`, Ready, created 2026-06-04T18:04Z | Production exists; promotion discipline must be standardized. |
| Existing agent framework | 2026-06-03 Phase 1A/1B is archived and defers global enforcement | This is the separate enforcement/CI/CD plan. |

## Allowed future statuses

- `PLANNED_NOT_IMPLEMENTED`
- `CI_RESTORED_ADVISORY_GOVERNANCE`
- `PROTECTION_BLOCKED_BY_GITHUB_PLAN_CAPABILITY`
- `MAIN_PROTECTED_STAGING_PENDING`
- `STAGING_PROTECTED_RELEASE_WORKFLOW_PENDING`
- `IMPLEMENTED_LOCALLY_PROVIDER_PROOF_OPEN`
- `IMPLEMENTED_AND_ENFORCED`
