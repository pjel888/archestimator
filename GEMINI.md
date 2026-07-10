# Gemini Entry Point - Deprecated

Gemini is phased out for Archestimator agent routing. Do not use Gemini for
planning, review, implementation, or provider work unless Philip explicitly
reapproves Gemini for a specific task.

Use `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` and
`.ai/12_agents/payloads/gemini.md` for the fail-closed policy. The approved
extra terminal-agent lane is Antigravity CLI (`agy`) when it is explicitly
scoped.

If Gemini is ever reapproved for a specific task, it inherits the same
<!-- supermemory-bootstrap: required -->
Supermemory workflow as every other agent: run `bun run supermemory:ensure`
before meaningful work, search relevant memory before broad/non-trivial work,
and add one sanitized durable update at closeout when project truth changes.
Supermemory is advisory; `.ai`, current source, tests, and provider evidence
remain authoritative.

Tool-specific graph/MCP guidance is intentionally omitted: Gemini is a deprecated,
fail-closed lane. If Gemini is ever reapproved for a specific task, it follows the
same proportional graph policy as every other agent
(the proportional graph policy in `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` and
`AGENT_FRAMEWORK_PROTOCOL.md`) — graph tools for broad/high-risk/unfamiliar work,
`rg`/targeted reads for narrow local edits — not an always-use-graph default.
