# 11 — Agent Coordination Ledger

**Date:** 2026-06-21 · **Status:** PLANNING / READINESS ONLY

This document defines the protocol for multiple AI agents working on the Ponytail Pass Plan concurrently. The user explicitly requested: "Give each agent its own dedicated /goal and have all the agents be able to talk to each other so that should there be any conflicts, it can be resolved. always assume that multiple coding ai agents are working on the same directory so stay vigilant."

## Agent goals (the 4 parallel agents + orchestrator)

### Orchestrator (Sisyphus / this session)

- **Goal:** Produce a comprehensive, blast-radius-aware Ponytail Pass Plan at `.ai/03_plans/2026-06-21-Ponytail-Pass-Plan/` — 16 documents covering analysis, blast radius, implementation waves, verification, risk, visual decisions, security/network contracts, adversarial QA, quality scoring, and the ongoing ponytail operating model.
- **Role:** Spawn agents, synthesize results, write documents, resolve conflicts, verify completeness.
- **File scope:** Only writes to `.ai/03_plans/2026-06-21-Ponytail-Pass-Plan/`. Does not edit source code.
- **Status:** Active throughout. Last to exit.

### Agent A — Blast radius for Tier 1 dependency removals (`bg_d4c101b4`)

- **Goal:** For each of 8 dependencies (`class-variance-authority`, `three`, `@next/third-parties`, `d3`/`d3-shape`, `@firecms/neat`, `lenis`, `rough-notation`, `roughjs`), produce a precise blast-radius report: confirmed import count, every file that imports it, what's used, swap path, risk.
- **Role:** Read-only exploration. Grep + file reads. No edits.
- **File scope:** Reads `package.json`, `src/`, `app/`, `tests/`, `~/.local/share/ponytail/`. Writes nothing.
- **Downstream:** Output → `03_BLAST_RADIUS_ANALYSIS.md` and `04_TIER_1_DEPENDENCY_CLEANUP_PLAN.md`.
- **Conflict surface with other agents:** Overlaps with Agent C (codebase re-pass) on dep usage. If Agent C reports a dep is used somewhere Agent A missed, Agent A's finding is overridden.
- **Status:** Complete 2026-06-21. Session: `ses_117e32fbfffe5gs1fcUDDm81yc`.

### Agent B — Blast radius for Tier 2 mega-files (`bg_5317ab1f`)

- **Goal:** For each of 7 mega-files, produce a coupling/blast-radius report: importers, consumed exports, dead exports, test files, barrel behavior, hot path, coupling score, refactor risk, recommended ponytail strategy.
- **Role:** Read-only exploration. Grep + file reads. No edits.
- **File scope:** Reads `src/`, `app/`, `tests/`. Writes nothing.
- **Downstream:** Output → `05_TIER_2_MEGA_FILE_STRATEGY.md`.
- **Conflict surface with other agents:** Minimal — mega-files are Agent B's exclusive scope. No overlap with Agent A (deps) or Agent D (ponytail ruleset).
- **Status:** Complete 2026-06-21. Session: `ses_117e30e2fffeu71Bf1frkpwpAi`.

### Agent C — Full codebase re-pass for missed over-engineering (`bg_3216bf22`)

- **Goal:** Do a SECOND, independent pass looking for over-engineering patterns the first pass missed: state machines, middleware chains, HOCs, plugin systems, config-for-config, custom hooks wrapping single native calls, duplicate logic, over-typed TS, repeated auth boilerplate, API routes with no client callers.
- **Role:** Read-only exploration. Grep + file reads. No edits.
- **File scope:** Reads `src/`, `app/`, `scripts/`. Writes nothing.
- **Downstream:** Output → appended to `02_CODEBASE_ANALYSIS.md` § "Second-pass findings" and routed into `06_TIER_3_QUICK_CUTS.md`.
- **Conflict surface with other agents:** Overlaps with Agent A on dep usage (if Agent C finds a dep used somewhere Agent A missed). Overlaps with the first-pass findings already in `02_CODEBASE_ANALYSIS.md` — Agent C is instructed NOT to duplicate those.
- **Status:** Complete 2026-06-21. Session: `ses_117e2ddcbffe6n76GVlRCjE5Dm`.

### Agent D — Ponytail ruleset extraction (`bg_2b0873e6`)

- **Goal:** Extract ponytail's full ruleset and command specifications from `~/.local/share/ponytail/` — the exact prose injected at each mode (lite/full/ultra/off), the command behaviors, the skill descriptions, the AGENTS.md always-on ruleset, the benchmark calibration numbers.
- **Role:** Read-only exploration. File reads only. No edits.
- **File scope:** Reads `~/.local/share/ponytail/`. Writes nothing.
- **Downstream:** Output → `10_PONYTAIL_OPERATING_MODEL.md` (augment with full verbatim ruleset text).
- **Conflict surface with other agents:** None — ponytail source is Agent D's exclusive scope.
- **Status:** Complete 2026-06-21. Session: `ses_117e2bb97ffeKrdlpYgvojIEH9`.

## Communication protocol (how agents "talk")

Agents do not literally talk to each other — they communicate through the orchestrator (Sisyphus). The protocol:

1. **Each agent writes its findings to its own session.** The orchestrator collects via `background_output(task_id="bg_...")`.
2. **The orchestrator synthesizes.** When agents return, the orchestrator reads all outputs, resolves conflicts, and writes the plan documents.
3. **Conflicts are resolved by the orchestrator** using these rules (see "Conflict resolution" below).
4. **If an agent needs to ask another agent a question**, it can't — but the orchestrator can spawn a follow-up via `task(task_id="ses_...")` to continue a specific agent's session with new context.

## Conflict resolution rules

When two agents report conflicting findings about the same code:

| Conflict type | Resolution rule |
|---|---|
| Agent A says "dep X is unused" / Agent C says "dep X is used at file:line" | **Agent C wins** (more recent + more specific). The orchestrator updates Agent A's finding and re-checks. If Agent C is right, the dep is NOT removed. |
| Agent B says "mega-file Y has N importers" / Agent C says "mega-file Y has N+1 importers" | **Re-run a focused grep** to resolve. The higher count wins if verified; otherwise the lower count. |
| Agent A says "swap path is X" / Agent D says "ponytail ruleset would suggest Y" | **Both are recorded.** The swap path in `04_TIER_1_DEPENDENCY_CLEANUP_PLAN.md` is Agent A's (grounded in actual code). The ponytail-ruleset note is a sidebar. |
| Any agent conflicts with `2026-06-14-Codebase-Cleanup-Plan` | **Cleanup plan wins for shared findings** (it has more detailed evidence). This plan adds new findings only. |

## Vigilance protocol (multiple agents on the same directory)

The user said: "always assume that multiple coding ai agents are working on the same directory so stay vigilant."

### During this planning phase

- **All 4 agents are read-only.** They explore the codebase but do not edit. No file conflicts possible.
- **The orchestrator is the only writer.** It writes only to `.ai/03_plans/2026-06-21-Ponytail-Pass-Plan/`. No source code is touched.
- **If another agent (not in this plan) edits source code while this plan is being written**, the orchestrator does NOT revert those changes. The orchestrator continues writing the plan. The plan's findings may become stale if source changes — re-verify before execution.

### During execution phase (Wave 1, Wave 2, etc.)

When this plan is executed (a separate session), multiple agents may work on different waves concurrently. Rules:

1. **File-locking convention:** Before editing a file, an agent announces intent in its session (or in a shared `.ai/05_logs/` entry). The first agent to announce owns the file until it's done.
2. **Wave isolation:** Wave 1 and any visual swaps both touch `package.json`, so package edits are serialized. Wave 2B source/test quick cuts can parallelize by file after Wave 1 package changes land. Tier 2 mega-file diffs are serialized per-file (one PR per file, one diff at a time).
3. **Last-writer-respect-first-writer:** If two agents edit the same file (despite the locking convention), the second writer's edit is preserved (it's the most recent). The first writer re-applies their change on top if still needed.
4. **Never revert work you didn't make.** If you see unexpected changes in a file you're editing, those are another agent's in-progress work. Continue YOUR task. Don't revert.
5. **Communicate via `.ai/05_logs/`.** If an agent needs to flag something to other agents, write a log entry at `.ai/05_logs/<date>-<topic>.md`. Other agents check this directory at session start.

### Specific vigilance for this plan's execution

- **Wave 1 (T1.1-T1.4) touches `package.json` + 1-2 source files.** Serialized — one agent at a time on `package.json`. Source file edits can parallelize.
- **Wave 2 (T1.5-T1.8) touches 1 source file per dep + `package.json`.** Same rule — `package.json` serialized, source edits parallel.
- **Tier 2 diffs are per-file.** `EstimateSheetContent.tsx` diffs are serialized (one PR at a time on that file). `workspace-repository.ts` diffs can run concurrently with `EstimateSheetContent.tsx` diffs (different file).
- **Tier 3 quick cuts are independent.** Each can run in its own PR concurrently.

## Agent health and failure handling

- **If an agent times out** (>15 min for exploration): the orchestrator cancels it via `background_cancel(taskId="bg_...")` and writes the document with available data. The document notes the agent didn't complete.
- **If an agent returns malformed output**: the orchestrator extracts what's usable, notes the malformation, and re-spawns a focused follow-up if needed via `task(task_id="ses_...")`.
- **If all 4 agents fail**: the orchestrator writes the plan with the data it already has (from the first-pass analysis + direct reads). The plan notes which sections are incomplete.

## Orchestrator's coordination log

| Time (UTC) | Action | Agent | Result |
|---|---|---|---|
| 2026-06-21 (start) | Created plan directory | Orchestrator | `.ai/03_plans/2026-06-21-Ponytail-Pass-Plan/` exists |
| 2026-06-21 (start) | Launched 4 parallel agents | Orchestrator | bg_d4c101b4, bg_5317ab1f, bg_3216bf22, bg_2b0873e6 |
| 2026-06-21 (start) | Read existing plan conventions | Orchestrator | `2026-06-14-Codebase-Cleanup-Plan` format adopted |
| 2026-06-21 (draft) | Wrote 00_README.md | Orchestrator | Done |
| 2026-06-21 (draft) | Wrote 01_EXECUTIVE_SUMMARY.md | Orchestrator | Done |
| 2026-06-21 (draft) | Wrote 02_CODEBASE_ANALYSIS.md (first-pass findings) | Orchestrator | Done |
| 2026-06-21 (draft) | Wrote 08_VERIFICATION_STRATEGY.md | Orchestrator | Done |
| 2026-06-21 (draft) | Wrote 09_RISK_REGISTER.md | Orchestrator | Done |
| 2026-06-21 (draft) | Wrote 10_PONYTAIL_OPERATING_MODEL.md | Orchestrator | Done |
| 2026-06-21 (draft) | Wrote 11_AGENT_COORDINATION_LEDGER.md (this file) | Orchestrator | Done |
| 2026-06-21 (Agent D done) | Collected Agent D → augmented 10_PONYTAIL_OPERATING_MODEL.md with verbatim ruleset, mode-specific prose, command output shapes, off-is-special nuance, next-turn injection note | Orchestrator | Done |
| 2026-06-21 (Agent A done) | Collected Agent A → updated 03_BLAST_RADIUS_ANALYSIS.md + 04_TIER_1_DEPENDENCY_CLEANUP_PLAN.md + 02_CODEBASE_ANALYSIS.md + 07_IMPLEMENTATION_WAVES.md with validated blast-radius data (window.gtag constraint, d3-shape usage, roughjs -500 LOC, three false positive) | Orchestrator | Done |
| 2026-06-21 (Agent B done) | Collected Agent B → updated 05_TIER_2_MEGA_FILE_STRATEGY.md + 03_BLAST_RADIUS_ANALYSIS.md with validated coupling data (37 importers for workspace-repository, 25 dead exports in EstimateSheetContent, 57 total dead exports, two priority options) | Orchestrator | Done |
| 2026-06-21 (Agent C done) | Collected Agent C → appended second-pass findings to 02_CODEBASE_ANALYSIS.md § "Second-pass findings" and 06_TIER_3_QUICK_CUTS.md § T3.6-T3.14 (9 new findings: auth boilerplate, over-fixture'd stories, registry bridges, trivial hook, duplicate date/query formatting, hand-rolled debounce, 5 zero-caller routes; 5 categories clean) | Orchestrator | Done |
| 2026-06-21 (continuation review) | Collected coherence, design, feasibility, and security reviewer lanes | Orchestrator | 23 actionable issues integrated |
| 2026-06-21 (continuation synthesis) | Added `12_QUALITY_SCORECARD_AND_REQUIREMENT_CLOSURE.md`, `13_VISUAL_DECISION_AND_QA_MATRIX.md`, `14_SECURITY_AND_NETWORK_CONTRACTS.md`, `15_ULTRAQA_ADVERSARIAL_PLAN_QA_MATRIX.md` | Orchestrator | Done |
| 2026-06-21 (final pass) | Final completeness pass across 16 docs: no stale TBDs, no invalid `app/` command paths, baseline-diff gates in place, visual/security/UltraQA matrices linked | Orchestrator | Done |

## What "stay vigilant" means concretely

1. **Check `git status` before any execution wave.** If the working tree is dirty (another agent's work), don't start a wave. Wait or coordinate.
2. **Check `git log` for recent commits before executing.** If `2026-06-14-Codebase-Cleanup-Plan` already executed T1.1/T1.2/T1.4, skip them. Don't duplicate work.
3. **Re-verify LOC counts before refactoring Tier 2 files.** The graph index is 2026-06-19. Source may have changed since.
4. **Re-verify dep usage before removing.** Run the multi-pattern grep yourself, even if Agent A says 0 imports. Agents can be wrong; `rg` is authoritative.
5. **If a finding feels wrong, it probably is.** Investigate before executing. The plan is a guide, not a command.
