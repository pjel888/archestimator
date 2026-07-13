# 13 — Rollout, Rollback, and Operations

This is a planning-only capability. "Rollout" here means how the future implementation lands and how operators run it. No production deployment of the audit itself is required for the tool to exist — it is a script + lib + tests.

## Rollout sequence

1. **Land Phases 1–5** (harness, manifest, detection, R2 reconciliation, report, dry-run script) on `main` via normal PR. These are additive (new files + one `package.json` script). No runtime behavior change for users.
2. **Land Phase 7 (Track A)** — the project-delete batch patch. Small, atomic, well-tested. This is the only change to existing application behavior in the implementation-ready core.
3. **Land Phase 9 (DSAR template + retention rule)** — additive.
4. **Operator runs first preview dry-run** — `bun run cf:orphan-audit --dry-run --target preview`. Inspect the report. This is the first real provider-backed evidence.
5. **Phase 6 (repair)** lands only after an independent reviewer signs off the package and the repair allowlist.
6. **Phase 8 (Track B)** lands only after OPEN-DEC-001 + a clean preview dry-run repair.

## Release gates

| Gate | Blocks | Evidence |
|---|---|---|
| Phase 1–5 tests green | merge to main | test suite |
| Track A cascade-off test green | Track A merge | test |
| Read-only instrumentation test green | any detection merge | TEST-002 |
| Redaction test green | any report change | TEST-003 |
| Preview dry-run completes ≤ 60s + ≤ cost cap | first prod dry-run | timed report |
| Repair gate tests green + reviewer sign-off | repair merge | gate tests + review |
| OPEN-DEC-001 resolved + clean preview dry-run repair | Track B merge | decision + report |
| P0 count == 0 on preview | prod dry-run | preview report |

## Rollback

- Phases 1–5: revert the PR; no runtime effect (tool was never in a request path).
- Track A: revert the two DELETE statements; behavior returns to transitive-cascade reliance (the status quo).
- Repair: repair is audited and idempotent; a bad repair can be re-derived and reversed where the action was delete-row (re-insert from the audit row snapshot) — but R2 deletes are irreversible. This is why repair requires a dry-run report first and is owner-gated.
- Track B: remove the `PRAGMA foreign_keys = ON` line; returns to today's unverified state.

## Rollback triggers

- Any detection false-positive that leads to a wrong repair → halt repairs, re-audit.
- Read-only violation detected in production (TEST-002 equivalent trips) → halt immediately.
- R2 cost cap exceeded unexpectedly → halt reconciliation.

## Rollout performance gates (recap from `09`)

| Metric | Source | Pass/fail | Rollback trigger |
|---|---|---|---|
| Preview dry-run wall-clock | timed run | ≤ 60s | n/a (read-only) |
| Preview R2 estimated cost | report | ≤ cap | abort scan |
| No read-only violation | TEST-002 harness | 0 writes | hard stop |
| Repair idempotency | repair test | empty re-run diff | investigate |

## Operator runbook

### Run a dry-run (local)
```
bun run cf:orphan-audit --dry-run --target local
```
Reads: local `node:sqlite` seeded DB (or a dump). Writes: stdout summary + `./orphan-report-<ts>.json`.

### Run a dry-run (preview)
```
bun run cf:orphan-audit --dry-run --target preview --r2-cost-cap 0.05
```
Reads: preview D1 (`ARCH_DB` preview) + preview R2. **Provider-backed.** Inspect `fk_enforcement`, `summary`, `r2_reconciliation.estimated_cost_usd`.

### Reading the report
- `fk_enforcement`: if `off` or `unknown`, every CASCADE edge is "unverified" — Track A matters most.
- `summary[].severity`: P0 = act before prod; P1 = act before next release; P2 = backlog.
- `r2_reconciliation.r2_only_count`: leaked R2 objects (Class B).
- `r2_reconciliation.d1_only_count`: ghost D1 rows (Class C).
- `gaps[]`: classes skipped; never ignore.

### Triage a P0
1. Identify the class + table.
2. Cross-reference `03` §7 for root cause.
3. Decide: repair now (Phase 6) or fix the underlying delete path.
4. If repair: see below.

### Run a repair
```
ORPHAN_AUDIT_REPAIR_TOKEN=<token> bun run cf:orphan-audit repair \
  --from-report ./orphan-report-<ts>.json --confirm --class <filter>
```
Refuses without: a prior report, `--confirm`, and the token. Prints before/after diff. Writes a `data_retention_events` audit row.

### Cadence
- **After each D1 migration apply** (preview): dry-run.
- **Weekly (prod):** full dry-run; alert on P0>0.
- **On demand:** before any DSAR erasure run (Phase 9 template).

### When GitHub Actions is re-enabled
- Add a workflow that runs `cf:orphan-audit --dry-run --target preview` post-migration-apply. Until then, this is a manual operator step (GitHub Actions currently disabled per fast-path).

## Feature flags

- None required. The audit is opt-in (you run the script). Track A is always-on (it is a correctness fix). Track B is gated by OPEN-DEC-001, not a flag.

## Staged rollout rings

- Ring 0: local seeded DB (automated tests).
- Ring 1: preview D1+R2 (operator dry-run).
- Ring 2: production D1+R2 dry-run (owner-approved).
- Ring 3: production repair (owner-approved, token-gated).

## Backward compatibility

- Fully backward compatible through Ring 2 (all read-only). Track A is a stricter delete (more correct). Track B can surface pre-existing violations as errors — hence the dry-run-first gate.

## Post-release verification

- After the first prod dry-run, record the baseline orphan counts in `.ai/10_state/current-state.md`.
- Track week-over-week deltas.

## Observability summary

- The report file is the primary artifact.
- Exit code drives CI/operator alerts.
- Repair audit rows in `data_retention_events` are the durability surface.

## Support / incident response

- P0 finding in prod → runbook triage → owner escalation → repair (if safe) or code fix.
- Read-only violation → halt + incident (should never happen; indicates a code bug in the audit module).

## Cost guardrails (per AGENTS.md free-tier posture)

- R2 `list()` is the only new metered surface. Cost worksheet in `20`. Owner approves the per-run cap before the first billed prod scan. Preview dry-runs stay under the free tier.
