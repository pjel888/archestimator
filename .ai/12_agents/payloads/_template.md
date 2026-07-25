# <Agent> Payload

Status: <approved|conditional|deprecated|unapproved|non-agent>
Primary lane: <role>
Secondary lane: <role or none>
Prohibited lanes: <exact side-effect or role limits>

## Authority

Start with `AGENTS.md`, the FAST PATH in `.ai/10_state/current-state.md`, and
task-relevant `.ai/00_system` docs. Use Direct, Brief, or Plan Pack. Inherit
automatic `Q0_CONTRACT_ONLY` through `Q3_RELEASE_GATE` classification, standing
local quality authorization, and fail-closed completion from the canonical beta
quality protocol.
When orchestration is selected, follow
`.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`;
otherwise use sequential fallback. Pull context just in time and do not
linear-read the full history logs.

## Role Notes

<Only tool-specific capabilities, limitations, and return expectations.>
