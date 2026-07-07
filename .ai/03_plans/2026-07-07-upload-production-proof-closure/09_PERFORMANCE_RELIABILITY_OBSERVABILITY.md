# 09 — Performance, Reliability, and Observability

## Performance (of the proof pipeline, not the upload runtime)

The proof pipeline is operator-run, not user-facing, so Core Web Vitals and route
budgets do not apply. The relevant performance contract is bounded *producer*
execution time and bounded *bundle gate* execution time.

### Performance evaluator contract (per suite rule)

| Metric | Baseline | Target | Measurement | Fixture | Runs | Regression threshold | Evidence |
|---|---|---|---|---|---|---|---|
| Bundle gate wall time | <2s (local file I/O, 8 small JSONs) | <2s | `time bun run scripts/check-upload-production-proof-evidence.ts` | the 8 artifacts | 1 (deterministic) | >5s = investigate | terminal output |
| Hosted ops producer | <30s (fail-closed + 1 authed dry-run each for cleanup+scan) | <30s | producer stdout timing | n/a (live route) | 1 | >60s = network issue | artifact + stdout |
| Hosted runtime producer | <20s | <20s | producer stdout | n/a | 1 | >45s = investigate | artifact + stdout |
| Live ClamD producer | <10s (two fixture scans) | <10s | producer stdout | generated clean + EICAR | 1 | clamd timeout (5s default) | artifact |
| Alert delivery producer | <10s (one POST) | <10s | producer stdout | sanitized alert | 1 | webhook timeout | artifact |
| Observations producer | <1s | <1s | producer stdout | operator JSON | 1 | n/a | 3 artifacts |

These are the declared evaluators. Passing ordinary unit tests is not the
performance gate for the pipeline; the producer run + bundle gate run is.

### Upload runtime budgets (recorded by PROOF-REQ-003, not changed by this pack)

The hosted runtime gate verifies these are *present* in the deployed Worker
(they are read from `wrangler.jsonc` vars by the runtime route):
- `ARCH_UPLOAD_HOSTED_MEMORY_MB=128`
- `ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES=4194304` (4 MiB)
- `ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS=30000`
- `ARCH_UPLOAD_HOSTED_CONCURRENT_UPLOADS=3`
- `ARCH_UPLOAD_STORAGE_LATENCY_P95_MS=250`

PROOF-REQ-003 fails if these configured facts are absent. It does not measure
them; it asserts their presence. (Measurement of real p95 storage latency is a
separate concern owned by the adjacent `verify-cloudflare-hosted-upload-lifecycle-proof.ts`
and `verify-cloudflare-d1-runtime-performance-proof.ts`, not by the 8-gate bundle.)

## Reliability

### Failure modes (producer-side)

| Producer | Failure mode | Detection | Recovery |
|---|---|---|---|
| Hosted ops/runtime | route not deployed / wrong alias | `hostedProofRoutesObservedDeployed=false` or non-200 | re-deploy or fix alias; re-run |
| Hosted ops/runtime | secret missing | `missingAuthenticatedProbeSecrets` non-empty | set secret env; re-run |
| Live ClamD | service unreachable | producer error, `skipped` artifact | bring service up; re-run with opt-in |
| Live ClamD | wrong provider (`UPLOAD_SCAN_PROVIDER!=clamd`) | `proofBoundary="live-clamd-proof-refused"` | set provider; re-run |
| Alert delivery | webhook non-2xx | `delivery.delivered=false` | fix endpoint; re-run |
| Observations | sanitizer rejects input | `pathSafe=false` / `secretRedacted=false` | re-author input without forbidden strings |
| Bundle gate | artifact missing | status `missing` | run the producer |
| Bundle gate | artifact wrong schema | status `failed`/`invalid` | inspect `failedChecks`; re-produce |

### Retry / idempotency
- Dry-run probes are idempotent (no state mutation).
- The alert delivery producer sends one POST per run; it is one-shot, not retried
  internally. An executor re-runs the producer after a transient failure.
- The backpressure exercise is one-shot to the threshold; over-driving beyond it
  is explicitly out of scope.

### Graceful degradation
- A fail-closed/skipped artifact is the *correct* degraded state. The bundle
  reports `productionProofReady=false` and the release gate blocks. This is the
  system failing safe.

## Observability (what the proof artifacts themselves observe)

The pack's observability is *meta*: it observes whether the upload system's own
observability works.

| Proof | Upload-system observability it validates |
|---|---|
| PROOF-REQ-005 (alert delivery) | `sendUploadOperationalAlert` reaches the webhook |
| PROOF-REQ-006 (dashboard) | `readUploadOperationsDashboardSnapshot` surfaces cleanup/scan/backpressure metrics |
| PROOF-REQ-007 (backpressure) | `reportUploadAdmissionRejected` telemetry fires on 429 |
| PROOF-REQ-008 (retention runbook) | cron → queue → route → audit event → dashboard → alert chain is observable end-to-end |

### Cloudflare-native observability (unchanged)
`wrangler.jsonc` `observability.enabled=true`, head sampling logs 0.1 / traces
0.05, invocation logs + persist on. Producer-proof receipts written to
`provider-proof/jobs/*.json` in R2 by the queue worker. This pack changes none
of this; it only proves the upload-relevant subset is wired.

### Metrics / alerts / dashboards / runbooks
- **Metrics:** upload telemetry events (5 named in `03`). Proven observable via
  PROOF-REQ-006/007/008.
- **Alerts:** `sendUploadOperationalAlert` for `warning|critical` severity.
  Proven delivered via PROOF-REQ-005.
- **Dashboard:** operations dashboard page. Proven observable via PROOF-REQ-006.
- **Runbook:** the production retention runbook. Proven exercisable via
  PROOF-REQ-008.

## Rollback / recovery
- No code change → no code rollback.
- A bad artifact is overwritten by re-running its producer.
- A false-positive closure (bundle green on bad evidence) is recovered by
  deleting/invalidating the offending artifact and re-running the gate; the
  release gate re-blocks.
- The worst-case failure mode is "bundle green but a real upload operation is
  broken" — mitigated by the independent-reviewer sign-off in Phase 3.
