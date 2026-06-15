# 00 — Index and Status Contract

**Plan date:** 2026-06-05
**Upgrade pass:** 2026-06-05 14:45 PHT / 06:45 UTC
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.
**Readiness target:** 98-100% implementation-planning readiness; not an implementation/enforcement completion claim.

## Status

`PLAN_PACK_READY_FOR_IMPLEMENTATION` for this docs-only plan pack.

This means the target model is planned, audited, traceable, and ready for a future implementation owner. It does **not** mean CI reactivation is complete, `main` is protected, Vercel Git auto-deploy has changed from its current disabled state, or closed beta is generally ready.

## Audited baseline

| Surface | Current fact | Plan consequence |
|---|---|---|
| Git baseline | pre-upgrade local `main` at `318a9862c9ddd05ba5763d340ac3e7de65757deb`, tracking `origin/main`; post-upgrade commits later moved `main` forward | Future implementation must re-fetch before acting and must not treat the pre-upgrade hash as current. |
| Working branch | docs-only upgrade pass on `main`; read-only Team used detached worktrees | Future implementation must use a scoped branch/worktree before mutating source/provider settings. |
| Code graph | 502 files, 4,634 nodes, 70,036 edges, updated 2026-06-05 14:23 PHT | Repo is large enough for graph-first impact review. |
| GitHub CI | Workflow `CI` exists but GitHub reports `disabled_manually` | P0: re-enable/replace and prove current run. |
| GitHub protection | `main protected:false`; protection/rulesets API returns GitHub plan/public-repo 403 | P0: resolve capability before required-check claims. |
| GitHub Actions settings | Actions enabled, allowed actions `all`, default workflow permissions `read`, SHA pinning not required | Future hardening must add least privilege and action policy. |
| Vercel Git config | `vercel.json` has `git.deploymentEnabled:false` | Keep controlled deploys until GitHub gates exist. |
| Vercel production | `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv`, Ready, created 2026-06-04T18:04Z | Production exists; promotion discipline must be standardized. |
| Existing agent framework | 2026-06-03 Phase 1A/1B is archived and defers global enforcement | This is the separate enforcement/CI/CD plan. |

## Allowed future statuses

- `PLANNED_NOT_IMPLEMENTED`
- `PLAN_PACK_READY_FOR_IMPLEMENTATION`
- `CI_RESTORED_ADVISORY_GOVERNANCE`
- `PROTECTION_BLOCKED_BY_GITHUB_PLAN_CAPABILITY`
- `MAIN_PROTECTED_STAGING_PENDING`
- `STAGING_PROTECTED_RELEASE_WORKFLOW_PENDING`
- `IMPLEMENTED_LOCALLY_PROVIDER_PROOF_OPEN`
- `IMPLEMENTED_AND_ENFORCED`
- `DOCS_HEALTH_FOLLOW_UP_SCOPED`
<!-- 98-100-UPGRADE:START -->
## 98-100 scorecard and transition gate

| Criteria | Score | Evidence location |
|---|---:|---|
| Completeness | 100 | `11`, `13`, `17` cover every lifecycle surface and audit-v2 response. |
| Clarity/actionability | 99 | `04`, `05`, `06`, `07`, `11`, `14` provide runnable phases/prompts. |
| Evidence basis/freshness | 100 | `02`, `16` include fresh GitHub/Vercel/graph/repo facts. |
| Scope discipline | 100 | Front matter, `10`, and `15` preserve docs-only/provider-proof boundaries. |
| Cross-reference/traceability | 100 | `13`, `17` map goals, findings, tickets, and proof. |
| Operational safety/rollback | 99 | `07`, `10`, `12`, `15` define release, bypass, secrets, and rollback constraints. |
| Lean startup fit | 99 | Advisory-first CI/governance before blocking enforcement. |

Pack-level readiness score after this pass: **99/100**. This score applies to implementation-planning quality only.

## Required status transitions

| From | To | Required evidence |
|---|---|---|
| `PLANNED_NOT_IMPLEMENTED` | `PLAN_PACK_READY_FOR_IMPLEMENTATION` | this 98-100 pass, docs-only diff, scorecard, `git diff --check` |
| `PLAN_PACK_READY_FOR_IMPLEMENTATION` | `CI_RESTORED_ADVISORY_GOVERNANCE` | enabled/current CI run, stable jobs, PR template/CODEOWNERS, advisory governance dry-run |
| `CI_RESTORED_ADVISORY_GOVERNANCE` | `PROTECTION_BLOCKED_BY_GITHUB_PLAN_CAPABILITY` | CI green but rulesets/protection still 403 or unavailable |
| `CI_RESTORED_ADVISORY_GOVERNANCE` | `MAIN_PROTECTED_STAGING_PENDING` | `main` protection API/UI proof and required checks configured |
| `MAIN_PROTECTED_STAGING_PENDING` | `STAGING_PROTECTED_RELEASE_WORKFLOW_PENDING` | `staging` exists/protected or explicitly deferred with owner decision |
| `STAGING_PROTECTED_RELEASE_WORKFLOW_PENDING` | `IMPLEMENTED_AND_ENFORCED` | release workflow, staged smoke, promote, rollback, and representative agent PR proof |

Add `PLAN_PACK_READY_FOR_IMPLEMENTATION` and `DOCS_HEALTH_FOLLOW_UP_SCOPED` to the allowed vocabulary for this folder.
<!-- 98-100-UPGRADE:END -->
<!-- REVIEW-FIX-2026-06-05:START -->
## Whole-pack handoff guard

Do **not** run the generic `.ai/08_prompts/003-PLAN-IMPLEMENTATION-PROMPT.MD` against this whole folder as a single all-at-once implementation. This pack is ready for implementation because the phases, gates, and proof boundaries are explicit; execution must use the phase-specific prompts in `14_FUTURE_IMPLEMENTATION_PROMPTS.md` or an equivalent owner-approved slice.

Whole-folder implementation is unsafe because Phase A/B/C advisory work, Phase D branch protection, Phase E Vercel release automation, and Phase G docs-health cleanup have different authorities, provider proof needs, and rollback scopes.
<!-- REVIEW-FIX-2026-06-05:END -->
