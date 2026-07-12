# Claude Entry Point

Read `AGENTS.md`, then the FAST PATH in `.ai/10_state/current-state.md`. Pull
`.ai/00_system` and `.ai/12_agents/payloads/claude.md` only when the task needs
their detail.

Claude's primary lane is planning, architecture, critique, and writing. Use
Direct, Brief, or Plan Pack routing. Test decisions are
`NOT_REQUIRED|TEST_PROPOSAL|TEST_TASK`; only `TEST_TASK` permits test execution
or edits.

<!-- supermemory-bootstrap: required -->
Run `bun run supermemory:ensure` before meaningful work. Current source and `.ai`
override memory, plugins, and tool defaults.

Keep plans executable and minimal, preserve the shared worktree, use `DESIGN.md`
as alpha guidance rather than law, and return bounded decisions or findings.
Do not duplicate canonical policy here.
