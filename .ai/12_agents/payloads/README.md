# Agent Payloads

Payloads define role-specific constraints for each agent or harness. They are
thin adapters to shared project rules, not independent policy.

Required shared files:

1. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
2. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
3. `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
4. `.ai/00_system/VALIDATION_MATRIX.md`
5. `.ai/10_state/current-state.md`
6. `.ai/10_state/decisions.md`

All payloads inherit the orchestrator-led routing contract from
`.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`: the active lead chooses lane,
model/effort tier, loop role, and whether parallel execution is worth the token
cost. Payloads may declare defaults and constraints, but they must not fork that
policy.

All payloads also inherit the loop-engineering contract from
`.ai/00_system/AGENT_OPERATING_PROTOCOL.md`: non-trivial product work follows
discover/audit -> `.ai/03_plans` plan pack -> `.ai/13_research` research ->
loop execution -> maker/checker verification -> real-surface proof -> durable
memory -> next decision. Claude, Codex, OpenCode, CommandCode, Antigravity,
Kimi, DeepSeek, Gemini only if explicitly reapproved,
and future payloads must map their local capabilities back to that shared loop.

Use `_template.md` for new payloads. Deprecated, unapproved, and non-agent
payloads must still state their fail-closed behavior.
