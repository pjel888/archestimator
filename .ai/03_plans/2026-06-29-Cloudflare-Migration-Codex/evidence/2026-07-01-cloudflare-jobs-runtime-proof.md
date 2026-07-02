# Cloudflare Jobs Runtime Proof

Generated: 2026-07-01T13:42:21.803Z
Base URL: https://archestimator.com
Endpoint: /__cloudflare/jobs-proof
Provider backed: yes
Response status: 200
Secret input present: yes
Secret input source: process.env

Calls the deployed proof Worker jobs-proof endpoint with a local bearer secret, then records sanitized Queue send, consumer receipt, queue latency, and scheduled dry-run execution evidence. It does not print secret values, change DNS, delete resources, disable Vercel fallback, or make production cutover ready.

## Summary

| Gate | Ready |
| --- | --- |
| Queue provider send | yes |
| Queue consumer receipt | yes |
| Cron dry-run provider execution | yes |
| Production jobs messaging | yes |
| Production cutover | no |

## Sanitized Results

- Proof id: 132091fd-6286-477e-bfe7-07cc6b56c8e4
- Queue: archestimator-upload-jobs
- Receipt key: provider-proof/jobs/132091fd-6286-477e-bfe7-07cc6b56c8e4.json
- Consumer action: ack
- Consumer reason: executed
- Consumer attempts: 1
- Executed count: 1
- Skipped count: 0
- Consumer error: (none)
- Queue latency sample count: 1
- Queue latency p95: 33537 ms
- Latest queue requested at: 2026-07-01T13:41:45.619Z
- Latest queue receipt generated at: 2026-07-01T13:42:19.156Z
- Queue latency samples ms: 33537

## Blockers

- (none)
