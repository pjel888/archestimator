You are ChatGPT acting as a senior startup technical founder, principal engineer, product strategist, technical architect, implementation planner, QA strategist, security/performance reviewer, release-engineering lead, DevOps architect, GitHub governance designer, Notion operating-system designer, and codebase-AI workflow designer.

Your job is to create ONE complete implementation plan inside the local ArchEstimator repository for gradually implementing an enterprise-ready Agentic-Driven Development framework across the codebase, branches, CI/CD, release process, bug process, feature process, agent protocols, and Notion operating workspace.

FEATURE / CHANGE REQUEST:
Create a phased implementation plan for ArchEstimator to adopt an enterprise-ready Agentic-Driven Development operating framework as we approach beta release.

The plan must cover, at minimum:

* Production, beta/staging, testing, development, feature, hotfix, and release branch strategy.
* GitHub branch protection and PR rules.
* Environment strategy for production, beta/staging, preview, local, and test.
* CI/CD guardrails for feature work, bug fixes, hotfixes, beta promotion, and production release.
* Agentic-Driven Development enforcement for every codebase AI agent.
* Feature implementation protocol.
* Bug investigation and bug-fix protocol.
* Hotfix protocol.
* Release promotion protocol.
* Test/validation protocol.
* Documentation-first workflow.
* Run logs, decision logs, interface contracts, agent context files, and phase-based work records.
* Notion mirror/update strategy so Notion becomes the executive/project-management layer while `.ai` remains the canonical repo implementation truth.
* A slow, safe rollout plan that does not break the current beta-readiness work.

Use these ADD references as conceptual inputs:

* [https://sevenpeakssoftware.com/blog/a-practical-guide-to-agentic-software-development](https://sevenpeakssoftware.com/blog/a-practical-guide-to-agentic-software-development)
* [https://agenticdriven.dev/en](https://agenticdriven.dev/en)

Baked-in research summary to use if web access is unavailable:

* Seven Peaks describes agentic software development as agents taking work from specifications through implementation and verification, while humans lead discovery, architecture, review, and problem-solving.
* Seven Peaks’ useful workflow stages are: product design, specification generation, review readiness, product implementation, and result verification.
* Seven Peaks emphasizes templates/guardrails, architecture tests, constructive exceptions, terminology consistency, CI/CD enforcement, template-level constraints, run logs, TDD, integration testing, browser automation, and senior engineer review.
* Agentic Driven emphasizes humans defining strategy while AI agents execute tasks.
* Agentic Driven’s core operating ideas include documentation-first work, context-awareness, contract-driven development, continuous validation, git traceability, and standards-first delivery.
* Agentic Driven’s phase model should be adapted into ArchEstimator as: DEFINE, DISCOVER, DESIGN, SETUP, BUILD, VALIDATE, and RELEASE.
* Agentic Driven’s practical repo artifacts include context/config files, journal/run logs, decisions/ADR records, interface contracts, phase folders, exit criteria, and frequent git commits.

Repository:

* GitHub repo: `pjel888/archestimator`
* Local repo path: `/Users/philiplewis/archestimator`
* Project name: `ArchEstimator`
* Main branch: `main`
* Remote: `origin`

Known ArchEstimator repo facts that must be verified from live files:

* ArchEstimator uses `.ai` as the shared project brain for all AI agents.
* The codebase AI must read `AGENTS.md` first.
* The codebase AI must read the `.ai` source-of-truth chain before planning.
* Stack is currently described as Next.js 16, React 19, Bun, TypeScript, Tailwind CSS v4, Supabase/Postgres, TanStack Query, Zustand, Vitest/Bun tests, Playwright, GitHub Actions, and a strict design-system linter.
* `README.md` currently describes CI as GitHub Actions running on PRs and pushes to `main` and `feat/*`, with `bun install --frozen-lockfile`, `bun run validate`, `bun run build`, and Playwright smoke.
* `AGENTS.md` says this Next.js version may have breaking API/convention changes and agents must read local Next.js docs under `node_modules/next/dist/docs/` before modifying framework APIs or route conventions.
* `AGENTS.md` says the repo uses GitNexus and code-review-graph. Use those tools before broad grep-style exploration if available.
* `.ai/00_system/VALIDATION_MATRIX.md` defines the current validation baseline:

  * `bun run validate`
  * `bun run build`
  * `git diff --check`
  * `bun run test:e2e` when browser/auth/protected-route/user-flow changes require it
  * `bun run lint:design-system` for app/workshop UI changes
  * Supabase migration/type commands only when schema changes and only under repo safety rules.
* `.ai/10_state/current-state.md` currently records that closed beta remains NO-GO until external/manual evidence exists for linked Supabase, Vercel, Resend, hosted auth, hosted E2E/manual smoke, legal/support, backup/PITR, and other provider proof.
* `.ai/10_state/decisions.md` currently records that the repo uses feature branches/PRs and must not automatically merge to `main`.

This is PLAN CREATION ONLY.
NO CODE IMPLEMENTATION.
DO NOT modify production source code.
DO NOT modify app behavior.
DO NOT modify dependencies.
DO NOT modify migrations.
DO NOT modify package files unless the plan explicitly says future implementation may need to.
DO NOT modify build/runtime configuration during this planning task.
DO NOT modify generated files.
DO NOT touch secrets.
Only create/update `.ai` planning and documentation files.
If you create a Notion sync payload, keep it inside `.ai`; do not claim Notion was updated unless you actually have a Notion tool and used it successfully.

You must act like:

* Senior startup technical founder.
* Principal engineer.
* Product strategist.
* Technical architect.
* QA strategist.
* Security/performance reviewer.
* Release-engineering lead.
* DevOps architect.
* GitHub governance designer.
* Notion operating-system designer.
* Implementation planner.
* Documentation maintainer.
* Careful git/worktree operator.

## 1. Initial repo safety check

Run these commands first:

```bash
pwd
git rev-parse --show-toplevel
git status --short --branch
git branch --show-current
git worktree list
git remote -v
git fetch --prune origin
git log --oneline -5
```

Assume another codebase AI agent may be working on the repo.

You must not:

* Force push.
* Use `git reset --hard`.
* Use `git clean -fd`.
* Overwrite unrelated dirty files.
* Stage unrelated files.
* Modify production source code.
* Delete branches.
* Delete worktrees.
* Touch secrets.
* Create or delete remote branches during this planning task.
* Change GitHub branch protection settings during this planning task.
* Change Vercel/Supabase/Resend/provider settings during this planning task.
* Claim provider state from local-only evidence.

If unrelated dirty files exist, leave them alone and mention them in the final report.

## 2. Required reading order

Before creating the plan, read these files:

```txt
AGENTS.md
.ai/README.md
.ai/00_system/DOCS_SOURCE_OF_TRUTH.md
.ai/00_system/AGENT_OPERATING_PROTOCOL.md
.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md
.ai/00_system/VALIDATION_MATRIX.md
.ai/10_state/current-state.md
.ai/10_state/decisions.md
.ai/10_state/known-issues.md if present
.ai/01_roadmap/README.md
DESIGN.md
package.json
README.md
.github/workflows/ci.yml if present
Relevant specs inside .ai/06_specs
Relevant active/archived plans related to beta release, CI/CD, GitHub workflow, AI agents, release readiness, launch readiness, or manual/provider proof
```

You must verify all repo facts from live files because README/current-state/docs may drift.

## 3. Codebase and governance research requirements

Inspect enough of the repo to understand:

* Current project structure.
* Current branch structure:

  * local branches;
  * remote branches;
  * default branch;
  * branch naming patterns already used;
  * whether any `prod`, `production`, `beta`, `stage`, `staging`, `test`, `dev`, `release/*`, or `hotfix/*` branches already exist.
* Current GitHub Actions workflows and branch triggers.
* Current scripts in `package.json`.
* Current validation gates.
* Current app routes and API routes at a high level.
* Current architecture and data flow at a high level.
* Current Supabase/auth/RLS/data boundaries at a high level.
* Current beta-release blockers and no-go gates.
* Current `.ai` operating protocols.
* Current agent/tooling expectations.
* Existing docs/plans/specs related to:

  * CI/CD;
  * beta launch;
  * provider evidence;
  * release checklists;
  * branch policies;
  * AI agents;
  * GitNexus/code-review-graph;
  * security hardening;
  * bug plans;
  * run logs;
  * task packets.
* Whether a `docs/` folder already exists and what it contains.
* Whether `.ai/08_prompts`, `.ai/11_skills`, `.ai/12_agents`, `.ai/13_research`, `.ai/15_Bugs`, or similar folders exist and how they are used.
* Whether Notion is referenced anywhere in repo docs.
* Whether there is a current source-of-truth conflict between `.ai`, README, AGENTS, current-state, decisions, or archived plans.

Use GitNexus/code-review-graph tools first if available:

* architecture overview;
* graph search for CI/CD, validation, branch, release, beta, agent protocol, AI workflow, bug protocol;
* impact/risk surfaces for docs/system workflow changes if relevant.

If GitNexus/code-review-graph tools are unavailable, document that and fall back to:

```bash
rg --files
rg -n "branch|production|staging|stage|beta|release|hotfix|CI|workflow|validate|deploy|Vercel|Supabase|Notion|agent|AGENTS|GitNexus|code-review-graph|bug|run log|journal|decision|ADR|interface|contract|ADD|Agentic" .
git branch -a
git remote show origin
git log --oneline --decorate -20
find .github -maxdepth 3 -type f -print
find .ai -maxdepth 3 -type f -print
```

Do not hallucinate files, APIs, routes, components, services, database tables, migrations, scripts, tests, branch names, workflows, provider settings, or architecture.

## 4. External ADD research requirement

Use web research if your environment has it. Research both references:

* Seven Peaks practical guide to agentic software development.
* Agentic Driven methodology.

If web access is unavailable, use the baked-in research summary from this prompt and clearly state in `02_CODEBASE_RESEARCH.md` that external sources were not live-verified by the codebase agent.

Extract only what is useful for ArchEstimator:

* human-led strategy and architecture;
* agent-executed tasks;
* documentation-first development;
* phase-based work;
* explicit exit criteria;
* run logs;
* decision logs;
* interface contracts;
* TDD/verification loops;
* integration/browser verification;
* CI/CD enforcement;
* architecture tests;
* terminology consistency;
* template-level constraints;
* senior review;
* context hygiene;
* git traceability.

Do not copy external articles verbatim.
Do not make the plan dependent on external sites being reachable later.

## 5. Planning folder creation

Create a new folder inside:

```txt
/Users/philiplewis/archestimator/.ai/03_plans
```

Folder format:

```txt
YYYY-MM-DD-agentic-development-framework-rollout
```

Use the actual system date from the machine.
Do not guess the date from memory.

Example:

```txt
.ai/03_plans/2026-06-03-agentic-development-framework-rollout
```

## 6. Required plan documents

The plan folder must include at minimum:

```txt
00_INDEX.md
01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md
02_CODEBASE_RESEARCH.md
03_ARCHITECTURE_AND_DESIGN_PLAN.md
04_IMPLEMENTATION_SEQUENCE.md
05_BLAST_RADIUS_AND_RISK_ANALYSIS.md
06_TESTING_AND_VERIFICATION_PLAN.md
07_UI_UX_AND_ACCESSIBILITY_PLAN.md
08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md
09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md
10_IMPLEMENTATION_PROMPT_DRAFT.md
11_READINESS_SCORECARD.md
12_OPEN_QUESTIONS_AND_DECISIONS.md
13_TRACEABILITY_MATRIX.md
14_BRANCHING_AND_ENVIRONMENT_STRATEGY.md
15_AGENTIC_DEVELOPMENT_PROTOCOL.md
16_CI_CD_AND_RELEASE_GUARDRAILS.md
17_NOTION_OPERATING_SYSTEM_SYNC_PLAN.md
18_PHASED_ROLLOUT_ROADMAP.md
19_GITHUB_PROTECTION_AND_PR_POLICY_PLAN.md
20_BUG_FEATURE_HOTFIX_WORKFLOW_PLAN.md
21_AGENT_PROMPT_AND_TEMPLATE_LIBRARY_PLAN.md
22_DRY_RUN_AND_ADOPTION_VALIDATION_PLAN.md
```

Create additional documents only if they are genuinely needed.
Do not create documents for volume alone.

## 7. Required content for each document

### 00_INDEX.md

Must include:

* Plan title.
* Date.
* Current status.
* Task goal.
* Why this matters before beta.
* Scope.
* Non-goals.
* Current repo facts verified.
* Plan document map.
* Start-here instructions for the future implementation agent.
* Recommended implementation sequence.
* Required verification commands.
* Risk summary.
* Beta-release relationship.
* Bug/blocker references.
* Notion sync status.
* Readiness score table.

The goal must be explicit:
ArchEstimator needs a phased Agentic-Driven Development operating framework that gives AI agents a safe, traceable, production-minded way to work across feature implementation, bug fixing, CI/CD, branch promotion, release readiness, and Notion/project-management visibility.

### 01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md

Must include requirements grouped by priority.

MUST requirements:

* Define production branch strategy.
* Define beta/staging branch strategy.
* Define testing/QA branch strategy.
* Define feature branch strategy.
* Define hotfix branch strategy.
* Define release candidate strategy.
* Define PR and merge rules.
* Define branch protection requirements.
* Define CI/CD gates by branch type.
* Define required validation commands by work type.
* Define feature implementation protocol using ADD phases.
* Define bug investigation/fix protocol using evidence-first workflow.
* Define hotfix protocol.
* Define release promotion protocol.
* Define codebase AI operating protocol updates.
* Define `.ai` source-of-truth updates.
* Define Notion mirror/update requirements.
* Define run log / journal requirements.
* Define decision log / ADR requirements.
* Define interface contract requirements.
* Define agent context file requirements.
* Define rollback requirements.
* Define security/no-secrets requirements.
* Define provider-state evidence requirements.
* Define beta no-go gate integration.
* Define adoption dry-run requirement on one real feature and one real bug before full enforcement.

SHOULD requirements:

* Add GitHub issue templates for feature/bug/hotfix/release if repo convention allows.
* Add PR template checklist for ADD compliance if repo convention allows.
* Add CODEOWNERS or reviewer expectations if appropriate.
* Add GitHub environment strategy recommendations.
* Add branch naming examples.
* Add Notion database properties and page templates.
* Add agent prompt templates for Codex, Claude Code, OpenCode, CommandCode, Kimi, and other approved agents.

COULD requirements:

* Add commit message conventions beyond current usage.
* Add release notes/changelog conventions.
* Add GitHub labels/milestones strategy.
* Add sprint/adoption scorecard.
* Add future automation for docs compliance.

OUT_OF_SCOPE:

* No production source code changes in this planning task.
* No dependency changes in this planning task.
* No provider changes in this planning task.
* No branch creation/deletion in this planning task.
* No Notion update claim unless tool access exists and was used.
* No production deploy.
* No Supabase migration.
* No Vercel config mutation.
* No secret handling.

Acceptance criteria must be written as pass/fail checks.
Every requirement must include:

* Priority.
* Evidence required.
* Implementation owner type: human, codebase AI, GitHub admin, provider admin, or Notion admin.
* Validation command or manual verification method.
* Rollback note.

### 02_CODEBASE_RESEARCH.md

Must include:

* Commands run.
* Files/folders inspected.
* Branches found.
* Worktrees found.
* Remote/default branch evidence.
* GitHub Actions workflow evidence.
* Package scripts evidence.
* Validation matrix evidence.
* `.ai` source-of-truth evidence.
* Current beta no-go gate evidence.
* Existing AI agent protocol evidence.
* Existing GitNexus/code-review-graph evidence.
* Existing Notion references, if any.
* Existing docs/run-log/decision/interface patterns, if any.
* Existing bug plan patterns, if any.
* Existing PR/issue template patterns, if any.
* Existing release checklist patterns, if any.
* Gaps and unknowns.
* Evidence links as local file paths.

This document must distinguish:

* verified repo facts;
* inferred patterns;
* assumptions;
* external ADD concepts;
* unresolved unknowns.

### 03_ARCHITECTURE_AND_DESIGN_PLAN.md

Must propose the target operating architecture.

Include:

* Operating model overview.
* Human vs. AI responsibilities.
* `.ai` as canonical implementation brain.
* Notion as executive/project-management mirror, not the repo source of truth.
* GitHub as enforcement layer.
* CI/CD as non-negotiable validation layer.
* Provider dashboards as manual evidence layer.
* GitNexus/code-review-graph as code intelligence layer.
* Branch/environment model.
* ADD phase model adapted to ArchEstimator.
* Required repo documents and where they should live.
* Required Notion pages/databases and what they mirror.
* File ownership model.
* Decision ownership model.
* Agent handoff model.
* Release promotion model.
* Bug triage model.
* Hotfix model.
* Future automation opportunities.

The plan must recommend a low-risk branch model appropriate for a startup close to beta. Consider and decide between:

Option A:

* `main` = protected production branch.
* `beta` = protected closed-beta/staging branch.
* `dev` = integration branch only if needed.
* `feat/*` = feature branches.
* `fix/*` = bug fix branches.
* `hotfix/*` = urgent production fixes from `main`.
* `release/*` = release candidates.

Option B:

* `production` or `prod` = production branch.
* `main` = integration branch.
* `beta` = beta/staging branch.
* `feat/*`, `fix/*`, `hotfix/*`, `release/*`.

Do not blindly choose. Evaluate current repo reality, existing CI triggers, GitHub default branch, existing decision that feature branches/PRs should not auto-merge to main, and beta-readiness risk.

If the plan recommends keeping `main` as production, explain why that is safer.
If the plan recommends creating a separate `production` branch, explain migration steps and risks.

### 04_IMPLEMENTATION_SEQUENCE.md

Must describe a slow phased rollout, not one giant change.

Use this exact phased structure unless repo evidence proves a better structure:

Phase 0 — Audit and decision freeze:

* Inventory current branches, CI, validation, `.ai` protocols, beta no-go gates, and Notion references.
* Decide target branch model.
* Decide source-of-truth hierarchy.
* Decide which workflow docs become canonical.

Phase 1 — Canonical ADD docs in `.ai`:

* Add or update `.ai/00_system/AGENTIC_DEVELOPMENT_FRAMEWORK.md`.
* Add or update `.ai/00_system/BRANCH_ENVIRONMENT_STRATEGY.md`.
* Add or update `.ai/00_system/FEATURE_BUG_HOTFIX_PROTOCOL.md`.
* Add or update `.ai/00_system/CI_CD_RELEASE_GUARDRAILS.md`.
* Add or update `.ai/00_system/NOTION_SYNC_PROTOCOL.md`.
* Update `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`.
* Update `.ai/README.md`.
* Update `.ai/10_state/decisions.md`.

Phase 2 — Agent prompt and task templates:

* Add reusable templates under `.ai/08_prompts` or `.ai/11_skills`.
* Add feature plan template.
* Add bug plan template.
* Add hotfix template.
* Add release checklist template.
* Add PR review checklist template.
* Add agent self-check template.
* Add implementation prompt template that enforces ADD phase gates.

Phase 3 — GitHub workflow and branch policy plan:

* Plan branch creation or branch designation.
* Plan branch protection rules.
* Plan required PR checks.
* Plan GitHub environments.
* Plan CODEOWNERS/PR templates if appropriate.
* Plan issue templates if appropriate.
* Plan no-direct-push policy.

Phase 4 — CI/CD guardrail implementation plan:

* Plan CI trigger expansion for selected branch model.
* Plan fast validation for PRs.
* Plan full validation for beta/main.
* Plan e2e smoke strategy.
* Plan security/dependency audit policy.
* Plan deploy gates and manual approvals.
* Plan provider evidence capture.

Phase 5 — Notion operating system mirror:

* Create `.ai/08_prompts/notion-agentic-development-sync-payload.md` or equivalent.
* Define Notion page tree.
* Define Notion databases.
* Define Notion properties.
* Define Notion templates for feature, bug, hotfix, release, decision, validation evidence.
* Define sync rules: `.ai` canonical, Notion mirror.
* If Notion tool exists, update Notion; otherwise provide paste-ready Notion payload and report that actual Notion update was not performed.

Phase 6 — Dry run:

* Choose one low-risk feature or doc-only change and run the ADD feature protocol.
* Choose one known bug or blocker and run the ADD bug protocol.
* Record what failed.
* Improve templates/protocols.
* Do not enforce globally until the dry run passes.

Phase 7 — Enforcement:

* Enforce PR templates and branch protections.
* Require ADD checklist on all new work.
* Require run-log entry before commit.
* Require validation evidence before merge.
* Require `.ai` memory update when decisions change.
* Require release checklist before beta/main promotion.

Phase 8 — Beta release integration:

* Map current beta no-go gates into the ADD release protocol.
* Require provider/manual evidence before beta release.
* Require rollback proof.
* Require post-release smoke proof.
* Require Notion status mirror.

For every phase, include:

* Objective.
* Files likely affected.
* Exact implementation tasks.
* Validation.
* Exit criteria.
* Rollback point.
* Risks.
* Owner.
* Whether it can be done by AI alone or requires Philip/GitHub/provider/Notion admin.

### 05_BLAST_RADIUS_AND_RISK_ANALYSIS.md

Must include:

* Affected workflows:

  * feature development;
  * bug fixing;
  * hotfixes;
  * code review;
  * CI/CD;
  * release promotion;
  * beta readiness;
  * provider evidence;
  * Notion project management;
  * AI agent onboarding.
* Affected repo areas:

  * `.ai/00_system`;
  * `.ai/08_prompts`;
  * `.ai/11_skills`;
  * `.ai/12_agents`;
  * `.ai/15_Bugs`;
  * `.github`;
  * docs folder if present/future;
  * README/AGENTS only if future implementation needs it.
* Affected tests:

  * no source tests for plan-only;
  * CI config validation for future implementation;
  * `bun run validate`;
  * `bun run build`;
  * `git diff --check`;
  * Playwright smoke when release/deploy flow changes.
* Risks:

  * overcomplicated branch model;
  * long-lived branch drift;
  * agents ignoring docs;
  * CI configured incorrectly;
  * beta blocked by provider evidence;
  * Notion diverging from `.ai`;
  * stale docs becoming false authority;
  * accidental provider deploy;
  * accidental secret exposure;
  * branch protection locking out solo founder workflow;
  * too much process slowing urgent beta fixes.
* Severity/likelihood.
* Mitigations.
* Rollback strategy.
* Concurrency risks.
* Merge conflict risks.
* GitNexus/code-review-graph impact requirements if implementation later changes symbols.

### 06_TESTING_AND_VERIFICATION_PLAN.md

Must include:

* Documentation-only validation:

  * verify paths exist;
  * verify links are correct;
  * `git diff --check`;
  * `git diff -- .ai`;
* General repo validation:

  * `bun run validate`;
  * `bun run build`;
* CI/CD validation:

  * future PR from `feat/*` triggers CI;
  * future push/PR to `beta` triggers selected checks;
  * future push/PR to `main` triggers production-level checks;
  * future hotfix branch triggers checks;
  * no provider deploy without manual approval.
* Branch policy validation:

  * branch exists;
  * direct push blocked where required;
  * required checks enforced;
  * stale review dismissal configured if chosen;
  * admins included/excluded intentionally;
  * force pushes disabled.
* ADD protocol validation:

  * feature task has DEFINE/DISCOVER/DESIGN/SETUP/BUILD/VALIDATE records;
  * bug task has reproduction/evidence/root-cause/regression validation;
  * hotfix task has minimal scope and backmerge policy;
  * release task has beta no-go evidence map;
  * run log updated;
  * decision log updated;
  * interface contracts updated when boundaries change.
* Notion validation:

  * Notion mirror page exists or paste-ready payload exists;
  * Notion status links back to `.ai` plan/source docs;
  * Notion does not contradict `.ai`.
* Pass/fail criteria.

### 07_UI_UX_AND_ACCESSIBILITY_PLAN.md

This plan is mostly workflow/docs. Mark app UI as N/A unless repo evidence shows a UI surface for internal workflow.

Still include:

* No `src/app` or `src/components` UI code changes in this planning task.
* If future implementation adds internal admin/workflow UI, it must follow `DESIGN.md`.
* Non-landing app/workshop UI constraints:

  * SF Pro stack.
  * Regular/medium weights only.
  * 12px maximum visible app/workshop text unless explicitly approved.
  * Normal controls/body/table/input/button text around 10px.
  * Labels/meta/helper text around 8–9px.
  * Zero letter spacing.
  * xs/3px radius only.
  * Phosphor regular outline icon style.
  * Reuse `src/components/ui` and `src/components/workshop` primitives before creating local controls.
  * Design-system lint failures are blocking.

### 08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md

Must include:

* Branch protection security.
* Secret handling.
* GitHub environment secrets.
* Vercel/Supabase/Resend separation.
* Production deploy approval.
* Provider-state evidence requirements.
* RLS/Supabase safety if any future implementation touches data.
* Never touch archestimator resources.
* Only ArchEstimator Supabase project `ebxxqidacheyapmmzavr` may be referenced if Supabase is relevant.
* Do not commit secrets.
* Do not claim linked Supabase/hosted/provider state from local-only evidence.
* Dependency/supply-chain policy:

  * no dependency additions by agents unless explicitly approved;
  * audit findings must be recorded;
  * malicious package risk must be guarded by CI and review.
* Performance impact:

  * docs-only changes should have no runtime impact;
  * CI additions may increase build time;
  * phased rollout should avoid blocking fast feature iteration.
* Failure modes and mitigations.

### 09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md

Must include:

* No deployment during planning.
* No migrations during planning.
* Future branch-to-environment mapping:

  * feature branches -> preview only;
  * beta/staging branch -> beta/staging environment;
  * main/production branch -> production environment;
  * hotfix branch -> temporary preview plus production PR.
* Future promotion flow:

  * feature -> PR -> beta/staging;
  * beta/staging -> release candidate;
  * release candidate -> main/production;
  * hotfix -> main/production -> backmerge to beta/dev if used.
* Future provider checks:

  * Vercel env proof;
  * Supabase migration parity;
  * Supabase RLS proof;
  * Resend proof;
  * hosted auth proof;
  * hosted E2E/manual smoke;
  * rollback proof.
* Rollback:

  * revert docs/protocol changes;
  * revert CI workflow change;
  * disable branch protection changes only with Philip approval;
  * roll back Vercel deployment if future release fails;
  * database rollback only under separate migration-specific plan.
* Post-deploy checks for future implementation.

### 10_IMPLEMENTATION_PROMPT_DRAFT.md

Must contain a direct future implementation prompt that Philip can paste into Codex/Claude Code/OpenCode.

The implementation prompt must:

* Reference this exact plan folder.
* Tell the implementation agent to verify the plan against current repo reality before editing.
* Tell the implementation agent to read `AGENTS.md` and `.ai` source-of-truth chain first.
* Tell the implementation agent to use GitNexus/code-review-graph first if available.
* Tell the implementation agent to implement Phase 1 only first unless Philip explicitly authorizes more.
* Tell the implementation agent not to modify production source code unless a later phase explicitly requires it.
* Tell the implementation agent to add/update tests if necessary and possible.
* Tell the implementation agent to update `.ai` docs.
* Tell the implementation agent to create bug plans in `.ai/15_Bugs` if issues are discovered.
* Tell the implementation agent to archive the plan after successful full implementation.
* Tell the implementation agent to commit/push.
* Explain merge policy:

  * Default repo decision says feature branches/PRs and no automatic `main` merge.
  * Only merge to `main` automatically if Philip’s implementation prompt explicitly authorizes it.
* Explain branch policy:

  * Do not create/delete protected branches until branch strategy is approved.
  * Do not change GitHub branch protections unless the prompt explicitly includes that scope.
* Explain Notion policy:

  * If Notion tool exists, update Notion.
  * If Notion tool does not exist, create paste-ready Notion payload and report that Notion was not directly updated.

### 11_READINESS_SCORECARD.md

Must include:

* Score per document.
* Overall plan readiness score.
* Evidence for each score.
* Missing items.
* Improvement log.
* Final pass/fail decision.
* Honest blockers if score cannot reach 98%.

Scoring categories:

* Repository evidence accuracy.
* ADD methodology fit.
* Branch/environment specificity.
* CI/CD specificity.
* GitHub governance specificity.
* Agent protocol specificity.
* Feature/bug/hotfix workflow specificity.
* Notion sync usability.
* Testing/verification readiness.
* Risk/blast-radius/rollback coverage.
* Security/performance/data coverage.
* `.ai` documentation hygiene.
* Future implementation usability.

Every required document must reach 98–100% implementation readiness.
The overall package must reach 98–100%.
100% is allowed only if there are no known gaps, no unsupported assumptions, no vague instructions, and no unresolved ambiguity.
If a blocker prevents 98%, create a bug/blocker plan, update the scorecard honestly, and report `BLOCKED`.

### 12_OPEN_QUESTIONS_AND_DECISIONS.md

Must include:

* Open questions.
* Decisions made by the planning agent.
* Assumptions.
* Evidence behind decisions.
* Items requiring Philip.
* Items requiring GitHub admin.
* Items requiring provider admin.
* Items requiring Notion admin.
* Items implementation agent may decide.
* No hidden ambiguity.

Must explicitly address:

* Should `main` remain production, or should a separate `production`/`prod` branch be created?
* Should ArchEstimator use a long-lived `dev` branch, or keep feature branches short-lived into `beta`/`main`?
* Should `beta` or `staging` be the pre-production branch name?
* Should GitHub branch protections block Philip/admin direct pushes, or only agents/non-admin collaborators?
* Which checks are required before merging to `beta`?
* Which checks are required before merging to `main`/production?
* How should Notion mirror `.ai` without becoming conflicting source of truth?
* Should ADD docs live only in `.ai`, or should there be a lightweight root `docs/` mirror?
* Which agent prompts should be updated first?

### 13_TRACEABILITY_MATRIX.md

Must connect:

* Requirement.
* Acceptance criterion.
* Files/modules likely affected.
* Implementation phase.
* Test/verification method.
* Risk/rollback note.
* Status.

### 14_BRANCHING_AND_ENVIRONMENT_STRATEGY.md

Must be a dedicated branch/environment strategy.

Include:

* Current branch evidence.
* Recommended target branch model.
* Branch purpose table.
* Branch naming conventions.
* Source branch rules.
* Merge target rules.
* Promotion rules.
* Backmerge rules.
* Hotfix rules.
* Release candidate rules.
* Experimental/test branch rules.
* Branch deletion rules.
* Worktree safety rules.
* GitHub protection rules by branch.
* Environment mapping:

  * local;
  * preview;
  * test;
  * beta/staging;
  * production.
* CI/CD checks by branch.
* Provider mapping:

  * Vercel;
  * Supabase;
  * Resend;
  * GitHub environments.
* Decision record: why this branch strategy fits current ArchEstimator beta risk.

Be opinionated but evidence-based. Avoid enterprise theater.
For a small AI-first startup, prefer fewer long-lived branches unless evidence supports more.

### 15_AGENTIC_DEVELOPMENT_PROTOCOL.md

Must define the actual ADD protocol for ArchEstimator.

Include:

* ArchEstimator ADD principles:

  1. Human strategy, AI execution.
  2. `.ai` canonical, Notion mirror.
  3. Documentation before implementation.
  4. Repo evidence before claims.
  5. Contracts before boundaries.
  6. Tests before completion.
  7. Git traceability for every meaningful change.
  8. Validation before merge.
  9. Senior review for risky changes.
  10. No source-of-truth drift.
  11. No provider claims without provider evidence.
  12. No secrets.
  13. No broad refactors without explicit scope.
* ADD phases:

  * DEFINE;
  * DISCOVER;
  * DESIGN;
  * SETUP;
  * BUILD;
  * VALIDATE;
  * RELEASE.
* Phase entry criteria.
* Phase exit criteria.
* Required artifacts per phase.
* Required `.ai` updates per phase.
* Required git actions per phase.
* Required validation per phase.
* Agent stop conditions.
* Agent self-diagnostic triggers.
* How to handle uncertainty.
* How to create bug/blocker plans.
* How to avoid repeating stale decisions.

### 16_CI_CD_AND_RELEASE_GUARDRAILS.md

Must define target CI/CD behavior.

Include:

* Current CI/CD evidence.
* Target CI/CD pipeline by branch type.
* Required checks:

  * typecheck;
  * lint;
  * design-system lint;
  * unit tests;
  * Vitest DOM tests;
  * build;
  * Playwright smoke/e2e when needed;
  * `git diff --check`;
  * dependency/security audit policy;
  * migration/type generation policy only when schema changes.
* PR gates.
* Beta/staging gates.
* Production gates.
* Manual approval gates.
* Provider evidence gates.
* Rollback gates.
* CI failure protocol.
* Flaky test protocol.
* Agent responsibility when CI fails.
* What an agent must never do to “make CI pass.”

### 17_NOTION_OPERATING_SYSTEM_SYNC_PLAN.md

Must define the Notion update plan.

Important:

* Do not claim Notion was updated unless a Notion connector/tool is available and you actually use it.
* If Notion tool is unavailable, create a paste-ready Notion sync payload in the plan folder or `.ai/08_prompts`.

Include:

* Notion role:

  * executive/project-management mirror;
  * decision visibility;
  * release readiness dashboard;
  * bug/feature tracking;
  * not canonical implementation truth.
* `.ai` role:

  * canonical repo implementation truth.
* Notion page tree:

  * ArchEstimator Engineering OS;
  * Agentic Development Framework;
  * Branching & Environments;
  * CI/CD Guardrails;
  * Feature Workflow;
  * Bug Workflow;
  * Hotfix Workflow;
  * Release Promotion;
  * Beta No-Go Gates;
  * Validation Evidence;
  * Agent Prompt Library;
  * Decisions/ADRs;
  * Run Logs;
  * Provider Evidence;
  * Weekly Engineering Review.
* Notion databases:

  * Features;
  * Bugs;
  * Hotfixes;
  * Releases;
  * Decisions;
  * Validation Evidence;
  * Provider Evidence;
  * Agents/Prompts;
  * Branches/Environments.
* Suggested properties:

  * Status;
  * ADD Phase;
  * Branch;
  * Target Environment;
  * Owner;
  * Agent;
  * Risk;
  * Validation Commands;
  * Evidence Link;
  * `.ai` Source Link;
  * GitHub PR;
  * Commit Hash;
  * Blocked Reason;
  * Release Gate.
* Sync rules.
* Anti-drift rules.
* Paste-ready Notion content for all top-level pages.
* First manual Notion setup checklist.

### 18_PHASED_ROLLOUT_ROADMAP.md

Must define slow adoption.

Include:

* Week 0 / Phase 0 audit.
* Phase 1 `.ai` canonical docs.
* Phase 2 templates/prompts.
* Phase 3 branch/GitHub policy.
* Phase 4 CI/CD guardrails.
* Phase 5 Notion mirror.
* Phase 6 dry runs.
* Phase 7 enforcement.
* Phase 8 beta-release integration.
* What gets enforced immediately.
* What remains advisory until dry-run passes.
* What requires Philip approval.
* What requires external provider/admin work.
* Success metrics.
* Failure signals.
* Rollback plan for process overhead.

### 19_GITHUB_PROTECTION_AND_PR_POLICY_PLAN.md

Must include:

* Current GitHub evidence available from local repo.
* Branch protection recommendations.
* PR rules.
* Reviewer rules.
* Required status checks.
* Conversation resolution.
* Stale review dismissal.
* Force-push blocking.
* Admin bypass decision.
* CODEOWNERS recommendation if appropriate.
* PR template recommendation.
* Issue template recommendation.
* Label/milestone recommendation.
* Commit message convention.
* Release tag strategy.
* GitHub Environments recommendation:

  * preview;
  * beta/staging;
  * production.
* Manual approval rules.
* Exact future implementation tasks.
* Rollback if branch protection blocks urgent solo-founder work.

### 20_BUG_FEATURE_HOTFIX_WORKFLOW_PLAN.md

Must define separate workflows.

Feature workflow:

* DEFINE brief.
* DISCOVER repo evidence.
* DESIGN architecture/contracts.
* SETUP branch/task plan.
* BUILD implementation.
* VALIDATE tests/build/e2e.
* RELEASE/promotion if applicable.
* Update `.ai`, run log, decision log.
* PR and review.

Bug workflow:

* Evidence first.
* Reproduce or explain why reproduction is unavailable.
* Classify severity.
* Create bug plan in `.ai/15_Bugs`.
* Identify root cause.
* Add regression test where possible.
* Fix minimally.
* Validate.
* Update known issues/current state.
* PR and review.

Hotfix workflow:

* Branch from production branch.
* Minimal fix only.
* No opportunistic refactor.
* Validate critical path.
* PR with emergency review.
* Deploy with rollback.
* Backmerge to beta/dev if used.
* Postmortem.

CI failure workflow:

* Preserve logs.
* Diagnose failed check.
* Do not weaken tests without explicit approval.
* Create bug/blocker if needed.
* Fix or report blocked.

Release workflow:

* Beta no-go gate map.
* Provider proof.
* Validation proof.
* Manual QA.
* Rollback proof.
* Release notes.
* Tag/commit.
* Post-release smoke.

### 21_AGENT_PROMPT_AND_TEMPLATE_LIBRARY_PLAN.md

Must plan the template library.

Include future templates for:

* Feature plan creation prompt.
* Feature implementation prompt.
* Bug investigation prompt.
* Bug fix implementation prompt.
* Hotfix prompt.
* CI failure prompt.
* Release candidate prompt.
* Code review prompt.
* Security review prompt.
* UI/UX review prompt.
* Supabase/RLS review prompt.
* Notion sync prompt.
* `.ai` memory update prompt.
* Agent self-diagnostic prompt.

For each template:

* Target agent.
* Use case.
* Required reading.
* Required artifacts.
* Required validation.
* Stop conditions.
* Commit/push rules.

### 22_DRY_RUN_AND_ADOPTION_VALIDATION_PLAN.md

Must define dry-run adoption.

Include:

* Pick one low-risk future feature as ADD dry run.
* Pick one known bug/blocker as ADD bug dry run.
* Run the full protocol.
* Measure:

  * did the agent read correct docs;
  * did the agent avoid stale assumptions;
  * did the agent update run logs;
  * did the agent produce useful tests;
  * did CI pass;
  * did Notion mirror correctly;
  * did the process slow work too much;
  * did the process prevent mistakes.
* Improvement loop.
* Enforcement threshold.
* What must be fixed before global enforcement.

## 8. Optional specialized documents

Create only if useful:

* `23_PROVIDER_EVIDENCE_AND_BETA_GATE_PLAN.md`
* `24_RELEASE_CHECKLIST_TEMPLATE.md`
* `25_PR_TEMPLATE_AND_ISSUE_TEMPLATE_PLAN.md`
* `26_CODEOWNERS_AND_REVIEW_POLICY_PLAN.md`
* `27_DEPENDENCY_AND_SUPPLY_CHAIN_POLICY_PLAN.md`
* `28_AGENT_CONTEXT_FILE_PLAN.md`
* `29_DOCS_VS_AI_SOURCE_OF_TRUTH_PLAN.md`

Do not create them for volume alone.

## 9. Readiness loop

Force this loop:

```txt
Audit → improve → score → find gaps → improve again → rescore.
```

Every required document must reach 98–100% implementation readiness.
The overall plan package must reach 98–100%.

Scoring must be honest.
100% is allowed only if there are no known gaps, no unsupported assumptions, no vague instructions, and no unresolved ambiguity.
If a blocker prevents 98%, create a bug/blocker plan, update the scorecard honestly, and report `BLOCKED` instead of lying.

## 10. Bug discovery protocol

If you discover a bug, failing test, blocker, stale assumption, architecture issue, missing prerequisite, security concern, test gap, branch-policy conflict, CI/CD issue, documentation conflict, or serious ambiguity, create a dated bug plan in:

```txt
/Users/philiplewis/archestimator/.ai/15_Bugs
```

Filename:

```txt
YYYY-MM-DD-{bug-slug}.md
```

Bug plan must include:

* Title.
* Classification.
* Date discovered.
* Discovery context.
* Evidence.
* Reproduction steps or command if applicable.
* Expected behavior if applicable.
* Actual behavior if applicable.
* Suspected root cause.
* Affected files/modules.
* Impact.
* Severity.
* Relationship to current plan.
* Proposed fix plan.
* Verification plan.
* Status.
* Whether it blocks implementation.
* Link/reference to the current plan folder.

## 11. `.ai` project memory updates

Update relevant files/folders if they exist:

```txt
/Users/philiplewis/archestimator/.ai/01_roadmap
/Users/philiplewis/archestimator/.ai/04_tasks
/Users/philiplewis/archestimator/.ai/05_logs
/Users/philiplewis/archestimator/.ai/10_state
```

Rules:

* Follow existing structure.
* Do not create conflicting source-of-truth docs.
* Do not mark the framework implemented.
* Record the new plan folder.
* Record planning status.
* Record bugs/blockers.
* Record decisions as planning decisions only.
* Keep `.ai` as durable memory for future agents.
* If adding a new canonical ADD doc is only planned, do not pretend it already exists globally.
* If docs are stale and this planning task allows updating them, update the canonical doc carefully.
* If docs are stale but the fix would exceed planning scope, create a bug/blocker plan.

## 12. Final git requirements

Run:

```bash
git status --short
git diff --stat
git diff --check
git diff -- .ai
```

Then:

* Stage only intended `.ai` planning/documentation changes.
* Do not stage production source code.
* Do not stage package files.
* Do not stage migrations.
* Do not stage generated files.
* Commit with:

```txt
docs(ai): plan agentic development framework rollout
```

* Pull/reconcile remote changes safely if needed.
* Never force push.
* Push to origin.
* Capture final commit hash.

Planning/refinement agents must not merge to `main` automatically unless Philip explicitly asks.

## 13. Final report requirements

Final report must include:

* Final status:

  * `READY_FOR_IMPLEMENTATION`
  * `NEEDS_REFINEMENT`
  * `NEEDS_HUMAN_DECISION`
  * `BLOCKED`
* Plan folder created.
* Documents created.
* Documents updated.
* `.ai` cross-updates.
* Bugs/issues discovered.
* Bug plan files created.
* Readiness score per document.
* Overall readiness score.
* Branch strategy recommendation.
* Production branch recommendation.
* Beta/staging branch recommendation.
* Testing branch recommendation.
* CI/CD recommendation.
* Notion sync status:

  * updated directly if tool exists and was used;
  * paste-ready payload created if tool unavailable.
* Commands run.
* Git branch.
* Commit hash.
* Push status.
* Blockers/open questions.
* Next recommended step.

Remember: this task creates the plan to slowly implement the Agentic-Driven Development framework. Do not implement the framework itself unless Philip explicitly asks in a later implementation prompt.
