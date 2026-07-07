# 16 — Requirements Traceability Matrix

| Requirement ID | Source | User outcome | Implementation phase | Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|---|
| PROOF-REQ-001 | `check-upload-production-proof-evidence.ts` `validateDeploymentReadback` | fresh deployment readback | P1 | P1-1 | (readback producer; read-only) | `04` PROOF-REQ-001 fields | bundle gate | release gate upload dim | passing (re-confirm) |
| PROOF-REQ-002 | `verify-hosted-upload-operations.ts` + `validateHostedUploadOperations` | hosted cleanup+scan dry-run | P1 | P1-2 | `src/app/api/internal/upload-{cleanup,scan}/route.ts` (read-only) | `04` fields | producer + bundle | release gate | passing (filename drift H3) |
| PROOF-REQ-003 | `verify-hosted-upload-runtime.ts` + `validateHostedUploadRuntime` | hosted runtime limit facts | P1 | P1-3 | `src/app/api/internal/upload-runtime/route.ts` (read-only) | `04` fields | producer + bundle | release gate | passing (filename drift H3) |
| PROOF-REQ-004 | `prove-upload-clamd-live.ts` + `validateLiveScanner` | real clamd clean/EICAR | P2 | P2-1 | `src/lib/uploads/clamd-scanner.ts` (read-only) | `04` fields | producer + bundle | release gate | skipped (external) |
| PROOF-REQ-005 | `verify-upload-alert-delivery.ts` + `validateAlertDelivery` | alert webhook 2xx redacted | P2 | P2-2 | `src/lib/uploads/operational-telemetry.ts` (read-only) | `04` fields | producer + bundle | release gate | skipped (external) |
| PROOF-REQ-006 | `verify-upload-production-observations.ts` `buildDashboardReport` + `validateDashboardObservation` | dashboard metrics observed | P2 | P2-3 | `src/lib/uploads/operations-dashboard.ts` + page (read-only) | `04` fields | producer + bundle | release gate | skipped (external) |
| PROOF-REQ-007 | `verify-upload-production-observations.ts` `buildBackpressureReport` + `validateHostedBackpressure` | hosted 429+Retry-After+telemetry | P2 | P2-4 | `src/lib/uploads/admission-control.ts` (read-only) | `04` fields | producer + bundle | release gate | skipped (external) |
| PROOF-REQ-008 | `verify-upload-production-observations.ts` `buildRetentionRunbookReport` + `validateRetentionRunbook` | retention runbook chain observed | P2 | P2-5 | `src/lib/uploads/cleanup-job.ts`, `worker.ts` cron (read-only) | `04` fields | producer + bundle | release gate | skipped (external) |
| OPS-REQ-001 | `03` H1 | commands find/write artifacts | P0 | P0-1 | scripts default path (no code change) | override in every command | bundle gate finds 8 candidates | n/a | resolvable (operator) |
| OPS-REQ-002 | `03` H2 | untwired scripts invokable | P0 | P0-2 | `package.json` (no code change) | direct invocation works | producer exits clean | n/a | resolvable (operator) |
| OPS-REQ-003 | `03` H3 | filename drift documented | P0 | P0-3 | (doc only) | README item #3 matches | reviewer not misled | n/a | resolvable (doc) |
| OPS-REQ-004 | `11` Phase 3 | bundle feeds release gate | P3 | P3-2 | `scripts/check-cloudflare-release-gates.ts` (read-only) | upload dim clear | `cf:release-gates` | release gate | resolvable |

## Requirement coverage summary

- **8 PROOF requirements:** all traceable to a producer command, an evidence
  schema, a bundle-gate validator, and a release-gate dimension. 3 currently
  passing (001/002/003); 5 externally-gated (004–008).
- **4 OPS requirements:** all internally resolvable at the operator level.
- **0 requirements untraced.**
- **0 requirements without a validation method.**

## Unresolved decision gates

- OPEN-001 (collection window) — does not block planning readiness.
- OPEN-002 (code-fix timing) — does not block planning readiness.
- OPEN-003 (backpressure route) — does not block planning readiness.

## Performance-sensitive requirements mapping

| Requirement | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| PROOF-REQ-003 | n/a | configured facts present | hosted runtime artifact | facts absent | re-deploy |
| PROOF-REQ-007 | n/a | 429 within threshold | observation JSON + telemetry | no 429 | stop driving; re-attempt |

Other requirements are not performance-sensitive (boolean/observational).
