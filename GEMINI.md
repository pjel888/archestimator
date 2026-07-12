# Gemini Entry Point - Deprecated

Gemini is phased out for Archestimator agent routing. Do not use Gemini for
planning, review, implementation, or provider work unless Philip explicitly
reapproves Gemini for a specific task.

Use `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` and
`.ai/12_agents/payloads/gemini.md` for the fail-closed policy. The approved
extra terminal-agent lane is Antigravity CLI (`agy`) when it is explicitly
scoped.

If Gemini is ever reapproved for a specific task, it inherits the same
Lean Engineering Ethos as every other agent (canonical statement:
`.ai/00_system/AGENT_OPERATING_PROTOCOL.md`): go deep on analysis to prevent
bugs, but lean on implementation (over-engineering is a bug, not thoroughness)
and lean on testing (tests are user-gated, never a default to feel thorough).
It also inherits the bounded-blast-radius and resource-economy rules: no
hypothetical surfaces, unnecessary lanes/artifacts/reviews, or token-heavy
retrieval after the requested claim is grounded.

If reapproved, only an explicit current-task user testing request maps to
`TEST_TASK` and authorizes tests, builds-as-gates, browser automation, or broad
QA. `TARGETED`, `BROADER`, and `CHEAPEST_DECISIVE_EXISTING_TEST` remain
proposal-only and never grant execution authority.

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
