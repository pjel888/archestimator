# Archestimator `.ai` Workspace

**Project:** Archestimator
**Purpose:** Shared operational-intelligence folder for every AI agent working on this project: Claude, Codex, Kimi, OpenCode, DeepSeek, Gemini, Cursor, Hermes, and future tools.

This folder is the project brain. It stores product thinking, implementation plans, decisions, handoffs, specs, prompts, audits, and agent payloads so work does not get scattered across chat history.

---

## New-agent reading order

1. `.ai/README.md` — folder purpose and navigation.
2. `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md` — canonical source map.
3. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` — safety and work rules.
4. `.ai/10_state/current-state.md` — current project status.
5. `.ai/02_audits/2026-05-17-reset-cleanup-audit.md` — why the previous prototype was rejected and deleted.
6. `.ai/06_specs/restart-guardrails.md` — rules for restarting without repeating the same mistakes.
7. `.ai/10_state/decisions.md` — durable decisions.
8. `.ai/10_state/known-issues.md` — risks and unresolved decisions.
9. `.ai/01_roadmap/README.md` — roadmap.

---

## Current active work

- Branch: `feat/auth-component-library-workspace`.
- Mode: pre-MVP reset after rejected app/workshop prototype.
- Preserved: `/` landing page.
- Active app baseline: `/workshop` intentionally empty.
- Superseded: previous project dashboard, estimate editor, component library, proposal, revision, local-first data, shell, and route-family work. Do not resume those old plans unless Philip explicitly reapproves them.
- Read first for restart context: `.ai/02_audits/2026-05-17-reset-cleanup-audit.md` and `.ai/06_specs/restart-guardrails.md`.

---

## Canonical top-level folders

- `00_system/` — governance, source-of-truth policy, validation, operating protocols.
- `01_roadmap/` — product phases, milestones, launch cutlines.
- `02_audits/` — audits, reviews, risk reports, competitive checks.
- `03_plans/` — approved or proposed plans before implementation.
- `04_tasks/` — task packets and execution checklists.
- `05_logs/` — human-readable run logs and handoff logs.
- `06_specs/` — product, UX, technical, data, and domain specs; `deep/` for long references.
- `07_experiments/` — prototypes, spikes, discarded explorations.
- `08_prompts/` — reusable prompt templates and agent instructions.
- `09_archive/` — preserved historical material, not a deletion bin.
- `10_state/` — current project state, open questions, decisions, known issues.
- `11_skills/` — reusable procedures/playbooks; `payloads/` for agent-loadable skill files.
- `12_agents/` — agent-role contracts; `payloads/` for model-specific instructions.
- `13_research/` — market, domain, product, cost-estimation, legal/code research.
- `99_inbox/` — temporary unsorted notes only; must be triaged into numbered folders.

---

## Rules

- Do not create tool-specific brains that diverge.
- Keep durable decisions in `10_state/decisions.md` or the relevant spec.
- Keep reusable procedures in `11_skills/`, not buried in plans.
- Keep model-specific payloads in `12_agents/payloads/`, but make them reference shared rules instead of duplicating them.
- `99_inbox/` is temporary. Anything important must be promoted to a numbered folder.
- Never store secrets, API keys, tokens, passwords, private client details, or production credentials in `.ai`.
- Date time-sensitive claims, especially market, pricing, code, tax, labor, materials, and regulatory claims.
