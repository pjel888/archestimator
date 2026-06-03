# Phase 1A / Phase 1B Implementation Gate Plan

## Purpose

Prevent future agents from calling Phase 1 complete after repo-local framework work while Notion remains stale or unsynced.

## Gate A — Phase 1A repo-local complete

Required evidence:

- `.ai/00_system` framework docs updated.
- `.ai/12_agents` payload schema and all approved/conditional/deprecated/non-agent decisions implemented.
- `.ai/08_prompts` and `.ai/11_skills` finalized.
- Thin adapters updated/fail-closed where authorized.
- Hermes/Cursor/Ollama/Gemini/`.agents`/CommandCode gaps resolved or fail-closed.
- Root stale agent-doc facts repaired or bugged.
- Graph/GitNexus/fallback evidence recorded.
- Dry-run specs exist without overclaim.
- Validation passes.
- Commit/push completed.

Allowed status: `PHASE_1A_COMPLETE` or `READY_FOR_PHASE_1B_NOTION_SYNC`. Not allowed: `PHASE_1_COMPLETE`.

## Gate B — Phase 1B Notion mirror complete

Required evidence:

- Phase 1A commit hash known.
- Notion targets fetched.
- Stale stack/graph facts corrected from live repo evidence.
- Framework mirror, agent roster, prompt library, run logs, dry-run/eval status, GitHub guardrails, provider-proof gates, release readiness, and proof boundary updated or blocked.
- Each Notion item includes source `.ai` path, commit hash, mirror date, anti-drift notice, proof boundary, and no secrets.
- Post-update fetch proof in `.ai/05_logs`.

Allowed status after Gate B: `PHASE_1_COMPLETE` only if no blocker remains or Philip explicitly waives/defers Phase 1B. If blocked: `PHASE_1A_COMPLETE_PHASE_1B_BLOCKED`.

## Gate C — global enforcement not included

Even after Phase 1A+1B, global enforcement remains not ready until dry-runs/evals pass, logs exist, payload gaps are resolved in practice, advisory checks prove stable, and Philip approves enforcement.
