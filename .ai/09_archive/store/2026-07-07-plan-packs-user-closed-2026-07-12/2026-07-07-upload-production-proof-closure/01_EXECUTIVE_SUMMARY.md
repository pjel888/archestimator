# 01 — Executive Summary

## Recommendation

Treat upload production-readiness closure as a **fail-closed evidence bundle**
problem, not a code problem. The application already implements every behavior
the bundle checks for; what is missing is *evidence of hosted/live operation*,
collected safely, sanitized, and verifiable by the bundle gate
`scripts/check-upload-production-proof-evidence.ts`.

Execute in three tracks, all operator-level (no code):

1. Repair two operational hazards that break every documented command.
2. Re-confirm the three already-passing gates under corrected paths.
3. Collect the five live/hosted gates as independent fail-closed evidence tracks.

## Current posture

**Bundle gate result (last committed check, re-confirmable):** 3/8 passed,
`productionProofReady=false`.

| Gate | Status | Why |
|---|---|---|
| `deploymentReadback` | ✅ Real passed | Production deployment READY, aliased to `www.archestimator.com`, hosted proof routes observed deployed, fail-closed 401 on unauthenticated probes. |
| `hostedUploadOperations` | ✅ Passed (stored under `-fail-closed-proof.json`) | Authenticated hosted dry-run for both cleanup and scan routes; `authenticatedDryRunKinds=[cleanup,scan]`. |
| `hostedUploadRuntime` | ✅ Passed (stored under `-fail-closed-proof.json`) | Authenticated hosted body + concurrency probes; configured limit facts present. |
| `liveScanner` | ⏸ Skipped | `ARCH_UPLOAD_CLAMD_LIVE_PROOF` not set; needs a real ClamD service scanning clean + EICAR fixtures. |
| `alertDelivery` | ⏸ Skipped | `ARCH_UPLOAD_ALERT_DELIVERY_PROOF` not set; needs observed 2xx webhook delivery of a sanitized alert. |
| `dashboardObservation` | ⏸ Skipped | No observation input loaded; needs operator observation of the hosted operations dashboard. |
| `hostedBackpressure` | ⏸ Skipped | No hosted 429 exercise observed; needs a real `429 + Retry-After + telemetry` observation. |
| `retentionRunbook` | ⏸ Skipped | Needs hosted cron + cleanup retry + dashboard + alert observation from the production runbook. |

### What is already strong

- The bundle gate is content-validated, not filename-validated: each artifact is
  checked against a strict schema of `mode` + `proofBoundary` + `passed` +
  domain-specific fields. A stale or local-only artifact cannot fool it.
- Five of the eight producer scripts are already wired into `package.json`
  (`cf:verify-hosted-upload-runtime/operations/lifecycle/ui`, `cf:jobs-proof`,
  `cf:queues-cron-proof`).
- The hosted operations and runtime gates already pass on a real authenticated
  dry-run — the upload job routes exist, respond, fail-closed without a secret,
  and dry-run correctly with one.
- Every producer script that can leak path/secret/customer data has a built-in
  sanitizer (`pathSafeInput` in `verify-upload-production-observations.ts`;
  `secretRedacted`/`payloadPathSafe` in the alert verifier; `noRawStoragePaths`
  in the runbook verifier).

### What blocks production readiness

- **5 of 8 gates** require hosted, live-scanner, or operator-observed action that
  cannot be produced from a local/planning session.
- **Evidence-directory drift** (Hazard H1): scripts default to a non-existent
  path; artifacts physically live under `000-Follow Ups/`.
- **Missing `package.json` wiring** (Hazard H2): the bundle gate and the
  observation builder are not registered as scripts.
- **Filename/boundary naming drift** (Hazard H3): two passing artifacts carry
  `-fail-closed-proof.json` names; the runbook names the non-fail-closed name.

## Target architecture (evidence pipeline, not runtime)

```
[Hosted/live environment]
   ├── deployment readback (read-only inspection) ──┐
   ├── hosted operations dry-run (authenticated)  ──┤
   ├── hosted runtime dry-run (authenticated)     ──┤
   ├── live ClamD scan (clean + EICAR)            ──┤
   ├── alert webhook delivery (sanitized)         ──┤──► [sanitized JSON artifacts]
   ├── dashboard observation (operator)           ──┤        in evidence/
   ├── backpressure exercise (429 + Retry-After)  ──┤
   └── retention runbook exercise (cron+retry)    ──┘
                                                        │
                                                        ▼
                                  scripts/check-upload-production-proof-evidence.ts
                                                        │
                                                        ▼
                                  productionProofReady=true (8/8 passed)
                                                        │
                                                        ▼
                                  feeds cf:release-gates / upload-release-gates.json
```

## Production-readiness bar (non-negotiables)

1. **No synthetic proof.** Every artifact must carry a `proofBoundary` string
   whose value proves hosted/live origin. Local, preview, fixture, stale, or
   no-secret-404 evidence is explicitly rejected by the schema.
2. **No secrets, paths, or customer data in artifacts.** Each producer script
   enforces this; the plan restates the sanitizer rules so an executor can audit.
3. **Bundle gate is the single source of truth.** Individual artifact passes are
   necessary but not sufficient; `productionProofReady` requires all 8.
4. **Closure ≠ enablement.** Reaching `productionProofReady=true` does not enable
   production uploads; it proves the upload *operations surface* is observable,
   safe, and retention-ready. Enabling uploads is a separate owner decision.

## Implementation shape

- **Phase 0** — Repair H1 (dir override convention) + H2 (invocation convention)
  + H3 (filename documentation). Operator-level, no code. *Prerequisite for all later phases.*
- **Phase 1** — Re-confirm deployment readback, hosted operations, hosted runtime
  under corrected paths so the bundle no longer relies on the filename fallback.
- **Phase 2** — Five parallel-safe evidence tracks: live scanner, alert delivery,
  dashboard observation, backpressure exercise, retention runbook.
- **Phase 3** — Bundle verification, launch-gate integration, sign-off.

## Stop condition for future implementation

The closure is complete when:
- `scripts/check-upload-production-proof-evidence.ts` reports `passed=true,
  productionProofReady=true` (8/8) against artifacts in the real evidence dir.
- Each of the 8 artifacts carries a hosted/live `proofBoundary`.
- The result feeds `upload-release-gates.json` and `cf:release-gates` without
  residual blockers on the upload dimension.
- An owner has signed off the bundle result (independent of this planning pack).
