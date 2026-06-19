# Kimi Prompt: Live Database Performance Evidence Workflow

## Dedicated `/goal`

Task base folder: `06-live-db-performance-evidence-workflow`

```text
/goal Complete the Kimi task whose base folder is `06-live-db-performance-evidence-workflow`. Locate the current task folder under `.ai/08_prompts/kimi` by finding either `06-live-db-performance-evidence-workflow` or a folder ending in `__06-live-db-performance-evidence-workflow`; then follow that folder's `PROMPT.md`. Build a repeatable evidence workflow for live or staging Supabase database performance checks before proposing indexes or RPC rewrites. Keep output reports in the current task folder and do not create performance migrations from static evidence alone.
```

## Objective

Turn existing static DB query inventories into a safe, repeatable workflow for collecting live/staging evidence.

## Background and evidence

- `scripts/audit-dbidx-repo.ts:177` says live Supabase metrics were not collected.
- `scripts/audit-dbidx-repo.ts:190` says DBIDX-002/003 require linked or staging DB parity and EXPLAIN evidence before candidate index migrations.
- `scripts/build-performance-query-inventory.ts:219` labels the inventory as repo-static with live provider proof open.
- `scripts/build-performance-query-inventory.ts:239` through `:242` says live EXPLAIN, metrics, RLS cost, row counts, and hosted timing remain open and migrations/RPC rewrites must not be created from that artifact alone.

## Non-goals

- Do not create new index migrations in this task.
- Do not rewrite RPCs based only on static inventory.
- Do not run against production unless explicitly authorized and scoped.
- Do not print secrets or database URLs.
- Do not require paid provider features.

## Required loop

Follow `../COMMON_KIMI_OPERATING_PROTOCOL.md`.

Loop cap: 5 iterations.

### DISCOVER

- Read startup docs.
- Read both inventory scripts.
- Inspect existing package scripts for DB/performance commands.
- Search `.ai/09_archive` only if needed for DBIDX context.
- Record starting `git status --short`.

### PLAN

In `REPORT.md`, specify:

- Evidence artifacts to collect.
- Required environment variables without printing values.
- Safe target classification: local, linked staging, hosted provider.
- Commands that collect query plans or advisor output.
- How results should be stored and labeled.

### EXECUTE

Useful deliverables:

- A script or documentation that orchestrates existing inventories plus optional live evidence.
- A markdown runbook for DBIDX-002/003.
- Output templates for EXPLAIN, row counts, RLS cost, advisor findings, and route timing.
- Guardrails that refuse to propose migrations when proof boundary is static-only.

Expected file scope might include:

- `scripts/audit-dbidx-repo.ts`
- `scripts/build-performance-query-inventory.ts`
- Current task folder report/runbook files
- A new script under `scripts/` if justified.

### VERIFY

At minimum:

```bash
bun run type-check
git diff --check
```

If a script is added:

```bash
bun <script-path> --help
```

or the closest safe dry-run command.

### REPORT

Update same-folder reports. Clearly label whether evidence is static-only or live/staging.

### DECIDE

Complete only when future agents have a concrete workflow that prevents index/RPC changes from being made without live evidence.

## Pass completion

Before final response, update `PASS_STATUS.md`, append `PASS_HISTORY.md`, and execute `../PASS_COMPLETION_PROTOCOL.md`.

If this is the first successful pass, rename this folder to:

```text
1st-Pass-Completed__06-live-db-performance-evidence-workflow
```

If blocked or failed on pass 1, rename this folder to one of:

```text
1st-Pass-Blocked__06-live-db-performance-evidence-workflow
1st-Pass-Failed__06-live-db-performance-evidence-workflow
```

On later passes, replace the existing leading pass prefix instead of stacking prefixes.
