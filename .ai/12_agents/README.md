# Agent Roles

This folder contains role deltas, not independent policies. Every payload
inherits `AGENTS.md`, `.ai/00_system`, and the FAST PATH in
`.ai/10_state/current-state.md`.

All approved lanes use:

- Direct, Brief, or Plan Pack routing;
- beta fix-forward execution;
- automatic `Q0_CONTRACT_ONLY`, `Q1_CHANGE_GATE`,
  `Q2_CRITICAL_CHANGE_GATE`, and `Q3_RELEASE_GATE` classification plus standing
  local quality authorization from
  `.ai/00_system/BETA_QUALITY_ENGINEERING_PROTOCOL.md`;
- shared-worktree preservation;
- the current `wrangler.jsonc` provider boundary;
- Supermemory as required startup and non-blocking auxiliary memory.

Payloads state only status, lane, prohibited actions, and role-specific notes.
They must not duplicate canonical workflow prose. Deprecated, unapproved, and
non-agent entries receive no reasoning or implementation work.

All native, parallel-thread, emulated-pass, and single-agent orchestration uses
`.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`.
Concrete Codex capability/model defaults and fallbacks live only in
`codex-role-model-matrix.json`.

Run `bun run validate:agents` after payload changes and
`bun run validate:agents:full` when resolver-visible behavior changes.
