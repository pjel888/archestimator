# Hosted Upload Operations Proof

Generated: 2026-07-02T04:35:18.191Z
Base URL: https://archestimator.com
Overall: PASS
Production dry-run proof ready: no

Hosted upload operations proof never records bearer secrets. Authenticated dry-run probes read cleanup/scan queues only; they do not delete storage, write cleanup audit events, download uploaded bytes, call scanner providers, or write scan results. This does not prove live scanner/CDR service execution, real alert delivery, dashboard observation, backpressure traffic, or retention-runbook completion.

| Probe | Run | Status | Duration | Cache-Control | no-store | Set-Cookie | Authenticated | Result |
| --- | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| upload-cleanup-unauthenticated-dry-run | 1 | 401 | 6260.42ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | no | PASS |
| upload-cleanup-unauthenticated-dry-run | 2 | 401 | 429.5ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | no | PASS |
| upload-cleanup-unauthenticated-dry-run | 3 | 401 | 730.86ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | no | PASS |
| upload-scan-unauthenticated-dry-run | 1 | 401 | 757.89ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | no | PASS |
| upload-scan-unauthenticated-dry-run | 2 | 401 | 775.96ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | no | PASS |
| upload-scan-unauthenticated-dry-run | 3 | 401 | 300.12ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | no | PASS |

## Remaining Gates

This proof surface does not close hosted scanner/CDR execution, observed alert delivery, hosted dashboard emission, hosted backpressure exercise, retention-runbook exercise, or body-size/memory/duration/storage-latency proof.
