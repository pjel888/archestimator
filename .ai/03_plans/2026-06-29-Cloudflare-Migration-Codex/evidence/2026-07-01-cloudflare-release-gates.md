# Cloudflare Release Gates

Generated: 2026-07-08T09:48:17.903Z

Aggregates existing local/sanitized Cloudflare migration evidence only. It does not call Cloudflare APIs, read env files, print secrets, deploy Workers, change DNS, purchase plans, cancel subscriptions, delete resources, or mutate external providers.

## Summary

| Gate | Ready |
| --- | --- |
| Planning inputs ready | yes |
| Local runtime proof ready | yes |
| Provider dashboard inventory ready | yes |
| Provider proof ready | yes |
| Cost/performance proof ready | yes |
| D1/Auth/Realtime proof ready | yes |
| Observability/support proof ready | no |
| Local release-gate report ready | yes |
| Production cutover ready | no |

## Checks

| Scope | Check | Result | Evidence | Blocker |
| --- | --- | --- | --- | --- |
| planning | Migration inventory refreshed | PASS | routes=70, providerCoupledFiles=86, rpcNames=75, sqlMigrations=182 |  |
| planning | Official Cloudflare pricing refreshed | PASS | pricingRefreshed=yes, missingProducts=0, invalidSourceUrls=0 |  |
| planning | Local cost/performance workbook scaffold generated | PASS | pricingRefreshed=yes, localPreviewPerformanceCaptured=yes |  |
| data-auth-realtime | D1/Auth/Realtime local redesign readiness report generated | PASS | localReportReady=yes, databaseInventoryReady=yes, inventoryRpcNames=75, rlsPolicyStorageAuthMatches=684 |  |
| data-auth-realtime | D1/Auth/Realtime production proof ready | PASS | d1Binding=yes, authReplacement=yes, appLayerAuthz=yes, localRpcMechanics=yes, betaFeedbackSlice=yes, collaborationInvitationSlice=yes, closedBetaSlice=yes, componentLibrarySlice=yes, estimateHistorySlice=yes, rpcRewrite=yes, realtimeReplacement=yes, restoreProof=yes, performanceProof=yes |  |
| local-runtime | Worker manifest and local preview controls ready | PASS | manifestReady=yes, localPreviewReady=yes |  |
| local-runtime | Local Worker route probe passed | PASS | reportPassed=yes, requiredRoutes=15, failedRequired=(none) |  |
| provider | Hosted Worker route matrix proof captured | PASS | configured=yes, providerBacked=yes, routeContractReady=yes, hostedRouteProofReady=yes, requiredRoutes=15, failedRequired=(none) |  |
| local-runtime | Cloudflare platform toolchain snapshot ready | PASS | localToolchainSnapshotReady=yes, observabilityConfigured=yes, allBindingsTyped=yes |  |
| provider | Wrangler/API auth readback ready | PASS | cliAvailable=yes, authCheckCompleted=yes, wranglerApiAuthenticated=yes, providerReadbackReady=yes |  |
| provider | Provider resource readback ready | PASS | wranglerAuthenticated=yes, readbackAttempted=yes, workerDeployment=yes, d1=yes, r2=yes, queues=yes, secrets=yes |  |
| local-runtime | Wrangler deploy dry-run ready | PASS | localWranglerDryRunReady=yes, exitCode=0, noUploadMarkerSeen=yes, warnings=0, requiredBindingsReady=yes |  |
| local-runtime | Queues/Cron local retry and DLQ proof ready | PASS | queueConfig=yes, workerQueueHandler=yes, producer=yes, ack=yes, retry=yes, dlq=yes, duplicate=yes, poison=yes, providerBacked=yes, productionJobsMessaging=yes |  |
| provider | Provider dashboard inventory captured | PASS | dashboardInventoryReady=yes |  |
| provider | Hosted Worker deployment and custom domain provider-proven | PASS | workersDeploymentReady=yes, workerDeploymentSecretsReady=yes, workerDeploymentReady=yes, wranglerApiAuthenticated=yes |  |
| provider | R2 and Images provider proof ready | PASS | storageMediaReady=yes |  |
| provider | Cron/Queues/dead-letter provider proof ready | PASS | jobsReady=yes |  |
| provider | Cloudflare analytics and observability receipt ready | PASS | analyticsReady=yes |  |
| cost-performance | Current provider cost inputs captured | PASS | currentProviderCostsReady=yes |  |
| cost-performance | Cloudflare usage cost inputs captured | PASS | cloudflareUsageCostsReady=yes |  |
| cost-performance | Hosted Cloudflare runtime performance proof captured | PASS | hostedCredentialFreePerformanceCaptured=yes, productionRuntimePerformanceReady=yes, strictHostedClientP95Ready=no, aggregateHostedPerformanceReady=yes |  |
| cost-performance | Production cost decision ready | PASS | productionCostDecisionReady=yes |  |
| observability-support | Agent debugging local snapshot ready | PASS | localReady=yes, logExists=yes, parsedRecords=1382, malformedLines=0, latestOrigin=test, latestFreshness=fresh, errorHandlingPassed=yes, errorHandlingViolations=0 |  |
| observability-support | Agent debugging production gate ready | FAIL | productionReady=no, failures=hostedProofEnv, hostedProofRoute, operationalIncidentAlerting, hostedProofArtifacts, supportMonitoring, operationalIncidents=yes, alertCatalog=yes, alertProducer=yes, hostedProofEnv=no, incidentAlerting=no, hostedProof=no, supportMonitoring=no | Agent debugging production gate is red: hostedProofEnv, hostedProofRoute, operationalIncidentAlerting, hostedProofArtifacts, supportMonitoring. Run `AGENT_DEBUG_SNAPSHOT_REQUIRE_PRODUCTION=1 OUTPUT_FILE=.ai/99_scratch/agent-debugging-snapshot-current.json bun run ops:agent-debug-snapshot` and resolve the reported readinessGates.production failures. |
| observability-support | Hosted observability proof bundle ready | FAIL | productionObservabilityReady=no, required=7, passed=0, failed=0, missing=7, invalid=0, failedRequirements=workersLogsQuery, uptimeAlertDelivery, errorRateAlertDelivery, queueDlqAlertDelivery, cronFailureAlertDelivery, incidentEscalationDelivery, retentionFailureAlertDelivery | Hosted observability proof is incomplete: workersLogsQuery, uptimeAlertDelivery, errorRateAlertDelivery, queueDlqAlertDelivery, cronFailureAlertDelivery, incidentEscalationDelivery, retentionFailureAlertDelivery. Run `bun run ops:observability-drill`, then collect Workers Logs and alert-delivery proof artifacts before rerunning `bun run ops:check-observability`. |
| observability-support | Hosted observability proof route ready | FAIL | routeStatus=route-not-found, httpStatus=404, routeReachable=no, authorizationEnforced=no, readyForWorkersLogsProof=no | Deploy the current Worker source from a clean runtime worktree so `/__cloudflare/observability-proof` is live, then rerun `bun run ops:check-observability-route`. |
| observability-support | Support monitoring readiness ready | FAIL | supportMonitoringReady=no, passed=0, missing=11, failed=0, openRequirements=supportInboxMonitoring, feedbackReview, uptimeAlertDelivery, errorAlertDelivery, incidentEscalationPath, supportOwnerLabel, alertOwnerLabel, first24HourReviewOwnerLabel, first72HourReviewOwnerLabel, operationalIncidentStatusArtifact, productionObservabilityProofArtifact | Support monitoring readiness is incomplete: supportInboxMonitoring, feedbackReview, uptimeAlertDelivery, errorAlertDelivery, incidentEscalationPath, supportOwnerLabel, alertOwnerLabel, first24HourReviewOwnerLabel, first72HourReviewOwnerLabel, operationalIncidentStatusArtifact, productionObservabilityProofArtifact. Run `OUTPUT_FILE=.ai/99_scratch/support-monitoring-readiness-current.json bun run launch:check-support-monitoring` with the required support owners, confirmations, incident status, and observability proof artifacts. |

## Blockers

- Agent debugging production gate ready: Agent debugging production gate is red: hostedProofEnv, hostedProofRoute, operationalIncidentAlerting, hostedProofArtifacts, supportMonitoring. Run `AGENT_DEBUG_SNAPSHOT_REQUIRE_PRODUCTION=1 OUTPUT_FILE=.ai/99_scratch/agent-debugging-snapshot-current.json bun run ops:agent-debug-snapshot` and resolve the reported readinessGates.production failures.
- Hosted observability proof bundle ready: Hosted observability proof is incomplete: workersLogsQuery, uptimeAlertDelivery, errorRateAlertDelivery, queueDlqAlertDelivery, cronFailureAlertDelivery, incidentEscalationDelivery, retentionFailureAlertDelivery. Run `bun run ops:observability-drill`, then collect Workers Logs and alert-delivery proof artifacts before rerunning `bun run ops:check-observability`.
- Hosted observability proof route ready: Deploy the current Worker source from a clean runtime worktree so `/__cloudflare/observability-proof` is live, then rerun `bun run ops:check-observability-route`.
- Support monitoring readiness ready: Support monitoring readiness is incomplete: supportInboxMonitoring, feedbackReview, uptimeAlertDelivery, errorAlertDelivery, incidentEscalationPath, supportOwnerLabel, alertOwnerLabel, first24HourReviewOwnerLabel, first72HourReviewOwnerLabel, operationalIncidentStatusArtifact, productionObservabilityProofArtifact. Run `OUTPUT_FILE=.ai/99_scratch/support-monitoring-readiness-current.json bun run launch:check-support-monitoring` with the required support owners, confirmations, incident status, and observability proof artifacts.
