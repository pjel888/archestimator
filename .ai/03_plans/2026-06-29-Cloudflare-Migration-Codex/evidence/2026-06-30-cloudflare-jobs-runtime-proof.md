# Cloudflare Jobs Runtime Proof

Generated: 2026-06-30T08:13:10.504Z
Base URL: https://archestimator-proof.philipjonlewis.workers.dev
Endpoint: /__cloudflare/jobs-proof
Provider backed: yes
Response status: 200
Secret input present: yes
Secret input source: process.env

Calls the deployed proof Worker jobs-proof endpoint with a local bearer secret, then records sanitized Queue send, consumer receipt, and scheduled dry-run execution evidence. It does not print secret values, change DNS, delete resources, disable Vercel fallback, or make production cutover ready.

## Summary

| Gate | Ready |
| --- | --- |
| Queue provider send | yes |
| Queue consumer receipt | yes |
| Cron dry-run provider execution | yes |
| Production jobs messaging | yes |
| Production cutover | no |

## Sanitized Results

- Proof id: 3fc41744-cc77-4ab1-b333-379cae7e5f80
- Queue: archestimator-upload-jobs
- Receipt key: provider-proof/jobs/3fc41744-cc77-4ab1-b333-379cae7e5f80.json
- Consumer action: ack
- Consumer reason: executed
- Consumer attempts: 1
- Executed count: 1
- Skipped count: 0
- Consumer error: (none)

## Blockers

- (none)
