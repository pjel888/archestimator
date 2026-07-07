# 05 — UX, UI, and Accessibility Plan

This pack designs an **operator/devtool capability**, not a customer-facing feature. UX scope is therefore narrow: the report format and the CLI/script interaction. There is no workshop UI, no end-user screen, no marketing surface. DESIGN.md (alpha-stage) does not apply.

## Primary "user"

The operator (Philip or a delegated engineer/AI) running the audit, reading its report, and gating repair. Secondary: a future reviewer reading a persisted report artifact.

## Primary journey

1. Operator runs `bun run cf:orphan-audit --dry-run` (local or against preview bindings).
2. Tool prints a human-readable summary to stdout and writes a redacted JSON report to a known path.
3. Operator inspects the report (counts per class, sample key prefixes, severity).
4. If P0>0, operator follows the runbook: triage, decide on repair, run `cf:orphan-audit repair --from-report <path> --confirm` with the repair token.
5. Tool prints a before/after diff and writes an audit row.

## Report surface states

The report (stdout + JSON file) must clearly distinguish:

| State | Meaning | Display |
|---|---|---|
| Clean | 0 orphans in all classes | green summary, exit 0 |
| Warning | orphans only in P2 classes | yellow summary, exit 0 (configurable) |
| Critical | ≥1 P0/P1 orphan | red summary, exit non-zero |
| Partial | upstream/R2 error caused a gap | grey "incomplete" banner, list of skipped classes, exit non-zero |
| Read-only-violated | detection attempted a write (should never happen) | hard error, abort |

## Loading / progress states

- Long-running R2 reconciliation must print paginated progress (`scanned N keys across M pages, estimated cost $X`) so the operator can Ctrl-C if a cap is breached.
- No spinner-only states: always emit periodic line progress for a long scan (operators run this headless/CI).

## Empty / error / degraded states

- Empty D1 (fresh preview): report says "0 rows scanned per table" explicitly, not silent.
- Missing binding (`ARCH_UPLOADS_R2`/`ARCH_DB` absent): hard error with the exact env var name.
- Hosted readback unavailable (e.g., `PRAGMA foreign_keys` readback path differs): report field `fk_enforcement: unknown` with a documented reason; does not block the rest of the audit.

## Accessibility (operator-facing text)

- All output is plain text / JSON — no color-only signaling. Severity is conveyed by both a text label (`CRITICAL`/`WARNING`/`CLEAN`) and exit code, not color alone (non-color cue requirement).
- JSON report is machine-parseable; stdout summary is human-readable and uses stable field names.
- No interactive prompts in detection mode (CI-safe). Repair mode may prompt for confirmation only when run without `--confirm`.

## Keyboard / focus

N/A — CLI/script surface. The only "focus" concern is that repair confirmation is reachable via a flag (`--confirm`) for non-interactive runs, and that an interactive prompt (if used) reads from stdin safely.

## Responsive / localization

N/A — operator tool, English-only output, no responsive layout.

## UX regressions to avoid

- Do not introduce a customer-visible UI as part of this work (scope creep; the audit is operator-only).
- Do not change any existing workshop UI.

## Reduced-motion / animation

N/A (no UI animation).

## Design-system reuse

No new UI primitives. The report is JSON + plain text. If a future operator dashboard is desired, it should reuse `src/components/ui/` primitives — but that is out of scope for this pack.

## Copy and content hierarchy

Report JSON field order (stable, documented):
1. `schema_version`
2. `generated_at` (ISO, UTC)
3. `target` (`local` | `preview` | `production`)
4. `fk_enforcement` (`on` | `off` | `unknown`)
5. `summary` per class: `{class, table, orphan_count, severity, legal_hold_excluded}`
6. `samples` (redacted, capped at N per class)
7. `r2_reconciliation` (`r2_only_count`, `d1_only_count`, `matched_count`, `list_calls`, `estimated_cost_usd`)
8. `gaps` (classes skipped and why)

## Confirmation behavior for destructive actions

Repair is the only destructive action. It requires (1) a prior dry-run report file, (2) `--confirm`, (3) the repair token. The before/after diff is the "undo awareness" surface — repair itself is not undoable, so the diff + audit row are the accountability layer.

## User-facing documentation implications

- Runbook lives in `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`.
- A short "how to read the report" section is included there.
- No end-user docs change (no end-user surface).

## Visual QA / browser proof

**Intentionally skipped.** Per AGENTS.md verification policy and the Codex App speed guardrail: the claim "the report is readable and redacted" is provable by static review of the report formatter + the redaction regex test (TEST-003). There is no browser-only claim here. Browser proof is reported as intentionally skipped.
