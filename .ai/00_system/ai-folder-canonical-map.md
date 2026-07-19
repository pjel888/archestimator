# `.ai` Folder Canonical Map

## Current rule

The canonical project intelligence root is `.ai/`.

All durable project-management, audit, planning, state, prompt, agent, skill, archive, and research material should live under the numbered folders below.

Repo-level entrypoints outside `.ai` still matter:

- `AGENTS.md` — top-level agent operating contract and current tool/graph rules.
- `DESIGN.md` — visual/design direction.
- Source files, migrations, package scripts, and tests — live implementation evidence when docs drift.

## Top-level canonical folders

- `00_system/` — governance, routing, structure, naming, validation, workflow
- `00_system/AGENT_FRAMEWORK_PROTOCOL.md` — canonical roles, payload, model
  mapping, and adapter rules
- `08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` —
  canonical orchestration, assignment, handoff, and recovery contract
- `00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` — canonical recovery loop when agent quality degrades, context is stale, or repeated mistakes appear
- `01_roadmap/` — roadmap, phases, milestones, launch cutline
- `02_audits/` — audits, reviews, risk reports, quality checks
- `03_plans/` — active and proposed plans
- `04_tasks/` — task packets and execution checklists
- `05_logs/` — human-readable logs and handoffs
- `06_specs/` — product, UX, technical, domain, data, integration specs
- `06_specs/deep/` — long-form reference corpus and detailed specs
- `07_experiments/` — spikes, prototypes, trial artifacts
- `08_prompts/` — prompt library and prompt templates
- `09_archive/` — archive entrypoint; preserved historical material under `store/`
- `10_state/` — current project state, open questions, decisions, known issues
- `11_skills/` — reusable project procedures; live payloads under `payloads/`
- `12_agents/` — agent-role contracts and model routing; live payloads under `payloads/`
- `13_research/` — domain, market, product, code/legal, cost, materials, competitor research
- `15_Bugs/` — dated bug plans for material blockers, stale source-of-truth
  claims, validation failures, and proof gaps
- `99_inbox/` — temporary unsorted intake only

## Placement rules

- New project/product reference: `06_specs/`
- New brand, narrative, positioning, messaging, or voice reference: `06_specs/brand/`
- New long-form or detailed reference: `06_specs/deep/`
- New audit/review report: `02_audits/`
- New active plan: `03_plans/`
- New task packet: `04_tasks/`
- New run/handoff log: `05_logs/`
- New prompt: `08_prompts/`
- New archived/superseded material: `09_archive/store/`
- New current-state update: `10_state/`
- New agent performance/recovery protocol: `00_system/` if it governs all agents; otherwise keep model-specific notes thin under `12_agents/payloads/`
- New reusable skill/playbook: `11_skills/` or `11_skills/payloads/`
- New agent/model payload: `12_agents/payloads/`
- New research pack: `13_research/`
- New bug plan: `15_Bugs/`
- Unsorted scratch notes: `99_inbox/`, then triage quickly

## Active authority shortcuts

- Current feature and route truth: `10_state/current-state.md`, then `10_state/decisions.md`.
- Launch sequence and startup priorities: `01_roadmap/README.md`.
- Agent recovery from stale context: `00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`.
- Agent framework and payload/harness rules: `00_system/AGENT_FRAMEWORK_PROTOCOL.md`.
- Multi-agent and portable orchestration:
  `08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`.
- Validation gates: `00_system/VALIDATION_MATRIX.md`.
- Feature-specific implementation contracts: the active plan/spec named by `10_state/current-state.md`.
- Historical plans under `03_plans/` or `09_archive/store/` are not active instructions unless current-state links them as current.

## Legacy / duplicate-numbered folders

These predate the current numbering and are superseded. Do not add new files; use the canonical home:

- `05_decisions/` → superseded by `10_state/decisions.md` (durable decisions live there).
- `07_design/` → superseded by `DESIGN.md` and `06_specs/brand/`.

## Anti-drift rule

Do not create new unnumbered top-level `.ai` content folders. If a new category is needed, add it to this map first with a clear role.

When docs disagree, resolve the disagreement in the canonical home instead of creating another summary. For current implementation claims, verify against source, migrations, tests, and package scripts before updating roadmap/system docs.
