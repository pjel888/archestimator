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
- Mode: Post-reset MVP — active implementation on a Cloudflare-first stack (Workers/OpenNext + D1 + R2 + Durable Objects + Queues/Cron + Cloudflare Email + Better Auth). Archestimator is the cost intelligence layer for AEC teams: an AEC-first product, not a generic quoting tool, with the campaign tagline **"From cost proposal to client approval."**
- Preserved: `/` landing page with active A/B testing, consent banner, and CSP Report-Only.
- Current implemented routes: cost proposal workspace — build, send, revise, approve, and track commercial estimates — backed by projects, estimates, the reusable component library, templates, D3 charts, settings, shared publication links, invite entry, and feature-flagged AI helpers.
- Startup narrative source: `.ai/00_corpus/ARCHESTIMATOR_MASTER.md` is the working corpus for product, business, pricing, and brand language. Current source and `AGENTS.md` override it; archived or historical documents do not.
- Claims boundary: construction and adjacent AEC workflows are the market. AI, procurement execution, immutable issued records, and legal-document automation remain roadmap or policy work unless current source says otherwise.
- Current state/data foundation: Cloudflare Worker `archestimator-proof` (custom domain `archestimator.com`) with bindings D1 `ARCH_DB` (`archestimator-proof-db`), R2 `ARCH_UPLOADS_R2` (`archestimator-proof-uploads`), Durable Object `COLLAB_ROOMS` (`CollaborationRoom`, SQLite-backed), Queue `UPLOAD_JOBS_QUEUE` (+ DLQ), Cloudflare Images `IMAGES`, and Cloudflare Email `EMAIL`. 29 active D1 migrations in `./migrations/` (latest `0029_estimate_actions_d1_support.sql`). TanStack Query, Zustand, React Complex Tree, D3, Radix context menu, Phosphor icons, Storybook 10.4.2 (review surface only, no production route migration), and ExcelJS are installed. `package.json` has zero `@supabase/*` packages; legacy Supabase project `ebxxqidacheyapmmzavr` and `./supabase/migrations/` (182 files) are historical/migration-archaeology only.
- Stack: Next.js 16.2.6, React 19.2.6, Bun, TypeScript 6.0.3, Tailwind CSS v4, Cloudflare Workers/OpenNext (`@opennextjs/cloudflare` ^1.20.1), Wrangler ^4.105.0, D1, R2, Durable Objects, Queues, Cloudflare Email, Better Auth 1.6.22, Storybook 10.4.2, Vitest 4.1.7.
- Current codebase: ~498 source files, ~218 test files (115 Vitest DOM, 2 Bun unit, 7 Playwright E2E), ~51 app routes/pages, ~17 API routes.
- Current AI bench: Codex, Claude, OpenCode, CommandCode, Antigravity CLI (`agy`), Kimi, and DeepSeek. Ollama is not approved for agent chat models. Gemini is phased out unless explicitly reapproved.
- Current agent workflow: choose Direct, Brief, or Plan Pack from `AGENTS.md`;
  establish the smallest sufficient Task Contract; run
  `DISCOVER -> DECIDE -> EDIT -> VERIFY -> FINISH`; and stop when the
  Completion Contract is evidenced. When orchestration is useful,
  `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`
  owns assignments, file ownership, handoffs, recovery, and native/thread/
  emulated/single-agent portability. No ledger or independent checker is
  required unless a current Plan Pack or named risk justifies it.
- Current Cloudflare-resource mandate: during pre-launch MVP, Philip grants
  standing authorization for agents to make Archestimator Cloudflare
  D1/R2/Durable Object/Queue/Email changes inside the resources bound in
  `wrangler.jsonc` (Worker `archestimator-proof`, D1 `ARCH_DB`, R2
  `ARCH_UPLOADS_R2`, DO `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Email
  `EMAIL`, Images `IMAGES`) without per-change owner approval. Move fast,
  make useful changes, fix mistakes forward, and validate proportionally
  because there are no external users yet. This does not allow unrelated
  Cloudflare accounts/projects, the historical Supabase project
  `ebxxqidacheyapmmzavr`, the unrelated `archestimator` provider project,
  secrets, paid add-ons (D1 paid plan, R2 paid tier, Workers Smart Placement
  paid, Workers Analytics paid, dedicated egress, etc.), hosting production
  deploys, or irreversible destructive actions without explicit fresh
  instruction. This mandate supersedes the older Supabase/Postgres
  owner-gated database wording unless a newer, narrower decision explicitly
  reintroduces a gate.
- Superseded: the deleted full prototype. Do not resume old plans without explicit reapproval.
- Storybook 10.4.2 is installed and implemented as a review surface with 60+ UI components and 85+ stories. Production app route migration, public Storybook hosting, and D1/Cloudflare-provider-backed stories remain explicitly unperformed. See `.ai/10_state/decisions.md` (2026-06-07) for implementation boundaries.
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
