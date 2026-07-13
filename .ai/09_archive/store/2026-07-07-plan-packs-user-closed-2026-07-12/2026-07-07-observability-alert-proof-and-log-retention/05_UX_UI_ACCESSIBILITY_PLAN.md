# 05 — UX / UI / Accessibility Plan

## Applicability

This plan is **operational/infra-facing**, not end-user-facing. There is **no new end-user UI**:
no new routes, no new components, no new client interactions, no mutation of the estimate/auth/
publication/collaboration user surfaces. The "users" of this plan's artifacts are:

1. **Operators/on-call** (Philip + any delegate) reading the readiness output, the alert receipts,
   and the incident runbook.
2. **The implementation AI** consuming the plan docs and the runbook.

Therefore the heavy UX/a11y dimensions (primary user journeys, screen states, keyboard nav, focus,
responsive layout, reduced motion) are **largely not applicable** to this plan and are marked N/A
with reason below. Where an operator-facing surface exists (the readiness JSON output, the
runbook), it is addressed.

## Operator-facing surfaces (in scope)

### O-1 — Readiness verifier output (`scripts/check-support-monitoring-readiness.ts`)
- **Current:** prints JSON to stdout; exit code 1 if not ready. Already structured + sanitized.
- **Target:** artifact-driven output with `launchReady`, `missing[]`, per-artifact `proofClass`,
  `redactionAttestation`, owner labels, SLA overrides.
- **UX bar:** the JSON is the operator's primary launch-decision surface. It must be
  self-describing: a reader who sees `launchReady:false` must be able to act on `missing[]`
  without reading the source.
- **Acceptance:** AC-GATE-01b (output includes `launchReady`/`missing`/`proofClass`).

### O-2 — Incident runbook (`13_…`)
- **Audience:** on-call operator mid-incident.
- **UX bar:** find-by-request-id, declare/escalate/close are copy-pasteable commands or scoped
  actions; severity definitions and SLAs are visible at the top; rollback trigger is unambiguous.
- **Acceptance:** AC-DOC-01.

### O-3 — Alert receipts (`.ai/99_scratch/alert-proof/*.json`)
- **Audience:** operator verifying "did the alert actually deliver."
- **UX bar:** each receipt is a small, redacted, diffable JSON; filename = scenario id.
- **Acceptance:** AC-FR-03a/c.

## N/A dimensions (with reason)

| Dimension | N/A reason |
|---|---|
| End-user journeys / navigation / information hierarchy | No end-user UI. |
| Loading/empty/success/error/disabled/offline states (end-user) | No end-user UI. |
| Confirmation/undo for destructive actions | Incident close is operator-admin, gated by authz + runbook; not an end-user destructive action. Retention purges are cron-driven DELETE with dry-run + audit; no end-user undo surface. |
| Responsive behavior / keyboard / focus / screen-reader / color contrast | No end-user UI. Operator surfaces are JSON + markdown; the runbook follows repo doc conventions. |
| Localization | No end-user copy. |

## Accessibility of operator surfaces

- The runbook is markdown — semantic headings, code blocks, tables. No images-only instructions.
- The readiness JSON is machine-readable; a human-readable summary line is emitted alongside
  (`launchReady: false — missing: [S-01 provider-backed receipt, owner labels x2]`).
- No color-only status cues in the JSON (uses explicit `proofClass`/`launchReady` booleans).

## Design-system reuse

None required — no new UI primitives. The runbook follows the repo's existing `.ai/03_plans/`
doc conventions (markdown, tables, Mermaid where it clarifies). `DESIGN.md` (alpha-stage) does not
apply to operational docs.

## Verification (proportional)

Per AGENTS.md, minor cosmetic/operational-doc changes do **not** need Playwright/browser proof.
Static review of the runbook + readiness output schema is sufficient. If a future iteration adds
an operator dashboard UI, that iteration must re-enter this section with full a11y treatment.
