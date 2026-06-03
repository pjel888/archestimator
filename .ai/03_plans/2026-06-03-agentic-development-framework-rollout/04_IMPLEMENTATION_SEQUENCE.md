# Implementation Sequence

## Phase 0 — Reverify before editing
- Run safety commands, inspect dirty worktree, fetch origin, read source-of-truth chain, run graph/code-intelligence checks.
- Validate this plan against current repo reality; create `.ai/15_Bugs` plans for drift.
- Rollback point: no edits yet.

## Phase 1 — Canonical docs
- Update `.ai/00_system` with explicit agent preflight/runtime/validation/evidence/adoption rules.
- Update `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` only to record framework status, not implementation claims.
- Validation: path checks, `git diff --check`.
- Rollback: revert `.ai/00_system` changes.

## Phase 2 — Agent payload templates
- Create `.ai/12_agents/payloads/_template.md`.
- Standardize existing payloads and decide/create missing Hermes, Cursor, Ollama-policy payloads.
- Keep Gemini deprecated.
- Validation: schema checklist for every payload.
- Rollback: revert payload files.

## Phase 3 — Role-specific payloads and routing
- Update `.ai/12_agents/README.md` with RACI, lane approvals, write scopes, escalation, final report requirements.
- Validation: `25_AGENT_ROLE_CONTRACTS_AND_ROUTING_MATRIX.md` traceability.

## Phase 4 — Prompt library
- Add `.ai/08_prompts/templates/*` for feature plan/implementation, bug investigation/fix, hotfix, CI failure, release candidate, code/security/UI/Supabase reviews, Notion sync, self-diagnostic, multi-agent orchestration, read-only audit, plan refinement, implementation readiness, provider proof, GitHub ruleset prep, dry-run eval.
- Validation: every template has target agents, mode, reading, write scope, validation, stop condition, final report.

## Phase 5 — Harness adapters
- Add/update thin adapters only: `AGENTS.md`, `.agents/README.md`, `CLAUDE.md`, `GEMINI.md`, `.claude`, `.codex`, `.cursor`, `.commandcode` pointers.
- Do not add `.opencode`/Kimi/Hermes config until official/local behavior is verified.
- Validation: no duplicated policy blocks; all point to `.ai`.

## Phase 6 — Dry-run/evals
- Execute scenarios in `33_AGENT_DRY_RUN_EVALS_AND_ADOPTION_TESTS.md`.
- Keep enforcement advisory until compliance score threshold passes.

## Phase 7 — PR/CI/GitHub enforcement
- Add PR templates/docs-compliance checks first.
- Harden GitHub Actions token permissions, pinned actions, dependency scanning, CODEOWNERS/rulesets only after approval.
- Rollback: disable advisory checks before enforcing, preserve admin bypass/emergency path.

## Phase 8 — Beta/release integration
- Connect agent framework evidence to existing closed-beta proof gates.
- Do not mark beta ready until external/provider/manual proof is captured.

## What not to touch
Production source, migrations, packages, dependencies, generated files, provider settings, GitHub settings, Notion, secrets, SlateCamp resources.
