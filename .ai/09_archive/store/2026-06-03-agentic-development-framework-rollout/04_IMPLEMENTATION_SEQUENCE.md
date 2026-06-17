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
Production source, migrations, packages, dependencies, generated files, provider settings, GitHub settings, Notion, secrets, archestimator resources.

---

## 2026-06-03 Phase 1A/1B hard-gate refinement

**Refinement timestamp:** `2026-06-03T15:04:34Z`.

This document is part of a **plan-refinement-only** pass. It does not implement source code, app behavior, dependencies, migrations, package files, runtime/generated files, provider changes, GitHub settings, branch protection, Notion mutations, or secrets. Only `.ai` planning/state/log/bug documents are in scope for this task.

### Phase 1A — repo-local framework implementation

Future Phase 1A is repo-local only. It may update `.ai/00_system`, standardize `.ai/12_agents` payloads, finalize `.ai/08_prompts` templates, finalize `.ai/11_skills` playbooks, and add/adjust thin harness adapters for `AGENTS.md`, `.agents/README.md`, `GEMINI.md`, `.commandcode`, `.codex`, `.claude`, `.cursor`, `.gemini`, and other discovered surfaces where authorized. It must resolve or fail-close Hermes, Cursor, Gemini, Ollama, `.agents`, and CommandCode drift policy. It must repair or bug stale root agent-doc facts. It must record graph/tool evidence and use code-review-graph fallback if GitNexus remains broken.

Phase 1A can end as `READY_FOR_PHASE_1A_IMPLEMENTATION` or `PHASE_1A_COMPLETE`, but **not** `PHASE_1_COMPLETE`.

### Phase 1B — Notion mirror hard completion gate

Future Phase 1B starts only after Phase 1A is committed and pushed. It must update the ArchEstimator Notion mirror for the framework, agent roster, prompt library, run logs, dry-run/eval status, GitHub guardrails, provider-proof gates, release readiness, and current proof boundary. It must verify stack facts from live `package.json` at implementation time, include source `.ai` paths, commit hash, mirror date, proof boundary, anti-drift notice, and no secrets.

If Notion mutation is unavailable, unauthorized, or fails, the future implementation agent must create a dated `.ai/15_Bugs` blocker and report `PHASE_1A_COMPLETE_PHASE_1B_BLOCKED`, not `PHASE_1_COMPLETE`. Notion is a mirror only; `.ai`, source, tests, package scripts, commits, and provider evidence remain authoritative.

### Readiness boundary

Current working assessment: Phase 1 repo implementation readiness is approximately 94-96% before this refinement and may honestly reach 98% plan readiness with fail-closed Phase 1A/1B decisions. Global framework enforcement is **not ready**. Enforcement implemented is **0%**. Closed beta remains **NO-GO** until separate external/manual provider proof gates pass. 100% readiness must not be claimed while known gaps remain.

### Live evidence from this refinement

- `git status --short --branch` initially reported `## main...origin/main`; branch `main`; worktree clean at `34b0c3f`.
- `git fetch --prune origin` completed with non-blocking git gc warning about `.git/gc.log` and many unreachable loose objects; no destructive cleanup was run.
- code-review-graph MCP worked: 477 files, 4,361 nodes, 65,147 edges, last updated 2026-06-03T22:34:39; communities above size 20: `workshop-estimate`, `estimates-estimate`, `workshop-project`.
- GitNexus CLI attempts failed with `Cannot destructure property 'package' of 'node.target' as it is null`; future implementation must not claim GitNexus readiness until repaired.
- `package.json` evidence: Next.js 16.2.6, React/React DOM 19.2.6, TypeScript ^6.0.3, Tailwind CSS ^4.3.0, Supabase JS 2.106.2, Supabase SSR 0.10.3, TanStack Query 5.100.14, Zustand 5.0.14, Vitest ^4.1.7, Playwright ^1.60.0.
- `.github/workflows/ci.yml` runs `bun run validate`, `bun run build`, `bun run test:e2e`, and `bun run test:e2e:perf`.
- Route/test inventory found 48 app page/API route files, 330 TypeScript/TSX files under `src`, and 194 files under `tests`/`e2e`.
- Notion was inspected read-only. `05 Engineering and Architecture` has stale React/DOM 19.2.4 and Supabase JS 2.105.4 against live `package.json`; `07 QA, Evidence, and Drift` has stale graph stats. No Notion mutation occurred.

### Bug/blocker references

- `.ai/15_Bugs/2026-06-03-agent-harness-payload-enforcement-gaps.md`
- `.ai/15_Bugs/2026-06-03-stack-version-source-of-truth-drift.md`
- `.ai/15_Bugs/2026-06-03-notion-agent-framework-mirror-and-stack-drift.md`
