# Agent Roles

This folder contains role deltas, not independent policies. Every payload
inherits `AGENTS.md`, `.ai/00_system`, and the FAST PATH in
`.ai/10_state/current-state.md`.

All approved lanes use:

- Direct, Brief, or Plan Pack routing;
- pre-beta fix-forward execution;
- `NOT_REQUIRED|TEST_PROPOSAL|TEST_TASK` test decisions;
- shared-worktree preservation;
- the current `wrangler.jsonc` provider boundary;
- Supermemory as required startup and non-blocking auxiliary memory.

Payloads state only status, lane, prohibited actions, and role-specific notes.
They must not duplicate canonical workflow prose. Deprecated, unapproved, and
non-agent entries receive no reasoning or implementation work.

Run `bun run validate:agents` after payload changes and
`bun run validate:agents:full` when resolver-visible behavior changes.
