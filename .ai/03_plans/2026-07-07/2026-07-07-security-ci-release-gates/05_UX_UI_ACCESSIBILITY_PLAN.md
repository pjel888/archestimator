# 05 — UX, UI, and Accessibility Plan

The "user" of this pack is a **developer reading the gate's report in a terminal or GitHub Actions log**, plus the **owner reading the launch-gate verdict**. There is no browser UI.

## Primary surfaces

### 1. `bun run security:gate` terminal report
- **Purpose:** one-glance PASS/ADVISORY/FAIL.
- **States:**
  - **PASS** (all gates green) — exit 0, green summary.
  - **ADVISORY** (some gates advisory-only) — exit 0, yellow warnings, "not blocking; see policy".
  - **FAIL** (any blocking gate red) — exit non-zero, red summary, per-gate failure reason + evidence path.
  - **SKIP** (tool unavailable) — that gate marked SKIP with reason + install hint; does not change exit code unless `SECURITY_GATE_STRICT=1`.
- **Proposed shape (pseudo, not implementation):**
  ```
  Archestimator Security Gate
  ───────────────────────────
  dependency-vuln .... PASS   (0 high, 0 critical; 2 moderate advisory)
  secret-scan ....... PASS   (0 findings)
  sbom .............. PASS   (124 deps; artifact: .open-next/sbom.cdx.json)
  coverage .......... ADVISORY (lines 61% ≥ 60% threshold; ratchet window active)
  route-smoke ....... PASS   (12/12 routes expected status)
  sast (CodeQL) ..... SKIP   (GHAS not enabled; OPEN-CI-01)
  ───────────────────────────
  Verdict: ADVISORY (non-blocking). See .ai/.../13 §2 for policy.
  Exit: 0
  ```
- **Accessibility:** plain text, no color-only signal (the word PASS/ADVISORY/FAIL accompanies any color); respects `NO_COLOR`/CI-non-tty (no ANSI codes when not a TTY). This is the a11y floor for a CLI tool.

### 2. GitHub Actions log / check run
- Each gate = a named step; the workflow's job name is `security-gates` (selectable as a required status check once branch protection exists).
- The consolidated report is uploaded as a workflow artifact (`security-gate-report-<sha>.txt`) per `09` retention.
- Failure annotations link to the relevant `13` policy row.

### 3. Launch-gate consumer (the `launch-readiness-evidence-gate` integration)
- The launch gate reads `security:gate`'s exit code + report path as the "security automation" domain evidence.
- UX there is owned by the launch-gate pack; this pack only contracts the **artifact shape**: `{ exitCode: number, reportPath: string, verdict: 'PASS'|'ADVISORY'|'FAIL', gates: [...] }`.

## UX requirements (UX-CI-*)

- **UX-CI-01:** Report is readable in < 5 seconds (summary first, details second).
- **UX-CI-02:** No color-only signaling (a11y + CI-log safety).
- **UX-CI-03:** Every FAIL includes the exact command to reproduce locally.
- **UX-CI-04:** Every SKIP includes the reason and the unblock action (e.g., "install gitleaks: see .ai/.../13 §3").
- **UX-CI-05:** Escape hatches documented in `--help` and in `13` §3.

## State matrix (CLI states)

| State | Trigger | User-visible | Exit code | Next action hint |
|---|---|---|---|---|
| PASS | all green | green summary | 0 | proceed |
| ADVISORY | advisory gates non-empty, no FAIL | yellow warnings | 0 | "not blocking; policy in 13 §2" |
| FAIL | ≥1 blocking gate red | red per-gate | non-zero | per-gate reproduce command |
| SKIP (tool) | tool binary missing | that gate SKIP | 0 (or non-zero if STRICT) | install hint |
| ERROR (gate crash) | gate threw | stack summary | non-zero | file issue / rerun |

## Accessibility (A11Y-CI-*)

- **A11Y-CI-01:** `NO_COLOR` honored; no ANSI when stdout not a TTY.
- **A11Y-CI-02:** Status conveyed by word + symbol, not color alone.
- **A11Y-CI-03:** Report is plain UTF-8 text (screen-reader friendly if piped).
- No browser surface → no keyboard/focus/contrast requirements apply (state why: this is a CLI/CI tool, not a web UI).

## Not applicable (with reason)

- Responsive layout, focus management, screen-reader navigation of a DOM, reduced-motion: **N/A** — no browser UI. The gate is a CLI tool and a CI log; a11y obligations are met by the text/color rules above.
- Localization: the report is developer-facing English; no i18n requirement pre-launch.
