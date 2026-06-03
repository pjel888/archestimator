# Agent Instruction Files and Harness Integration Plan

## Actual instruction/config files found
`AGENTS.md`, `.ai/AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.ai/12_agents/*`, `.ai/08_prompts/*`, `.ai/11_skills/*`, `.agents/skills/*`, `.claude/settings.json`, `.codex/config.toml`, `.codex/hooks.json`, `.cursor/mcp.json`, `.gemini/ralph/state.json`, `.commandcode/agents/*`, `.commandcode/taste/*`, `.github/workflows/ci.yml`.

## Integration rules
- `AGENTS.md`: thin entrypoint only.
- `.ai/12_agents`: canonical role/payload source.
- `.ai/08_prompts`: reusable prompts.
- `.ai/11_skills`: reusable playbooks.
- `.agents/`: thin compatibility shim plus skills; not a separate brain.
- `.claude`/`.codex`/`.cursor`: MCP/hooks/config only; role rules live in `.ai`.
- `.commandcode`: sentinels/taste files must point to `.ai` and avoid conflicting policy.
- `.gemini`: deprecated state must not revive Gemini lane.

## What not to create until verified
Do not create `.opencode`, Kimi, Hermes, or provider-specific harness config without verifying official docs or installed local behavior.
