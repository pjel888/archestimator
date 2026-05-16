# Archestimator Agent Entry Point

## Project intelligence root

All AI agents must use `.ai/` as the shared project brain.

Start here:
1. `.ai/README.md`
2. `.ai/00_system/ai-folder-canonical-map.md`
3. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
4. `.ai/10_state/current-state.md`
5. `.ai/10_state/decisions.md`

## Core rules

- Do not create separate tool-specific knowledge silos.
- Keep durable decisions, plans, specs, prompts, skills, and agent instructions inside `.ai/`.
- Do not store secrets in the repository or `.ai`.
- Tech stack is not finalized yet; do not assume Next.js/Bun is locked until `.ai/10_state/decisions.md` says so.
- If project reality changes, update `.ai/10_state/current-state.md` and the relevant canonical doc.

## Current stage

Archestimator is pre-stack and pre-MVP-definition. Prioritize product definition, estimation-domain assumptions, source policy, and UX flows before implementation.
