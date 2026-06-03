# Requirements and Acceptance Criteria

## Functional requirements

| ID | Priority | Requirement | Acceptance criterion |
|---|---|---|---|
| FR-001 | MUST | `.ai` remains canonical project brain. | Every future tool-specific instruction points to `.ai/00_system` and `.ai/12_agents`; no competing source-of-truth is created. |
| FR-002 | MUST | `AGENTS.md` remains thin repo entrypoint. | Future changes add only pointers/reading order and do not duplicate all policy. |
| FR-003 | MUST | `.ai/12_agents/payloads` becomes thin but operationally enforceable. | Each payload follows schema in `26_AGENT_PAYLOAD_STANDARDIZATION_PLAN.md`. |
| FR-004 | MUST | Missing Hermes/Cursor/Ollama-policy payload decisions are resolved. | Either files are created as thin payloads/prohibition notes or docs remove them from active roster. |
| FR-005 | MUST | Deprecated Gemini is fail-closed. | `gemini.md`, `GEMINI.md`, and `.gemini` state handling all say Gemini is deprecated unless Philip reapproves. |
| FR-006 | MUST | `.agents/` is handled without drift. | If kept, `.agents/README.md` is a thin compatibility shim to `.ai`; skills remain playbooks, not an alternate brain. |
| FR-007 | MUST | Agent preflight is enforceable. | Every prompt/payload demands safety checks, source-of-truth read, scope/non-goals, validation gates, and mode declaration. |
| FR-008 | MUST | Runtime multi-agent rules are enforceable. | Disjoint write scopes, worktree isolation, leader-owned integration, dirty-worktree handling, and conflict detection are documented. |
| FR-009 | MUST | Evidence protocol is enforceable. | Run logs capture branch/commit, commands, graph evidence, tests, provider proof boundaries, bugs, `.ai` updates, and final report. |
| FR-010 | MUST | Notion remains mirror-only. | No Notion page/database may be cited as repo implementation truth over `.ai`/source/test evidence. |
| FR-011 | MUST | GitHub and CI hardening is staged. | Advisory/dry-run first; rulesets/protection/required checks require approval before enforcement. |
| FR-012 | MUST | Provider/GitHub/admin claims require proof. | Agents may not claim provider state from local evidence or plan text. |

## Agent-specific requirements

| Agent/harness | Status target | Primary lane | Requirements |
|---|---|---|---|
| Codex | Approved | implementation/tests/PR diffs | Must run safety preflight, graph checks, TDD where source changes, validation, `.ai` updates, no provider mutations without approval. |
| Claude / Claude Code | Approved | planning/architecture/review/writing | Must read `.ai`, use hooks/settings safely, avoid source edits unless explicitly assigned, record evidence. |
| OpenCode | Approved/conditional | exploration/fallback/review | Must verify installed schema before config changes; no config drift from `.ai`. |
| CommandCode | Approved/conditional | taste/review/sentinel lanes | `.commandcode/agents` must be subordinate to `.ai`; sentinels are reviewers unless implementation is explicitly assigned. |
| Kimi | Approved/conditional | UI/product/long-context | UI-capable changes must follow `DESIGN.md` and design-system lint. |
| Antigravity CLI / `agy` | Approved | isolated terminal lane | Must use branch/worktree isolation for edits; extra terminal lane replaces Gemini. |
| DeepSeek | Approved/conditional | debug/logic critique | Default read-only/diagnostic; implementation only with explicit assignment and validation. |
| Hermes | Listed but missing payload | orchestration/evidence | Must get payload or be removed from active roster; cannot orchestrate without run-log/concurrency rules. |
| Cursor | Local MCP only/conditional | editor support/review | Create rules only if approved; `.cursor/mcp.json` currently only configures code-review-graph. |
| Gemini | Deprecated | none | Fail closed unless Philip explicitly reapproves for a task. |
| Ollama | Non-agent | embeddings only | No chat/planning/coding via Ollama unless Philip explicitly approves and documents it. |
| GitNexus/code-review-graph | Intelligence harness | graph/evidence | Use before broad grep and before code-symbol edits; record CLI/tool failures honestly. |

## Non-functional requirements
- Lean startup velocity: minimal ceremony, small branches, fast checks, dry-run before enforcement.
- Security: no secrets, no provider/admin mutations, no destructive commands, no long-lived deployment secrets when OIDC/provider-native safe flow is available and approved.
- Performance: keep CI fast for feature branches and fuller for beta/main/release.
- Accessibility/UI: N/A for the docs-only framework itself, but future internal dashboards must follow `DESIGN.md` and `07_UI_UX_AND_ACCESSIBILITY_PLAN.md`.
- Compatibility: all tools must tolerate `.ai` as source of truth; no duplicated policy forks.

## Non-goals
- Do not implement source behavior, migrations, providers, GitHub settings, Notion, package files, dependencies, or generated files in this plan-refinement task.

## Pass/fail
Pass if a future implementation agent can execute Phase 1 without asking for missing schema/routing/run-log/concurrency/compliance requirements. Fail if any agent/harness lane lacks status, role, scope, validation, or evidence rules.

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
