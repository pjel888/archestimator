# Archestimator Agent Entry Point

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project intelligence root

All AI agents must use `.ai/` as the shared project brain.

Start here:
1. `.ai/README.md`
2. `.ai/00_system/ai-folder-canonical-map.md`
3. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
4. `.ai/10_state/current-state.md`
5. `.ai/10_state/decisions.md`
6. `DESIGN.md`

## Core rules

- Do not create separate tool-specific knowledge silos.
- Keep durable decisions, plans, specs, prompts, skills, and agent instructions inside `.ai/`.
- Do not store secrets in the repository or `.ai`.
- Stack baseline is Next.js + Bun, local-first data while the product model changes rapidly.
- Prepare data-access boundaries for future Supabase/Postgres migration, but do not connect Supabase until explicitly approved.
- If project reality changes, update `.ai/10_state/current-state.md` and the relevant canonical doc.

## Current stage

Archestimator is entering MVP implementation setup. Prioritize the estimating sheet, cost library, proposal package, versioning, local-first data repositories, validation gates, and design-system consistency.