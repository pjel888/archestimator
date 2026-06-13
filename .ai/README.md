# Archestimator `.ai` Workspace

**Project:** Archestimator
**Purpose:** Shared operational-intelligence folder for every AI agent working on this project: Claude, Codex, OpenCode, CommandCode, Antigravity CLI (`agy`), Kimi, DeepSeek, Cursor, Hermes, and future tools.

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

- Branch: `main`. Agents must verify the live branch with `git status --short --branch` before editing.
- Mode: Post-reset MVP — active implementation with Supabase/Auth/Postgres backend.
- Preserved: `/` landing page with active A/B testing, consent banner, and CSP Report-Only.
- Current implemented routes: full workshop ecosystem with projects, estimates, library, templates, charts, settings, shared links, invite entry, and AI copilot.
- Current state/data foundation: Supabase project `ebxxqidacheyapmmzavr` with 67+ local migration files (50+ applied to linked remote). TanStack Query, Zustand, React Complex Tree, D3, Radix context menu, Phosphor icons, Storybook 10.4.2 (review surface only, no production route migration), and ExcelJS are installed.
- Stack: Next.js 16.2.6, React 19.2.6, Bun, TypeScript 6.0.3, Tailwind CSS v4, Storybook 10.4.2, Vitest 4.1.7.
- Current codebase: ~498 source files, ~218 test files (115 Vitest DOM, 2 Bun unit, 7 Playwright E2E), ~51 app routes/pages, ~17 API routes.
- Current AI bench: Codex, Claude, OpenCode, CommandCode, Antigravity CLI (`agy`), Kimi, and DeepSeek. Ollama is not approved for agent chat models. Gemini is phased out unless explicitly reapproved.
- Current agent workflow mandate: non-trivial product work is loop-engineered
  across all coding agents. Agents audit current reality, plan in `.ai/03_plans`,
  research uncertain claims in `.ai/13_research`, execute through the narrowest
  adequate loop surface, verify with maker/checker and real-surface evidence,
  persist state outside chat, and decide the next iteration. See
  `.ai/09_archive/store/2026-06-13-loop-engineering-mandate-and-research/` and
  `.ai/13_research/loop-engineering-agentic-product-development-2026-06-13.md`.
- Superseded: the deleted full prototype. Do not resume old plans without explicit reapproval.
- Storybook 10.4.2 is installed and implemented as a review surface with 60+ UI components and 85+ stories. Production app route migration, public Storybook hosting, and Supabase/provider-backed stories remain explicitly unperformed. See `.ai/10_state/decisions.md` (2026-06-07) for implementation boundaries.
- Read first for restart: `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`, `.ai/10_state/current-state.md`, `.ai/06_specs/feature-inventory.md`, `.ai/10_state/decisions.md`.

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
