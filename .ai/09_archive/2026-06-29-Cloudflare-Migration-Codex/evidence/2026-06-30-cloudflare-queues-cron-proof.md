# Cloudflare Queues/Cron Local Proof

Generated: 2026-06-30T08:13:30.192Z

Cloudflare Queues/Cron proof. It validates wrangler queue/DLQ config, Worker queue() wiring, local enqueue, ack, retry, duplicate-idempotency, poison-message handling, and, when available, a sanitized provider runtime proof without printing secrets, changing DNS, billing, or replacing the live Vercel cron fallback.

Jobs runtime proof present: yes
Jobs runtime proof generated: 2026-06-30T08:13:10.504Z

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
| providerBacked | yes |
| queueSendProviderReady | yes |
| queueConsumerReceiptReady | yes |
| cronProviderExecutionProven | yes |
| productionJobsMessagingReady | yes |

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

- (none)
