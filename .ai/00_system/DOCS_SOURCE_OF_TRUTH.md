# Docs Source of Truth

The `.ai` folder prevents agent drift. Each type of knowledge has one canonical home.

## Current restart entry point

- Current state: `.ai/10_state/current-state.md`
- Reset audit: `.ai/02_audits/2026-05-17-reset-cleanup-audit.md`
- Restart guardrails: `.ai/06_specs/restart-guardrails.md`
- Decisions: `.ai/10_state/decisions.md`
- Known issues: `.ai/10_state/known-issues.md`

Historical workshop-recovery plans/logs are not active instructions after the reset.

## Canonical homes

- Project overview and navigation: `.ai/README.md`
- Folder map and policy: `.ai/00_system/ai-folder-canonical-map.md`
- Operating protocol: `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- Validation commands and evidence expectations: `.ai/00_system/VALIDATION_MATRIX.md`
- Current state: `.ai/10_state/current-state.md`
- Decisions: `.ai/10_state/decisions.md`
- Known issues and risks: `.ai/10_state/known-issues.md`
- Roadmap: `.ai/01_roadmap/README.md`
- Audits: `.ai/02_audits/`
- Plans: `.ai/03_plans/`
- Tasks/boards: `.ai/04_tasks/`
- Handoff logs: `.ai/05_logs/`
- Specs: `.ai/06_specs/`
- Skills/playbooks: `.ai/11_skills/`
- Agent contracts/model routing: `.ai/12_agents/`
- Research: `.ai/13_research/`

## Anti-duplication rule

If two docs cover the same topic, one must be canonical and the other must point to it. Do not let Claude, Codex, OpenCode, Kimi, DeepSeek, or other agents maintain separate contradictory instructions.
