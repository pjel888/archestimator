# Claude Adapter

`.claude/` is for Claude tool configuration and hooks only. Claude role,
scope, evidence, and safety policy live in `.ai/12_agents/payloads/claude.md`
and `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`.

Do not add Claude-specific project memory here. Durable project truth belongs
in `.ai`.

Claude Code inherits the shared Supermemory workflow from
`.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` and
`.ai/12_agents/payloads/claude.md`: check `http://localhost:6767/`, start the
local server when needed, search memory before meaningful work, and update it
at closeout when durable project truth changes. Supermemory is advisory; `.ai`
and current source remain authoritative.
