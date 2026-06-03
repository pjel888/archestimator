# Claude Adapter

`.claude/` is for Claude tool configuration and hooks only. Claude role,
scope, evidence, and safety policy live in `.ai/12_agents/payloads/claude.md`
and `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`.

Do not add Claude-specific project memory here. Durable project truth belongs
in `.ai`.
