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
- `NOT_REQUIRED|TEST_PROPOSAL|TEST_TASK`

Everything else belongs in canonical policy or a genuinely tool-specific note.
Start from the FAST PATH and avoid preloading the full history files.
