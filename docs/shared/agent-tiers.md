# Agent Tiers

This compatibility pointer exists for workflows that look for
`docs/shared/agent-tiers.md`, including Ultrawork. Canonical model, effort,
lane, and stop-condition policy lives in:

- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/12_agents/README.md`

Use the canonical tiers from `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`:

- Low: file search, inventory, path checks, simple docs cleanup, status checks,
  and deterministic evidence gathering.
- Standard: ordinary implementation, focused tests, straightforward refactors,
  and normal review.
- High: architecture, security, data integrity, auth, migrations,
  multi-surface behavior, ambiguous debugging, adversarial review, and release
  or provider-proof decisions.
- Highest: lead orchestration for broad or risky work, final blocker
  arbitration, and cases where a wrong decision would create expensive rework.

This file must stay a pointer, not a separate policy source. Update the `.ai`
protocols first when the tier model changes.
