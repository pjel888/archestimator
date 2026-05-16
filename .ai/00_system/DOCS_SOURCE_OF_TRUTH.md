# Docs Source of Truth

## Principle

The `.ai` folder should prevent agent drift. Each type of knowledge has one canonical home.

## Canonical homes

- Project overview and navigation: `.ai/README.md`
- `.ai` taxonomy and placement rules: `.ai/00_system/ai-folder-canonical-map.md`
- Agent workflow rules: `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- Validation expectations: `.ai/00_system/VALIDATION_MATRIX.md`
- Current project state: `.ai/10_state/current-state.md`
- Decisions and assumptions: `.ai/10_state/decisions.md`
- Known issues and risks: `.ai/10_state/known-issues.md`
- Roadmap: `.ai/01_roadmap/README.md`
- Plans: `.ai/03_plans/`
- Specs: `.ai/06_specs/`
- Skills/playbooks: `.ai/11_skills/`
- Agent contracts/model routing: `.ai/12_agents/`
- Research: `.ai/13_research/`

## Anti-duplication rule

If two docs cover the same topic, one must be canonical and the other must point to it. Do not let Claude, Codex, OpenCode, or other agents maintain separate contradictory instructions.
