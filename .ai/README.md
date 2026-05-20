# Archestimator `.ai` Workspace

**Project:** Archestimator
**Purpose:** Shared operational-intelligence folder for every AI agent working on this project: Claude, Codex, OpenCode, CommandCode, Gemini, Kimi, DeepSeek, Cursor, Hermes, and future tools.

This folder is the project brain. It stores product thinking, implementation plans, decisions, handoffs, specs, prompts, audits, and agent payloads so work does not get scattered across chat history.

---

## New-agent reading order

1. `.ai/README.md` — folder purpose and navigation.
2. `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md` — canonical source map.
3. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` — safety and work rules.
4. `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` — mandatory recovery loop when agent performance degrades or context feels stale.
5. `.ai/10_state/current-state.md` — current project status.
6. `.ai/02_audits/2026-05-17-reset-cleanup-audit.md` — why the previous prototype was rejected and deleted.
7. `.ai/06_specs/restart-guardrails.md` — rules for restarting without repeating the same mistakes.
8. `.ai/10_state/decisions.md` — durable decisions.
9. `.ai/10_state/known-issues.md` — risks and unresolved decisions.
10. `.ai/01_roadmap/README.md` — roadmap.

---

## Current active work

- Branch observed by latest state update: `feat/estimate-sheet-header`.
- Mode: post-reset MVP exploration after rejected app/workshop prototype.
- Preserved: `/` landing page.
- Current implemented slice: `/workshop`, `/workshop/projects`, project detail/estimates routes, and `/workshop/components` exist in `src/app`.
- Current state/data foundation: Supabase project `ebxxqidacheyapmmzavr` is linked locally; `.env.local` contains public Supabase URL/publishable key; TanStack Query, Supabase client packages, Zustand, and React Complex Tree are installed for the approved state/tree architecture. The first schema migration and seed file now define the workspace/project/estimate/library/tree/row tables with RLS from the start. Estimate-tree drag/drop reorganization has been removed; tree movement has no current UI path pending a replacement design.
- Current AI bench: Codex, Claude, OpenCode, CommandCode, Gemini, and Kimi are available for agent work. Kimi is especially strong for frontend/product UI work and long-context synthesis. Ollama is not an approved agent lane. Only the nomic embedding model used by ChunkHound is approved for active Ollama use unless Philip explicitly approves a local chat model.
- Superseded: the deleted full prototype dashboard, estimate editor, component library, proposal, revision, local-first data, shell, and broad route-family work. Do not resume those old plans unless Philip explicitly reapproves them.
- Read first for restart and quality context: `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`, `.ai/10_state/current-state.md`, `.ai/03_plans/current-post-reset-workshop-slice.md`, `.ai/02_audits/2026-05-17-reset-cleanup-audit.md`, and `.ai/06_specs/restart-guardrails.md`.

---

## Canonical top-level folders

- `00_system/` — governance, source-of-truth policy, validation, operating protocols.
- `01_roadmap/` — product phases, milestones, launch cutlines.
- `02_audits/` — audits, reviews, risk reports, competitive checks.
- `03_plans/` — approved or proposed plans before implementation.
- `04_tasks/` — task packets and execution checklists.
- `05_logs/` — human-readable run logs and handoff logs.
- `06_specs/` — product, UX, technical, data, domain, brand/narrative/voice, and integration specs; `deep/` for long references; `brand/` for brand strategy.
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

## Agent performance recovery

If Philip says the agent is getting worse, confused, stale, or not following the project direction, stop normal execution and run `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` before planning or coding. The recovery loop requires checking live git state, rereading the active source-of-truth chain, reducing scope, and verifying evidence before claiming completion.
