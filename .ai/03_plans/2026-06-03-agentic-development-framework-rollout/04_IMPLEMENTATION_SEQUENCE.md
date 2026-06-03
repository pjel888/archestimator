# Implementation Sequence

**Date:** 2026-06-03
**Status:** Slow rollout; no framework implementation in this planning task.

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

## Phase details

### Phase 0 — Audit and decision freeze

- Objective: freeze target branch model and source-of-truth hierarchy before changing governance.
- Files likely affected: this folder, `.ai/05_logs`, `.ai/10_state/decisions.md`.
- Exact tasks: rerun branch/CI/provider evidence; confirm `main` production + `beta` staging recommendation; record Philip decision.
- Validation: `git status --short --branch`, `git remote show origin`, `.github/workflows/ci.yml` inspection.
- Exit criteria: approved branch/environment decision exists.
- Rollback point: delete only the new planning notes before settings change.
- Risks: stale branch assumptions; another agent working concurrently.
- Owner: Philip + codebase AI.
- AI alone? AI can audit; Philip approves decisions.

### Phase 1 — Canonical ADD docs in `.ai`

- Objective: create the canonical rules without touching runtime source.
- Files likely affected: `.ai/00_system/AGENTIC_DEVELOPMENT_FRAMEWORK.md`, `.ai/00_system/BRANCH_ENVIRONMENT_STRATEGY.md`, `.ai/00_system/FEATURE_BUG_HOTFIX_PROTOCOL.md`, `.ai/00_system/CI_CD_RELEASE_GUARDRAILS.md`, `.ai/00_system/NOTION_SYNC_PROTOCOL.md`, `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`, `.ai/README.md`, `.ai/10_state/decisions.md`.
- Exact tasks: add docs; update source map; update decisions; create run log; verify links.
- Validation: `git diff --check`; path existence; docs-only diff review.
- Exit criteria: all canonical docs exist and source map points to them.
- Rollback point: revert the docs commit.
- Risks: duplicate source-of-truth docs.
- Owner: codebase AI, Philip approves.
- AI alone? Yes for drafting; no for final branch/protection decision.

### Phase 2 — Agent prompt and task templates

- Objective: make ADD repeatable for future AI agents.
- Files likely affected: `.ai/08_prompts`, `.ai/11_skills`, `.ai/04_tasks`.
- Exact tasks: add feature, bug, hotfix, release, PR review, agent self-check, implementation prompts.
- Validation: run one prompt dry-read; no placeholders; trace every template to validation.
- Exit criteria: templates are usable without chat context.
- Rollback: remove template files.
- Owner: codebase AI.
- AI alone? Yes.

### Phase 3 — GitHub workflow and branch policy plan

- Objective: plan settings before modifying GitHub.
- Files likely affected: `.github` in future, `.ai/00_system`, `.ai/05_logs`.
- Exact tasks: draft PR/issue templates, branch protection matrix, environment rules, required checks.
- Validation: owner reviews settings list before any GitHub mutation.
- Exit criteria: approved settings packet.
- Rollback: do not apply settings until approved.
- Owner: Philip/GitHub admin + AI.
- AI alone? No.

### Phase 4 — CI/CD guardrail implementation plan

- Objective: expand CI only after branch model is approved.
- Files likely affected: `.github/workflows/ci.yml`, future templates, `.ai/00_system`.
- Exact tasks: add triggers for `beta`, `fix/**`, `hotfix/**`, `release/**`; split fast PR and full beta/main gates if needed; add manual deploy rules.
- Validation: PR workflow run on feature branch; no provider deploy without approval.
- Exit criteria: CI catches failures and remains fast enough.
- Rollback: revert workflow YAML.
- Owner: AI + GitHub admin.
- AI alone? AI drafts; admin approves environment/deploy gates.

### Phase 5 — Notion operating system mirror

- Objective: create executive mirror without source-of-truth drift.
- Files likely affected: `17_NOTION_OPERATING_SYSTEM_SYNC_PLAN.md`, `23_NOTION_SYNC_PAYLOAD.md`, optional Notion workspace.
- Exact tasks: create page tree, database properties, templates, anti-drift rules, first manual setup checklist.
- Validation: Notion payload links back to `.ai`; no Notion-only decisions.
- Exit criteria: payload is paste-ready or connector update proof exists.
- Rollback: archive stale payload or fix Notion pages.
- Owner: Notion admin + AI.
- AI alone? AI can prepare payload; admin applies.

### Phase 6 — Dry run

- Objective: prove the protocol on one real feature and one real bug before enforcement.
- Files likely affected: `.ai/04_tasks`, `.ai/05_logs`, `.ai/15_Bugs`, affected future code only in dry-run scope.
- Exact tasks: select low-risk feature; select known bug/blocker; run full ADD phases; record misses; patch templates.
- Validation: dry-run feature and bug have evidence, tests when code changes, logs, and review.
- Exit criteria: both dry runs pass or enforcement is postponed.
- Rollback: keep ADD advisory.
- Owner: Philip + AI.
- AI alone? No; Philip selects dry-run targets.

### Phase 7 — Enforcement

- Objective: make ADD mandatory only after dry-run proof.
- Files likely affected: `.github`, `.ai/00_system`, `.ai/08_prompts`, `.ai/11_skills`.
- Exact tasks: enable PR templates, required checks, run-log requirement, branch protections, validation evidence before merge.
- Validation: protected-branch test and rollback drill.
- Exit criteria: checks block bad changes without blocking emergency owner recovery.
- Rollback: relax GitHub settings with decision log.
- Owner: GitHub admin.
- AI alone? No.

### Phase 8 — Beta release integration

- Objective: connect ADD release flow to existing closed-beta proof gates.
- Files likely affected: `.ai/01_roadmap`, `.ai/03_plans/mvp-launch-readiness-2026-06-01`, Notion mirror.
- Exact tasks: map provider/manual no-go gates into release checklist; require rollback/post-release smoke; mirror status in Notion.
- Validation: provider proof packet and hosted smoke.
- Exit criteria: beta can only proceed with evidence.
- Rollback: beta stays NO-GO.
- Owner: Philip/provider admin + AI.
- AI alone? No.
