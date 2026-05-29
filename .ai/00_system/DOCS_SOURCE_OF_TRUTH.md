# Docs Source of Truth

The `.ai` folder prevents agent drift. Each type of knowledge has one canonical home.

## Current restart entry point

- Current state: `.ai/10_state/current-state.md`
- Decisions: `.ai/10_state/decisions.md`
- Roadmap and launch cutline: `.ai/01_roadmap/README.md`
- Validation matrix: `.ai/00_system/VALIDATION_MATRIX.md`
- Agent operating protocol: `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- Agent self-diagnostic protocol: `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
- Known issues and risks: `.ai/10_state/known-issues.md`

If this restart chain conflicts with `.ai/README.md` active-work notes, prefer `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` until the README is refreshed. Historical workshop-recovery plans/logs are not active instructions after the reset.

## Current implementation authorities

These docs are the first stops for the current MVP codebase surface:

- Live project and estimate bootstrap: `.ai/06_specs/live-project-estimate-bootstrap.md`
- Project estimates and component-library source split: `.ai/06_specs/current-project-estimates-component-library-spec.md`
- Estimate Activity contract: `.ai/09_archive/store/2026-05-29-estimate-sheet-version-control-complete/18-current-activity-contract.md`
- Estimate Activity local-safe audit: `.ai/09_archive/store/2026-05-29-estimate-sheet-version-control-complete/19-local-safe-completion-audit.md`
- Project charts: `.ai/09_archive/store/2026-05-29-project-charts-estimate-comparison-complete/`
- Proposal XLSX export: `.ai/09_archive/store/2026-05-29-industry-standard-excel-proposal-export-complete/`
- Library/Templates split, component creation/versioning, and variant assets: `.ai/09_archive/store/2026-05-29-workshop-library-components-templates-split-complete/`, `.ai/09_archive/store/2026-05-29-workshop-library-component-creation-versioning-complete/`, `.ai/09_archive/store/2026-05-29-component-variant-assets-and-cost-history-complete/`
- AI Ask-only readiness and implementation: `.ai/03_plans/ai-chatbot-agent-readiness/`
- UI componentization: `.ai/09_archive/store/2026-05-29-implemented-plan-cleanup/ui-componentization-and-storybook-plan.md`

Do not treat an older plan as active if these docs or `.ai/10_state/*` say the implementation has moved on.

## Canonical homes

- Project overview and navigation: `.ai/README.md`
- Folder map and policy: `.ai/00_system/ai-folder-canonical-map.md`
- Operating protocol: `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- Performance degradation / stale-context recovery: `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
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
- Brand, narrative, positioning, messaging, and voice: `.ai/06_specs/brand/`
- Skills/playbooks: `.ai/11_skills/`
- Agent contracts/model routing: `.ai/12_agents/`
- Research: `.ai/13_research/`
- External operating workspace: Notion may mirror roadmap/startup context, but repo implementation truth lives in `.ai` and current source files when conflicts appear.

## Anti-duplication rule

If two docs cover the same topic, one must be canonical and the other must point to it. Do not let Claude, Codex, OpenCode, CommandCode, Antigravity CLI (`agy`), Kimi, DeepSeek, Notion, or other agents/tools maintain separate contradictory instructions. Gemini is phased out and must not become a separate active instruction lane unless Philip explicitly reapproves it.

## Agent performance rule

When Philip reports degraded agent quality, stale behavior, or repeated mistakes, agents must treat `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` as the canonical recovery procedure before continuing work. Do not answer from memory; check live git state and active source-of-truth docs first.
