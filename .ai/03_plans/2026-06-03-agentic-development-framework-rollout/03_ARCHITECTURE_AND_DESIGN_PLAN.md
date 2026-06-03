# Architecture and Design Plan

**Date:** 2026-06-03

## Operating model overview

ArchEstimator should adopt ADD as a repo-native operating system, not a new product feature. Humans own strategy, scope, architecture, release approval, provider proof, legal decisions, and production risk. AI agents execute bounded work using `.ai` as context, GitHub as review/enforcement, CI/CD as validation, provider dashboards as manual proof, and Notion as the executive mirror.

## Human vs AI responsibilities

| Responsibility | Human | AI agent |
|---|---|---|
| Product strategy and beta cutline | Decides | Records and applies |
| Architecture/risky tradeoffs | Approves | Drafts options and evidence |
| Implementation | Reviews and scopes | Executes with tests |
| Provider state | Configures or authorizes | Prepares checklists; verifies only with proof |
| Release | Approves | Produces evidence and rollback packet |
| Notion | Admin/setup | Produces paste-ready mirror payload |

## System layers

- `.ai` canonical implementation brain: source-of-truth chain, plans, tasks, logs, decisions, specs, prompts, skills, agents, research.
- Notion executive/project-management mirror: status visibility, databases, weekly review, links back to `.ai`; never canonical for implementation truth.
- GitHub enforcement layer: PRs, branch protection, required checks, issue/PR templates, CODEOWNERS only if it does not lock out solo-founder recovery.
- CI/CD non-negotiable validation layer: branch-specific checks and manual approval gates.
- Provider dashboards/manual proof layer: Vercel/Supabase/Resend/legal/support/backup proof; local docs cannot replace this.
- GitNexus/code-review-graph intelligence layer: repository overview, impact, affected flows, and detect-changes before code edits or commits.

## Branch/environment model decision

Recommended option: **Option A** with `main` as protected production branch, new `beta` as closed-beta/staging branch, optional `dev` only if feature volume makes `beta` noisy, and short-lived `feat/*`, `fix/*`, `hotfix/*`, `release/*` branches.

Why this is safer now:

- Current GitHub default is `main`; CI already targets `main` and `feat/**`.
- No `production`, `prod`, `beta`, `staging`, `dev`, `release/*`, or `hotfix/*` branch currently exists.
- Creating `production` and demoting `main` would force default-branch, CI trigger, Vercel, GitHub protection, and agent-doc migration at the same time.
- Closed beta is already blocked by provider proof; branch churn should not add another blocker.
- A single new `beta` branch is enough to separate staged beta proof from production without enterprise theater.

Option B is rejected for now because it multiplies long-lived branches before the beta proof workflow is stable. Reconsider Option B only after beta users exist, production deployment is routine, and a separate production branch solves a demonstrated failure.

## ADD phase model adapted to ArchEstimator

| Phase | Purpose | Required artifacts |
|---|---|---|
| DEFINE | User goal, non-goals, owner decisions, beta relationship | Brief, acceptance criteria, stop conditions |
| DISCOVER | Repo/provider/current-state evidence | Research log, graph/GitNexus evidence, source map |
| DESIGN | Architecture, contracts, branch/env plan | Design plan, interface contracts, risk table |
| SETUP | Branch/worktree/tasks/templates | Task packet, run log stub, branch target |
| BUILD | Implementation or docs update | Tests first when code changes; focused diffs |
| VALIDATE | Commands, e2e/manual/provider proof | Validation report and evidence links |
| RELEASE | PR/merge/promotion/Notion mirror/archive | Release checklist, rollback proof, final log |

## Required repo documents and locations

- `.ai/00_system/AGENTIC_DEVELOPMENT_FRAMEWORK.md`
- `.ai/00_system/BRANCH_ENVIRONMENT_STRATEGY.md`
- `.ai/00_system/FEATURE_BUG_HOTFIX_PROTOCOL.md`
- `.ai/00_system/CI_CD_RELEASE_GUARDRAILS.md`
- `.ai/00_system/NOTION_SYNC_PROTOCOL.md`
- `.ai/08_prompts/*` for reusable implementation prompts
- `.ai/11_skills/*` for project-local playbooks if reusable beyond one prompt
- `.ai/12_agents/*` for role contracts if current roles need repo-specific thin adapters
- `.ai/04_tasks/*` for task packets
- `.ai/05_logs/*` for run logs
- `.ai/15_Bugs/*` for active bug/blocker plans

## Notion pages/databases

Use the page tree and database plan in `17_NOTION_OPERATING_SYSTEM_SYNC_PLAN.md`. Every Notion page should link back to the exact `.ai` source document. Notion statuses are mirrors and must be corrected when `.ai` changes.

## Ownership and handoff models

- File ownership: `.ai/00_system` owns policies; `.ai/08_prompts` owns prompt payloads; `.ai/04_tasks` owns task packets; `.ai/05_logs` owns evidence logs; `.github` owns enforcement only after approval.
- Decision ownership: Philip decides branch model, protection strictness, provider/admin changes, release approval, and global enforcement. Agents may recommend and draft.
- Agent handoff: every future agent receives source-of-truth chain, plan folder, branch target, files in scope, validation commands, stop conditions, and rollback path.

## Release, bug, and hotfix models

- Release promotion: feature/fix PRs land into `beta`, then `release/*`, then `main` after beta no-go proof and rollback proof.
- Bug triage: evidence first, reproduction or explicit unreproducibility reason, root cause, regression test where possible, minimal fix.
- Hotfix: branch from `main`, smallest safe fix, critical validation, emergency PR, production deploy with rollback, backmerge to `beta` if used.

## Future automation opportunities

- PR template validation for ADD phase artifacts.
- CI docs-compliance check for required `.ai` run log links.
- Branch-name checker.
- Secret/dependency audit gates.
- Release evidence manifest generator.
