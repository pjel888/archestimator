# Skill Registry — ZCode Active Skills

**Created:** 2026-06-21
**Plan:** `.ai/03_plans/2026-06-21-ZCode-Skill-Parity/`

Every skill below lives in `.agents/skills/<name>/` with a valid
`SKILL.md` (verified: 96/96 have `name:` + `description:` frontmatter).
`.claude/skills/` and `.commandcode/skills/` are symlink farms pointing
into `.agents/skills/` (verified: 0 broken symlinks in either farm).

ZCode loads skills from `.agents/skills/` (repo-local) plus the
`zcode-plugins-official` cache (docx, pdf, android-dev, ios-dev,
restore-legacy-sessions, skill-creator, superpowers 5.1.0, find-skills).

**Total active in `.agents/skills/`: 96**
- Pre-existing: 9
- Lane A (codex): 29
- Lane B (claude): 19
- Lane C (superpowers): 13
- Lane C (compound-eng): 25
- Lane D (new gap): 1

Plus 12 plugin-cache skills loaded directly by ZCode (not counted above):
`debug-issue, docx, explore-codebase, find-skills, hallmark, impeccable,
pdf, refactor-safely, review-changes, skill-creator, supabase,
supabase-postgres-best-practices` — these are surfaced via the active-skills
list and supplement the repo-local set.

---

## Pre-existing (already in .agents/skills before this task) (9)

| name | source | purpose |
|------|--------|---------|
| `debug-issue` | pre-existing | Systematically debug issues using graph-powered code navigation |
| `explore-codebase` | pre-existing | Navigate and understand codebase structure using the knowledge graph |
| `gitnexus` | pre-existing | Use the GitNexus knowledge graph for broad codebase exploration, high-risk shared-symbol/API refactors, unfamiliar call chains, and bug tracing that is cheaper to answ... |
| `hallmark` | pre-existing | Anti-AI-slop design skill for greenfield pages, audits, redesigns, and design extraction from URLs or screenshots. |
| `impeccable` | pre-existing | Use when the user wants to design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract, or otherwise improv... |
| `refactor-safely` | pre-existing | Plan and execute safe refactoring using dependency analysis |
| `review-changes` | pre-existing | Perform a structured code review using change detection and impact |
| `supabase` | pre-existing | Use when doing ANY task involving Supabase. |
| `supabase-postgres-best-practices` | pre-existing | Postgres performance optimization and best practices from Supabase. |

## Lane A — Codex OMX + engineering skills (29)

| name | source | purpose |
|------|--------|---------|
| `analyze` | ~/.codex/skills/analyze | [OMX] Run read-only deep repository analysis and return a ranked synthesis with explicit confidence, concrete file references, and clear evidence-vs-inference boundaries. |
| `ask` | ~/.codex/skills/ask | [OMX] Ask a local external advisor CLI (Claude or Gemini) and capture a reusable artifact |
| `autopilot` | ~/.codex/skills/autopilot | [OMX] Strict autonomous loop: $deep-interview -> $ralplan -> $ultragoal (+ $team if needed) -> $code-review -> $ultraqa |
| `autoresearch` | ~/.codex/skills/autoresearch | [OMX] Stateful validator-gated research loop with native-hook persistence |
| `autoresearch-goal` | ~/.codex/skills/autoresearch-goal | [OMX] Durable professor-critic research workflow over Codex goal mode without reviving deprecated omx autoresearch |
| `best-practice-research` | ~/.codex/skills/best-practice-research | [OMX] Bounded best-practice research wrapper using official/upstream evidence first |
| `cancel` | ~/.codex/skills/cancel | [OMX] Cancel any active OMX mode (autopilot, ralph, ultrawork, ecomode, ultraqa, swarm, ultrapilot, pipeline, team) |
| `code-review` | ~/.codex/skills/code-review | [OMX] Run a comprehensive code review |
| `configure-notifications` | ~/.codex/skills/configure-notifications | [OMX] Configure OMX notifications - unified entry point for all platforms |
| `deep-interview` | ~/.codex/skills/deep-interview | [OMX] Socratic deep interview with mathematical ambiguity gating before execution |
| `design` | ~/.codex/skills/design | [OMX] Canonical repo-local DESIGN.md workflow for product, UI/UX, and frontend decision source of truth |
| `doctor` | ~/.codex/skills/doctor | [OMX] Diagnose and fix oh-my-codex installation issues |
| `hud` | ~/.codex/skills/hud | [OMX] Show or configure the OMX HUD (two-layer statusline) |
| `kimi-webbridge` | ~/.codex/skills/kimi-webbridge | \|   Kimi WebBridge lets AI control the user's real browser — navigate, click, type, read, screenshot, and interact with any website using the user's actual login sessions. |
| `omx-setup` | ~/.codex/skills/omx-setup | [OMX] Setup and configure oh-my-codex using current CLI behavior |
| `performance-goal` | ~/.codex/skills/performance-goal | [OMX] Run an evaluator-gated performance optimization workflow over Codex goal mode with durable OMX artifacts and safe goal handoffs. |
| `pipeline` | ~/.codex/skills/pipeline | [OMX] Configurable pipeline orchestrator for sequencing stages |
| `plan` | ~/.codex/skills/plan | [OMX] Strategic planning with optional interview workflow |
| `prometheus-strict` | ~/.codex/skills/prometheus-strict | [OMX] Clean-room interview-driven planner: Metis clarifies, Momus challenges, Oracle synthesizes, then hands off to $ultragoal/$team. |
| `ralph` | ~/.codex/skills/ralph | [OMX] Self-referential loop until task completion with architect verification |
| `ralplan` | ~/.codex/skills/ralplan | [OMX] Alias for $plan --consensus |
| `skill` | ~/.codex/skills/skill | [OMX] Manage local skills - list, add, remove, search, edit, setup wizard |
| `team` | ~/.codex/skills/team | [OMX] N coordinated agents on shared task list using tmux-based orchestration |
| `ultragoal` | ~/.codex/skills/ultragoal | [OMX] Create and execute durable repo-native multi-goal plans over Codex goal mode artifacts. |
| `ultraqa` | ~/.codex/skills/ultraqa | [OMX] Adversarial dynamic e2e QA workflow - generate hostile scenarios, test, verify, fix, report, and clean up |
| `ultrawork` | ~/.codex/skills/ultrawork | [OMX] Parallel execution engine for high-throughput task completion |
| `visual-ralph` | ~/.codex/skills/visual-ralph | [OMX] Visual Ralph orchestration for frontend UI from generated references, static references, or live URL targets, using $ralph with built-in visual verdict and pixel... |
| `wiki` | ~/.codex/skills/wiki | [OMX] Persistent markdown project wiki stored under repository omx_wiki with keyword search and lifecycle capture |
| `worker` | ~/.codex/skills/worker | [OMX] Team worker protocol (ACK, mailbox, task lifecycle) for tmux-based OMX teams |

## Lane B — Claude / mattpocock engineering skills (19)

| name | source | purpose |
|------|--------|---------|
| `codebase-design` | ~/.claude/skills/codebase-design | Shared vocabulary for designing deep modules. |
| `decision-mapping` | ~/.claude/skills/decision-mapping | Turn a loose idea into a sequenced map of investigation tickets, then drive them to resolution one at a time. |
| `diagnosing-bugs` | ~/.claude/skills/diagnosing-bugs | Diagnosis loop for hard bugs and performance regressions. |
| `domain-modeling` | ~/.claude/skills/domain-modeling | Build and sharpen a project's domain model. |
| `grill-with-docs` | ~/.claude/skills/grill-with-docs | A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go. |
| `handoff` | ~/.claude/skills/handoff | Compact the current conversation into a handoff document for another agent to pick up. |
| `implement` | ~/.claude/skills/implement | Implement a piece of work based on a PRD or set of issues. |
| `improve-codebase-architecture` | ~/.claude/skills/improve-codebase-architecture | Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick. |
| `prototype` | ~/.claude/skills/prototype | Build a throwaway prototype to flesh out a design — a runnable terminal app for state/business-logic questions, or several radically different UI variations toggleable... |
| `qa` | ~/.claude/skills/qa | Interactive QA session where user reports bugs or issues conversationally, and the agent files GitHub issues. |
| `request-refactor-plan` | ~/.claude/skills/request-refactor-plan | Create a detailed refactor plan with tiny commits via user interview, then file it as a GitHub issue. |
| `resolving-merge-conflicts` | ~/.claude/skills/resolving-merge-conflicts | Use when you need to resolve an in-progress git merge/rebase conflict. |
| `review` | ~/.claude/skills/review | Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes — Standards (does the code follow this repo's documented coding standards?) ... |
| `tdd` | ~/.claude/skills/tdd | Test-driven development. |
| `to-issues` | ~/.claude/skills/to-issues | Break a plan, spec, or PRD into independently-grabbable issues on the project issue tracker using tracer-bullet vertical slices. |
| `to-prd` | ~/.claude/skills/to-prd | Turn the current conversation into a PRD and publish it to the project issue tracker — no interview, just synthesis of what you've already discussed. |
| `triage` | ~/.claude/skills/triage | Move issues and external PRs through a state machine of triage roles — categorise, verify, grill if needed, and write agent-ready briefs. |
| `ubiquitous-language` | ~/.claude/skills/ubiquitous-language | Extract a DDD-style ubiquitous language glossary from the current conversation, flagging ambiguities and proposing canonical terms. |
| `writing-great-skills` | ~/.claude/skills/writing-great-skills | Reference for writing and editing skills well — the vocabulary and principles that make a skill predictable. |

## Lane C — Superpowers skills (13)

| name | source | purpose |
|------|--------|---------|
| `brainstorming` | superpowers 6.0.3 | You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. |
| `dispatching-parallel-agents` | superpowers 6.0.3 | Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies |
| `executing-plans` | superpowers 6.0.3 | Use when you have a written implementation plan to execute in a separate session with review checkpoints |
| `finishing-a-development-branch` | superpowers 6.0.3 | Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured ... |
| `receiving-code-review` | superpowers 6.0.3 | Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor a... |
| `requesting-code-review` | superpowers 6.0.3 | Use when completing tasks, implementing major features, or before merging to verify work meets requirements |
| `subagent-driven-development` | superpowers 6.0.3 | Use when executing implementation plans with independent tasks in the current session |
| `systematic-debugging` | superpowers 6.0.3 | Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes |
| `test-driven-development` | superpowers 6.0.3 | Use when implementing any feature or bugfix, before writing implementation code |
| `using-git-worktrees` | superpowers 6.0.3 | Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an isolated workspace exists via native t... |
| `verification-before-completion` | superpowers 6.0.3 | Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before ma... |
| `writing-plans` | superpowers 6.0.3 | Use when you have a spec or requirements for a multi-step task, before touching code |
| `writing-skills` | superpowers 6.0.3 | Use when creating new skills, editing existing skills, or verifying skills work before deployment |

## Lane C — Compound Engineering skills (25)

| name | source | purpose |
|------|--------|---------|
| `ce-agent-native-architecture` | compound-eng 3.13.1 | Build applications where agents are first-class citizens. |
| `ce-agent-native-audit` | compound-eng 3.13.1 | Run comprehensive agent-native architecture review with scored principles |
| `ce-brainstorm` | compound-eng 3.13.1 | Explore requirements and approaches through collaborative dialogue, then write a right-sized requirements document. |
| `ce-clean-gone-branches` | compound-eng 3.13.1 | Clean up local branches whose remote tracking branch is gone. |
| `ce-code-review` | compound-eng 3.13.1 | Structured code review using tiered persona agents, confidence-gated findings, and a merge/dedup pipeline. |
| `ce-commit` | compound-eng 3.13.1 | Create a git commit with a clear, value-communicating message. |
| `ce-commit-push-pr` | compound-eng 3.13.1 | Commit, push, and open a PR with an adaptive, value-first description that scales in depth with the change. |
| `ce-debug` | compound-eng 3.13.1 | Systematically find root causes and fix bugs. |
| `ce-doc-review` | compound-eng 3.13.1 | Review requirements or plan documents using parallel persona agents that surface role-specific issues. |
| `ce-ideate` | compound-eng 3.13.1 | Generate and critically evaluate grounded ideas about a topic. |
| `ce-optimize` | compound-eng 3.13.1 | Run metric-driven iterative optimization loops -- define a measurable goal, run parallel experiments, measure each against hard gates or LLM-as-judge scores, keep impr... |
| `ce-plan` | compound-eng 3.13.1 | Create structured plans for multi-step tasks -- software features, research workflows, events, study plans, or any goal that benefits from breakdown. |
| `ce-polish` | compound-eng 3.13.1 | Start the dev server, open the feature in a browser, and iterate on improvements together. |
| `ce-product-pulse` | compound-eng 3.13.1 | Generate a time-windowed pulse report on what users experienced and how the product performed - usage, quality, errors, signals worth investigating. |
| `ce-promote` | compound-eng 3.13.1 | Draft user-facing announcement and marketing copy for a feature that just shipped — an X post or thread, a changelog blurb, a LinkedIn post, an email, a blog intro, or... |
| `ce-proof` | compound-eng 3.13.1 | Publish, view, comment on, and edit markdown via Proof (proofeditor.ai) — create a shareable doc, read a shared doc, and make comment/suggestion/block edits over its API. |
| `ce-release-notes` | compound-eng 3.13.1 | Summarize recent compound-engineering plugin releases, or answer a specific question about a past release with a version citation. |
| `ce-report-bug` | compound-eng 3.13.1 | Report a bug in the compound-engineering plugin |
| `ce-resolve-pr-feedback` | compound-eng 3.13.1 | Resolve PR review feedback by evaluating validity and fixing issues in parallel. |
| `ce-simplify-code` | compound-eng 3.13.1 | Simplify and refine recently changed code for clarity, reuse, quality, and efficiency while preserving behavior. |
| `ce-strategy` | compound-eng 3.13.1 | Create or maintain STRATEGY.md - the product's target problem, approach, users, key metrics, and tracks of work. |
| `ce-test-browser` | compound-eng 3.13.1 | Run browser tests on pages affected by current PR or branch |
| `ce-work` | compound-eng 3.13.1 | Execute work efficiently while maintaining quality and finishing features |
| `ce-worktree` | compound-eng 3.13.1 | Ensure work happens in an isolated git worktree without disturbing the current checkout. |
| `lfg` | compound-eng 3.13.1 | Run the full autonomous engineering pipeline end-to-end (plan, work, code review, test, commit, push, open PR, watch CI, fix CI failures until green). |

## Lane D — New Archestimator-gap skills (1)

| name | source | purpose |
|------|--------|---------|
| `archestimator-plan-pack` | new (gap) | Archestimator-specific planning discipline: when to spin a dated .ai/03_plans/<YYYY-MM-DD>-<slug>/ plan pack with a LOOP_LEDGER.md vs running a lightweight in-session ... |

---

## Maintenance

To re-audit parity (e.g. after adding a new skill to Claude/Codex),
compare this registry against:
- `ls ~/.codex/skills/` (Codex user skills)
- `ls ~/.claude/skills/` (Claude user skills)
- `find ~/.claude/plugins/cache -name SKILL.md` (plugin skills)

To port a new skill `<name>` from source `<src>`:
```
mkdir -p .agents/skills/<name>
cp -R <src>/. .agents/skills/<name>/
[ -e .claude/skills/<name> ]      || ln -s ../../.agents/skills/<name> .claude/skills/<name>
[ -e .commandcode/skills/<name> ] || ln -s ../../.agents/skills/<name> .commandcode/skills/<name>
# verify .agents/skills/<name>/SKILL.md has name: + description: frontmatter
```
Then append the PORTED line to `LOOP_LEDGER.md` and add a row to this registry.