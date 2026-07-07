# 05 — UX, UI & Accessibility Plan

The launch gate has **no application UI**. Its "user experience" is the **owner-facing report** (Markdown + stdout JSON) and the **operator CLI**. This plan covers both surfaces proportionally. No browser proof is required (no browser-only behavior).

## §1. Primary user journeys

### Journey A — Owner go/no-go decision (primary)
- **Actor:** Philip (owner).
- **Goal:** Determine whether Archestimator is ready for first users.
- **Steps:** (1) run `bun run launch:gate --full` (or read the latest report); (2) read the banner; (3) if CONDITIONAL/NO-GO, read the remaining-work list; (4) act on owner-owned items; (5) re-run.
- **States:** loading (gate running), success (GO), partial (CONDITIONAL), blocked (NO-GO), error (gate-error).

### Journey B — Executor/CI consumption
- **Actor:** CI job or implementation agent.
- **Goal:** Machine-readable status + exit code.
- **Steps:** run gate, parse stdout JSON, branch on `status`/exit code.

### Journey C — Operator staged proof
- **Actor:** Operator with Cloudflare auth.
- **Goal:** Run provider/hosted stages.
- **Steps:** `--with-provider` → review; `--with-hosted` → review; `--full` → owner signoff.

## §2. Report UX states (the Markdown surface)

| State | Banner | Body |
|---|---|---|
| GO | `# 🟢 GO — IMPLEMENTATION-READY` | Summary counts; "no remaining work" |
| CONDITIONAL | `# 🟡 CONDITIONAL — CONDITIONALLY READY` | Summary + remaining-work list with owners |
| NO-GO | `# 🔴 NO-GO — NOT READY` | Summary + blockers list with fix actions |
| gate-error | `# ⚠️ GATE ERROR` | Diagnostic; exit 1 |

**Loading state:** stdout prints `{"status":"running",...}` then final JSON (matching anchor convention of single-object stdout).

## §3. Accessibility (operator CLI + Markdown report)

- **Markdown report:** uses semantic heading hierarchy (H1 banner, H2 sections, table for domains). Color is **not** the only status cue — each banner has a text label (GO/CONDITIONAL/NO-GO) and emoji are supplemental (the text label carries meaning).
- **CLI:** exit codes are machine-readable; stdout JSON is parseable; stderr for human diagnostics.
- **Color-contrast:** the Markdown renders in GitHub/any MD viewer; no custom color beyond emoji (which are supplemental).
- **Non-color cues:** explicit pass/advisory/blocker text labels per domain row.

No keyboard/focus/screen-reader testing needed (no interactive UI). If a future web dashboard is added, a full a11y pass would be required — out of scope here.

## §4. Information hierarchy (Markdown report)

1. Banner (status).
2. One-line plain-language summary.
3. Summary counts table.
4. Hard blockers (if any) — top of body, actionable.
5. Advisory warnings — below blockers.
6. Missing/stale evidence — below advisory.
7. Conflicts (if any).
8. Evidence-class legend.
9. "How was this derived" note (read-only; no provider proof from local checks).
10. Report metadata (generatedAt, mode, schemaVersion).

## §5. Copy & content

- Plain language for the owner: "Closed beta is **NO-GO** because legal-owner signoff is missing (DOM-05). Action: set LEGAL_OWNER_TERMS_CONFIRMED=1 ... and re-run launch:check-legal-owner."
- No jargon without a one-line gloss.
- Remaining-work items always pair an **action** with an **owner**.

## §6. UX regressions to avoid

- A wall-of-text report the owner cannot parse (mitigation: banner + actionable remaining-work).
- Status hidden below the fold (mitigation: banner is line 1).
- Local evidence dressed as provider proof (mitigation: evidence-class labels + the no-promotion rule FR-LG-05).

## §7. Design-system reuse

Not applicable (no `src/components/ui/` usage). The Markdown report follows the existing evidence-directory report style (matching `cf:release-gates` Markdown output).
