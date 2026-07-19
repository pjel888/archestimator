# Agent Self-Diagnostic Protocol

**Date:** 2026-07-11
**Status:** Active quality-control protocol for Archestimator agents.

## Why this exists

Philip reported that agent performance is degrading. The likely failure mode is not a single bad answer; it is accumulated drift:

- stale `.ai` instructions are being followed after project reality changed;
- long-context sessions carry superseded implementation details forward;
- agents read too much historical material and fail to distinguish active instructions from archived context;
- agents promise work instead of executing and verifying it;
- agents make broad product claims without checking the current repo state;
- agents stack new plans on top of unverified assumptions;
- agents answer uncertainty with more abstractions, agents, artifacts, tests, or
  repeated review instead of narrowing the real blast radius;
- agents burn context on full-history reads, redundant scans, and duplicated
  evidence after the affected claim is already grounded;
- agents under-report uncertainty and over-report completion.

This document is the mandatory recovery loop when an agent seems confused, slow, stale, repetitive, overconfident, or misaligned with Philip's current direction.

## Non-negotiable rule

If current repo state conflicts with historical plans, current repo state wins. Then update `.ai/10_state/current-state.md` or the relevant source-of-truth doc so the next agent does not repeat the same mistake. If `.ai/README.md` active-work notes conflict with `.ai/10_state/current-state.md` or `.ai/10_state/decisions.md`, treat the state docs as newer until the README is refreshed.

## Trigger conditions

Run this diagnostic before continuing when any of these happen:

1. Philip says performance is getting bad, getting worse, stale, confused, or not following instructions.
2. The agent is about to use an old plan after a reset or major correction.
3. The active branch or live routes do not match `.ai/README.md` or `.ai/10_state/current-state.md`.
4. The task requires more than one implementation slice and context is already large.
5. The agent cannot clearly state the current goal, non-goals, affected files, and validation gate.
6. The agent has made two failed attempts or repeated the same class of mistake.
7. The agent is relying on memory instead of reading repo files.

## Five-minute self-diagnostic loop

Do this before further planning or coding:

1. Check live repo state:
   - `git status --short --branch`
   - `git branch --show-current`
   - inspect changed files before editing any already-modified file.
2. Re-read `AGENTS.md` and only the FAST PATH block at the top of
   `.ai/10_state/current-state.md`. Use `DOCS_SOURCE_OF_TRUTH.md` to pull the
   narrow protocol, decision, issue, plan, or spec that the failure actually
   touches; do not linear-read append-only history.
3. For whole-codebase, roadmap, architecture, or docs-sync work, gather fresh evidence before acting:
   - code-review graph/GitNexus overview or query when available;
   - current `src/app` route tree;
   - current package scripts and major dependencies;
   - active `wrangler.jsonc` bindings and current `./migrations/` list when data
     or provider facts matter;
   - current evidence surfaces, and test files only when the user has explicitly
     authorized a testing task (`TEST_TASK` under the User Test Authorization
     Gate); older plan metadata does not authorize running tests.
4. State the task frame internally before acting:
   - goal;
   - non-goals;
   - current active branch;
   - files likely touched;
   - `test_requirement`, validation evidence, and command(s) when needed;
   - stop conditions.
5. Reduce scope:
   - choose the smallest useful change;
   - stop discovery when the evidence-supported direct/transitive blast radius
     and governing constraints are known;
   - do not revive old routes, modules, data layers, or UI unless the current task explicitly requires them;
   - do not add a new plan if an active plan already covers the work.
6. Verify evidence before final response:
   - docs-only: referenced paths exist and `git diff --check` passes;
   - code changes: use `.ai/00_system/VALIDATION_MATRIX.md` for the current gate;
   - if validation cannot run, say why and what remains unverified.

## Context hygiene rules

- Prefer reading the exact file over trusting session memory.
- Prefer narrow reads over dumping large docs into context.
- Summarize old material as `historical context`, not active instruction, unless current-state docs point to it.
- Do not continue from a long degraded session for implementation work; start a fresh session or delegate to an isolated builder with a concise brief.
- Do not let a model-specific skill override repo-local `.ai` source-of-truth docs.
- Do not let a workflow impose automatic TDD, UltraQA, browser automation,
  builds, broad validation, repeated review, or multi-agent fan-out without the
  task-specific authorization and proportional benefit required by `AGENTS.md`.
- Do not trust memory-derived route, feature, provider, AI, or package facts
  without a cheap current-file check.

## When modifying `.ai` docs

1. Preserve Philip's current corrections as first-class rules, not buried notes.
2. Mark stale or superseded guidance explicitly.
3. Do not create parallel Hermes-only, Claude-only, or Codex-only project brains.
4. Update the source-of-truth map if a new canonical doc is created.
5. Keep docs short enough to be loaded reliably by future agents.
6. For roadmap and system docs, separate shipped implementation, partial implementation, future scope, and blocked/destructive work.

## Required final report after a self-diagnostic fix

Report concisely:

1. what was diagnosed;
2. what docs or rules changed;
3. what was verified;
4. what remains risky or unresolved;
5. the recommended next action.
