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

Use `_template.md` for new payloads. Deprecated, unapproved, and non-agent
payloads must still state their fail-closed behavior.
