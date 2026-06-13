# Loop Engineering Mandate And Research

**Date:** 2026-06-13
**Status:** implemented and archived governance plan pack
**Mode:** docs/governance, source-backed research, no source-code change

## Purpose

This pack updates the Archestimator product-development mandate so non-trivial
work is loop-engineered instead of prompt-by-prompt. The existing habit remains:
audit the codebase, create or update a plan pack under `.ai/03_plans`, research
uncertain claims, implement, verify, and iterate. The update makes the loop
explicit: the system owns discovery, lane assignment, verification, durable
memory, and next-step selection until a real stop condition is proven.

The pack was archived after the mandate, research note, cross-agent payload
updates, state links, and docs-only verification were completed.

## Agent-Neutral Boundary

The mandate must work across Claude, Codex, OpenCode, CommandCode, Antigravity,
Kimi, DeepSeek, Cursor where approved, Gemini only if explicitly reapproved, and
future coding agents. `.ai/00_system` is the shared authority. Tool-specific
payloads, prompts, skills, and connectors translate the loop into each agent's
surface; they do not fork policy or lower the evidence bar.

## Reading Order

1. `00_INDEX.md`
2. `01_CURRENT_WORKFLOW_AUDIT.md`
3. `02_LOOP_ENGINEERING_RESEARCH.md`
4. `03_LOOP_SURFACE_MAP.md`
5. `04_ADOPTION_AND_VALIDATION_PLAN.md`
6. `IMPLEMENTATION_HANDOFF_PROMPT.md`

Companion research note:
`.ai/13_research/loop-engineering-agentic-product-development-2026-06-13.md`.

## Proof Boundary

This is a repo-local documentation and governance update. It does not change
source code, dependencies, database schema, provider settings, GitHub settings,
Vercel settings, production, or runtime behavior.

Validation target:

- referenced paths exist;
- markdown diff has no whitespace errors via `git diff --check`;
- final report separates local docs proof from provider/manual/browser proof.
