# `.ai` Folder Canonical Map

## Current rule

The canonical project intelligence root is `.ai/`.

All durable project-management, audit, planning, state, prompt, agent, skill, archive, and research material should live under the numbered folders below.

## Top-level canonical folders

- `00_system/` — governance, routing, structure, naming, validation, workflow
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
- `99_inbox/` — temporary unsorted intake only

## Placement rules

- New project/product reference: `06_specs/`
- New long-form or detailed reference: `06_specs/deep/`
- New audit/review report: `02_audits/`
- New active plan: `03_plans/`
- New task packet: `04_tasks/`
- New run/handoff log: `05_logs/`
- New prompt: `08_prompts/`
- New archived/superseded material: `09_archive/store/`
- New current-state update: `10_state/`
- New reusable skill/playbook: `11_skills/` or `11_skills/payloads/`
- New agent/model payload: `12_agents/payloads/`
- New research pack: `13_research/`
- Unsorted scratch notes: `99_inbox/`, then triage quickly

## Anti-drift rule

Do not create new unnumbered top-level `.ai` content folders. If a new category is needed, add it to this map first with a clear role.
