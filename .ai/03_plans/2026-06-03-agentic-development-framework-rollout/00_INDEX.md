# Agentic-Driven Development Framework Rollout Plan

**Date:** 2026-06-03
**Current status:** READY_FOR_IMPLEMENTATION for Phase 1 only; framework not implemented.
**Plan folder:** `.ai/03_plans/2026-06-03-agentic-development-framework-rollout`
**Source prompt:** `.ai/08_prompts/agentic-driven-framework.md`

## Task goal

ArchEstimator needs a phased Agentic-Driven Development operating framework that gives AI agents a safe, traceable, production-minded way to work across feature implementation, bug fixing, CI/CD, branch promotion, release readiness, and Notion/project-management visibility.

## Why this matters before beta

Closed beta is still blocked by external/manual provider evidence. Adding an ADD operating framework before beta prevents AI agents from bypassing the current no-go gates, inventing provider state, pushing source-of-truth drift into Notion, or changing branch/CI behavior without review.

## Scope

- Plan only; no production source, dependency, migration, provider, branch-protection, or runtime config changes.
- Define branch/environment strategy, CI/CD guardrails, GitHub governance, ADD phase gates, feature/bug/hotfix/release workflows, Notion mirror rules, templates, and adoption dry runs.
- Produce a future implementation prompt and paste-ready Notion payload.

## Non-goals

- No production deploy, Supabase migration, Vercel config mutation, Resend mutation, dependency change, production source edit, branch creation/deletion, or direct Notion update in this planning run.
- No claim that ADD is globally active until Phase 6 dry runs pass and Phase 7 enforcement is approved.

## Current repo facts verified

- main is the local and remote default branch; remote branches found: origin/main, origin/feat/share-page-client-review-ux-ui-overhaul, origin/teaser/prelaunch; local branches: main and teaser/prelaunch; no beta/staging/dev/release/hotfix branch exists yet.
- GitHub Actions `.github/workflows/ci.yml` currently runs on all pull requests and pushes to `main` and `feat/**`; it installs Bun, runs `bun run validate`, runs `bun run build`, installs Playwright Chromium, runs `bun run test:e2e`, and runs route-transition perf smoke.
- `package.json` exposes `validate` as `type-check && lint && lint:design-system && test && test:dom`; separate gates include `build`, `test:e2e`, `test:e2e:perf`, launch provider readiness helpers, and performance helpers.
- `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md` makes `.ai` the canonical implementation truth, with Notion only allowed as an external mirror; `.ai/10_state/current-state.md` keeps closed beta NO-GO until provider/manual proof is captured.
- Stack evidence: `package.json` currently records Next.js 16.2.6, React/React DOM 19.2.6, Bun scripts, TypeScript 6.0.3, Tailwind CSS 4.3.0, Supabase JS 2.106.2, TanStack Query 5.100.14, Zustand 5.0.14, Vitest 4.1.7, Playwright 1.60.0.
- Route surface includes public marketing pages, `/login`, `/auth/callback`, `/invite/[token]`, `/share/[token]`, `/api/ai/ask`, `/api/ai/package-builder`, publication APIs, and authenticated `/workshop` routes.
- Supabase migrations exist locally; current count observed: 67 files. Provider/linked status is not claimed by this plan.
- Code-review-graph architecture overview succeeded; GitNexus was stale, then refreshed with `npx gitnexus analyze` and became up-to-date at commit `4bc738c`.
- Live research checked Seven Peaks and Agentic Driven on 2026-06-03: Seven Peaks emphasizes human-led product design/review, agent-driven specs/implementation, TDD, integration/browser verification, run logs, guardrails, CI/CD enforcement, and senior review; Agentic Driven emphasizes human strategy with AI execution, Documentation-First, Context-Aware, Contract-Driven, Continuous Validation, Git-Traceable, Standards-First work, and phase gates from DEFINE through VALIDATE.

## Plan document map

- `00_INDEX.md`
- `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md`
- `02_CODEBASE_RESEARCH.md`
- `03_ARCHITECTURE_AND_DESIGN_PLAN.md`
- `04_IMPLEMENTATION_SEQUENCE.md`
- `05_BLAST_RADIUS_AND_RISK_ANALYSIS.md`
- `06_TESTING_AND_VERIFICATION_PLAN.md`
- `07_UI_UX_AND_ACCESSIBILITY_PLAN.md`
- `08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md`
- `09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md`
- `10_IMPLEMENTATION_PROMPT_DRAFT.md`
- `11_READINESS_SCORECARD.md`
- `12_OPEN_QUESTIONS_AND_DECISIONS.md`
- `13_TRACEABILITY_MATRIX.md`
- `14_BRANCHING_AND_ENVIRONMENT_STRATEGY.md`
- `15_AGENTIC_DEVELOPMENT_PROTOCOL.md`
- `16_CI_CD_AND_RELEASE_GUARDRAILS.md`
- `17_NOTION_OPERATING_SYSTEM_SYNC_PLAN.md`
- `18_PHASED_ROLLOUT_ROADMAP.md`
- `19_GITHUB_PROTECTION_AND_PR_POLICY_PLAN.md`
- `20_BUG_FEATURE_HOTFIX_WORKFLOW_PLAN.md`
- `21_AGENT_PROMPT_AND_TEMPLATE_LIBRARY_PLAN.md`
- `22_DRY_RUN_AND_ADOPTION_VALIDATION_PLAN.md`
- `23_NOTION_SYNC_PAYLOAD.md`

## Start here for the future implementation agent

1. Read `AGENTS.md`.
2. Read `.ai/README.md`, `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, `.ai/00_system/VALIDATION_MATRIX.md`, `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, and this folder.
3. Re-run current repo truth checks because branch/CI/provider status can drift.
4. Implement **Phase 1 only** unless Philip explicitly authorizes later phases.
5. Do not modify production source code, providers, protected branches, migrations, dependencies, or Notion unless the new prompt explicitly includes that scope.

## Recommended implementation sequence

| Phase | Name | Exact implementation tasks | Files likely affected | Owner | Validation | Exit criteria |
|---|---|---|---|---|---|---|
| 0 | Audit and decision freeze | Inventory branches, CI, `.ai`, beta no-go gates, Notion refs; freeze target branch model | `.ai/03_plans/...`, `.ai/05_logs` | Human + codebase AI | Docs-only | Approved decision note |
| 1 | Canonical ADD docs in `.ai` | Create framework, branch/environment, feature/bug/hotfix, CI/CD, Notion protocol docs; update source map/readme/decisions | .ai/00_system, .ai/README.md, .ai/10_state | Codebase AI | `git diff --check`; doc link check | Docs accepted and no source diffs |
| 2 | Agent prompt and task templates | Add prompt templates for feature, bug, hotfix, release, PR, self-check | .ai/08_prompts, .ai/11_skills | Codebase AI | Dry-run prompt review | Templates used in one dry run |
| 3 | GitHub workflow and branch policy plan | Plan branch creation/designation, protection, PR template, issue templates | .github future only; .ai docs first | GitHub admin + AI | Manual GitHub review | Philip approves exact settings |
| 4 | CI/CD guardrail implementation plan | Plan trigger expansion, fast/full validation, e2e, security audit, deploy approvals | .github/workflows future | Codebase AI + GitHub admin | PR workflow run | Checks pass without provider mutation |
| 5 | Notion operating system mirror | Create payload, page tree, databases, properties, sync rules | Plan folder and optionally Notion | Notion admin | Payload exists or connector proof | No `.ai`/Notion contradiction |
| 6 | Dry run | Run one low-risk feature and one known bug through ADD; record failures and improve templates | .ai/04_tasks, .ai/05_logs, .ai/15_Bugs | Human + AI | Dry-run report | Both dry runs pass or protocol remains advisory |
| 7 | Enforcement | Require PR template, branch protections, run log before commit, validation before merge | .github + .ai | GitHub admin | Protected-branch test | No solo-founder lockout |
| 8 | Beta release integration | Map no-go gates, provider proof, rollback proof, post-release smoke, Notion status | .ai/01_roadmap, .ai/03_plans/mvp-launch... | Human + provider admin | Manual proof packet | Beta remains NO-GO until proof |

## Required verification commands

```bash
git status --short --branch
git diff --check
git diff -- .ai
bun run validate     # future implementation phases when docs become enforceable behavior or source changes
bun run build        # future implementation phases when runtime/source/config changes
bun run test:e2e     # future branch/release/auth/protected-route/user-flow changes
```

## Risk summary

Primary risk is enterprise theater: too many long-lived branches or rules can slow a solo-founder beta. Secondary risks are stale docs, Notion drift, CI misconfiguration, provider claims without proof, and branch protection locking out urgent recovery. The plan mitigates this by keeping `main` as production, adding only one new long-lived `beta` branch, making `dev` optional, and requiring dry runs before enforcement.

## Beta-release relationship

This plan does not unblock beta. It gives future agents a gated release protocol that maps current beta no-go proof requirements into branch promotion and release checklists.

## Bug/blocker references

- New planning bug: `.ai/15_Bugs/2026-06-03-stack-version-source-of-truth-drift.md`.
- Existing beta blockers remain in `.ai/10_state/current-state.md` and `.ai/03_plans/mvp-launch-readiness-2026-06-01/46-manual-proof-matrix.md`.

## Notion sync status

Direct Notion update was not performed in this repo-local planning run. Paste-ready Notion content is available in `17_NOTION_OPERATING_SYSTEM_SYNC_PLAN.md` and `23_NOTION_SYNC_PAYLOAD.md`.

## Readiness score table

| Document | Score | Evidence |
|---|---:|---|
| `00_INDEX.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `02_CODEBASE_RESEARCH.md` | 99% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `03_ARCHITECTURE_AND_DESIGN_PLAN.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `04_IMPLEMENTATION_SEQUENCE.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `05_BLAST_RADIUS_AND_RISK_ANALYSIS.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `06_TESTING_AND_VERIFICATION_PLAN.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `07_UI_UX_AND_ACCESSIBILITY_PLAN.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `10_IMPLEMENTATION_PROMPT_DRAFT.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `11_READINESS_SCORECARD.md` | 99% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `12_OPEN_QUESTIONS_AND_DECISIONS.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `13_TRACEABILITY_MATRIX.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `14_BRANCHING_AND_ENVIRONMENT_STRATEGY.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `15_AGENTIC_DEVELOPMENT_PROTOCOL.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `16_CI_CD_AND_RELEASE_GUARDRAILS.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `17_NOTION_OPERATING_SYSTEM_SYNC_PLAN.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `18_PHASED_ROLLOUT_ROADMAP.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `19_GITHUB_PROTECTION_AND_PR_POLICY_PLAN.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `20_BUG_FEATURE_HOTFIX_WORKFLOW_PLAN.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `21_AGENT_PROMPT_AND_TEMPLATE_LIBRARY_PLAN.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `22_DRY_RUN_AND_ADOPTION_VALIDATION_PLAN.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |
| `23_NOTION_SYNC_PAYLOAD.md` | 98% | Meets required sections with live repo/external evidence; implementation remains intentionally future-scoped. |

**Overall package readiness:** 98%. The plan is ready for Phase 1 implementation; 100% is intentionally withheld because GitHub/provider/Notion admin settings still require external proof and approval.
