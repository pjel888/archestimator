# Agent Run Log Playbook

Use this only when a task needs durable `.ai` evidence or a material handoff.
Direct and Brief work do not create run logs by default.

## Steps

1. Create `.ai/05_logs/YYYY-MM-DD-<task-slug>-<mode>-run.md`.
2. Record goal, mode, relevant branch/commit state, dirty status before work,
   and allowed writes.
3. Record source-of-truth docs read.
4. Record graph/GitNexus evidence or fallback.
5. Record commands as `[exit N] command - purpose - key output`.
6. Record files changed and validation results.
7. Separate `local-only`, `provider-proven`, and `manual-proof-pending`.
8. Link bug plans and proof artifacts.
9. Record final status, remaining risks, and any explicitly requested
   commit/push/merge state.

This playbook records Git state; it never authorizes committing, pushing,
branching, stashing, cleaning, or rewriting history.

Never paste secrets, raw tokens, service-role keys, OAuth codes, or provider
passwords into run logs.
