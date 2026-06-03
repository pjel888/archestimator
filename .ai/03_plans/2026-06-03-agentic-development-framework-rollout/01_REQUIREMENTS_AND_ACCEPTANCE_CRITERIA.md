# Requirements and Acceptance Criteria

**Date:** 2026-06-03
**Status:** READY_FOR_IMPLEMENTATION for plan-driven Phase 1.

## MUST requirements

| ID | Requirement | Pass/fail acceptance check | Owner type | Evidence / validation | Rollback note |
|---|---|---|---|---|---|
| M-01 | Define production branch strategy | Plan chooses whether `main` remains production and records rationale | human + codebase AI | Inspect `.github/workflows/ci.yml`, `git remote show origin`, branch list | Revert `.ai/00_system/BRANCH_ENVIRONMENT_STRATEGY.md` update before protection changes |
| M-02 | Define beta/staging branch strategy | Plan names the pre-production branch and environment mapping | human + GitHub admin | Branch list and future GitHub environment review | Delete unapproved branch only after no PRs depend on it |
| M-03 | Define testing/QA branch strategy | Plan says when `test/*` or temporary QA branches are allowed | codebase AI | Branch naming table exists | Prune temporary branches after evidence is archived |
| M-04 | Define feature branch strategy | Feature work uses short-lived `feat/*` branches with PRs | codebase AI | PR checklist and branch table | Close stale branch and preserve evidence in `.ai/05_logs` |
| M-05 | Define hotfix branch strategy | Hotfix starts from production branch and backmerges to beta/dev if used | human + codebase AI | Hotfix workflow table | Revert hotfix or backmerge correction PR |
| M-06 | Define release candidate strategy | Release candidates use `release/*` only for gated promotion windows | human | Release workflow doc and tag policy | Delete RC branch after rollback or release |
| M-07 | Define PR and merge rules | Every non-trivial change uses PR review and no automatic main merge | GitHub admin + codebase AI | PR template checklist | Temporarily relax template only with Philip decision log |
| M-08 | Define branch protection requirements | Protection matrix covers main, beta, release, hotfix, and feature branches | GitHub admin | GitHub settings manual proof | Rollback protection only with explicit owner approval |
| M-09 | Define CI/CD gates by branch type | CI table maps branch type to commands and deploy gates | codebase AI + GitHub admin | Workflow dry-run or PR run evidence | Revert workflow YAML change |
| M-10 | Define required validation commands by work type | Validation matrix extends current `bun run validate`, build, design lint, e2e rules | codebase AI | `.ai/00_system/VALIDATION_MATRIX.md` and future ADD docs | Revert doc update and restore previous matrix |
| M-11 | Define feature implementation protocol using ADD phases | Feature workflow uses DEFINE/DISCOVER/DESIGN/SETUP/BUILD/VALIDATE/RELEASE | codebase AI | Dry-run feature plan evidence | Mark protocol advisory until dry-run passes |
| M-12 | Define bug investigation/fix protocol | Bug workflow requires evidence, reproduction, root cause, regression test, validation | codebase AI | Bug plan in `.ai/15_Bugs` | Archive or revise bug plan with reason |
| M-13 | Define hotfix protocol | Hotfix workflow is minimal, scoped, reviewed, rollback-backed | human + codebase AI | Hotfix checklist | Back out hotfix branch/protection rule |
| M-14 | Define release promotion protocol | Promotion requires beta no-go evidence, provider proof, rollback proof, post-release smoke | human + provider admin | Manual proof matrix and release checklist | Stop release; revert promotion PR |
| M-15 | Define codebase AI operating protocol updates | Future Phase 1 names exact `.ai/00_system` docs to add/update | codebase AI | Docs diff and agent dry-run | Revert ADD docs |
| M-16 | Define `.ai` source-of-truth updates | `.ai` remains canonical; Notion cannot contradict it | codebase AI | DOCS_SOURCE_OF_TRUTH update in Phase 1 | Restore previous source map |
| M-17 | Define Notion mirror/update requirements | Notion is executive/project mirror with links back to `.ai` | Notion admin | Paste-ready payload or connector proof | Remove stale Notion links/status |
| M-18 | Define run log / journal requirements | Every meaningful task records a run log with command evidence and commit hash | codebase AI | `.ai/05_logs` entry exists before merge | Correct log entry or mark superseded |
| M-19 | Define decision log / ADR requirements | Durable branch/process decisions enter `.ai/10_state/decisions.md` or ADR home | human + codebase AI | Decision entry with date and scope | Add superseded decision note |
| M-20 | Define interface contract requirements | Boundary changes require contract artifact and validation method | codebase AI | Contract template and traceability matrix | Revert boundary change or update contract |
| M-21 | Define agent context file requirements | Agents must read AGENTS.md and `.ai` chain before implementation | codebase AI | Prompt templates include required reading | Patch template and rerun dry-run |
| M-22 | Define rollback requirements | Every branch, CI, provider, and protocol change has rollback notes | human + codebase AI | Rollback table per phase | Execute documented revert path |
| M-23 | Define security/no-secrets requirements | No secrets in `.ai`; provider settings require proof not claims | all owners | Secret scan/manual review | Rotate leaked secret and remove from history under separate incident plan |
| M-24 | Define provider-state evidence requirements | Vercel/Supabase/Resend claims need dashboard or CLI proof | provider admin | Manual/provider proof packet | Downgrade status to unproven |
| M-25 | Define beta no-go gate integration | Release protocol maps current no-go blockers into promotion gates | human + provider admin | `.ai/10_state/current-state.md` and manual proof matrix | Stop beta promotion |
| M-26 | Define adoption dry-run requirement | One real feature and one real bug must pass ADD before global enforcement | human + codebase AI | Dry-run report in `22_DRY_RUN...` | Keep protocol advisory |

## SHOULD requirements

| ID | Requirement | Pass/fail acceptance check | Owner type | Evidence / validation | Rollback note |
|---|---|---|---|---|---|
| S-01 | Add GitHub issue templates if convention allows | Template plan names feature/bug/hotfix/release forms | codebase AI | Future `.github/ISSUE_TEMPLATE` diff | Remove templates if noisy |
| S-02 | Add PR template checklist if convention allows | Template includes ADD phase/evidence gates | codebase AI | Future `.github/pull_request_template.md` | Revert template |
| S-03 | Add CODEOWNERS or reviewer expectations | Plan recommends lightweight owner review before CODEOWNERS enforcement | GitHub admin | GitHub settings or CODEOWNERS diff | Delete CODEOWNERS if it blocks solo workflow |
| S-04 | Add GitHub environment strategy | preview/beta/production environments are specified | GitHub admin + provider admin | GitHub environment settings screenshots | Remove unapproved environment rules |
| S-05 | Add branch naming examples | Examples exist for feat/fix/hotfix/release/test/spike | codebase AI | Strategy doc table | Patch docs |
| S-06 | Add Notion database properties/templates | Notion page tree and databases are paste-ready | Notion admin | Notion payload file | Archive stale payload |
| S-07 | Add agent prompt templates | Codex, Claude Code, OpenCode, CommandCode, Kimi and other approved agents have template coverage | codebase AI | Template library plan | Patch template library |

## COULD requirements

| ID | Requirement | Pass/fail acceptance check | Owner type | Evidence / validation | Rollback note |
|---|---|---|---|---|---|
| C-01 | Commit message conventions beyond current usage | Plan uses Lore trailers for future commits without blocking urgent fixes | human + codebase AI | Commit examples | Revert to simpler convention |
| C-02 | Release notes/changelog conventions | Plan describes release notes source and owner | codebase AI | Release checklist | Archive unused changelog |
| C-03 | GitHub labels/milestones strategy | Recommended labels map ADD phases and severity | GitHub admin | Label screenshot/export | Delete noisy labels |
| C-04 | Sprint/adoption scorecard | Scorecard tracks dry-run process overhead and mistakes prevented | human | Dry-run report | Drop scorecard if overhead exceeds value |
| C-05 | Future docs-compliance automation | Plan defers automation until dry-run proves templates | codebase AI | Future CI check proposal | Remove automation |

## OUT_OF_SCOPE requirements

| ID | Requirement | Pass/fail acceptance check | Owner type | Evidence / validation | Rollback note |
|---|---|---|---|---|---|
| O-01 | No production source code changes in this planning task | Only `.ai` docs and plan artifacts changed | codebase AI | `git diff --stat` excludes `src/` | Revert source changes |
| O-02 | No dependency changes | No package or lockfile diff | codebase AI | `git diff -- package.json bun.lock` empty | Revert package diffs |
| O-03 | No provider changes | No Vercel/Supabase/Resend writes | provider admin | No provider command output claiming mutation | Revert provider settings manually |
| O-04 | No branch creation/deletion | No new local or remote branch created | codebase AI | `git branch -a` evidence | Delete accidental branch after approval |
| O-05 | No direct Notion update claim unless tool used | Plan says direct update not performed and provides payload | Notion admin | Payload file exists | Correct Notion page or docs |
| O-06 | No production deploy/migration/Vercel config mutation/secret handling | Plan-only status preserved | all owners | Diff and command log | Incident-specific rollback |

## Pass/fail rule

A future implementation phase passes only when every scoped requirement has current evidence, the owner type is explicit, validation has run or is blocked with an evidence-backed reason, and the rollback note is executable without deleting unrelated work.
