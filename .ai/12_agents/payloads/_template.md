# <Agent> Payload

Status: <approved|conditional|deprecated|unapproved|non-agent>
Primary lane: <role>
Secondary lane: <role or none>
Prohibited lanes: <exact side-effect or role limits>

## Authority

Start with `AGENTS.md`, the FAST PATH in `.ai/10_state/current-state.md`, and
task-relevant `.ai/00_system` docs. Use Direct, Brief, or Plan Pack. Test
decisions are `NOT_REQUIRED|TEST_PROPOSAL|TEST_TASK`; only `TEST_TASK` permits
test execution or edits.
When orchestration is selected, follow
`.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`;
otherwise use sequential fallback. Pull context just in time and do not
linear-read the full history logs.

## Role Notes

<Only tool-specific capabilities, limitations, and return expectations.>
