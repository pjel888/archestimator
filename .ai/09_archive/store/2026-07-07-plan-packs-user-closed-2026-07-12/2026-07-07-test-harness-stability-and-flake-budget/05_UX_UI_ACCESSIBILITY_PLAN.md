# 05 — UX, UI, and Accessibility Plan (developer-experience surface)

> This pack does not change any user-facing UI. The "UX" of this work is the
> **developer experience (DX)** of running, reading, and trusting the test
> harness. Accessibility applies to the harness *output* (report readability,
> non-color cues in terminal output). Per the planning prompt's docs-only QA
> note, dynamic adversarial QA of a UI is not applicable to the planning task;
> the future implementation's adversarial matrix is in `19`.

## Primary developer journeys

| Journey | Today | Target |
|---|---|---|
| "Run the full suite locally" | `bun run validate` (~minutes, opaque) | same command + optional `flakewatch` for timing/flake detail |
| "Did my change slow tests down?" | unknowable (no per-file timing) | `flakewatch-report` before/after diff |
| "Is this test flaky or am I?" | rerun by hand, guess | N-run scan + quarantine ledger answer it |
| "What's the flake budget?" | undocumented | owner-thresholds table (`13`/`15`) |
| "What's slow?" | `vitest.config.ts` comment mentions 525s | measured per-file p95 ranking |

## Harness output states (DX)

- **Loading/running:** vitest default reporter (adequate). `flakewatch` should
  emit a progress line per run (`run k/N …`) so long N-run scans are observable.
- **Success:** green + wall-clock + (optional) JSON path. No regression vs
  budget.
- **Flake detected:** distinct exit code or report row; **non-color cue**
  (label `[FLAKE]`, not only red text) so it is readable in colorblind/minimal
  terminals and in CI logs.
- **Quarantine:** ledger entry referenced in the report; coverage-neutral note.
- **Error (compile/config):** unchanged vitest error output.
- **Timeout:** vitest timeout message + the file's measured p95 context.

## Accessibility of harness output

- Reports (terminal + JSON) must not rely on color alone for pass/fail/flake
  status (label + symbol + color).
- JSON schema must be stable and documented so screen-reader/CI tooling can
  parse it.
- No new browser UI is introduced by this pack.

## Design-system reuse

- Not applicable (no UI components added). The pack defers to existing terminal
  output conventions; if a future dashboard is desired, it belongs in a sibling
  pack, not here.

## Responsive / motion

- Not applicable (terminal/report output only).

## UX regressions to avoid

- Do not make `validate` slower as a side effect of adding measurement.
- Do not make the N-run scan so slow that nobody runs it (cap N, allow
  targeted-glob scans).
- Do not add ceremony (mandatory pre-commit hooks) that slows routine iteration
  contrary to AGENTS.md's "fast, useful iteration" posture.
