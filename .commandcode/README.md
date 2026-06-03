# CommandCode Adapter

`.commandcode/` contains sentinel and taste surfaces. They are useful review
adapters, not a separate project brain.

Canonical rules live in:

1. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
2. `.ai/12_agents/payloads/commandcode.md`
3. `DESIGN.md` for UI taste boundaries

CommandCode agents default to review/sentinel lanes unless implementation is
explicitly assigned in an isolated branch/worktree with a disjoint write scope.
