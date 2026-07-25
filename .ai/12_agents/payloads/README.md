# Payload Contract

Each payload must include:

- `Status:`
- `Primary lane:`
- `Secondary lane:`
- `Prohibited lanes:`
- references to `AGENTS.md`, `.ai/00_system`, and
  `.ai/10_state/current-state.md`
- the canonical
  `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` when
  orchestration is used
- Direct/Brief/Plan Pack routing
- inheritance of `.ai/00_system/BETA_QUALITY_ENGINEERING_PROTOCOL.md` and the
  `Q0_CONTRACT_ONLY` through `Q3_RELEASE_GATE` profiles

Everything else belongs in canonical policy or a genuinely tool-specific note.
Start from the FAST PATH and avoid preloading the full history files.
