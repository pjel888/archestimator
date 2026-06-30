# Cloudflare Queues/Cron Local Proof

Generated: 2026-06-30T00:06:43.316Z

Local Cloudflare Queues/Cron proof only. It validates wrangler queue/DLQ config, Worker queue() wiring, local enqueue, ack, retry, duplicate-idempotency, and poison-message handling without calling Cloudflare APIs, creating queues, reading secrets, deploying Workers, proving provider execution, changing DNS, billing, or replacing the live Vercel cron fallback.

## Readiness

| Gate | Ready |
| --- | --- |
| localQueueConfigReady | yes |
| workerQueueHandlerReady | yes |
| localQueueProducerReady | yes |
| localConsumerAckReady | yes |
| localRetryReady | yes |
| localDeadLetterDecisionReady | yes |
| localDuplicateDeliveryReady | yes |
| localPoisonMessageReady | yes |
| localQueuesCronProofReady | yes |
| providerBacked | no |
| productionJobsMessagingReady | no |

## Queue Config

| Check | Value |
| --- | --- |
| Producer binding | UPLOAD_JOBS_QUEUE |
| Producer queue | archestimator-upload-jobs |
| Consumer queue | archestimator-upload-jobs |
| Consumer max retries | 3 |
| Dead-letter queue | archestimator-upload-jobs-dlq |

## Local Simulation

| Metric | Value |
| --- | ---: |
| Enqueued messages | 1 |
| Acked messages | 3 |
| Retried messages | 1 |
| Duplicate acked | 1 |
| Invalid acked | 1 |
| DLQ expected | 1 |

| Message | Job | Action | Reason | Attempts | DLQ expected |
| --- | --- | --- | --- | ---: | --- |
| cleanup-success | upload-cleanup | ack | executed | 1 | no |
| cleanup-duplicate | upload-cleanup | ack | duplicate | 2 | no |
| scan-failure-final-attempt | upload-scan | retry | job-failed | 3 | yes |
| invalid-poison | unknown | ack | invalid-message | 1 | no |

## Blockers

- Cloudflare provider-backed Cron/Queues/DLQ execution evidence is still missing.
