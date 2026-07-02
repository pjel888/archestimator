# Cloudflare Jobs Runtime Proof

Generated: 2026-07-01T21:57:48.508Z
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

- Proof id: 9868f10f-3ab5-4e86-aeb9-d7259e2f497c
- Queue: archestimator-upload-jobs
- Receipt key: provider-proof/jobs/9868f10f-3ab5-4e86-aeb9-d7259e2f497c.json
- Consumer action: ack
- Consumer reason: executed
- Consumer attempts: 1
- Executed count: 1
- Skipped count: 0
- Consumer error: (none)
- Queue latency sample count: 1
- Queue latency p95: 33001 ms
- Latest queue requested at: 2026-07-01T21:57:12.424Z
- Latest queue receipt generated at: 2026-07-01T21:57:45.425Z
- Queue latency samples ms: 33001

## Blockers

- (none)
