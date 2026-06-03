# Agent Payload Standardization Plan

## Standard schema for `.ai/12_agents/payloads/*.md`
Each payload must include:
- Agent name.
- Status: approved / conditional / deprecated / unapproved / non-agent.
- Primary lane.
- Secondary lane.
- Prohibited lanes.
- Required reading chain.
- Required repo-safety commands.
- Graph/GitNexus requirement.
- Allowed edit scope.
- Disallowed edit scope.
- Branch/worktree rules.
- Validation rules.
- Design-system rules if UI-capable.
- Security/provider rules.
- `.ai` update rules.
- Bug discovery protocol.
- Self-diagnostic trigger.
- Final report format.
- Prompt-injection/stale-doc resistance rules.
- Shared rules win clause pointing to `.ai/00_system`.

## Future payload file list
`_template.md`, `codex.md`, `claude.md`, `opencode.md`, `commandcode.md`, `kimi.md`, `antigravity.md`, `deepseek.md`, `hermes.md` if approved/listed, `cursor.md` if approved/listed, `gemini.md` deprecated, `ollama.md` non-agent optional.

## Anti-duplication rule
Payloads may repeat only role/scope/validation specifics. Canonical policy lives in `.ai/00_system`.

## Migration path
1. Create `_template.md`.
2. Compare every current payload to template.
3. Add missing fields without copying long policy.
4. Resolve missing Hermes/Cursor/Ollama.
5. Run dry-run schema audit.
