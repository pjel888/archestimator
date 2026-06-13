# Loop Engineering Mandate Index

## Bottom Line

Archestimator's product-development flow should now be described as a
loop-engineered, agent-neutral system:

1. Audit current code, provider boundaries, docs, and state.
2. Create or update a dated `.ai/03_plans/<YYYY-MM-DD>-<slug>/` plan pack.
3. Research uncertain claims into `.ai/13_research/` with source dates.
4. Execute through the narrowest adequate loop surface.
5. Verify with maker/checker separation and real-surface evidence.
6. Persist state outside chat.
7. Decide the next iteration or stop only when the condition is proven.

This preserves the lean mandate: small direct fixes stay direct. The loop is for
non-trivial, research-heavy, user-facing, provider-facing, ambiguous, or
multi-lane work.

## Documents

- `01_CURRENT_WORKFLOW_AUDIT.md` - current mandate audit and gap analysis.
- `02_LOOP_ENGINEERING_RESEARCH.md` - source-backed research summary.
- `03_LOOP_SURFACE_MAP.md` - routing map for `ultrawork`, `ultragoal`,
  `omo:ulw-loop`, `autopilot`, `omo:ultraresearch`, `ultraqa`, and
  `vercel:agent-browser`.
- `04_ADOPTION_AND_VALIDATION_PLAN.md` - rollout and validation plan for docs
  governance.
- `IMPLEMENTATION_HANDOFF_PROMPT.md` - reusable prompt for future agents.

## Canonical Updates Made

- Root `AGENTS.md` now names loop-engineered product development and the loop
  surface vocabulary.
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` now defines the product loop,
  route selection, and cross-agent compatibility.
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` now defines the agent-neutral loop
  engineering contract and receipt fields for durable loop memory, research
  boundary, and manual QA channel.
- `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, and
  `.ai/10_state/execution-ledger.md` now point to this pack and its companion
  research note.

## Stop Condition

This governance update is complete when the canonical mandate docs, plan pack,
research note, and state links are internally consistent and pass docs-only
validation. It does not require browser, provider, or production proof because
no runtime artifact changed.
