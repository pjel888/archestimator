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
3. Plan before building when the task is non-trivial.
4. Keep implementation isolated once code exists: branch, worktree, or explicit task environment.
5. Verify with evidence before claiming completion.
6. Update `.ai` state/docs when a durable decision or project reality changes.

## Mandatory self-diagnostic trigger

If Philip says the agent is getting worse, confused, stale, not following instructions, or repeating mistakes, stop the normal workflow and run `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` before planning or coding. This is not optional cleanup; it is the recovery path for protecting project quality.

Minimum diagnostic actions:

1. Check `git status --short --branch` and the active branch.
2. Inspect modified files before editing them.
3. Reread the active source-of-truth chain listed in `.ai/README.md`.
4. State the current goal, non-goals, affected files, validation gate, and stop conditions internally.
5. Make the smallest corrective change and verify it.

## Multi-agent rule

Use the smallest number of agents needed. Avoid swarm work unless tasks are clearly independent.

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

## UI implementation contract

- Outside the public landing page, visible app/workshop text must not exceed 12px unless Philip explicitly approves a named exception.
- Default app/workshop scale is compact: body, table, nav, input, tab, toolbar, chip, and button text around 10px; subtitles around 11px; meta/eyebrow labels around 8–9px.
- Before creating UI markup, inspect and reuse existing primitives/components. Extend shared primitives instead of creating feature-local controls.
- If a repeated UI pattern is missing from the shared library, create or extend a reusable primitive first, then use it in the feature. Do not let feature screens become the first owner of generic controls.
- Buttons, icon buttons, and toolbar buttons must go through `src/components/ui/button.tsx` or an explicitly shared wrapper built on it.
- Search inputs must go through the shared search/input primitive, currently `src/components/ui/search-input.tsx` when present, instead of one-off local input markup.
- Repeated cards, chips, tabs, filters, dropdowns, panels, empty states, and inspector controls must be extracted or reused as shared components.
- UI component work must update or follow `.ai/03_plans/ui-componentization-and-storybook-plan.md`, including the component matrix and Storybook category plan. Do not install Storybook unless Philip explicitly approves setup/dependencies.
- Treat oversized typography and duplicated controls as blocking defects during implementation and review.

## Completion discipline

- Do not promise future work when a tool can do it now.
- Do not claim completion from intent; claim completion only from evidence.
- If validation is skipped, say exactly why and what risk remains.
- If a doc is stale, patch the canonical doc instead of compensating in chat.
