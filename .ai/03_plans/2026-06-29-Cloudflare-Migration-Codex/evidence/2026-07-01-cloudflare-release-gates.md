# Cloudflare Release Gates

Generated: 2026-07-12T12:30:27.594Z

Aggregates existing local/sanitized Cloudflare migration evidence only. It does not call Cloudflare APIs, read env files, print secrets, deploy Workers, change DNS, purchase plans, cancel subscriptions, delete resources, or mutate external providers.

## Summary

| Gate | Ready |
| --- | --- |
| Planning inputs ready | no |
| Local runtime proof ready | no |
| Provider dashboard inventory ready | no |
| Provider proof ready | no |
| Cost/performance proof ready | no |
| D1/Auth/Realtime proof ready | no |
| Observability/support proof ready | no |
| Local release-gate report ready | no |
| Production cutover ready | no |

## Checks

| Scope | Check | Result | Evidence | Blocker |
| --- | --- | --- | --- | --- |
| planning | Migration inventory refreshed | FAIL | source=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-migration-inventory.json, present=no | Required Cloudflare migration evidence artifact is missing. |
| planning | Official Cloudflare pricing refreshed | FAIL | source=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-official-pricing-snapshot.json, present=no | Required Cloudflare migration evidence artifact is missing. |
| planning | Local cost/performance workbook scaffold generated | FAIL | source=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-cost-performance-workbook.json, present=no | Required Cloudflare migration evidence artifact is missing. |
| data-auth-realtime | D1/Auth/Realtime local redesign readiness report generated | FAIL | source=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-d1-auth-realtime-readiness.json, present=no | Required Cloudflare migration evidence artifact is missing. |
| data-auth-realtime | D1/Auth/Realtime production proof ready | FAIL | source=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-d1-auth-realtime-readiness.json, present=no | Required Cloudflare migration evidence artifact is missing. |
| local-runtime | Worker manifest and local preview controls ready | FAIL | source=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-worker-readiness.json, present=no | Required Cloudflare migration evidence artifact is missing. |
| local-runtime | Local Worker route probe passed | FAIL | source=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-29-cloudflare-worker-preview-route-probe.json, present=no | Required Cloudflare migration evidence artifact is missing. |
| provider | Hosted Worker route matrix proof captured | FAIL | source=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-hosted-route-proof.json, present=no | Required Cloudflare migration evidence artifact is missing. |
| local-runtime | Cloudflare platform toolchain snapshot ready | FAIL | source=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-platform-toolchain.json, present=no | Required Cloudflare migration evidence artifact is missing. |
| provider | Wrangler/API auth readback ready | FAIL | source=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-wrangler-auth.json, present=no | Required Cloudflare migration evidence artifact is missing. |
| provider | Provider resource readback ready | FAIL | source=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-provider-resource-readback.json, present=no | Required Cloudflare migration evidence artifact is missing. |
| local-runtime | Wrangler deploy dry-run ready | FAIL | source=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-wrangler-deploy-dry-run.json, present=no | Required Cloudflare migration evidence artifact is missing. |
| local-runtime | Queues/Cron local retry and DLQ proof ready | FAIL | source=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-queues-cron-proof.json, present=no | Required Cloudflare migration evidence artifact is missing. |
| provider | Provider dashboard inventory captured | FAIL | source=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-provider-readiness.json, present=no | Required Cloudflare migration evidence artifact is missing. |
| cost-performance | Current provider cost inputs captured | FAIL | source=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-cost-performance-workbook.json, present=no | Required Cloudflare migration evidence artifact is missing. |
| cost-performance | Cloudflare usage cost inputs captured | FAIL | source=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-cost-performance-workbook.json, present=no | Required Cloudflare migration evidence artifact is missing. |
| cost-performance | Hosted Cloudflare performance proof captured | FAIL | source=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-cost-performance-workbook.json, present=no | Required Cloudflare migration evidence artifact is missing. |
| cost-performance | Production cost decision ready | FAIL | source=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-cost-performance-workbook.json, present=no | Required Cloudflare migration evidence artifact is missing. |
| observability-support | Agent debugging local snapshot ready | PASS | localReady=yes, logExists=yes, parsedRecords=1389, malformedLines=0, latestOrigin=runtime, latestFreshness=fresh, errorHandlingPassed=yes, errorHandlingViolations=0 |  |
| observability-support | Agent debugging production gate ready | FAIL | productionReady=no, failures=hostedProofEnv, operationalIncidentAlerting, hostedProofArtifacts, supportMonitoring, operationalIncidents=yes, alertCatalog=yes, alertProducer=yes, hostedProofEnv=no, incidentAlerting=no, hostedProof=no, supportMonitoring=no | Agent debugging production gate is red: hostedProofEnv, operationalIncidentAlerting, hostedProofArtifacts, supportMonitoring. Run `AGENT_DEBUG_SNAPSHOT_REQUIRE_PRODUCTION=1 OUTPUT_FILE=.ai/99_scratch/agent-debugging-snapshot-current.json bun run ops:agent-debug-snapshot` and resolve the reported readinessGates.production failures. |
| observability-support | Hosted observability proof bundle ready | FAIL | productionObservabilityReady=no, required=7, passed=0, failed=0, missing=7, invalid=0, failedRequirements=workersLogsQuery, uptimeAlertDelivery, errorRateAlertDelivery, queueDlqAlertDelivery, cronFailureAlertDelivery, incidentEscalationDelivery, retentionFailureAlertDelivery | Hosted observability proof is incomplete: workersLogsQuery, uptimeAlertDelivery, errorRateAlertDelivery, queueDlqAlertDelivery, cronFailureAlertDelivery, incidentEscalationDelivery, retentionFailureAlertDelivery. Run `bun run ops:observability-drill`, then collect Workers Logs and alert-delivery proof artifacts before rerunning `bun run ops:check-observability`. |
| observability-support | Hosted observability proof route ready | PASS | routeStatus=auth-enforced, httpStatus=401, routeReachable=yes, authorizationEnforced=yes, readyForWorkersLogsProof=yes |  |
| observability-support | Support monitoring readiness ready | FAIL | supportMonitoringReady=no, passed=0, missing=11, failed=0, openRequirements=supportInboxMonitoring, feedbackReview, uptimeAlertDelivery, errorAlertDelivery, incidentEscalationPath, supportOwnerLabel, alertOwnerLabel, first24HourReviewOwnerLabel, first72HourReviewOwnerLabel, operationalIncidentStatusArtifact, productionObservabilityProofArtifact | Support monitoring readiness is incomplete: supportInboxMonitoring, feedbackReview, uptimeAlertDelivery, errorAlertDelivery, incidentEscalationPath, supportOwnerLabel, alertOwnerLabel, first24HourReviewOwnerLabel, first72HourReviewOwnerLabel, operationalIncidentStatusArtifact, productionObservabilityProofArtifact. Run `OUTPUT_FILE=.ai/99_scratch/support-monitoring-readiness-current.json bun run launch:check-support-monitoring` with the required support owners, confirmations, incident status, and observability proof artifacts. |
| local-runtime | Beta operating local readiness receipt current | FAIL | source=.ai/99_scratch/beta-operating-readiness-current.json, present=no | Required release evidence artifact is missing. |

## Blockers

- Migration inventory refreshed: Required Cloudflare migration evidence artifact is missing.
- Official Cloudflare pricing refreshed: Required Cloudflare migration evidence artifact is missing.
- Local cost/performance workbook scaffold generated: Required Cloudflare migration evidence artifact is missing.
- D1/Auth/Realtime local redesign readiness report generated: Required Cloudflare migration evidence artifact is missing.
- D1/Auth/Realtime production proof ready: Required Cloudflare migration evidence artifact is missing.
- Worker manifest and local preview controls ready: Required Cloudflare migration evidence artifact is missing.
- Local Worker route probe passed: Required Cloudflare migration evidence artifact is missing.
- Hosted Worker route matrix proof captured: Required Cloudflare migration evidence artifact is missing.
- Cloudflare platform toolchain snapshot ready: Required Cloudflare migration evidence artifact is missing.
- Wrangler/API auth readback ready: Required Cloudflare migration evidence artifact is missing.
- Provider resource readback ready: Required Cloudflare migration evidence artifact is missing.
- Wrangler deploy dry-run ready: Required Cloudflare migration evidence artifact is missing.
- Queues/Cron local retry and DLQ proof ready: Required Cloudflare migration evidence artifact is missing.
- Provider dashboard inventory captured: Required Cloudflare migration evidence artifact is missing.
- Current provider cost inputs captured: Required Cloudflare migration evidence artifact is missing.
- Cloudflare usage cost inputs captured: Required Cloudflare migration evidence artifact is missing.
- Hosted Cloudflare performance proof captured: Required Cloudflare migration evidence artifact is missing.
- Production cost decision ready: Required Cloudflare migration evidence artifact is missing.
- Agent debugging production gate ready: Agent debugging production gate is red: hostedProofEnv, operationalIncidentAlerting, hostedProofArtifacts, supportMonitoring. Run `AGENT_DEBUG_SNAPSHOT_REQUIRE_PRODUCTION=1 OUTPUT_FILE=.ai/99_scratch/agent-debugging-snapshot-current.json bun run ops:agent-debug-snapshot` and resolve the reported readinessGates.production failures.
- Hosted observability proof bundle ready: Hosted observability proof is incomplete: workersLogsQuery, uptimeAlertDelivery, errorRateAlertDelivery, queueDlqAlertDelivery, cronFailureAlertDelivery, incidentEscalationDelivery, retentionFailureAlertDelivery. Run `bun run ops:observability-drill`, then collect Workers Logs and alert-delivery proof artifacts before rerunning `bun run ops:check-observability`.
- Support monitoring readiness ready: Support monitoring readiness is incomplete: supportInboxMonitoring, feedbackReview, uptimeAlertDelivery, errorAlertDelivery, incidentEscalationPath, supportOwnerLabel, alertOwnerLabel, first24HourReviewOwnerLabel, first72HourReviewOwnerLabel, operationalIncidentStatusArtifact, productionObservabilityProofArtifact. Run `OUTPUT_FILE=.ai/99_scratch/support-monitoring-readiness-current.json bun run launch:check-support-monitoring` with the required support owners, confirmations, incident status, and observability proof artifacts.
- Beta operating local readiness receipt current: Required release evidence artifact is missing.
