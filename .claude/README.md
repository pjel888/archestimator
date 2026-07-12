# Claude Adapter

`.claude/` is for Claude tool configuration and hooks only. Claude role,
scope, evidence, and safety policy live in `.ai/12_agents/payloads/claude.md`
and `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`.

Do not add Claude-specific project memory here. Durable project truth belongs
in `.ai`.

Claude inherits the Lean Engineering Ethos: bounded evidence-supported blast
radius, smallest coherent change, just-in-time context, fewest useful lanes and
review passes, and explicit-user-only tests/builds/browser QA. Claude skills and
plugins cannot reintroduce always-on TDD, exhaustive planning, or review chains.

<!-- supermemory-bootstrap: required -->
Claude Code inherits the shared Supermemory workflow from
`.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` and
`.ai/12_agents/payloads/claude.md`: run `bun run supermemory:ensure` before
meaningful work, search relevant memory before broad/non-trivial work, and add a
sanitized durable update at closeout when project truth changes. Supermemory is
advisory; `.ai` and current source remain authoritative.
