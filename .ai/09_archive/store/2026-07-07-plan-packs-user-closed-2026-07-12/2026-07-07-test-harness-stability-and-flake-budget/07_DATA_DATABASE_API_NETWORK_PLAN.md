# 07 — Data, Database, API, and Network Plan

> **Mostly not applicable.** This pack does not touch D1, R2, Durable Objects,
> Queues, Email, or any network/API surface. No migrations, no app data, no
> provider state. Stated with evidence per the planning prompt's "mark N/A with
> reason" rule.

## Applicability

| Dimension | In scope? | Reason |
|---|---|---|
| D1 schema/migrations | No | Pack is test-harness-only; no app data behavior change. |
| R2 / DO / Queues / Email | No | Not touched. |
| App API/Route Handlers/Server Actions | No | No behavior change. |
| Network/external integrations | No | Harness runs locally; no new outbound calls. |

## The small data contract this pack *does* introduce

The pack creates two **local data artifacts** (not database, not provider):

### 1. Flakewatch timing/flake report (`flakewatch-report.json`)

- **Owner:** `scripts/flakewatch.mjs` (writer); developer/CI (reader).
- **Lifecycle:** regenerated per scan; before/after pairs kept as evidence in
  `19`. Not committed as source-of-truth (it is measurement output).
- **Schema (stable, documented in `19` §B):**
  ```json
  {
    "schema_version": 1,
    "generated_at": "<iso>",
    "runs": <N>,
    "glob": "<glob>",
    "wall_clock_ms": { "p50": <n>, "p95": <n>, "max": <n> },
    "files": [
      { "file": "<repo-relative>", "fail_rate": <x/N>,
        "wall_clock_ms": { "p50": <n>, "p95": <n>, "max": <n> },
        "status": "ok" | "flake" | "slow" | "timeout" }
    ],
    "summary": { "flake_count": <n>, "slow_count": <n>, "coverage_files": <n> }
  }
  ```
- **Privacy:** contains only file paths + timings; no secrets, no user data.
- **Retention:** evidence pairs kept in `.ai` plan folder or `.omx` logs (local
  state, gitignored per AGENTS.md).

### 2. Quarantine ledger

- **Owner:** the agent/human who quarantines (writer); flakewatch + owner
  review (readers).
- **Location:** repo path TBD in T2.2 (candidate: `.ai/qa/quarantine-ledger.yml`
  or `tests/QUARANTINE.md`). Must be **committed** (so coverage loss is
  visible in git, not hidden).
- **Lifecycle:** append-mostly; entries transition `quarantined → re-testing →
  resolved/reinstated`. `retest_by` enforces time-bounding.
- **Integrity:** a validator (T2.3) rejects entries missing `replacement` or
  `retest_by`.
- **Privacy:** test names + file paths only; no secrets.

## Data integrity considerations (even though no DB)

- The before/after **coverage count** (files + assertions) is the integrity
  invariant: post-phase count ≥ pre-phase count, modulo recorded replacements.
  This is the "no hidden coverage loss" stop condition made machine-checkable.
- Flakewatch must detect a mid-scan test-file edit (git dirty check per run) and
  abort, so a "before/after" comparison is never contaminated by concurrent
  edits (shared-worktree safety, AGENTS.md §6).

## No database/provider-proof requirement

Because there is no DB/provider surface, there is no `EXPLAIN`, no readback, no
migration order, no app-authz boundary to prove for this pack. The flakewatch
*measurements* are the closest thing to "provider proof" and they are local
automated evidence (evidence class: Local automated), not provider-backed.
