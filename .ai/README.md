# Archestimator `.ai` Workspace

**Project:** Archestimator
**Purpose:** Shared operational-intelligence folder for every AI agent working on this project: Claude, Codex, OpenCode, CommandCode, Antigravity CLI (`agy`), Kimi, DeepSeek, Hermes, and future tools.

This folder is the project brain. It stores product thinking, implementation plans, decisions, handoffs, specs, prompts, audits, and agent payloads so work does not get scattered across chat history.

---

## New-agent reading order

Fast start is canonical: read `AGENTS.md`, then only the FAST PATH block at the
top of `.ai/10_state/current-state.md`. Do not linear-read this folder before
ordinary work.

Pull deeper files only when the task needs them:

1. `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md` — source map for non-trivial or stale-context work.
2. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` — loop activation, stop conditions, and proportional validation.
3. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` — agent-framework, payload, proof-boundary, and multi-agent work.
4. `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` — mandatory recovery loop when agent performance degrades or context feels stale.
5. `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` — use `rg` for the specific area; do not preload the full history logs.
6. Specs, roadmap, audits, design, plans, or bug files only when the task touches that area.

---

## Current active work

- Branch: `main`. Agents must verify the live branch with `git status --short --branch` before editing.
- Mode: Post-reset MVP — active implementation with Supabase/Auth/Postgres backend. Archestimator is the cost intelligence layer for AEC teams (AEC-committed, not contractor-first), with the campaign tagline **"From cost proposal to client approval."**
- Preserved: `/` landing page with active A/B testing, consent banner, and CSP Report-Only.
- Current implemented routes: cost proposal workspace — build, send, revise, approve, and track commercial estimates — backed by projects, estimates, the reusable component library, templates, D3 charts, settings, shared publication links, invite entry, and feature-flagged AI helpers.
- Current state/data foundation: Supabase project `ebxxqidacheyapmmzavr` with 67+ local migration files (50+ applied to linked remote). TanStack Query, Zustand, React Complex Tree, D3, Radix context menu, Phosphor icons, Storybook 10.4.2 (review surface only, no production route migration), and ExcelJS are installed.
- Stack: Next.js 16.2.6, React 19.2.6, Bun, TypeScript 6.0.3, Tailwind CSS v4, Storybook 10.4.2, Vitest 4.1.7.
- Current codebase: ~498 source files, ~218 test files (115 Vitest DOM, 2 Bun unit, 7 Playwright E2E), ~51 app routes/pages, ~17 API routes.
- Current AI bench: Codex, Claude, OpenCode, CommandCode, Antigravity CLI (`agy`), Kimi, and DeepSeek. Ollama is not approved for agent chat models. Gemini is phased out unless explicitly reapproved.
- Current agent workflow mandate: non-trivial product work is loop-engineered
  across all coding agents. Ordinary non-trivial work uses an in-session loop;
  high-blast-radius or explicitly exhaustive work adds a dated `.ai/03_plans/`
  plan pack and `LOOP_LEDGER.md`. Agents audit current reality, research
  uncertain claims in `.ai/13_research` when needed, execute through the
  narrowest adequate loop surface, verify with maker/checker and real-surface
  evidence, persist state outside chat, and decide the next iteration. See
  `.ai/09_archive/store/2026-06-13-loop-engineering-mandate-and-research/` and
  `.ai/13_research/loop-engineering-agentic-product-development-2026-06-13.md`.
- Current database mandate: during pre-launch MVP, Philip grants standing
  authorization for agents to make Archestimator Supabase/Postgres changes in
  project `ebxxqidacheyapmmzavr` without per-change owner approval. Move fast,
  make useful database changes, fix mistakes forward, and validate
  proportionally because there are no external users yet. This does not allow
  unrelated provider projects, secrets, paid add-ons, hosting production
  deploys, or irreversible destructive actions without explicit fresh
  instruction. This mandate supersedes older default owner-gated database
  wording unless a newer, narrower decision explicitly reintroduces a gate.
- Superseded: the deleted full prototype. Do not resume old plans without explicit reapproval.
- Storybook 10.4.2 is installed and implemented as a review surface with 60+ UI components and 85+ stories. Production app route migration, public Storybook hosting, and Supabase/provider-backed stories remain explicitly unperformed. See `.ai/10_state/decisions.md` (2026-06-07) for implementation boundaries.
- Read first for restart: `AGENTS.md` plus the FAST PATH block at the top of
  `.ai/10_state/current-state.md`; pull self-diagnostic, feature inventory, and
  decisions only when restart risk or task scope requires them.
- Source-of-truth note: the founder master startup corpus (v4.3, 2026-06-18) is
  now in `.ai/00_corpus/ARCHESTIMATOR_MASTER.md`. Notion (Homebase, Launch
  Readiness Checklist, Risk and Decision Register, Feature Inventory, Customer
  Discovery Pipeline) remains canonical for live trackers and decided items.

---

## Canonical top-level folders

- `00_system/` — governance, source-of-truth policy, validation, operating protocols.
- `00_corpus/` — founder master startup corpus (brand, product, business, pricing, marketing, operations).
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
