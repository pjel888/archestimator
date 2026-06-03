# Agent Operating Protocol

## Goal

Make Archestimator safe for multi-agent work from day one.

## Required workflow for meaningful work

1. Clarify the brief internally:
   - goal
   - non-goals
   - constraints
   - affected files/systems
   - acceptance criteria
   - risks
   - definition of done
2. Read relevant `.ai` docs before acting.
3. For broad codebase, architecture, roadmap, or docs-sync work, run a current repo-truth pass before editing:
   - inspect `git status --short --branch`;
   - use the code-review graph/GitNexus surfaces before broad grep-style exploration when they are available;
   - confirm current routes, packages, migrations, tests, and relevant `.ai/10_state/*` docs.
4. Plan before building when the task is non-trivial.
5. Keep implementation isolated once code exists: branch, worktree, or explicit task environment.
6. Verify with evidence before claiming completion.
7. Update `.ai` state/docs when a durable decision or project reality changes.

For agent-framework, payload, harness, multi-agent, evidence, provider-proof,
or run-log work, also follow `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`.

## Mandatory self-diagnostic trigger

If Philip says the agent is getting worse, confused, stale, not following instructions, or repeating mistakes, stop the normal workflow and run `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` before planning or coding. This is not optional cleanup; it is the recovery path for protecting project quality.

Minimum diagnostic actions:

1. Check `git status --short --branch` and the active branch.
2. Inspect modified files before editing them.
3. Reread the active source-of-truth chain listed in `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`.
4. State the current goal, non-goals, affected files, validation gate, and stop conditions internally.
5. Make the smallest corrective change and verify it.

## Multi-agent rule

Use the smallest number of agents needed. Avoid swarm work unless tasks are clearly independent.

When using parallel agents:

- Keep read-only audit agents read-only.
- Give implementation agents disjoint write scopes.
- The lead agent owns integration, conflict checks, validation, and final evidence.
- Do not let a subagent revive stale routes, stale data assumptions, or superseded `.ai` plans without checking current-state first.

Default roles:
- Claude: planning, architecture, critique, writing, strategy
- Codex: implementation, refactoring, tests, PR-ready diffs
- OpenCode: exploration, fallback planning/review, codebase traversal, flexible coding bench
- CommandCode: taste-aware implementation/review, project-convention checks, PR work, and plan-mode codebase review
- Antigravity CLI (`agy`): extra terminal-agent lane for independent planning, review, audit, implementation, and long-context checks when another agent should run in a separate terminal/task environment
- Gemini: phased out; do not route new work to Gemini unless Philip explicitly reapproves it for a specific task
- Kimi: frontend/product UI implementation and review, long-context synthesis, fallback planning/review, document analysis
- DeepSeek: debugging, logic review, second-opinion critique
- Ollama: not an approved agent LLM lane; only the nomic embedding model used by ChunkHound is approved for active use, and locally listed chat models must not be used for planning, review, or implementation unless explicitly approved and documented
- Hermes: orchestration, memory, routing, task delegation across the AI bench, file/system operations, and final evidence verification

## Safety rules

- No secrets in `.ai`.
- No production deploys or destructive commands without explicit approval.
- Do not overwrite project decisions silently. Mark superseded decisions with dates.
- Factual claims about code, costs, regulations, labor, or materials require cited sources or local evidence.
- Respect explicit read-only/audit-only user scopes. If stale docs are found during an audit-only task, report the exact patch target instead of editing.
- For Next.js work, read the relevant local Next.js docs under `node_modules/next/dist/docs/` before changing framework APIs or route conventions.
- For symbol edits, follow the repo's graph/GitNexus impact-analysis rule before modifying functions, classes, methods, or exported API boundaries.
- Archestimator Supabase/Postgres is active only for project `ebxxqidacheyapmmzavr`; never touch SlateCamp resources.
- AI capability is currently Ask-only unless Philip explicitly approves a wider slice. No Draft/Apply, write tools, retrieval/RAG, or stored conversation features may be added by implication.
- Tool-specific adapter files (`CLAUDE.md`, `GEMINI.md`, `.agents/`,
  `.claude/`, `.codex/`, `.cursor/`, `.gemini/`, `.commandcode/`) must stay
  subordinate to `.ai/00_system` and `.ai/12_agents`. They may point to `.ai`;
  they must not fork policy.

## UI implementation contract

- Outside the public landing page, every app/workshop UI must follow the enforceable SF Pro product system from `DESIGN.md`.
- App/workshop typography uses the SF Pro system stack and regular/medium weights only, while preserving the compact density scale: visible text must not exceed `12px`, true titles may use `12px`, normal controls/body/table/input/button text should stay around `10px`, subtitles around `11px`, and meta/eyebrow/helper labels around `8-9px`.
- Labels, eyebrows, metadata, helper copy, and muted subheaders must never render larger than the paired input/control/body text they describe; oversized labels are a blocking design defect, not a preference.
- App/workshop letter spacing must stay at `0`; do not use negative tracking, uppercase wide tracking, or arbitrary tracking utilities.
- App/workshop color tokens are strong `#292929`, default `#5D5D5D`, subtle `#7F7F7F`, selected background `#F5F5F5`, and border `#F2F2F2`, with semantic success/warning/danger only for meaning.
- App/workshop border radius is `xs` only (`3px`). Do not use `rounded`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`, arbitrary radius utilities, or CSS radius values other than `3px` outside landing-approved surfaces.
- App/workshop icons must use regular 1px-outline-style iconography. Current Phosphor icons should use regular weight unless a dedicated 1px icon library is explicitly approved.
- Before creating UI markup, inspect and reuse existing primitives/components. Extend shared primitives instead of creating feature-local controls.
- If a repeated UI pattern is missing from the shared library, create or extend a reusable primitive first, then use it in the feature. Do not let feature screens become the first owner of generic controls.
- Buttons, icon buttons, and toolbar buttons must go through `src/components/ui/button.tsx` or an explicitly shared wrapper built on it.
- Search inputs must go through the shared search/input primitive, currently `src/components/ui/search-input.tsx` when present, instead of one-off local input markup.
- Repeated cards, chips, tabs, filters, dropdowns, panels, empty states, and inspector controls must be extracted or reused as shared components.
- UI component work must update or follow `.ai/09_archive/store/2026-05-29-implemented-plan-cleanup/ui-componentization-and-storybook-plan.md`, including the component matrix and Storybook category plan. Do not install Storybook unless Philip explicitly approves setup/dependencies.
- Treat design-system lint failures, oversized typography, inverted text hierarchy, non-xs radius, non-regular/medium weights, nonzero tracking, bold/fill icons, and duplicated controls as blocking defects during implementation and review.

## Completion discipline

- Do not promise future work when a tool can do it now.
- Do not claim completion from intent; claim completion only from evidence.
- If validation is skipped, say exactly why and what risk remains.
- If a doc is stale and the current task allows editing, patch the canonical doc instead of compensating in chat.
- If a doc is stale and the current task is read-only, name the canonical doc and the exact stale claim in the final report.
