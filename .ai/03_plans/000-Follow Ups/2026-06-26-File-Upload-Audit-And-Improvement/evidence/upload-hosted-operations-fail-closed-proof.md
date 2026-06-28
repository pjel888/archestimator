# Hosted Upload Operations Proof

Generated: 2026-06-28T04:08:19.371Z
Base URL: https://www.archestimator.com
Overall: PASS
Production dry-run proof ready: yes

Hosted upload operations proof never records bearer secrets. Authenticated dry-run probes read cleanup/scan queues only; they do not delete storage, write cleanup audit events, download uploaded bytes, call scanner providers, or write scan results. This does not prove live scanner/CDR service execution, real alert delivery, dashboard observation, backpressure traffic, or retention-runbook completion.

| Probe | Run | Status | Duration | Cache-Control | no-store | Set-Cookie | Authenticated | Result |
| --- | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| upload-cleanup-unauthenticated-dry-run | 1 | 401 | 5058.65ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | no | PASS |
| upload-scan-unauthenticated-dry-run | 1 | 401 | 1171.34ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | no | PASS |
| upload-cleanup-authenticated-dry-run | 1 | 200 | 1196.79ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | yes | PASS |
| upload-scan-authenticated-dry-run | 1 | 200 | 932.43ms | private, no-cache, no-store, max-age=0, must-revalidate | yes | no | yes | PASS |

## Remaining Gates

This proof surface does not close hosted scanner/CDR execution, observed alert delivery, hosted dashboard emission, hosted backpressure exercise, retention-runbook exercise, or body-size/memory/duration/storage-latency proof.
