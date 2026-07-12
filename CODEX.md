# Codex Entry Point

Read `AGENTS.md`, then the FAST PATH in `.ai/10_state/current-state.md`. Pull
`.ai/00_system` and `.ai/12_agents/payloads/codex.md` only when the task needs
their detail.

Codex's primary lane is implementation, refactoring, debugging, and explicit
`TEST_TASK` work. Use Direct, Brief, or Plan Pack routing. Test decisions are
`NOT_REQUIRED|TEST_PROPOSAL|TEST_TASK`; only `TEST_TASK` permits test execution
or edits.

<!-- supermemory-bootstrap: required -->
Run `bun run supermemory:ensure` before meaningful work. Current source and `.ai`
override memory and tool defaults.

Preserve the shared worktree, read local Next 16 docs before framework changes,
stay inside current `wrangler.jsonc` authority, and return changed paths plus
decisive evidence. Do not duplicate canonical policy here.
