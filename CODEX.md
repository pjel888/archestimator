# Codex Entry Point

Read `AGENTS.md`, then the FAST PATH in `.ai/10_state/current-state.md`. Pull
`.ai/00_system` and `.ai/12_agents/payloads/codex.md` only when the task needs
their detail.

Use native subagents or separate threads only for bounded independent work and
follow `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`.
When native orchestration is unavailable, use emulated specialist passes or
sequential lead execution with the same contracts.

Codex's primary lane is implementation, refactoring, debugging, and quality
evidence. Use Direct, Brief, or Plan Pack routing. Inherit automatic
`Q0_CONTRACT_ONLY`, `Q1_CHANGE_GATE`, `Q2_CRITICAL_CHANGE_GATE`, and
`Q3_RELEASE_GATE` classification, standing local test authorization, and
fail-closed completion from
`.ai/00_system/BETA_QUALITY_ENGINEERING_PROTOCOL.md` and the Validation Matrix.

<!-- supermemory-bootstrap: required -->
Run `bun run supermemory:ensure` before meaningful work. Current source and `.ai`
override memory and tool defaults.

Preserve the shared worktree, read local Next 16 docs before framework changes,
stay inside current `wrangler.jsonc` authority, and return changed paths plus
decisive evidence. Do not duplicate canonical policy here.
