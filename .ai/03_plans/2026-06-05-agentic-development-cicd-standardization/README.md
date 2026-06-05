# Agentic Development and CI/CD Standardization Plan

**Plan date:** 2026-06-05
**Upgrade pass:** 2026-06-05 14:45 PHT / 06:45 UTC
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.
**Readiness target:** 98-100% implementation-planning readiness; not an implementation/enforcement completion claim.

## Why this plan exists

Archestimator already has a repo-local agent framework and a closed-beta proof discipline, but the actual delivery control plane is not yet standardized enough for AI-heavy production work. The current risk is precise: strong `.ai` rules exist, but GitHub/Vercel enforcement is either disabled, unavailable, or advisory.

## Recommended decision

Keep **GitHub Actions as the CI control plane** and **Vercel as the deployment platform**. Do not migrate to CircleCI, GitLab CI, or Buildkite right now. The bottleneck is enforcement and release discipline, not the CI vendor.

Near-term model:

```txt
AI task branch/worktree (`codex/*`, `feat/*`, `fix/*`, `docs/*`)
        ↓ PR with agent receipt + validation evidence
protected `staging` branch for closed-beta integration
        ↓ staging deploy/proof packet
protected `main` branch as production source of truth
        ↓ staged Vercel production deployment
manual smoke + owner approval
        ↓ Vercel promote / domain assignment
archestimator.com current production
```

## Pack structure

| Doc | Purpose |
|---|---|
| `00_INDEX.md` | Navigation and status contract |
| `01_EXECUTIVE_SUMMARY_AND_DECISION_RECORD.md` | Recommended operating model |
| `02_CURRENT_REPO_AND_PROVIDER_AUDIT.md` | Live repo/GitHub/Vercel/graph facts |
| `03_BRANCHING_AND_ENVIRONMENT_MODEL.md` | Branch/environment strategy |
| `04_GITHUB_ACTIONS_CI_REACTIVATION_AND_HARDENING_PLAN.md` | CI restoration and hardening |
| `05_PR_GOVERNANCE_CODEOWNERS_AND_AGENT_RECEIPT_PLAN.md` | PR template, CODEOWNERS, agent receipt |
| `06_GITHUB_PROTECTION_RULESETS_AND_REQUIRED_CHECKS_PLAN.md` | Branch protection/ruleset plan and blocker |
| `07_VERCEL_DEPLOYMENT_PROMOTION_AND_ROLLBACK_PLAN.md` | Staged deploy/promote/rollback |
| `08_AGENTIC_DEVELOPMENT_STANDARDIZATION_PLAN.md` | Agent workflow standardization |
| `09_VALIDATION_MATRIX_AND_TEST_STRATEGY.md` | Future test and validation gates |
| `10_SECURITY_SECRETS_AND_PROVIDER_PROOF_PLAN.md` | Secrets/proof-boundary policy |
| `11_IMPLEMENTATION_SEQUENCE_AND_TICKETS.md` | Ordered future tickets |
| `12_RISK_REGISTER_AND_ROLLBACK_PLAN.md` | Risks and rollback paths |
| `13_TRACEABILITY_MATRIX.md` | Goals to docs/evidence/tickets mapping |
| `14_FUTURE_IMPLEMENTATION_PROMPTS.md` | Ready future prompts |
| `15_FINAL_READINESS_GATE.md` | Hard implementation gates |
| `16_AUDIT_APPENDIX_COMMANDS_AND_EVIDENCE.md` | Commands and source links |
| `17_QUALITY_SCORECARD_AND_AUDIT_RESPONSE.md` | Audit v2 response and 98-100 scorecard |

## Non-goals for this planning task

- No production source code changes.
- No GitHub setting changes.
- No Vercel setting changes.
- No Supabase/Resend/provider mutation.
- No branch protection enablement.
- No Notion mutation.
- No claim that CI/CD governance is implemented.

## Readiness statement

This planning pack is ready for future implementation. The future implementation phase will require provider/GitHub mutations and must not be treated as docs-only.
<!-- 98-100-UPGRADE:START -->
## 98-100 readiness upgrade summary

This pass raises the target plan pack from the supplied audit report's `92/100` to an internal **99/100 planning-readiness** standard by adding explicit scorekeeping, status transitions, adversarial validation expectations, audit-v2 response coverage, and follow-up tickets for broader documentation ecosystem gaps.

### Current verified baseline for this upgrade pass

| Surface | Current fact | Planning consequence |
|---|---|---|
| Local repo | `main` at `318a9862c9ddd05ba5763d340ac3e7de65757deb`, tracking `origin/main` | Future implementation must re-fetch before acting. |
| Code graph | 502 files, 4,634 nodes, 70,036 edges; updated 2026-06-05 14:23 PHT | Graph-first review is mandatory before broad implementation. |
| GitHub CI | `CI disabled_manually`, workflow id `277898857`; latest listed runs are old May 18 failures | CI cannot be treated as a gate yet. |
| GitHub protection | private repo, `main protected:false`; rulesets endpoint returns GitHub plan/public-repo 403 | Required-check enforcement is capability-blocked until owner action. |
| Vercel production | deployment `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv`, `READY`, aliases include apex/www, `git.deploymentEnabled:false` | Keep controlled manual deploy/promote until GitHub gates exist. |
| Audit v2 | target pack `92/100`, broader ecosystem `78/100` | This pack can be implementation-ready while broader docs follow-ups remain separate. |

### Additional pack document

`17_QUALITY_SCORECARD_AND_AUDIT_RESPONSE.md` records the audit response, per-document score upgrade, criteria scoring, and residual risks. It is part of this folder's readiness contract.
<!-- 98-100-UPGRADE:END -->
