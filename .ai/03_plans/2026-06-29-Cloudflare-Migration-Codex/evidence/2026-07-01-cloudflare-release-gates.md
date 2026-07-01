# Cloudflare Release Gates

Generated: 2026-07-01T05:13:11.940Z

Aggregates existing local/sanitized Cloudflare migration evidence only. It does not call Cloudflare APIs, read env files, print secrets, deploy Workers, change DNS, purchase plans, mutate providers, or make Vercel/Supabase/Resend removable.

## Summary

| Gate | Ready |
| --- | --- |
| Planning inputs ready | yes |
| Local runtime proof ready | yes |
| Provider dashboard inventory ready | yes |
| Provider proof ready | no |
| Cost/performance proof ready | no |
| D1/Auth/Realtime proof ready | no |
| Local release-gate report ready | yes |
| Production cutover ready | no |

## Checks

| Scope | Check | Result | Evidence | Blocker |
| --- | --- | --- | --- | --- |
| planning | Migration inventory refreshed | PASS | routes=70, providerCoupledFiles=86, rpcNames=75, sqlMigrations=182 |  |
| planning | Official Cloudflare pricing refreshed | PASS | pricingRefreshed=yes, missingProducts=0, invalidSourceUrls=0 |  |
| planning | Local cost/performance workbook scaffold generated | PASS | pricingRefreshed=yes, localPreviewPerformanceCaptured=yes |  |
| data-auth-realtime | D1/Auth/Realtime local redesign readiness report generated | PASS | localReportReady=yes, databaseInventoryReady=yes, inventoryRpcNames=75, rlsPolicyStorageAuthMatches=684 |  |
| data-auth-realtime | D1/Auth/Realtime production proof ready | FAIL | d1Binding=yes, authReplacement=no, appLayerAuthz=yes, localRpcMechanics=yes, betaFeedbackSlice=yes, collaborationInvitationSlice=yes, closedBetaSlice=yes, componentLibrarySlice=yes, estimateHistorySlice=yes, rpcRewrite=yes, realtimeReplacement=yes, restoreProof=yes, performanceProof=yes | One or more D1/Auth/Realtime production proof subgates are incomplete; see the evidence flags for the exact blockers. |
| local-runtime | Worker manifest and local preview controls ready | PASS | manifestReady=yes, localPreviewReady=yes |  |
| local-runtime | Local Worker route probe passed | PASS | reportPassed=yes, requiredRoutes=15, failedRequired=(none) |  |
| provider | Hosted Worker route matrix proof captured | PASS | configured=yes, providerBacked=yes, routeContractReady=yes, hostedRouteProofReady=yes, requiredRoutes=15, failedRequired=(none) |  |
| local-runtime | Cloudflare platform toolchain snapshot ready | PASS | localToolchainSnapshotReady=yes, observabilityConfigured=yes, allBindingsTyped=yes |  |
| provider | Wrangler/API auth readback ready | PASS | cliAvailable=yes, authCheckCompleted=yes, wranglerApiAuthenticated=yes, providerReadbackReady=yes |  |
| provider | Provider resource readback ready | FAIL | wranglerAuthenticated=yes, readbackAttempted=yes, workerDeployment=yes, d1=yes, r2=yes, queues=yes, secrets=no | Read-only Wrangler resource readback is incomplete: Worker secret name list: missing expected names BETTER_AUTH_GOOGLE_CLIENT_ID, BETTER_AUTH_GOOGLE_CLIENT_SECRET. |
| local-runtime | Wrangler deploy dry-run ready | PASS | localWranglerDryRunReady=yes, exitCode=0, noUploadMarkerSeen=yes, warnings=0, requiredBindingsReady=yes |  |
| local-runtime | Queues/Cron local retry and DLQ proof ready | PASS | queueConfig=yes, workerQueueHandler=yes, producer=yes, ack=yes, retry=yes, dlq=yes, duplicate=yes, poison=yes, providerBacked=yes, productionJobsMessaging=yes |  |
| provider | Provider dashboard inventory captured | PASS | dashboardInventoryReady=yes |  |
| provider | Hosted Worker deployment and custom domain provider-proven | FAIL | workersDeploymentReady=no, workerDeploymentSecretsReady=no, workerDeploymentReady=no, wranglerApiAuthenticated=yes | Workers Paid/API auth/secrets/hosted Worker/custom-domain proof is incomplete. |
| provider | R2 and Images provider proof ready | PASS | storageMediaReady=yes |  |
| provider | Cron/Queues/dead-letter provider proof ready | PASS | jobsReady=yes |  |
| provider | Cloudflare analytics and observability receipt ready | PASS | analyticsReady=yes |  |
| cost-performance | Current provider cost inputs captured | FAIL | currentProviderCostsReady=no | Sanitized Vercel/Supabase/Resend invoice or dashboard usage inputs are missing. |
| cost-performance | Cloudflare usage cost inputs captured | FAIL | cloudflareUsageCostsReady=no | Hosted Cloudflare request/CPU/storage/operation usage inputs are missing. |
| cost-performance | Hosted Cloudflare performance proof captured | FAIL | hostedCredentialFreePerformanceCaptured=yes, hostedPerformanceReady=no | Hosted Cloudflare route/action performance evidence is missing, failing budgets, or not production-ready. |
| cost-performance | Production cost decision ready | FAIL | productionCostDecisionReady=no | Production cost decision cannot pass until current-provider and hosted Cloudflare usage/performance evidence exists. |

## Blockers

- D1/Auth/Realtime production proof ready: One or more D1/Auth/Realtime production proof subgates are incomplete; see the evidence flags for the exact blockers.
- Provider resource readback ready: Read-only Wrangler resource readback is incomplete: Worker secret name list: missing expected names BETTER_AUTH_GOOGLE_CLIENT_ID, BETTER_AUTH_GOOGLE_CLIENT_SECRET.
- Hosted Worker deployment and custom domain provider-proven: Workers Paid/API auth/secrets/hosted Worker/custom-domain proof is incomplete.
- Current provider cost inputs captured: Sanitized Vercel/Supabase/Resend invoice or dashboard usage inputs are missing.
- Cloudflare usage cost inputs captured: Hosted Cloudflare request/CPU/storage/operation usage inputs are missing.
- Hosted Cloudflare performance proof captured: Hosted Cloudflare route/action performance evidence is missing, failing budgets, or not production-ready.
- Production cost decision ready: Production cost decision cannot pass until current-provider and hosted Cloudflare usage/performance evidence exists.
