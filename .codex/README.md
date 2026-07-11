# Codex Adapter

`.codex/` is for shareable Codex MCP, hook, prompt, skill, and agent adapter
configuration. Codex role, scope, evidence, and safety policy live in
`.ai/12_agents/payloads/codex.md` and
`.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`.

Do not add Codex-only project brain files here. Durable project truth belongs
in `.ai`.

<!-- supermemory-bootstrap: required -->
Codex inherits the shared Supermemory workflow from
`.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` and
`.ai/12_agents/payloads/codex.md`: run `bun run supermemory:ensure` before
meaningful work, search relevant memory before broad/non-trivial work, and add a
sanitized durable update at closeout when project truth changes. Supermemory is
advisory; `.ai` and current source remain authoritative, and auxiliary memory
sync failures do not block implementation.

Keep runtime state, logs, sessions, caches, tmp files, and machine-local
settings out of Git.

Validate the shared Codex/OpenCode adapter surface with:

```sh
bun run validate:agents
```
