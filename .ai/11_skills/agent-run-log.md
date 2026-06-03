# Agent Run Log Playbook

Use this when a task produces durable `.ai` evidence.

## Steps

1. Create `.ai/05_logs/YYYY-MM-DD-<task-slug>-<mode>-run.md`.
2. Record goal, mode, branch, commit, dirty status before work, and allowed
   writes.
3. Record source-of-truth docs read.
4. Record graph/GitNexus evidence or fallback.
5. Record commands as `[exit N] command - purpose - key output`.
6. Record files changed and validation results.
7. Separate `local-only`, `provider-proven`, and `manual-proof-pending`.
8. Link bug plans and proof artifacts.
9. Record final status, remaining risks, commit/push/merge state, and cleanup.

Never paste secrets, raw tokens, service-role keys, OAuth codes, or provider
passwords into run logs.
