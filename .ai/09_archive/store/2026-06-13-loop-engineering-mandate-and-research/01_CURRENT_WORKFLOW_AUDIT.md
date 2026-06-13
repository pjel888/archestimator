# Current Workflow Audit

## Scope

Audit the repo-local agent mandate and planning/research surfaces for the
request to make Archestimator's usual product-development flow more explicitly
loop-engineered and usable by all approved coding agents.

## Current Aligned Surfaces

- `AGENTS.md` already states that orchestration is normal when work splits
  cleanly and that loop engineering means defining a goal, observing evidence,
  persisting state, deciding the next action, and stopping on a real pass or
  blocker.
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` already supports proportional
  execution and multi-agent routing.
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` already makes the lead
  orchestrator own scope, routing, model/effort, integration, validation, and
  the final claim.
- `.ai/03_plans/README.md` already requires dated plan packs under
  `.ai/03_plans/<YYYY-MM-DD>-<topic-slug>/`.
- `.ai/12_agents/README.md` and `.ai/12_agents/payloads/README.md` already keep
  payloads subordinate to the shared framework.

## Gaps Found

- The product-development loop was present as a principle but not explicit as
  the normal non-trivial feature-development path.
- Research was not explicitly tied to loop memory and `.ai/13_research` for
  agentic workflow decisions.
- Browser-facing proof was called out in verification policy, but not mapped to
  `vercel:agent-browser` as a named loop surface.
- The framework receipt lacked fields for loop memory, research boundary, and
  manual QA channel.
- Reusable prompt templates did not include a loop-engineered product-development
  template.
- Cross-agent compatibility was implied by payload rules but needed an explicit
  statement that Claude, Codex, OpenCode, CommandCode, Antigravity, Kimi,
  DeepSeek, Cursor, Gemini if reapproved, and future agents all inherit the same
  `.ai/00_system` loop contract.

## Local Constraints

- The work is documentation-only.
- Runtime surfaces such as tmux-bound OMX team/question panes were not required.
- The installed `ultrawork` skill references `docs/shared/agent-tiers.md`, but
  that file is not present in this repo. The repo-local authority for tiering is
  `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`.

## Audit Outcome

The repo already had the right direction. This pack makes the loop explicit,
names the requested surfaces, and adds durable research/state links so future
agents do not reconstruct the mandate from chat memory or fork it per tool.
