# Cloudflare Provider Readiness

Generated: 2026-07-01T09:46:03.811Z
Source: .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-provider-readiness-source.json
Captured: 2026-06-30T02:00:15.745Z
DNS delegation source: .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-dns-delegation.json
Wrangler auth source: .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-wrangler-auth.json
Provider resource readback source: .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-provider-resource-readback.json
Provider runtime proof source: .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-provider-runtime-proof.json
Jobs runtime proof source: .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-jobs-runtime-proof.json
Observability proof source: .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-observability-proof.json
Nameserver evidence source: public-dns

Sanitized provider-readiness check only. It evaluates dashboard facts supplied in a local JSON artifact and, when present, public DNS NS lookup and Wrangler auth artifacts. It does not create Cloudflare resources, does not read env files, does not print secrets, does not mutate DNS/resources/billing, and does not make Vercel/Supabase/Resend removable.

## Summary

| Gate | Ready |
| --- | --- |
| Dashboard inventory ready | yes |
| Workers deployment ready | yes |
| Storage/media ready | yes |
| Jobs ready | yes |
| Analytics ready | yes |
| Production cutover ready | yes |

## Checks

| Check | Result | Evidence | Blocker |
| --- | --- | --- | --- |
| Cloudflare account identified | PASS | account=Philipjonlewis@gmail.com's Account, accountIdPresent=yes |  |
| Cloudflare zone exists | PASS | zone=archestimator.com, zoneIdPresent=yes, plan=Free |  |
| Imported DNS reviewed | PASS | dnsImportedReviewed=yes, recordCount=9 |  |
| Registrar nameservers point at Cloudflare | PASS | assigned=carl.ns.cloudflare.com, ziggy.ns.cloudflare.com, publicDns=carl.ns.cloudflare.com, ziggy.ns.cloudflare.com, sanitizedRegistrar=dns1.registrar-servers.com, dns2.registrar-servers.com |  |
| Workers Paid purchased | PASS | workersPlan=Paid, workersPaidPurchased=yes |  |
| Worker project deployed | PASS | projectCount=1, deployedWorkerUrlPresent=yes, wranglerDeploymentReadback=yes |  |
| Worker custom domain attached and serving | PASS | customDomainAttached=yes, customDomainHttpChecked=yes, customDomainHttpReady=yes |  |
| Cloudflare API/Wrangler auth configured | PASS | dashboardApiAuthConfigured=yes, wranglerAuthChecked=yes, wranglerApiAuthenticated=yes, wranglerProviderReadback=yes |  |
| Sanitized Worker secret list captured | PASS | sanitizedSecretListCaptured=no, wranglerSecretNameReadback=yes |  |
| R2 proof buckets and readback proven | PASS | r2ProofBucketsCreated=yes, r2HostedReadbackProven=yes, wranglerR2Readback=yes, providerRuntimeR2Proof=yes |  |
| Cloudflare Images binding provider-proven | PASS | imagesBindingProviderProven=no, providerRuntimeImagesProof=yes |  |
| Cron/Queues provider execution proven | PASS | cronProviderExecutionProven=no, queuesProofCreated=yes, deadLetterProofCreated=yes, wranglerQueuesReadback=yes, jobsRuntimeProductionProof=yes |  |
| Cloudflare Analytics/Workers Observability receiving data | PASS | webAnalyticsPropertyCreated=yes, webAnalyticsReceivingDataProven=no, workersObservabilityReceivingDataProven=yes, observedProbeEvents=110 |  |

## Actions Intentionally Not Taken

- paid checkout/subscription purchase by Codex
- API token creation
- registrar nameserver changes
- Vercel cancellation
- Supabase cancellation
- Resend cancellation
- provider resource deletion
