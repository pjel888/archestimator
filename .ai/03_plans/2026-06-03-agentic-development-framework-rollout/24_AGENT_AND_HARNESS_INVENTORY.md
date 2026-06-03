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
