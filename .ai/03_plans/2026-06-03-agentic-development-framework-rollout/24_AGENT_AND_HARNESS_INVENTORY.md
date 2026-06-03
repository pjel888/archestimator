# Agent and Harness Inventory

## Discovered local agent/harness surfaces

| Surface | Status | Evidence | Quality / gap |
|---|---|---|---|
| `AGENTS.md` | canonical repo entrypoint | root file exists | strong `.ai` pointer; future implementation may add one thin link to agent/harness rollout without duplicating policy |
| `.ai/AGENTS.md` | `.ai` subtree instructions | exists | strong `.ai` taxonomy, docs-only validation; keep |
| `.ai/12_agents/README.md` | canonical role contract folder | exists | lists Hermes, Cursor, DeepSeek; payload set does not fully match |
| `.ai/12_agents/payloads/codex.md` | active payload | exists | thin but not operationally enforceable enough |
| `.ai/12_agents/payloads/claude.md` | active payload | exists | thin but lacks safety commands/write scopes |
| `.ai/12_agents/payloads/opencode.md` | active payload | exists | thin; needs installed-schema warning |
| `.ai/12_agents/payloads/commandcode.md` | active payload | exists | thin; must align with `.commandcode/agents` sentinels |
| `.ai/12_agents/payloads/antigravity.md` | active payload | exists | thin; good `agy` role note; needs worktree/validation gates |
| `.ai/12_agents/payloads/kimi.md` | active payload | exists | thin; needs UI/design-system gates |
| `.ai/12_agents/payloads/deepseek.md` | active payload | exists | thin; needs debug/read-only default and escalation rules |
| `.ai/12_agents/payloads/gemini.md` | deprecated payload | exists | correctly deprecated; root `GEMINI.md` still lacks explicit deprecation text |
| `.ai/12_agents/payloads/hermes.md` | missing | README names Hermes | must be created or Hermes removed from active roster by future implementation |
| `.ai/12_agents/payloads/cursor.md` | missing | README names Cursor/future tools | create if Cursor is approved for repo work, otherwise document as MCP-only/unapproved |
| `.ai/12_agents/payloads/ollama.md` | missing | policy says non-agent | optional prohibition/embedding-only note to prevent accidental chat-model routing |
| `.ai/08_prompts/*` | prompt library | exists | includes plan creation/refinement/implementation and agentic framework prompt; missing finalized template matrix for all workflow modes |
| `.ai/11_skills/*` | project playbooks | exists | few product/research/data playbooks only; missing agent framework/dry-run/run-log playbooks |
| `.agents/skills/*` | local skill compatibility folder | exists | skills/playbooks only; no `.agents/README.md` pointer; do not treat as canonical brain |
| `.claude/settings.json` | Claude hooks | exists | code-review-graph hooks only; no Claude-specific memory/settings policy beyond root `CLAUDE.md` |
| `CLAUDE.md` | Claude entrypoint | exists | root points to `AGENTS.md`/`.ai`; stack note says older local-first baseline and should be updated in future implementation/docs-sync if allowed |
| `.codex/config.toml`, `.codex/hooks.json` | Codex surfaces | exist | code-review-graph MCP/hooks; no Codex role payload bridge besides root `AGENTS.md` and `.ai/12_agents/payloads/codex.md` |
| `.cursor/mcp.json` | Cursor MCP config | exists | code-review-graph MCP only; no Cursor rules/instructions folder found |
| `.gemini/ralph/state.json` | stale Gemini/Ralph state | exists | Gemini is deprecated; future implementation should decide whether to archive/remove state safely |
| `GEMINI.md` | Gemini entrypoint | exists | contains graph rules only; conflicts with Gemini phased-out policy by omission |
| `.commandcode/agents/*.md` | CommandCode sentinel agents | exists | many domain sentinel prompts, heavy and not thin `.ai` pointers; future plan must avoid drift and add a pointer/compatibility pattern |
| `.commandcode/taste/*` | CommandCode taste rules | exists | useful style/workflow preferences; must be reconciled under `.ai` canonical rules |
| `.github/workflows/ci.yml` | CI harness | exists | strong basic validation; needs progressive security hardening and docs-compliance after dry-run |
| `.github/copilot-instructions.md` | absent | not found | create only if GitHub Copilot becomes approved; keep thin pointer to `.ai` |
| `.opencode/` | absent | not found | do not invent; verify installed OpenCode docs/schema before future config |
| `.commandcode` | present | local sentinel/taste surfaces | plan integration needed |

## Required future files
- `.ai/12_agents/payloads/_template.md`
- `.ai/12_agents/payloads/hermes.md` or decision removing Hermes from active roster
- `.ai/12_agents/payloads/cursor.md` if Cursor is approved
- `.ai/12_agents/payloads/ollama.md` as non-agent/embedding-only note if useful
- `.agents/README.md` thin compatibility shim
- Root `GEMINI.md` fail-closed deprecation notice or safe archive decision
- `.ai/08_prompts/templates/*`
- `.ai/11_skills/agent-run-log.md`, `agent-compliance-dry-run.md`, `provider-proof-packet.md` or equivalent

## Open questions
See `12_OPEN_QUESTIONS_AND_DECISIONS.md`.

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
