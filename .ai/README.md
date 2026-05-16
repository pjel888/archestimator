# Archestimator `.ai` Workspace

**Project:** Archestimator
**Purpose:** A shared operational-intelligence folder for every AI agent working on this project: Claude, Codex, Kimi, OpenCode, DeepSeek, Gemini, Cursor, and future tools.

This folder is the project brain. It is intentionally created before the tech stack is finalized so product thinking, estimates logic, workflows, decisions, prompts, and agent handoffs do not get scattered across separate tools.

---

## New-agent reading order

1. `.ai/README.md` — folder purpose and navigation
2. `.ai/00_system/ai-folder-canonical-map.md` — where every artifact belongs
3. `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md` — which docs are authoritative
4. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` — how agents should work safely
5. `.ai/10_state/current-state.md` — current project status
6. `.ai/01_roadmap/README.md` — roadmap index
7. `.ai/03_plans/README.md` — implementation/product plans
8. `.ai/11_skills/README.md` — reusable playbooks and skills
9. `.ai/12_agents/README.md` — model/agent roles and payloads

---

## Canonical top-level folders

- `00_system/` — governance, source-of-truth policy, validation, operating protocols
- `01_roadmap/` — product phases, milestones, launch cutlines
- `02_audits/` — audits, reviews, risk reports, competitive checks
- `03_plans/` — approved or proposed plans before implementation
- `04_tasks/` — task packets and execution checklists
- `05_logs/` — human-readable run logs and handoff logs
- `06_specs/` — product, UX, technical, data, and domain specs; `deep/` for long references
- `07_experiments/` — prototypes, spikes, discarded explorations
- `08_prompts/` — reusable prompt templates and agent instructions
- `09_archive/` — preserved historical material, not a deletion bin
- `10_state/` — current project state, open questions, decisions, known issues
- `11_skills/` — reusable procedures/playbooks; `payloads/` for agent-loadable skill files
- `12_agents/` — agent-role contracts; `payloads/` for model-specific instructions
- `13_research/` — market, domain, product, cost-estimation, legal/code research
- `99_inbox/` — temporary unsorted notes only; must be triaged into numbered folders

---

## Rules

- Do not create tool-specific brains that diverge. Claude/Codex/Kimi/OpenCode/DeepSeek should all read from this folder.
- Keep durable decisions in `10_state/decisions.md` or the relevant spec, not in chat history only.
- Keep reusable procedures in `11_skills/`, not buried in plans.
- Keep model-specific payloads in `12_agents/payloads/`, but make them reference shared rules instead of duplicating them.
- `99_inbox/` is temporary. Anything important must be promoted to a numbered folder.
- Never store secrets, API keys, tokens, passwords, private client details, or production credentials in `.ai`.
- Date time-sensitive claims, especially market, pricing, code, tax, labor, materials, and regulatory claims.
