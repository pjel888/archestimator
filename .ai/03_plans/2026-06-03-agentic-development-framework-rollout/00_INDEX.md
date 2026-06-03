# Agentic-Driven Development Framework Rollout Plan

**Status:** READY_FOR_IMPLEMENTATION for Phase 1 docs/payload/harness implementation. Global enforcement remains CONDITIONAL and not implemented.
**Plan folder:** `.ai/03_plans/2026-06-03-agentic-development-framework-rollout`
**Primary refinement result:** agent/harness enforcement is now the primary Phase 1 focus.

## Task goal
Refine the Agentic-Driven Development Framework plan so a future implementation agent can safely standardize and enforce ArchEstimator AI-agent behavior across Codex, Claude/Claude Code, OpenCode, CommandCode, Kimi, Antigravity CLI/`agy`, DeepSeek, Hermes, Cursor, deprecated Gemini, Ollama non-agent policy, GitNexus/code-review-graph, GitHub Actions, and any discovered harness surfaces.

## Scope
- Plan, research, task, state, and documentation updates under `.ai` only.
- Future implementation planning for `AGENTS.md`, `.ai/00_system`, `.ai/12_agents`, `.ai/08_prompts`, `.ai/11_skills`, `.agents`, `.claude`, `.codex`, `.cursor`, `.commandcode`, `.gemini`, `.github`.
- Lean-enterprise governance: small batches, protected main, optional beta/staging, dry-run before enforcement, manual provider approvals.

## Non-goals
- No production source code changes, dependency changes, package changes, migrations, generated files, provider mutations, GitHub settings mutations, or Notion mutations.
- No claim that framework enforcement, beta readiness, GitHub rulesets, provider proof, or Notion sync has been implemented.

## Start here for future implementation agents
1. Read `AGENTS.md`, `.ai/AGENTS.md`, `.ai/README.md`, `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`, `.ai/00_system/VALIDATION_MATRIX.md`, `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, `DESIGN.md`, and this plan folder.
2. Run repo safety checks and graph/code-intelligence checks before edits.
3. Implement Phase 1 only unless Philip explicitly authorizes later phases.
4. Keep every tool-specific instruction file thin and subordinate to `.ai/00_system`.
5. Create bug plans in `.ai/15_Bugs` for any discovered mismatch.

## Plan document map
- 00–13: required baseline planning, requirements, research, architecture, sequence, risks, testing, UI, security/data, rollback, implementation prompt, scorecard, decisions, traceability.
- 14–23: branch/environment, ADD protocol, CI/CD, Notion, rollout, GitHub, workflow, prompt library, dry-run, Notion payload.
- 24–35: required agent/harness inventory, routing, payload standardization, harness integration, concurrency, compliance, run logs, permissions, research, dry-run evals, handoff, prompt library finalization.
- 36–42: optional but useful implementation roadmaps/appendices for GitHub rulesets, provider proof, Notion mirror, risk register, payload templates, worktree/branch playbook, final report standard.

## Recommended implementation sequence
1. Canonical docs: update `.ai/00_system` with agent framework preflight/runtime/evidence rules.
2. Payload templates: add `_template.md`, fill missing Hermes/Cursor/Ollama-policy payloads if approved, standardize existing payloads.
3. Harness adapters: add thin pointers in `AGENTS.md`, `.agents/README.md`, root `GEMINI.md` deprecation notice, CommandCode/Claude/Codex/Cursor/OpenCode guidance only after local/docs verification.
4. Prompt library: finalize `.ai/08_prompts/templates` for feature, bug, hotfix, release, review, self-diagnostic, provider-proof, GitHub setup, dry-run.
5. Skills/playbooks: add `.ai/11_skills` run-log, compliance-dry-run, and agent-self-diagnostic playbooks.
6. Dry-runs/evals: run plan-only, read-only, implementation, hotfix, release, stale-doc, provider-hallucination, dirty-worktree, prompt-injection scenarios.
7. CI/PR/GitHub enforcement: advisory first, enforce only after dry-run pass and Philip approval.
8. Beta/release integration: connect to existing launch proof gates without changing beta NO-GO status prematurely.

## Required verification commands
## Validation baseline for future implementation

Run the smallest sufficient checks after each step and the full gate before completion when source/config changes occur:

```bash
git status --short --branch
git diff --check
bun run validate
bun run build
bun run test:e2e
bun run lint:design-system
```

Rules:
- Docs-only work: verify referenced paths, run `git diff --check`, inspect `git diff -- .ai`, and use code-review-graph `detect_changes` when available before commit.
- Source/config/runtime changes: `bun run validate` and `bun run build` are required.
- Browser/auth/protected-route/user-flow/release changes: `bun run test:e2e` is required unless blocked, with a documented safe substitute.
- App/workshop UI changes: `bun run lint:design-system` is blocking.
- Supabase migrations: run linked/local migration checks only when schema changes and only under approved ArchEstimator project `ebxxqidacheyapmmzavr`; never touch SlateCamp resources.

## Risk summary
Highest risks: tool-specific instruction drift, missing Hermes/Cursor/Ollama payload policy, root `GEMINI.md` omission, CommandCode sentinel drift, multi-agent overlapping edits, provider/GitHub/Notion hallucination, and premature enforcement that slows solo-founder velocity.

## Bug/blocker references
- Existing: `.ai/15_Bugs/2026-06-03-stack-version-source-of-truth-drift.md`.
- New from this refinement: `.ai/15_Bugs/2026-06-03-agent-harness-payload-enforcement-gaps.md`.

## Current status
This package is implementation-ready for a future docs/payload/harness implementation pass. Later GitHub settings, provider actions, and Notion mirror actions need separate authorization.

## Readiness score table
| Doc | Score | Decision |
|---|---:|---|
| 00_INDEX | 99 | Ready |
| 01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA | 99 | Ready |
| 02_CODEBASE_RESEARCH | 99 | Ready |
| 03_ARCHITECTURE_AND_DESIGN_PLAN | 99 | Ready |
| 04_IMPLEMENTATION_SEQUENCE | 99 | Ready |
| 05_BLAST_RADIUS_AND_RISK_ANALYSIS | 99 | Ready |
| 06_TESTING_AND_VERIFICATION_PLAN | 99 | Ready |
| 07_UI_UX_AND_ACCESSIBILITY_PLAN | 98 | Ready; UI dashboard remains future-only |
| 08_SECURITY_PERFORMANCE_AND_DATA_PLAN | 99 | Ready |
| 09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN | 99 | Ready |
| 10_IMPLEMENTATION_PROMPT_DRAFT | 99 | Ready |
| 11_READINESS_SCORECARD | 99 | Ready |
| 12_OPEN_QUESTIONS_AND_DECISIONS | 98 | Ready with owner decisions clearly isolated |
| 13_TRACEABILITY_MATRIX | 99 | Ready |
| 14_BRANCHING_AND_ENVIRONMENT_STRATEGY | 98 | Ready; beta branch/rulesets require approval |
| 15_AGENTIC_DEVELOPMENT_PROTOCOL | 99 | Ready |
| 16_CI_CD_AND_RELEASE_GUARDRAILS | 98 | Ready; GitHub mutations deferred |
| 17_NOTION_OPERATING_SYSTEM_SYNC_PLAN | 98 | Ready; Notion mirror requires separate authorization |
| 18_PHASED_ROLLOUT_ROADMAP | 99 | Ready |
| 19_GITHUB_PROTECTION_AND_PR_POLICY_PLAN | 98 | Ready; GitHub admin actions require Philip |
| 20_BUG_FEATURE_HOTFIX_WORKFLOW_PLAN | 99 | Ready |
| 21_AGENT_PROMPT_AND_TEMPLATE_LIBRARY_PLAN | 99 | Ready |
| 22_DRY_RUN_AND_ADOPTION_VALIDATION_PLAN | 99 | Ready |
| 23_NOTION_SYNC_PAYLOAD | 98 | Ready; paste only after authorization |
| 24_AGENT_AND_HARNESS_INVENTORY | 99 | Ready |
| 25_AGENT_ROLE_CONTRACTS_AND_ROUTING_MATRIX | 99 | Ready |
| 26_AGENT_PAYLOAD_STANDARDIZATION_PLAN | 99 | Ready |
| 27_AGENT_INSTRUCTION_FILES_AND_HARNESS_INTEGRATION_PLAN | 99 | Ready |
| 28_MULTI_AGENT_ORCHESTRATION_AND_CONCURRENCY_PLAN | 99 | Ready |
| 29_AGENT_COMPLIANCE_ENFORCEMENT_AND_SELF_DIAGNOSTIC_PLAN | 99 | Ready |
| 30_AGENT_RUN_LOG_EVIDENCE_AND_MEMORY_PROTOCOL | 99 | Ready |
| 31_AGENT_SECURITY_TOOL_PERMISSIONS_AND_SANDBOX_PLAN | 99 | Ready |
| 32_LEAN_ENTERPRISE_DEVELOPER_OPERATING_MODEL_RESEARCH | 99 | Ready |
| 33_AGENT_DRY_RUN_EVALS_AND_ADOPTION_TESTS | 99 | Ready |
| 34_IMPLEMENTATION_AGENT_HANDOFF_CHECKLIST | 99 | Ready |
| 35_PROMPT_LIBRARY_FINALIZATION_PLAN | 99 | Ready |
| 36_GITHUB_RULESETS_AND_CI_ENFORCEMENT_ROADMAP | 98 | Ready; staged GitHub admin approval required |
| 37_PROVIDER_PROOF_AND_RELEASE_AGENT_GATES | 98 | Ready; external proof collection remains open |
| 38_NOTION_AGENT_MIRROR_OPERATING_PLAN | 98 | Ready; Notion auth required separately |
| 39_AI_AGENT_RISK_REGISTER | 99 | Ready |
| 40_AGENT_PAYLOAD_TEMPLATES_APPENDIX | 99 | Ready |
| 41_AGENT_WORKTREE_AND_BRANCH_PLAYBOOK | 99 | Ready |
| 42_AGENT_FINAL_REPORT_STANDARD | 99 | Ready |

## Overall readiness
- Before this refinement: existing package claimed 98% overall but agent/harness readiness was honestly ~72% because required inventory/routing/payload/concurrency/compliance/dry-run documents were missing.
- After this refinement: **98% Phase 1 implementation readiness**, **conditional global enforcement readiness**, **0% enforcement implemented**. The open harness/payload bug is intentionally part of Phase 1 scope and blocks any claim of global enforcement until resolved.
- Optional appendices `36`-`42` are non-blocking reference aids; they should not create enterprise theater or block lean Phase 1 delivery.
