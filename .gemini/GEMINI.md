# Gemini Workspace Entry Point — Deprecated

Gemini is fail-closed for Archestimator planning, review, implementation, and
provider work unless the current user explicitly reapproves it for a bounded
task.

If reapproved, start with `AGENTS.md`, the FAST PATH in
`.ai/10_state/current-state.md`, and
`.ai/12_agents/payloads/gemini.md`. Use Direct, Brief, or Plan Pack routing and
inherit automatic `Q0_CONTRACT_ONLY`, `Q1_CHANGE_GATE`,
`Q2_CRITICAL_CHANGE_GATE`, and `Q3_RELEASE_GATE` classification from
`.ai/00_system/BETA_QUALITY_ENGINEERING_PROTOCOL.md`. For any delegated,
threaded, emulated, or fallback execution, follow
`.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`.

<!-- supermemory-bootstrap: required -->
Run `bun run supermemory:ensure` before meaningful reapproved work. This file
defines no independent workflow, model, Git, provider, or validation policy.
