# Agent Self-Diagnostic Protocol

**Date:** 2026-05-18
**Status:** Active quality-control protocol for Archestimator agents.

## Why this exists

Philip reported that agent performance is degrading. The likely failure mode is not a single bad answer; it is accumulated drift:

- stale `.ai` instructions are being followed after project reality changed;
- long-context sessions carry superseded implementation details forward;
- agents read too much historical material and fail to distinguish active instructions from archived context;
- agents promise work instead of executing and verifying it;
- agents make broad product claims without checking the current repo state;
- agents stack new plans on top of unverified assumptions;
- agents under-report uncertainty and over-report completion.

This document is the mandatory recovery loop when an agent seems confused, slow, stale, repetitive, overconfident, or misaligned with Philip's current direction.

## Non-negotiable rule

If current repo state conflicts with historical plans, current repo state wins. Then update `.ai/10_state/current-state.md` or the relevant source-of-truth doc so the next agent does not repeat the same mistake.

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
2. Read the active source-of-truth chain:
   - `.ai/README.md`
   - `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`
   - `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
   - `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
   - `.ai/10_state/current-state.md`
   - `.ai/10_state/decisions.md`
   - `.ai/10_state/known-issues.md`
   - relevant active plan/spec only after the current-state docs are read.
3. State the task frame internally before acting:
   - goal;
   - non-goals;
   - current active branch;
   - files likely touched;
   - validation command(s);
   - stop conditions.
4. Reduce scope:
   - choose the smallest useful change;
   - do not revive old routes, modules, data layers, or UI unless the current task explicitly requires them;
   - do not add a new plan if an active plan already covers the work.
5. Verify evidence before final response:
   - docs-only: referenced paths exist and `git diff --check` passes;
   - code changes: use `.ai/00_system/VALIDATION_MATRIX.md` for the current gate;
   - if validation cannot run, say why and what remains unverified.

## Context hygiene rules

- Prefer reading the exact file over trusting session memory.
- Prefer narrow reads over dumping large docs into context.
- Summarize old material as `historical context`, not active instruction, unless current-state docs point to it.
- Do not continue from a long degraded session for implementation work; start a fresh session or delegate to an isolated builder with a concise brief.
- Do not let a model-specific skill override repo-local `.ai` source-of-truth docs.

## When modifying `.ai` docs

1. Preserve Philip's current corrections as first-class rules, not buried notes.
2. Mark stale or superseded guidance explicitly.
3. Do not create parallel Hermes-only, Claude-only, or Codex-only project brains.
4. Update the source-of-truth map if a new canonical doc is created.
5. Keep docs short enough to be loaded reliably by future agents.

## Required final report after a self-diagnostic fix

Report concisely:

1. what was diagnosed;
2. what docs or rules changed;
3. what was verified;
4. what remains risky or unresolved;
5. the recommended next action.
